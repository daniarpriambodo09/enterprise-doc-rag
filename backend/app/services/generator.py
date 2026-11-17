from groq import Groq
from typing import List, Dict
from app.core.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

SYSTEM_PROMPT = """Kamu adalah Asisten AI Analisis Dokumen Perusahaan yang akurat dan objektif.
Aturan wajib:
1. Jawab pertanyaan HANYA berdasarkan konteks dokumen yang diberikan di bawah ini.
2. Setiap klaim atau angka penting WAJIB menyertakan sitasi sumber dengan format [Nama File, Hal. X].
3. Jika jawaban tidak ditemukan secara eksplisit di dalam konteks, katakan dengan jujur: "Maaf, informasi tersebut tidak ditemukan dalam dokumen yang tersedia." Jangan mengarang atau berasumsi.
4. Jika konteks memuat tabel Markdown, baca baris dan kolomnya dengan teliti sebelum menjawab.
5. Gunakan Bahasa Indonesia yang formal, jelas, dan terstruktur."""

def generate_answer(query: str, retrieved_chunks: List[Dict]) -> Dict:
    if not retrieved_chunks:
        return {
            "answer": "Belum ada dokumen yang diunggah atau tidak ditemukan konteks yang relevan.",
            "sources": []
        }

    # Susun konteks dari hasil retrieval
    context_blocks = []
    for chunk in retrieved_chunks:
        block = f"--- SUMBER: {chunk['filename']} (Halaman {chunk['page_number']}) ---\n{chunk['content']}"
        context_blocks.append(block)
    
    full_context = "\n\n".join(context_blocks)

    user_message = f"""Konteks Dokumen:
{full_context}

Pertanyaan Pengguna:
{query}"""

    completion = client.chat.completions.create(
        model=settings.LLM_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message}
        ],
        temperature=0.1,
        max_completion_tokens=1500,
        reasoning_effort="low"
    )

    answer_text = completion.choices[0].message.content

    return {
        "answer": answer_text,
        "sources": [
            {
                "filename": c["filename"],
                "page_number": c["page_number"],
                "score": c["score"],
                "snippet": c["content"][:250] + "..."
            }
            for c in retrieved_chunks
        ]
    }