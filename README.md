# Enterprise Document RAG Workspace

Sistem **Retrieval-Augmented Generation (RAG)** siap produksi untuk menganalisis dokumen PDF perusahaan yang kompleks (SOP, spesifikasi teknis, kebijakan, laporan, hingga CV) menggunakan **parsing Markdown berbasis layout**, **Hybrid Search (`pgvector` + BM25)**, **guardrails anti-halusinasi**, serta **sitasi sumber per halaman yang dapat diverifikasi**.

---

## Keunggulan Teknis (*Key Engineering Highlights*)

- **Layout-Aware PDF & Table Parsing (`pymupdf4llm`)**: Mengekstrak PDF multi-halaman menjadi Markdown terstruktur per halaman sehingga tabel, heading, dan urutan baca tetap utuh, sekaligus mempertahankan metadata `page_number` di setiap chunk.
- **Two-Stage Hybrid Search (`pgvector` HNSW + BM25 Reranking)**:
  1. **Semantic Retrieval**: Mengambil 15 kandidat teratas dari PostgreSQL `pgvector` (embedding Gemini 768-dimensi dengan indeks cosine HNSW).
  2. **Lexical Reranking**: Menghitung skor `BM25Okapi` di atas kandidat tersebut lalu menggabungkan skor (`0.7 * semantic + 0.3 * normalized_bm25`) agar akurat untuk makna semantik maupun istilah/kode spesifik.
- **Guardrails Anti-Halusinasi Ketat**: Generasi jawaban dengan `temperature=0.1` yang mewajibkan sitasi `[Nama File, Hal. X]` pada setiap klaim penting, serta menolak menjawab secara jujur apabila informasi tidak tersedia di dalam konteks dokumen.
- **Manajemen Basis Pengetahuan Idempoten**:
  - **Anti-Duplikasi / Overwrite**: Endpoint `POST /api/v1/upload` otomatis menghapus chunk lama dengan `filename` yang sama sebelum menyimpan chunk baru.
  - **Hapus Dokumen**: Endpoint `DELETE /api/v1/documents/{filename}` menghapus seluruh chunk beserta vektor embedding-nya dari database.
- **Pipeline Evaluasi Kuantitatif**: Skrip `eval_rag.py` untuk mengukur **Recall@5**, **Faithfulness Score (LLM-as-a-Judge)**, dan **End-to-End Latency** secara otomatis.

---

## Arsitektur Sistem

```mermaid
flowchart LR
    subgraph Client ["Frontend (Next.js 16 + Tailwind CSS)"]
        UI["Workspace Chat & Manajemen Dokumen"]
        Cite["Inspektor Sitasi & Skor Relevansi"]
    end

    subgraph API ["Backend (FastAPI)"]
        Upload["POST /api/v1/upload"]
        Delete["DELETE /api/v1/documents/{filename}"]
        Chat["POST /api/v1/chat"]
        Parser["Layout-Aware Parser (pymupdf4llm)"]
        Retriever["Hybrid Retriever (Vector + BM25)"]
        Generator["Grounded Generator (Groq LLM)"]
    end

    subgraph Storage ["PostgreSQL + pgvector"]
        DB[("document_chunks (HNSW Index)")]
    end

    subgraph External ["Model APIs"]
        Gemini["Gemini Embedding API (768-d)"]
        Groq["Groq Inference API"]
    end

    UI -->|Unggah PDF| Upload --> Parser --> Gemini --> DB
    UI -->|Hapus Dokumen| Delete --> DB
    UI -->|Pertanyaan + Top-K| Chat --> Retriever
    Retriever -->|Query Embedding| Gemini
    Retriever <-->|Top-15 Cosine + BM25| DB
    Retriever --> Generator --> Groq
    Generator -->|Jawaban + Sumber| UI --> Cite
```

---

## Poin yang Perlu Diperlihatkan (Demo & Portofolio Showcase)

Saat mempresentasikan proyek ini kepada rekruter atau tim teknis, berikut fitur dan kapabilitas utama yang layak ditunjukkan:

1. **Unggah PDF Drag-and-Drop & Manajemen Dokumen**
   - Tunjukkan proses unggah PDF melalui *drag-and-drop*, pencarian dokumen di sidebar, statistik jumlah dokumen & total chunk, fitur *overwrite* anti-duplikasi saat file yang sama diunggah ulang, serta tombol hapus dokumen dengan konfirmasi inline.
2. **Jawaban Terstruktur (Tabel Markdown & Daftar Poin)**
   - Ajukan pertanyaan analitis (misalnya perbandingan proyek atau ekstraksi *Technical Skills*) untuk memperlihatkan kemampuan sistem merangkai tabel Markdown yang rapi lengkap dengan sitasi halaman.
3. **Inspektor Bukti & Skor Relevansi (*Source Citations*)**
   - Buka panel **"Sumber Referensi"** di bawah jawaban AI untuk menunjukkan potongan teks asli (*snippet*), nomor halaman, serta *progress bar* skor relevansi gabungan (Hybrid Score).
4. **Uji *Guardrails* Anti-Halusinasi (*Out-of-Context*)**
   - Ajukan pertanyaan yang tidak ada di dalam dokumen (contoh: nominal gaji atau kebijakan cuti pada dokumen CV) untuk membuktikan AI menjawab jujur *"Maaf, informasi tersebut tidak ditemukan dalam dokumen yang tersedia"* tanpa mengarang fakta.
5. **Kontrol *Retrieval Top-K* & Indikator *Latency***
   - Ubah nilai **Retrieval Top-K** (`3`, `5`, `8`, `10`) di sidebar dan perhatikan metrik waktu respons (*latency*) serta tombol salin jawaban pada setiap kartu respons AI.
6. **Bukti Evaluasi Kuantitatif (`eval_rag.py`)**
   - Tunjukkan hasil benchmark terukur pada file `backend/evaluation/eval_report.json` sebagai validasi performa sistem RAG secara objektif.

---

## Hasil Evaluasi Kuantitatif RAG

Evaluasi dijalankan menggunakan `backend/evaluation/eval_rag.py` terhadap 8 skenario uji (`backend/evaluation/test_dataset.json`) pada dokumen terindeks `CV_Daniar Priambodo_Backend Developer.pdf` (Halaman 1) dengan konfigurasi `Top-K = 5`.

### Ringkasan Metrik

| Metrik | Hasil Terukur | Keterangan |
| :--- | :---: | :--- |
| **Total Skenario Uji** | **8** | 6 pertanyaan *in-context* + 2 pertanyaan *out-of-context* (guardrail) |
| **Retrieval Hit Rate (Recall@5)** | **100.0%** (`1.0`) | Seluruh `expected_page` berhasil ditemukan pada top-5 hasil hybrid search |
| **Average Faithfulness Score** | **0.750 / 1.000** | 6/8 skenario meraih skor `1.00`; 2 skenario (`Q1`, `Q5`) gagal validasi JSON pada API LLM Judge (`json_validate_failed`) |
| **Average End-to-End Latency** | **9.745 s** | Waktu murni proses RAG (`hybrid_search` + `generate_answer`) |

### Rincian Hasil per Skenario (`eval_report.json`)

| ID | Kategori | Recall@5 | Faithfulness | Latency | Catatan |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Q1** | Technical Skills Extraction | HIT | `0.00`* | `1.76s` | *Error validasi JSON pada LLM Judge (`400 json_validate_failed`) |
| **Q2** | Internship Experience | HIT | `1.00` | `1.42s` | Seluruh klaim didukung penuh oleh konteks |
| **Q3** | Project Detail (E-Checksheet) | HIT | `1.00` | `13.83s` | Seluruh klaim didukung penuh oleh konteks |
| **Q4** | Project Detail (Culturace 2026) | HIT | `1.00` | `11.63s` | Seluruh fakta RAB & target peserta sesuai konteks |
| **Q5** | Project Detail (Crypto Trading Bot) | HIT | `0.00`* | `10.74s` | *Error validasi JSON pada LLM Judge (`400 json_validate_failed`) |
| **Q6** | AI & ML Projects (Beyond AI & Langit.in) | HIT | `1.00` | `10.54s` | Perbandingan metode & metrik evaluasi akurat |
| **Q7** | Guardrail / Out-of-Context (Gaji) | HIT | `1.00` | `13.62s` | AI menolak menjawab secara jujur tanpa halusinasi |
| **Q8** | Guardrail / Out-of-Context (Cuti/Asuransi) | HIT | `1.00` | `14.41s` | AI menolak menjawab secara jujur tanpa halusinasi |

---

## Tech Stack

| Layer | Teknologi |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, `react-markdown`, `remark-gfm`, `lucide-react` |
| **Backend** | FastAPI, Uvicorn, Pydantic v2, Python 3.11 |
| **Vector Database** | PostgreSQL 16 + `pgvector` (indeks cosine similarity HNSW) |
| **Parsing & Retrieval** | `pymupdf4llm`, `rank-bm25` (`BM25Okapi`) |
| **Embeddings & LLM** | Google `gemini-embedding-001` (768-dim), Groq (`openai/gpt-oss-20b`) |
| **Containerization** | Docker, Docker Compose |

---

## Struktur Direktori

```text
enterprise-doc-rag/
├── docker-compose.yml              # Container PostgreSQL + pgvector lokal
├── README.md
├── backend/
│   ├── Dockerfile                  # Image ringan python:3.11-slim (tanpa PyTorch GPU)
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py                 # Entrypoint FastAPI, CORS, inisialisasi DB
│   │   ├── api/
│   │   │   └── routes.py           # /upload (anti-duplikasi), /chat, /documents, DELETE /documents/{filename}
│   │   ├── core/
│   │   │   ├── config.py           # Konfigurasi environment via pydantic-settings
│   │   │   └── database.py         # Koneksi psycopg2 & inisialisasi tabel/indeks HNSW
│   │   └── services/
│   │       ├── parser.py           # Chunker PDF-to-Markdown berbasis layout
│   │       ├── embedder.py         # Generator embedding Gemini (batch & query)
│   │       ├── retriever.py        # Hybrid Search (pgvector + BM25)
│   │       └── generator.py        # Generator jawaban LLM + sitasi sumber
│   └── evaluation/
│       ├── test_dataset.json       # Dataset uji QA dengan expected_page & ground_truth
│       ├── eval_rag.py             # Evaluator otomatis Recall@5, Faithfulness & Latency
│       └── eval_report.json        # Laporan hasil evaluasi terbaru
└── frontend/
    ├── package.json
    └── src/
        ├── lib/api.ts              # Klien API terketik (fetch, upload, chat, delete)
        ├── app/
        │   ├── layout.tsx
        │   ├── globals.css
        │   └── page.tsx            # Workspace utama RAG & orkestrasi state
        └── components/
            ├── Header.tsx
            ├── Sidebar.tsx         # Upload drag-and-drop, cari, hapus dokumen, atur Top-K
            ├── EmptyState.tsx      # Tampilan awal & contoh pertanyaan cepat
            ├── ChatMessage.tsx     # Kartu pesan user/AI dengan latency & tombol salin
            ├── MarkdownRenderer.tsx# Styling tabel GFM, code block, & newline <br>
            └── SourceCitations.tsx # Panel inspeksi bukti & skor relevansi
```

---

## Cara Menjalankan Secara Lokal

### 1. Jalankan PostgreSQL dengan `pgvector`
```bash
docker compose up -d
```

### 2. Konfigurasi & Jalankan Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt
```

Buat file `backend/.env` (gunakan `backend/.env.example` sebagai acuan):
```env
GROQ_API_KEY=your_groq_api_key
LLM_MODEL=openai/gpt-oss-20b
GEMINI_API_KEY=your_gemini_api_key
EMBEDDING_MODEL=gemini-embedding-001
DATABASE_URL=postgresql://raguser:ragpassword@localhost:5433/enterprise_rag
```

Jalankan server FastAPI:
```bash
uvicorn app.main:app --reload --port 8000
```

### 3. Konfigurasi & Jalankan Frontend
```bash
cd frontend
npm install
```

Buat file `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
```

Jalankan server Next.js:
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

### 4. Menjalankan Ulang Evaluasi RAG
Pastikan PostgreSQL aktif dan dokumen PDF sudah terindeks:
```bash
cd backend
python evaluation/eval_rag.py
```

---

## Panduan Deployment

### Backend (Render / Railway / Hugging Face Spaces)
File `backend/Dockerfile` menggunakan base image ringan `python:3.11-slim` tanpa dependency PyTorch GPU dan mendukung port dinamis `${PORT:-8000}`:
```bash
cd backend
docker build -t enterprise-rag-backend .
docker run -p 8000:8000 --env-file .env enterprise-rag-backend
```
1. Siapkan database PostgreSQL dengan ekstensi `pgvector` aktif (misalnya **Supabase**, **Neon**, atau **Railway Postgres**).
2. Deploy folder `backend/` sebagai Docker Web Service dan atur variabel `GROQ_API_KEY`, `GEMINI_API_KEY`, serta `DATABASE_URL`.

### Frontend (Vercel)
1. Hubungkan direktori `frontend/` ke **Vercel**.
2. Atur environment variable `NEXT_PUBLIC_API_URL` ke URL backend yang sudah di-deploy (misal `https://your-backend.onrender.com/api/v1`).
3. Deploy.
