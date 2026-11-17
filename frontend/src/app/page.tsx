"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";
import {
  fetchDocuments,
  uploadDocument,
  sendChatQuery,
  deleteDocument,
  DocumentItem,
} from "../lib/api";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import ChatMessage, { ChatMessageData } from "../components/ChatMessage";
import EmptyState from "../components/EmptyState";

function getCurrentTimeLabel() {
  return new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RagWorkspace() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput] = useState("");
  const [topK, setTopK] = useState<number>(5);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadDocs = async () => {
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoadingChat]);

  // Auto-resize textarea height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadStatus({
        type: "error",
        text: "Hanya file PDF (.pdf) yang didukung.",
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);
    try {
      const res = await uploadDocument(file);
      setUploadStatus({
        type: "success",
        text: `${res.filename} berhasil diindeks (${res.total_chunks} chunks)`,
      });
      await loadDocs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload gagal";
      setUploadStatus({ type: "error", text: message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (filename: string) => {
    setDeletingFilename(filename);
    setUploadStatus(null);
    try {
      const res = await deleteDocument(filename);
      setUploadStatus({
        type: "success",
        text: res.message,
      });
      await loadDocs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal menghapus dokumen";
      setUploadStatus({ type: "error", text: message });
    } finally {
      setDeletingFilename(null);
    }
  };

  const submitQuery = async (rawQuery: string) => {
    const userQuery = rawQuery.trim();
    if (!userQuery || isLoadingChat) return;

    setInput("");
    const userMsg: ChatMessageData = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userQuery,
      timestamp: getCurrentTimeLabel(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoadingChat(true);

    const startTime = performance.now();
    try {
      const data = await sendChatQuery(userQuery, topK);
      const latencyMs = performance.now() - startTime;

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.answer,
          sources: data.sources,
          latencyMs,
          timestamp: getCurrentTimeLabel(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "Maaf, terjadi gangguan saat menghubungi server RAG. Pastikan backend FastAPI aktif dan dapat diakses.",
          isError: true,
          timestamp: getCurrentTimeLabel(),
        },
      ]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitQuery(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitQuery(input);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden relative">
      {/* Ambient Radial Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      {/* Sidebar */}
      <div className="relative z-20 h-full">
        <Sidebar
          documents={documents}
          isUploading={isUploading}
          deletingFilename={deletingFilename}
          uploadStatus={uploadStatus}
          topK={topK}
          onTopKChange={setTopK}
          onUploadFile={handleFileUpload}
          onDeleteDocument={handleDeleteDocument}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />
      </div>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10 bg-grid-pattern">
        <Header
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onClearChat={handleClearChat}
          hasMessages={messages.length > 0}
        />

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
          {messages.length === 0 ? (
            <EmptyState
              documentCount={documents.length}
              onSelectPrompt={(prompt) => submitQuery(prompt)}
            />
          ) : (
            messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
          )}

          {isLoadingChat && (
            <div className="flex gap-3.5 max-w-4xl mx-auto animate-fade-in-up">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              </div>
              <div className="rounded-2xl rounded-tl-sm px-5 py-4 bg-slate-900/80 border border-slate-800/90 backdrop-blur-sm max-w-md w-full">
                <div className="flex items-center gap-2 text-xs font-medium text-indigo-300 mb-2.5">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  <span>Mencari konteks (Top-{topK}) & menyusun jawaban...</span>
                </div>
                <div className="space-y-2">
                  <div className="h-2.5 bg-slate-800 rounded-full w-full animate-pulse" />
                  <div className="h-2.5 bg-slate-800 rounded-full w-4/5 animate-pulse" />
                  <div className="h-2.5 bg-slate-800 rounded-full w-3/5 animate-pulse" />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Composer */}
        <div className="p-4 sm:px-6 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
          <form
            onSubmit={handleFormSubmit}
            className="max-w-4xl mx-auto relative flex items-end gap-2.5 bg-slate-900/90 border border-slate-700/80 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/15 rounded-2xl p-2 pl-4 shadow-xl transition-all"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanyakan isi dokumen, prosedur SOP, atau data tabel... (Enter untuk kirim)"
              className="flex-1 bg-transparent py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none max-h-40 leading-relaxed"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoadingChat}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs sm:text-sm flex items-center gap-2 transition shadow-md shadow-indigo-950/50 shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Kirim</span>
            </button>
          </form>
          <p className="max-w-4xl mx-auto text-center text-[11px] text-slate-500 mt-2">
            Enterprise Doc RAG oleh <span className="text-slate-300 font-medium">Daniar Priambodo</span> • Sitasi halaman otomatis • Shift + Enter untuk baris baru
          </p>
        </div>
      </main>
    </div>
  );
}
