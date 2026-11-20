"use client";

import React, { useState } from "react";
import { Bot, User, Copy, Check, Clock, AlertTriangle } from "lucide-react";
import { SourceCitation } from "../lib/api";
import MarkdownRenderer from "./MarkdownRenderer";
import SourceCitations from "./SourceCitations";

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceCitation[];
  latencyMs?: number;
  isError?: boolean;
  timestamp: string;
}

interface ChatMessageProps {
  message: ChatMessageData;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAnswer = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (message.role === "user") {
    return (
      <div className="flex justify-end gap-3 max-w-4xl mx-auto animate-fade-in-up">
        <div className="flex flex-col items-end max-w-[82%] sm:max-w-[75%]">
          <div className="rounded-2xl rounded-tr-sm px-4 py-3 bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20 dark:shadow-indigo-950/40 text-sm leading-relaxed">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <span className="text-[10px] text-slate-500 mt-1.5 px-1">
            Anda • {message.timestamp}
          </span>
        </div>
        <div className="w-8 h-8 rounded-xl bg-slate-200 border border-slate-300 dark:bg-slate-800 dark:border-slate-700/80 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <User className="w-4 h-4 text-slate-700 dark:text-slate-300" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-3.5 max-w-4xl mx-auto animate-fade-in-up">
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm border ${message.isError
            ? "bg-rose-50 border-rose-200 dark:bg-rose-500/15 dark:border-rose-500/30"
            : "bg-indigo-50 border-indigo-200 dark:bg-gradient-to-br dark:from-indigo-500/25 dark:to-violet-500/20 dark:border-indigo-500/30"
          }`}
      >
        {message.isError ? (
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
        ) : (
          <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
        )}
      </div>

      <div className="flex-1 min-w-0 max-w-[90%]">
        <div
          className={`rounded-2xl rounded-tl-sm px-5 py-4 backdrop-blur-sm shadow-sm dark:shadow-xl ${message.isError
              ? "bg-rose-50 border border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:border-rose-800/50 dark:text-rose-200"
              : "bg-white border border-slate-200 text-slate-800 dark:bg-slate-900/80 dark:border-slate-800/90 dark:text-slate-100"
            }`}
        >
          {/* Card Header */}
          <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-200/80 dark:border-slate-800/70">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                TanyaDoc
              </span>
              {message.latencyMs !== undefined && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/90 dark:text-slate-400 dark:border-slate-700/60">
                  <Clock className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                  {(message.latencyMs / 1000).toFixed(2)}s
                </span>
              )}
            </div>

            {!message.isError && (
              <button
                type="button"
                onClick={handleCopyAnswer}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/80 transition cursor-pointer"
                title="Salin jawaban"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Tersalin
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Markdown Answer Body */}
          <MarkdownRenderer content={message.content} />

          {/* Sources */}
          {message.sources && message.sources.length > 0 && (
            <SourceCitations sources={message.sources} />
          )}
        </div>

        <span className="text-[10px] text-slate-500 mt-1.5 px-1 inline-block">
          {message.timestamp}
        </span>
      </div>
    </div>
  );
}
