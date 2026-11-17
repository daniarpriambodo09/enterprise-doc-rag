"use client";

import React from "react";
import Link from "next/link";
import { Menu, RotateCcw, Cpu, Info } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onClearChat: () => void;
  hasMessages: boolean;
}

export default function Header({
  onOpenMobileSidebar,
  onClearChat,
  hasMessages,
}: HeaderProps) {
  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between bg-white/80 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-20 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:text-white transition cursor-pointer"
          aria-label="Buka menu dokumen"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
            Asisten Analisis Dokumen & SOP Perusahaan
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <ThemeToggle />

        <Link
          href="/about"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-slate-800/70 dark:hover:bg-slate-800 dark:border-slate-700/70 text-xs font-medium dark:text-slate-300 dark:hover:text-white transition"
          title="Tentang TanyaDoc"
        >
          <Info className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="hidden sm:inline">Tentang</span>
        </Link>

        <span className="hidden md:inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800/50">
          by Daniar Priambodo
        </span>

        <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/60">
          <Cpu className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          Groq OpenAI-OSS-20B
        </span>

        {hasMessages && (
          <button
            type="button"
            onClick={onClearChat}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:border-slate-700/70 text-xs font-medium dark:text-slate-300 dark:hover:text-white transition cursor-pointer"
            title="Mulai percakapan baru"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Chat</span>
          </button>
        )}
      </div>
    </header>
  );
}
