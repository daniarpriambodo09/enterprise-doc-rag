"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === "dark" ? "Ubah ke Light Mode" : "Ubah ke Dark Mode"}
      aria-label={theme === "dark" ? "Ubah ke Light Mode" : "Ubah ke Dark Mode"}
      className="inline-flex items-center justify-center p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-slate-800/70 dark:hover:bg-slate-800 dark:border-slate-700/70 dark:text-slate-300 dark:hover:text-white transition cursor-pointer"
    >
      {!mounted ? (
        <Sun className="w-3.5 h-3.5 opacity-60" />
      ) : theme === "dark" ? (
        <Sun className="w-3.5 h-3.5 text-amber-400" />
      ) : (
        <Moon className="w-3.5 h-3.5 text-slate-700" />
      )}
    </button>
  );
}
