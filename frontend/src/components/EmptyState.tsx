"use client";

import React from "react";
import {
  Sparkles,
  FileSearch,
  Table2,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";

interface EmptyStateProps {
  documentCount: number;
  onSelectPrompt: (prompt: string) => void;
}

const SUGGESTED_PROMPTS = [
  {
    icon: FileSearch,
    title: "Ringkasan Eksekutif",
    prompt: "Berikan ringkasan poin-poin utama dari dokumen yang telah diunggah.",
  },
  {
    icon: Table2,
    title: "Ekstraksi Tabel & Metrik",
    prompt: "Ekstrak data penting, angka, atau prosedur utama dalam format tabel.",
  },
  {
    icon: ShieldCheck,
    title: "Audit Kebijakan & SOP",
    prompt: "Apa saja aturan kepatuhan, batasan, atau langkah SOP yang wajib diikuti?",
  },
];

export default function EmptyState({
  documentCount,
  onSelectPrompt,
}: EmptyStateProps) {
  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-14 px-2 animate-fade-in-up">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-medium mb-4">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Hybrid Search + pgvector RAG Engine</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
          Analisis Dokumen Perusahaan{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Lebih Cepat & Akurat
          </span>
        </h2>

        <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
          {documentCount > 0
            ? `Saat ini terdapat ${documentCount} dokumen terindeks di basis pengetahuan. Ajukan pertanyaan spesifik untuk mendapatkan jawaban terstruktur lengkap dengan sitasi halaman.`
            : "Unggah dokumen PDF perusahaan (SOP, laporan keuangan, kebijakan, atau spesifikasi teknis) pada panel kiri untuk mulai menganalisis."}
        </p>
      </div>

      {/* Suggested Prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SUGGESTED_PROMPTS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              className="group text-left p-4 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800/90 hover:border-indigo-500/50 transition-all duration-200 shadow-sm hover:shadow-indigo-950/30 cursor-pointer flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                </div>
                <h3 className="text-xs font-semibold text-slate-200 mb-1">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {item.prompt}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
