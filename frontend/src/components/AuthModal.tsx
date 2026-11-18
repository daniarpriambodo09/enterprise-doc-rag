"use client";

import React, { useState } from "react";
import { Loader2, LogIn, UserPlus, X } from "lucide-react";
import { loginUser, registerUser, UserProfile } from "../lib/api";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const user =
        mode === "login"
          ? await loginUser({ email, password })
          : await registerUser({ name, email, password });
      onAuthSuccess(user);
      setName("");
      setEmail("");
      setPassword("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Autentikasi gagal.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-5 shadow-2xl animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
              {mode === "login" ? (
                <LogIn className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
            </div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              {mode === "login" ? "Masuk ke TanyaDoc" : "Daftar Akun Baru"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 mb-4">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              mode === "login"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              mode === "register"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Daftar
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
          {mode === "login"
            ? "Masuk untuk mengakses dokumen pribadi dan riwayat percakapan Anda."
            : "Buat akun untuk mengunggah & mengelola dokumen PDF pribadi Anda secara terisolasi."}
        </p>

        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/60 dark:border-rose-800/60 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "register" && (
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Anda"
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 dark:bg-slate-950 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm dark:text-slate-100 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 dark:bg-slate-950 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm dark:text-slate-100 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 dark:bg-slate-950 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm dark:text-slate-100 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-950 text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{mode === "login" ? "Masuk" : "Daftar & Masuk"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
