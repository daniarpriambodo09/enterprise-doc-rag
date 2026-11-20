"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";

interface EmptyStateProps {
  documentCount: number;
  isAuthenticated: boolean;
  onSelectPrompt: (prompt: string) => void;
}

const ONBOARDING_STEPS = [
  {
    num: "01",
    title: "Unggah Dokumen",
    desc: "Masukkan file PDF yang ingin dijadikan sumber referensi melalui panel di sebelah kiri.",
  },
  {
    num: "02",
    title: "Pemrosesan Chunks",
    desc: "Sistem memecah isi PDF menjadi potongan paragraf kecil (chunks) agar pencarian informasi lebih akurat.",
  },
  {
    num: "03",
    title: "Mulai Bertanya",
    desc: "Ketik pertanyaan di kolom bawah atau pilih contoh pertanyaan di bawah ini untuk melihat jawaban beserta rujukan halamannya.",
  },
];

const SUGGESTED_PROMPTS = [
  {
    title: "Ringkasan Cepat",
    prompt:
      "Tolong rangkum poin-poin paling penting dari dokumen ini secara singkat dan mudah dipahami.",
  },
  {
    title: "Tabel & Poin Penting",
    prompt:
      "Tolong susun informasi penting, angka, atau langkah-langkah utama dari dokumen ini dalam bentuk tabel yang rapi.",
  },
  {
    title: "Penjelasan & Detail Isi",
    prompt:
      "Jelaskan bagian atau istilah penting yang dibahas di dokumen ini beserta rujukan halamannya.",
  },
];

export default function EmptyState({
  documentCount,
  isAuthenticated,
  onSelectPrompt,
}: EmptyStateProps) {
  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 px-2 space-y-9 animate-fade-in-up">
      {/* Hero Section */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Tanya Apa Saja dari Dokumen PDF Anda
        </h2>

        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Unggah dokumen Anda, lalu ajukan pertanyaan untuk mendapatkan jawaban
          beserta nomor halaman aslinya.
        </p>

        {isAuthenticated && documentCount > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {documentCount} dokumen pribadi siap dicari di panel sebelah kiri.
          </p>
        )}
      </div>

      {/* Panduan 3 Langkah */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Cara Penggunaan
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ONBOARDING_STEPS.map((item) => (
            <div
              key={item.num}
              className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5"
            >
              <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                {item.num}
              </span>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {item.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Contoh Pertanyaan Cepat */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Contoh Pertanyaan
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SUGGESTED_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              className="group text-left p-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-400 dark:bg-slate-900/70 dark:hover:bg-slate-900 dark:border-slate-800 dark:hover:border-indigo-500/70 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                  {item.title}
                </h3>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 dark:text-slate-500 dark:group-hover:text-indigo-400 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                {item.prompt}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
