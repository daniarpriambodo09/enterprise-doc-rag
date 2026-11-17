import pymupdf4llm
from typing import List, Dict

def parse_and_chunk_pdf(file_path: str, filename: str, chunk_size: int = 1200, overlap: int = 200) -> List[Dict]:
    """
    Mengekstrak PDF menjadi Markdown per halaman agar tabel tetap utuh,
    lalu membaginya menjadi chunks dengan tetap menjaga metadata nomor halaman.
    """
    pages_data = pymupdf4llm.to_markdown(file_path, page_chunks=True)
    
    chunks = []
    chunk_counter = 0

    for idx, page in enumerate(pages_data):
        meta = page.get("metadata", {})
        # Mendukung format metadata versi baru ('page_number') maupun lama ('page')
        if "page_number" in meta:
            page_num = int(meta["page_number"])
        elif "page" in meta:
            page_num = int(meta["page"]) + 1
        else:
            page_num = idx + 1

        text = page.get("text", "").strip()
        if not text:
            continue

        paragraphs = text.split("\n\n")
        current_chunk = ""

        for para in paragraphs:
            if len(current_chunk) + len(para) <= chunk_size:
                current_chunk += para + "\n\n"
            else:
                if current_chunk.strip():
                    chunks.append({
                        "filename": filename,
                        "page_number": page_num,
                        "chunk_index": chunk_counter,
                        "content": current_chunk.strip()
                    })
                    chunk_counter += 1
                
                overlap_text = current_chunk[-overlap:] if len(current_chunk) > overlap else ""
                current_chunk = overlap_text + para + "\n\n"

        if current_chunk.strip():
            chunks.append({
                "filename": filename,
                "page_number": page_num,
                "chunk_index": chunk_counter,
                "content": current_chunk.strip()
            })
            chunk_counter += 1

    return chunks