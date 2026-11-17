import psycopg2
from pgvector.psycopg2 import register_vector
from app.core.config import settings

def get_db_connection():
    conn = psycopg2.connect(settings.DATABASE_URL)
    register_vector(conn)
    return conn

def init_db():
    conn = psycopg2.connect(settings.DATABASE_URL)
    cur = conn.cursor()
    
    # Aktifkan ekstensi pgvector
    cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    conn.commit()
    
    register_vector(conn)
    
    # Buat tabel penyimpanan dokumen & vektor
    cur.execute("""
        CREATE TABLE IF NOT EXISTS document_chunks (
            id SERIAL PRIMARY KEY,
            filename TEXT NOT NULL,
            page_number INTEGER NOT NULL,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL,
            embedding vector(768),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    
    # Buat index HNSW agar pencarian vektor super cepat
    cur.execute("""
        CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
        ON document_chunks USING hnsw (embedding vector_cosine_ops);
    """)
    
    conn.commit()
    cur.close()
    conn.close()