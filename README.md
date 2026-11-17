# Enterprise Document RAG Workspace

A production-ready **Retrieval-Augmented Generation (RAG)** system engineered for analyzing complex enterprise PDFs (SOPs, technical specifications, policies, and financial tables) with **layout-aware Markdown parsing**, **Hybrid Search (`pgvector` + BM25)**, **strict anti-hallucination guardrails**, and **verifiable page-level citations**.

---

## Key Engineering Highlights

- **Layout-Aware PDF & Table Parsing (`pymupdf4llm`)**: Converts multi-page PDFs into structured Markdown per page, preserving complex tables, headings, and reading order while retaining exact `page_number` metadata across overlapping chunks.
- **Two-Stage Hybrid Search (`pgvector` HNSW + BM25 Reranking)**:
  1. **Semantic Retrieval**: Queries PostgreSQL `pgvector` (768-dim Gemini embeddings with HNSW cosine index) to fetch the top-15 semantic candidates.
  2. **Lexical Reranking**: Applies `BM25Okapi` over the candidate set and fuses scores (`0.7 * semantic + 0.3 * normalized_bm25`) to capture both conceptual intent and exact domain keywords/codes.
- **Strict Anti-Hallucination Guardrails**: Enforces grounded generation (`temperature=0.1`) with mandatory `[Filename, Hal. X]` inline citations and explicit refusal when answers are absent from retrieved context.
- **Idempotent Knowledge Base Management**:
  - Automatic overwrite/deduplication on `POST /api/v1/upload` when re-uploading an existing filename.
  - Full document & embedding lifecycle deletion via `DELETE /api/v1/documents/{filename}`.
- **Quantitative Evaluation Pipeline**: Built-in RAG evaluation harness (`eval_rag.py`) measuring **Recall@5**, **LLM-as-a-Judge Faithfulness**, and **End-to-End Latency**.

---

## System Architecture

```mermaid
flowchart LR
    subgraph Client ["Frontend (Next.js 16 + Tailwind CSS)"]
        UI["Chat & Document Workspace"]
        Cite["Citation & Relevance Inspector"]
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

    UI -->|Upload PDF| Upload --> Parser --> Gemini --> DB
    UI -->|Delete Doc| Delete --> DB
    UI -->|Query + Top-K| Chat --> Retriever
    Retriever -->|Query Embedding| Gemini
    Retriever <-->|Top-15 Cosine + BM25| DB
    Retriever --> Generator --> Groq
    Generator -->|Answer + Sources| UI --> Cite
```

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, `react-markdown`, `remark-gfm`, `lucide-react` |
| **Backend** | FastAPI, Uvicorn, Pydantic v2, Python 3.11 |
| **Vector Database** | PostgreSQL 16 + `pgvector` (HNSW cosine similarity index) |
| **Parsing & Retrieval** | `pymupdf4llm`, `rank-bm25` (BM25Okapi) |
| **Embeddings & LLM** | Google `gemini-embedding-001` (768-dim), Groq (`openai/gpt-oss-20b`) |
| **Containerization** | Docker, Docker Compose |

---

## Project Structure

```text
enterprise-doc-rag/
├── docker-compose.yml              # Local PostgreSQL + pgvector container
├── README.md
├── backend/
│   ├── Dockerfile                  # Lightweight python:3.11-slim image (no PyTorch GPU bloat)
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS, lifespan DB init
│   │   ├── api/
│   │   │   └── routes.py           # /upload (dedup), /chat, /documents, DELETE /documents/{filename}
│   │   ├── core/
│   │   │   ├── config.py           # Environment settings via pydantic-settings
│   │   │   └── database.py         # psycopg2 + pgvector HNSW schema initialization
│   │   └── services/
│   │       ├── parser.py           # Layout-aware PDF-to-Markdown chunker
│   │       ├── embedder.py         # Gemini batch & query embeddings
│   │       ├── retriever.py        # Hybrid Search (pgvector + BM25)
│   │       └── generator.py        # Grounded LLM response + source snippets
│   └── evaluation/
│       ├── test_dataset.json       # Benchmark QA pairs with expected_page & ground_truth
│       └── eval_rag.py             # Automated Recall@5, Faithfulness & Latency evaluator
└── frontend/
    ├── package.json
    └── src/
        ├── lib/api.ts              # Typed API client (fetch, upload, chat, delete)
        ├── app/
        │   ├── layout.tsx
        │   ├── globals.css
        │   └── page.tsx            # Main RAG workspace & state orchestration
        └── components/
            ├── Header.tsx
            ├── Sidebar.tsx         # Drag-and-drop upload, search, delete, Top-K tuning
            ├── EmptyState.tsx      # Hero welcome & suggested prompts
            ├── ChatMessage.tsx     # User/AI message cards with latency & copy actions
            ├── MarkdownRenderer.tsx# Custom GFM table, code block & markdown styling
            └── SourceCitations.tsx # Expandable evidence & relevance score inspector
```

---

## Getting Started (Local Development)

### 1. Start PostgreSQL with `pgvector`
```bash
docker compose up -d
```

### 2. Configure & Run the Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env` (use `backend/.env.example` as a template):
```env
GROQ_API_KEY=your_groq_api_key
LLM_MODEL=openai/gpt-oss-20b
GEMINI_API_KEY=your_gemini_api_key
EMBEDDING_MODEL=gemini-embedding-001
DATABASE_URL=postgresql://raguser:ragpassword@localhost:5433/enterprise_rag
```

Start the FastAPI server:
```bash
uvicorn app.main:app --reload --port 8000
```

### 3. Configure & Run the Frontend
```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
```

Start the Next.js development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Quantitative Evaluation

The `backend/evaluation/` suite benchmarks retrieval accuracy, answer faithfulness (via LLM-as-a-Judge), and end-to-end latency.

### Run the Evaluation Script
Ensure PostgreSQL is running and at least one relevant PDF document is indexed:
```bash
cd backend
python evaluation/eval_rag.py
```
The script prints a summary table to the terminal and writes detailed per-query results to `backend/evaluation/eval_report.json`.

### Evaluation Benchmark Results

| Metric | Target | Measured Result | Notes |
| :--- | :---: | :---: | :--- |
| **Retrieval Hit Rate (Recall@5)** | >= 85.0% | *Run `eval_rag.py` to populate* | `expected_page` found in top-5 hybrid search results |
| **Faithfulness Score (LLM-as-a-Judge)** | >= 0.90 | *Run `eval_rag.py` to populate* | 0.0 – 1.0 scale; checks strict grounding in retrieved chunks |
| **Average End-to-End Latency** | <= 3.00s | *Run `eval_rag.py` to populate* | Includes query embedding, hybrid retrieval, and LLM generation |

---

## Deployment Guide

### Backend (Render / Railway / Hugging Face Spaces)
The `backend/Dockerfile` uses `python:3.11-slim` with zero heavy PyTorch/GPU dependencies and binds dynamically to `${PORT:-8000}`:
```bash
cd backend
docker build -t enterprise-rag-backend .
docker run -p 8000:8000 --env-file .env enterprise-rag-backend
```
1. Provision a managed PostgreSQL database with `pgvector` enabled (e.g., **Supabase**, **Neon**, or **Railway Postgres**).
2. Deploy `backend/` as a Docker Web Service and set `GROQ_API_KEY`, `GEMINI_API_KEY`, and `DATABASE_URL`.

### Frontend (Vercel)
1. Import the `frontend/` directory into **Vercel**.
2. Set `NEXT_PUBLIC_API_URL` to your deployed backend URL (e.g., `https://your-backend.onrender.com/api/v1`).
3. Deploy.
