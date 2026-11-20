"use client";

import React from "react";
import {
  Sparkles,
  FileSearch,
  Table2,
  ShieldCheck,
  ArrowUpRight,
  UploadCloud,
  Scissors,
  MessageCircleQuestion,
} from "lucide-react";

interface EmptyStateProps {
  documentCount: number;
  onSelectPrompt: (prompt: string) => void;
}

const ONBOARDING_STEPS = [
  {
    step: "Langkah 1",
    icon: UploadCloud,
    title: "Unggah Dokumen",
    desc: "Klik tombol unggah di sidebar kiri untuk memasukkan file PDF yang ingin dijadikan sumber referensi.",
  },
  {
    step: "Langkah 2",
    icon: Scissors,
    title: "Pahami Potongan Teks (Chunks)",
    desc: "Sistem otomatis memecah dokumen Anda menjadi bagian-bagian kecil (chunks) agar pencarian informasi lebih cepat dan presisi.",
  },
  {
    step: "Langkah 3",
    icon: MessageCircleQuestion,
    title: "Mulai Bertanya",
    desc: "Ketik pertanyaan di kolom bawah atau pilih contoh pertanyaan cepat untuk melihat jawaban beserta nomor halamannya.",
  },
];

const SUGGESTED_PROMPTS = [
  {
    icon: FileSearch,
    title: "Ringkasan Eksekutif",
    prompt: "Tolong rangkum poin-poin paling penting dari dokumen ini secara singkat dan jelas.",
  },
  {
    icon: Table2,
    title: "Ekstraksi Tabel & Metrik",
    prompt: "Tolong tampilkan data penting, angka, atau langkah utama dari dokumen ini dalam bentuk tabel yang rapi.",
  },
  {
    icon: ShieldCheck,
    title: "Audit Kebijakan & SOP",
    prompt: "Apa saja aturan penting, batasan, atau prosedur wajib yang perlu diperhatikan di dokumen ini?",
  },
];

export default function EmptyState({
  documentCount,
  onSelectPrompt,
}: EmptyStateProps) {
  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-10 px-2 space-y-8 animate-fade-in-up">
      {/* Hero Section */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/25 dark:text-indigo-300 text-xs font-medium mb-4">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>✨ Asisten Cerdas Dokumen PDF Anda</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">
          Tanya Apa Saja dari{" "}
          <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 dark:from-indigo-400 dark:via-violet-400 dark:to-blue-400 bg-clip-text text-transparent">
            Dokumen PDF Anda
          </span>
        </h2>

        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Unggah dokumen Anda, dan dapatkan jawaban akurat lengkap dengan
          referensi halaman aslinya dalam hitungan detik.
          {documentCount > 0 && (
            <span className="block mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              Saat ini tersedia {documentCount} dokumen siap tanya di panel kiri.
            </span>
          )}
        </p>
      </div>

      {/* Onboarding 3 Langkah */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 text-center sm:text-left">
          Cara Penggunaan
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ONBOARDING_STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-900/50 border border-slate-200/90 dark:border-slate-800/80 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                    {item.step}
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200/80 text-indigo-600 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400 flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {item.title}
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Prompts */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 text-center sm:text-left">
          Contoh Pertanyaan Cepat (Klik untuk Mengisi Kolom Chat)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SUGGESTED_PROMPTS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectPrompt(item.prompt)}
                className="group text-left p-4 rounded-2xl bg-white hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-400 dark:bg-slate-900/75 dark:hover:bg-slate-900 dark:border-slate-800/90 dark:hover:border-indigo-500/70 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 dark:hover:shadow-indigo-950/40 cursor-pointer flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 dark:bg-indigo-500/10 dark:border-indigo-500/20 flex items-center justify-center dark:text-indigo-400 group-hover:scale-105 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-all">
                      <Icon className="w-4 h-4" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-slate-500 dark:group-hover:text-indigo-400 transition-all" />
                  </div>
                  <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 mb-1 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                    {item.prompt}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
