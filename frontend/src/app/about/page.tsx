import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  BookOpen,
  Cpu,
  Database,
  FileSearch,
  Layers,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Tentang TanyaDoc — Enterprise Document RAG by Daniar Priambodo",
  description:
    "Informasi arsitektur, teknologi, dan pengembang di balik TanyaDoc (Enterprise Document RAG Workspace) oleh Daniar Priambodo.",
};

const PIPELINE_STEPS = [
  {
    step: "01",
    title: "Multimodal PDF Ingestion",
    desc: "Mengekstrak teks, tabel Markdown, diagram, dan grafik per halaman melalui Gemini Vision, dengan fallback berlapis ke unpdf, Groq Vision, serta OCR lokal Tesseract.js di browser.",
    icon: Layers,
  },
  {
    step: "02",
    title: "Vector & Lexical Indexing",
    desc: "Dokumen dipecah menjadi chunk ber-overlap dengan metadata nomor halaman, di-embed ke 768-dimensi (gemini-embedding-001), dan diindeks di Neon PostgreSQL + pgvector (HNSW).",
    icon: Database,
  },
  {
    step: "03",
    title: "Two-Stage Hybrid Search",
    desc: "Menggabungkan 70% Semantic Cosine Similarity dan 30% PostgreSQL Full-Text Lexical Score (ts_rank) untuk menangkap makna konteks sekaligus istilah teknis spesifik.",
    icon: FileSearch,
  },
  {
    step: "04",
    title: "Grounded Generation & Guardrails",
    desc: "LLM menjawab secara terstruktur hanya dari konteks terambil, wajib menyertakan sitasi [Nama File, Hal. X], dan menolak menjawab jika informasi tidak ada di dokumen.",
    icon: ShieldCheck,
  },
];

const TECH_STACK = [
  { label: "Frontend & API", value: "Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4" },
  { label: "Vector Database", value: "Neon PostgreSQL + pgvector (HNSW Cosine Index)" },
  { label: "Embeddings & Vision", value: "Google Gemini (gemini-embedding-001 & Gemini Vision)" },
  { label: "LLM & Fallback OCR", value: "Groq Inference API, unpdf, pdf-lib, pdfjs-dist, Tesseract.js" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 bg-grid-pattern">
      {/* Top Navigation */}
      <header className="h-14 border-b border-slate-800/80 px-4 sm:px-8 flex items-center justify-between bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Workspace</span>
        </Link>

        <span className="text-xs text-slate-400 font-medium">
          tanyadoc.my.id
        </span>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-12 space-y-12">
        {/* Hero / Intro */}
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Enterprise Document RAG Workspace</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Tentang TanyaDoc
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl">
            <strong className="text-slate-200">TanyaDoc</strong> adalah sistem
            analisis dokumen perusahaan berbasis{" "}
            <strong className="text-slate-200">
              Retrieval-Augmented Generation (RAG)
            </strong>{" "}
            yang dirancang untuk membaca dokumen PDF kompleks—mulai dari SOP,
            laporan, spesifikasi teknis, hingga dokumen hasil scan—dan
            menghasilkan jawaban terstruktur lengkap dengan sitasi halaman yang
            dapat diverifikasi.
          </p>
        </section>

        {/* How It Works */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Arsitektur & Cara Kerja
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PIPELINE_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/90 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-indigo-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-mono text-slate-500">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tech Stack */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-500" />
            <span>Teknologi yang Digunakan</span>
          </h2>

          <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 divide-y divide-slate-800/80">
            {TECH_STACK.map((row) => (
              <div
                key={row.label}
                className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4"
              >
                <span className="text-xs font-medium text-slate-400">
                  {row.label}
                </span>
                <span className="text-xs sm:text-sm text-slate-200 font-medium">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Creator / Author Card */}
        <section className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Dikembangkan Oleh</span>
            </div>
            <h2 className="text-lg font-bold text-white">Daniar Priambodo</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
              Backend &amp; AI/ML Engineer — Mahasiswa S1 Ilmu Data Terapan di
              Politeknik Elektronika Negeri Surabaya (PENS). Berfokus pada
              pengembangan sistem RAG, pipeline LLM, dan arsitektur backend
              scalable.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-white text-slate-950 text-xs font-semibold shrink-0 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Coba TanyaDoc</span>
          </Link>
        </section>
      </main>
    </div>
  );
}
