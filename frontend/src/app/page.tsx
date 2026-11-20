"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import {
  fetchDocuments,
  uploadDocument,
  sendChatQuery,
  deleteDocument,
  fetchSessions,
  fetchSessionDetail,
  deleteSession,
  fetchCurrentUser,
  logoutUser,
  AdminAuthError,
  getOrCreateGuestId,
  DocumentItem,
  ChatSessionItem,
  UserProfile,
} from "../lib/api";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import ChatMessage, { ChatMessageData } from "../components/ChatMessage";
import EmptyState from "../components/EmptyState";
import AuthModal from "../components/AuthModal";

function formatTimeLabel(dateInput?: string) {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RagWorkspace() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput] = useState("");
  const [topK, setTopK] = useState<number>(5);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingAuthAction, setPendingAuthAction] = useState<
    | { type: "upload"; file: File }
    | { type: "delete"; filename: string }
    | null
  >(null);

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

  const loadSessions = async () => {
    try {
      const data = await fetchSessions();
      setSessions(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    getOrCreateGuestId();
    fetchCurrentUser().then((user) => setCurrentUser(user));
    loadDocs();
    loadSessions();
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
    setUploadProgress(null);
    setUploadStatus(null);
    try {
      const res = await uploadDocument(file, (statusText) => {
        setUploadProgress(statusText);
      });
      const modeText =
        res.ingestion_mode === "client-ocr"
          ? "OCR Lokal (Tesseract)"
          : res.ingestion_mode === "groq-vision"
            ? "Groq Vision AI"
            : res.ingestion_mode === "multimodal"
              ? "Multimodal AI"
              : "Ekstraksi Teks";
      setUploadStatus({
        type: "success",
        text: `${res.filename} berhasil diindeks (${res.total_chunks} chunks • ${modeText})`,
      });
      await loadDocs();
    } catch (err: unknown) {
      if (err instanceof AdminAuthError) {
        setPendingAuthAction({ type: "upload", file });
        setIsAuthModalOpen(true);
        return;
      }
      const message = err instanceof Error ? err.message : "Upload gagal";
      setUploadStatus({ type: "error", text: message });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
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
      if (err instanceof AdminAuthError) {
        setPendingAuthAction({ type: "delete", filename });
        setIsAuthModalOpen(true);
        return;
      }
      const message = err instanceof Error ? err.message : "Gagal menghapus dokumen";
      setUploadStatus({ type: "error", text: message });
    } finally {
      setDeletingFilename(null);
    }
  };

  const handleAuthSuccess = async (user: UserProfile) => {
    setCurrentUser(user);
    await Promise.all([loadDocs(), loadSessions()]);
    const action = pendingAuthAction;
    setPendingAuthAction(null);
    if (action?.type === "upload") {
      await handleFileUpload(action.file);
    } else if (action?.type === "delete") {
      await handleDeleteDocument(action.filename);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setActiveSessionId(null);
    setMessages([]);
    await Promise.all([loadDocs(), loadSessions()]);
  };

  const handleSelectSession = async (sessionId: string) => {
    if (isLoadingChat || isLoadingSession) return;
    setIsLoadingSession(true);
    try {
      const detail = await fetchSessionDetail(sessionId);
      setActiveSessionId(detail.session.id);
      setMessages(
        detail.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources,
          timestamp: formatTimeLabel(m.created_at),
        }))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSession(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    setDeletingSessionId(sessionId);
    try {
      await deleteSession(sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
      await loadSessions();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
  };

  const submitQuery = async (rawQuery: string) => {
    const userQuery = rawQuery.trim();
    if (!userQuery || isLoadingChat) return;

    setInput("");
    const userMsg: ChatMessageData = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userQuery,
      timestamp: formatTimeLabel(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoadingChat(true);

    const startTime = performance.now();
    try {
      const data = await sendChatQuery(userQuery, topK, activeSessionId);
      const latencyMs = performance.now() - startTime;

      if (data.session_id && data.session_id !== activeSessionId) {
        setActiveSessionId(data.session_id);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.answer,
          sources: data.sources,
          latencyMs,
          timestamp: formatTimeLabel(),
        },
      ]);

      await loadSessions();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "Maaf, terjadi gangguan saat menghubungi server RAG. Pastikan backend & koneksi database aktif.",
          isError: true,
          timestamp: formatTimeLabel(),
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

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans overflow-hidden relative transition-colors">
      {/* Ambient Radial Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 left-1/3 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/10 dark:bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      {/* Sidebar */}
      <div className="relative z-20 h-full">
        <Sidebar
          documents={documents}
          sessions={sessions}
          activeSessionId={activeSessionId}
          isAuthenticated={Boolean(currentUser)}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          deletingFilename={deletingFilename}
          deletingSessionId={deletingSessionId}
          uploadStatus={uploadStatus}
          topK={topK}
          onTopKChange={setTopK}
          onUploadFile={handleFileUpload}
          onDeleteDocument={handleDeleteDocument}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />
      </div>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10 bg-grid-pattern">
        <Header
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onClearChat={handleNewChat}
          hasMessages={messages.length > 0}
          user={currentUser}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
        />

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
          {isLoadingSession ? (
            <div className="flex items-center justify-center py-20 text-slate-500 dark:text-slate-400 gap-2.5 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
              <span>Memuat riwayat percakapan...</span>
            </div>
          ) : messages.length === 0 ? (
            <EmptyState
              documentCount={documents.length}
              isAuthenticated={Boolean(currentUser)}
              onSelectPrompt={(prompt) => {
                setInput(prompt);
                textareaRef.current?.focus();
              }}
            />
          ) : (
            messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
          )}

          {isLoadingChat && (
            <div className="flex gap-3.5 max-w-4xl mx-auto animate-fade-in-up">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 dark:bg-indigo-500/15 dark:border-indigo-500/30 flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
              </div>
              <div className="rounded-2xl rounded-tl-sm px-5 py-4 bg-white border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800/90 backdrop-blur-sm max-w-md w-full shadow-sm">
                <div className="flex items-center gap-2 text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-2.5">
                  <span>Mencari konteks (Top-{topK}) & menyusun jawaban...</span>
                </div>
                <div className="space-y-2">
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full w-full animate-pulse" />
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full w-4/5 animate-pulse" />
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full w-3/5 animate-pulse" />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Composer */}
        <div className="p-4 sm:px-6 border-t border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-colors">
          <form
            onSubmit={handleFormSubmit}
            className="max-w-4xl mx-auto relative flex items-end gap-2.5 bg-white border border-slate-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 dark:bg-slate-900/90 dark:border-slate-700/80 dark:focus-within:border-indigo-500/80 rounded-2xl p-2 pl-4 shadow-sm dark:shadow-xl transition-all"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanyakan isi dokumen, prosedur SOP, tabel, atau grafik... (Enter untuk kirim)"
              className="flex-1 bg-transparent py-2 text-sm text-slate-900 placeholder-slate-400 dark:text-slate-100 dark:placeholder-slate-500 focus:outline-none resize-none max-h-40 leading-relaxed"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoadingChat}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs sm:text-sm flex items-center gap-2 transition shadow-md shadow-indigo-500/20 dark:shadow-indigo-950/50 shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Kirim</span>
            </button>
          </form>
          <p className="max-w-4xl mx-auto text-center text-[11px] text-slate-500 mt-2">
            TanyaDoc oleh <span className="text-slate-700 dark:text-slate-300 font-medium">Daniar Priambodo</span> • Sitasi halaman otomatis • Shift + Enter untuk baris baru
          </p>
        </div>
      </main>

      {/* Modal Login & Register */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingAuthAction(null);
        }}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
