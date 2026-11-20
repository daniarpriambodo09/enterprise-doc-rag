"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  X,
  Trash2,
  Check,
  Plus,
  MessageSquare,
  FolderOpen,
  Lock,
  Unlock,
  Info,
} from "lucide-react";
import { ChatSessionItem, DocumentItem } from "../lib/api";

interface SidebarProps {
  documents: DocumentItem[];
  sessions: ChatSessionItem[];
  activeSessionId: string | null;
  isUploading: boolean;
  uploadProgress?: string | null;
  deletingFilename: string | null;
  deletingSessionId: string | null;
  uploadStatus: { type: "success" | "error"; text: string } | null;
  topK: number;
  onTopKChange: (val: number) => void;
  onUploadFile: (file: File) => void;
  onDeleteDocument: (filename: string) => void;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  hasAdminPasscode: boolean;
  onOpenAdminModal: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatShortDateTime(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Sidebar({
  documents,
  sessions,
  activeSessionId,
  isUploading,
  uploadProgress,
  deletingFilename,
  deletingSessionId,
  uploadStatus,
  topK,
  onTopKChange,
  onUploadFile,
  onDeleteDocument,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  hasAdminPasscode,
  onOpenAdminModal,
  isOpenMobile,
  onCloseMobile,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"history" | "documents">("documents");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<string | null>(null);
  const [dismissedStatus, setDismissedStatus] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDismissedStatus(false);
  }, [uploadStatus]);

  const totalChunks = documents.reduce((acc, doc) => acc + doc.total_chunks, 0);

  const filteredDocs = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isUploading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onUploadFile(file);
  };

  const sidebarContent = (
    <div className="w-[300px] h-full border-r border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-950 flex flex-col transition-colors">
      {/* Top Bar: Brand + New Chat */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-200 dark:border-slate-800/70">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h1 className="font-semibold text-sm text-slate-900 dark:text-slate-100 tracking-tight truncate">
              TanyaDoc
            </h1>
            <p className="text-[11px] text-slate-500 truncate">
              by Daniar Priambodo
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                onNewChat();
                onCloseMobile();
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-950 text-xs font-medium transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Chat Baru</span>
            </button>
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Tutup sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Minimalist Tabs */}
        <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition cursor-pointer ${activeTab === "history"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Riwayat ({sessions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition cursor-pointer ${activeTab === "documents"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Dokumen ({documents.length})</span>
          </button>
        </div>
      </div>

      {/* Main Scrollable Content */}
      {activeTab === "history" ? (
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {sessions.length === 0 ? (
            <div className="py-10 px-4 text-center">
              <p className="text-xs text-slate-500">
                Belum ada riwayat percakapan.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const isDeleting = deletingSessionId === session.id;
                return (
                  <li key={session.id}>
                    <div
                      onClick={() => {
                        onSelectSession(session.id);
                        onCloseMobile();
                      }}
                      className={`group flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg transition cursor-pointer ${isActive
                          ? "bg-slate-100 text-slate-900 border border-slate-300 dark:bg-slate-800/90 dark:text-white dark:border-slate-700/80"
                          : "hover:bg-slate-100/70 text-slate-700 dark:hover:bg-slate-900 dark:text-slate-300 border border-transparent"
                        }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-xs font-medium truncate"
                          title={session.title}
                        >
                          {session.title}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {formatShortDateTime(session.updated_at)}
                        </p>
                      </div>

                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 animate-spin shrink-0" />
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition shrink-0 cursor-pointer"
                          title="Hapus sesi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 px-3 py-3 gap-2.5">
          {/* Compact Drag & Drop Upload Bar */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-dashed transition cursor-pointer ${isDragging
                  ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10"
                  : "border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100/80 dark:border-slate-700/80 dark:hover:border-slate-500 dark:bg-slate-900/60 dark:hover:bg-slate-900"
                } ${isUploading ? "opacity-80 pointer-events-none" : ""}`}
            >
              <div className="w-7 h-7 rounded-md bg-white border border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 flex items-center justify-center dark:text-slate-300 shrink-0">
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                  {isUploading
                    ? uploadProgress || "Memproses PDF..."
                    : "Unggah Dokumen PDF"}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {isUploading
                    ? "Teks, tabel & analisis visual"
                    : "Klik atau seret file ke sini"}
                </p>
              </div>
            </div>

            {uploadStatus && !dismissedStatus && (
              <div
                className={`mt-2 px-2.5 py-2 rounded-lg text-[11px] flex items-start gap-2 ${uploadStatus.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50"
                    : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/50"
                  }`}
              >
                {uploadStatus.type === "success" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                )}
                <span className="flex-1 break-words leading-snug">
                  {uploadStatus.text}
                </span>
                <button
                  type="button"
                  onClick={() => setDismissedStatus(true)}
                  className="text-current opacity-60 hover:opacity-100 shrink-0 cursor-pointer"
                  aria-label="Tutup notifikasi"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari dokumen..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-slate-400 dark:bg-slate-900 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs dark:text-slate-200 dark:placeholder-slate-500 focus:outline-none dark:focus:border-slate-600 transition"
            />
          </div>

          {/* Section Header with Inline Stats & Admin Lock */}
          <div className="flex items-center justify-between px-1 pt-0.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Terindeks ({filteredDocs.length})
            </span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <span>{totalChunks} chunks</span>
                <span className="relative group/chunks inline-flex items-center">
                  <Info
                    className="w-3 h-3 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-help transition-colors"
                    aria-label="Penjelasan tentang chunks"
                  />
                  <span className="pointer-events-none opacity-0 group-hover/chunks:opacity-100 transition-opacity duration-150 absolute right-0 top-full mt-1.5 w-56 p-2.5 rounded-xl bg-slate-900 text-slate-100 dark:bg-slate-800 dark:text-slate-100 border border-slate-700 shadow-xl text-[10px] leading-relaxed z-40">
                    Chunks adalah potongan paragraf kecil hasil pemecahan dokumen PDF agar AI bisa membaca dan mencari jawaban secara akurat.
                  </span>
                </span>
              </span>
              <button
                type="button"
                onClick={onOpenAdminModal}
                title={
                  hasAdminPasscode
                    ? "Admin Mode Aktif (Klik untuk ubah/hapus passcode)"
                    : "Admin Mode (Masukkan passcode untuk upload/hapus)"
                }
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border transition cursor-pointer ${hasAdminPasscode
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:border-slate-800"
                  }`}
              >
                {hasAdminPasscode ? (
                  <Unlock className="w-2.5 h-2.5" />
                ) : (
                  <Lock className="w-2.5 h-2.5" />
                )}
                <span>Admin</span>
              </button>
            </div>
          </div>

          {/* Document List */}
          <div className="flex-1 overflow-y-auto -mx-1 px-1">
            {filteredDocs.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-slate-500">
                  {documents.length === 0
                    ? "Belum ada dokumen di database."
                    : "Tidak ada dokumen yang cocok."}
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {filteredDocs.map((doc, idx) => {
                  const isDeleting = deletingFilename === doc.filename;
                  const isConfirming = confirmDeleteFile === doc.filename;
                  const canDelete = doc.can_delete !== false;
                  const isPublic = doc.is_public !== false;

                  return (
                    <li
                      key={`${doc.filename}-${idx}`}
                      className="px-2.5 py-2 rounded-lg hover:bg-slate-100/80 border border-transparent hover:border-slate-200 dark:hover:bg-slate-900/90 dark:hover:border-slate-800 transition group"
                    >
                      <div className="flex items-start gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <p
                              className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate"
                              title={doc.filename}
                            >
                              {doc.filename}
                            </p>

                            {canDelete && (
                              isDeleting ? (
                                <Loader2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 animate-spin shrink-0" />
                              ) : isConfirming ? (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmDeleteFile(null);
                                      onDeleteDocument(doc.filename);
                                    }}
                                    className="p-0.5 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-500/35 dark:border-rose-500/30 transition cursor-pointer"
                                    title="Konfirmasi hapus"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteFile(null)}
                                    className="p-0.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
                                    title="Batal"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteFile(doc.filename)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition shrink-0 cursor-pointer"
                                  title={`Hapus ${doc.filename}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 flex-wrap">
                            <span
                              className={`px-1.5 py-0 rounded text-[9px] font-medium border ${
                                isPublic
                                  ? "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                  : "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60"
                              }`}
                            >
                              {isPublic ? "Publik" : "Pribadi"}
                            </span>
                            <span>{doc.total_chunks} chunks</span>
                            {isConfirming ? (
                              <span className="text-rose-600 dark:text-rose-400 font-medium">
                                • Hapus dokumen?
                              </span>
                            ) : (
                              doc.uploaded_at && (
                                <span>• {formatDate(doc.uploaded_at)}</span>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Compact Footer: Top-K Selector */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950 transition-colors">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
            <span>Jumlah Referensi (Top-K)</span>
            <span className="relative group/topk inline-flex items-center">
              <Info
                className="w-3 h-3 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-help transition-colors"
                aria-label="Penjelasan Jumlah Referensi (Top-K)"
              />
              <span className="pointer-events-none opacity-0 group-hover/topk:opacity-100 transition-opacity duration-150 absolute left-0 bottom-full mb-2 w-60 p-2.5 rounded-xl bg-slate-900 text-slate-100 dark:bg-slate-800 dark:text-slate-100 border border-slate-700 shadow-xl text-[10px] leading-relaxed z-40">
                Mengatur berapa banyak potongan teks (chunks) yang diambil sebagai sumber jawaban. Pilih angka lebih besar untuk pertanyaan yang membutuhkan rangkuman luas.
              </span>
            </span>
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {[3, 5, 8, 10].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => onTopKChange(val)}
                className={`w-6 h-6 rounded text-[11px] font-medium transition cursor-pointer ${
                  topK === val
                    ? "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-950"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:border-slate-800"
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block h-full shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 dark:bg-slate-950/75 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 h-full">{sidebarContent}</aside>
        </div>
      )}
    </>
  );
}
