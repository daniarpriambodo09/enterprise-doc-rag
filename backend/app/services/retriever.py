from typing import List, Dict
from rank_bm25 import BM25Okapi
from app.core.database import get_db_connection
from app.services.embedder import get_embedding

def hybrid_search(query: str, top_k: int = 5) -> List[Dict]:
    query_embedding = get_embedding(query)
    
    conn = get_db_connection()
    cur = conn.cursor()

    # 1. Semantic Vector Search (Ambil top-15 kandidat berdasarkan kemiripan makna)
    cur.execute("""
        SELECT id, filename, page_number, content, 
               1 - (embedding <=> %s::vector) AS vector_score
        FROM document_chunks
        ORDER BY embedding <=> %s::vector
        LIMIT 15;
    """, (query_embedding, query_embedding))
    
    vector_results = cur.fetchall()
    cur.close()
    conn.close()

    if not vector_results:
        return []

    # 2. Keyword Reranking (BM25) di atas kandidat teratas untuk akurasi istilah/kode
    corpus = [row[3].lower().split() for row in vector_results]
    bm25 = BM25Okapi(corpus)
    bm25_scores = bm25.get_scores(query.lower().split())

    # 3. Gabungkan skor (Hybrid Scoring: 70% Semantic + 30% Keyword)
    max_bm25 = max(bm25_scores) if max(bm25_scores) > 0 else 1.0
    combined_results = []

    for idx, row in enumerate(vector_results):
        norm_bm25 = bm25_scores[idx] / max_bm25
        final_score = (0.7 * float(row[4])) + (0.3 * norm_bm25)
        
        combined_results.append({
            "id": row[0],
            "filename": row[1],
            "page_number": row[2],
            "content": row[3],
            "score": round(final_score, 4)
        })

    # Urutkan berdasarkan skor gabungan tertinggi
    combined_results.sort(key=lambda x: x["score"], reverse=True)
    return combined_results[:top_k]