"use client";

import React from "react";
import Link from "next/link";
import { Menu, RotateCcw, Info, LogIn, LogOut, User } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { UserProfile } from "../lib/api";

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onClearChat: () => void;
  hasMessages: boolean;
  user: UserProfile | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export default function Header({
  onOpenMobileSidebar,
  onClearChat,
  hasMessages,
  user,
  onOpenAuthModal,
  onLogout,
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
            TanyaDoc — Asisten Tanya Jawab PDF
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

        {hasMessages && (
          <button
            type="button"
            onClick={onClearChat}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:border-slate-700/70 text-xs font-medium dark:text-slate-300 dark:hover:text-white transition cursor-pointer"
            title="Mulai percakapan baru"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset</span>
          </button>
        )}

        {user ? (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 dark:bg-slate-800/90 dark:border-slate-700/80 dark:text-slate-200 text-xs font-medium max-w-[140px]">
              <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="truncate">{user.username}</span>
              {user.role === "admin" && (
                <span className="px-1 py-0.2 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 text-[9px] font-semibold uppercase">
                  Admin
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={onLogout}
              title="Keluar"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-700 hover:text-rose-700 dark:bg-slate-800/80 dark:hover:bg-rose-950/50 dark:border-slate-700/70 dark:hover:border-rose-800/60 text-xs font-medium dark:text-slate-300 dark:hover:text-rose-300 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-950 text-xs font-semibold transition cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Masuk / Daftar</span>
          </button>
        )}
      </div>
    </header>
  );
}
