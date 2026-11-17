"use client";

import React, { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  Check,
  Copy,
  Sparkles,
} from "lucide-react";
import { SourceCitation } from "../lib/api";

interface SourceCitationsProps {
  sources: SourceCitation[];
}

function getScoreStyle(score: number) {
  const pct = score * 100;
  if (pct >= 75) {
    return {
      badge:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
      bar: "bg-emerald-500 dark:bg-emerald-400",
    };
  }
  if (pct >= 50) {
    return {
      badge:
        "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30",
      bar: "bg-indigo-500 dark:bg-indigo-400",
    };
  }
  return {
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
    bar: "bg-amber-500 dark:bg-amber-400",
  };
}

export default function SourceCitations({ sources }: SourceCitationsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!sources || sources.length === 0) return null;

  const uniqueDocs = new Set(sources.map((s) => s.filename)).size;
  const topScore = Math.max(...sources.map((s) => s.score));

  const handleCopySnippet = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1600);
  };

  return (
    <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-slate-800/80">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-indigo-300 dark:bg-slate-950/60 dark:hover:bg-slate-950/90 dark:border-slate-800/80 dark:hover:border-indigo-500/40 transition group cursor-pointer"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 group-hover:text-indigo-800 dark:text-indigo-300 dark:group-hover:text-indigo-200">
            <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{sources.length} Sumber Referensi</span>
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">•</span>
          <span className="text-[11px] text-slate-600 dark:text-slate-400">
            {uniqueDocs} dokumen
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20">
            <Sparkles className="w-2.5 h-2.5" />
            Top {(topScore * 100).toFixed(0)}%
          </span>
        </div>

        <span className="flex items-center gap-1 text-[11px] text-slate-500 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-slate-200 shrink-0">
          <span>{isOpen ? "Tutup" : "Lihat bukti"}</span>
          {isOpen ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </span>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-2.5 animate-fade-in-up">
          {sources.map((src, sIdx) => {
            const pct = Math.min(100, Math.max(0, src.score * 100));
            const style = getScoreStyle(src.score);

            return (
              <div
                key={sIdx}
                className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-slate-300 dark:bg-slate-950/80 dark:border-slate-800/90 dark:hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-500/15 dark:border-indigo-500/30 text-[10px] font-bold dark:text-indigo-300 shrink-0">
                      {sIdx + 1}
                    </span>
                    <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span
                      className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate"
                      title={src.filename}
                    >
                      {src.filename}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-200/70 border border-slate-300/70 text-slate-700 dark:bg-slate-800/90 dark:border-slate-700/70 text-[10px] font-medium dark:text-slate-300 shrink-0">
                      Hal. {src.page_number}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${style.badge}`}
                    >
                      {pct.toFixed(1)}% match
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopySnippet(src.snippet, sIdx)}
                      title="Salin kutipan"
                      className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      {copiedIdx === sIdx ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Relevance Bar */}
                <div className="w-full h-1 rounded-full bg-slate-200 dark:bg-slate-800/90 overflow-hidden mb-2.5">
                  <div
                    className={`h-full rounded-full ${style.bar} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/60 font-mono">
                  {src.snippet}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
