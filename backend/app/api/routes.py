import os
import shutil
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from app.core.database import get_db_connection
from app.services.parser import parse_and_chunk_pdf
from app.services.embedder import get_batch_embeddings
from app.services.retriever import hybrid_search
from app.services.generator import generate_answer

router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    top_k: int = 5

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Saat ini hanya mendukung file PDF.")

    # Simpan sementara untuk diproses PyMuPDF
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        chunks = parse_and_chunk_pdf(tmp_path, file.filename)
        if not chunks:
            raise HTTPException(status_code=400, detail="Tidak ada teks yang bisa diekstrak dari PDF ini.")

        # Generate embedding secara batch (lebih cepat & hemat request)
        texts = [c["content"] for c in chunks]
        embeddings = get_batch_embeddings(texts)

        conn = get_db_connection()
        cur = conn.cursor()

        try:
            # Anti-duplikasi: hapus chunk lama jika file dengan nama yang sama sudah ada
            cur.execute("DELETE FROM document_chunks WHERE filename = %s;", (file.filename,))
            overwritten_chunks = cur.rowcount

            for chunk, emb in zip(chunks, embeddings):
                cur.execute("""
                    INSERT INTO document_chunks (filename, page_number, chunk_index, content, embedding)
                    VALUES (%s, %s, %s, %s, %s);
                """, (chunk["filename"], chunk["page_number"], chunk["chunk_index"], chunk["content"], emb))

            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()
            conn.close()

        return {
            "status": "success",
            "filename": file.filename,
            "total_chunks": len(chunks),
            "overwritten_chunks": overwritten_chunks,
            "message": f"Dokumen berhasil diproses menjadi {len(chunks)} bagian dan disimpan ke database."
        }
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@router.post("/chat")
async def chat_with_docs(request: ChatRequest):
    retrieved = hybrid_search(request.query, top_k=request.top_k)
    result = generate_answer(request.query, retrieved)
    return result

@router.get("/documents")
async def list_documents():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT filename, COUNT(*) as total_chunks, MAX(created_at) as uploaded_at
        FROM document_chunks
        GROUP BY filename
        ORDER BY uploaded_at DESC;
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [
        {"filename": r[0], "total_chunks": r[1], "uploaded_at": r[2]}
        for r in rows
    ]

@router.delete("/documents/{filename}")
async def delete_document(filename: str):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM document_chunks WHERE filename = %s;", (filename,))
        deleted_count = cur.rowcount
        if deleted_count == 0:
            conn.rollback()
            raise HTTPException(status_code=404, detail=f"Dokumen '{filename}' tidak ditemukan.")
        conn.commit()
    except HTTPException:
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

    return {
        "status": "success",
        "filename": filename,
        "deleted_chunks": deleted_count,
        "message": f"Dokumen '{filename}' ({deleted_count} chunks) berhasil dihapus dari database."
    }