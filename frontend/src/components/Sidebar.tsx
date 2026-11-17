"use client";

import React, { useState, useRef } from "react";
import {
  BookOpen,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  Database,
  Layers,
  SlidersHorizontal,
  X,
  Trash2,
  Check,
} from "lucide-react";
import { DocumentItem } from "../lib/api";

interface SidebarProps {
  documents: DocumentItem[];
  isUploading: boolean;
  deletingFilename: string | null;
  uploadStatus: { type: "success" | "error"; text: string } | null;
  topK: number;
  onTopKChange: (val: number) => void;
  onUploadFile: (file: File) => void;
  onDeleteDocument: (filename: string) => void;
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

export default function Sidebar({
  documents,
  isUploading,
  deletingFilename,
  uploadStatus,
  topK,
  onTopKChange,
  onUploadFile,
  onDeleteDocument,
  isOpenMobile,
  onCloseMobile,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="w-80 h-full border-r border-slate-800/80 bg-slate-900/85 backdrop-blur-xl flex flex-col p-5">
      {/* Brand Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-950/50">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white">
              Enterprise Doc RAG
            </h1>
            <p className="text-[11px] text-slate-400">
              Hybrid Search + pgvector
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          aria-label="Tutup sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div className="mb-5">
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
          className={`rounded-2xl border-2 border-dashed p-4 text-center transition-all cursor-pointer ${
            isDragging
              ? "border-indigo-400 bg-indigo-500/15 scale-[1.01]"
              : "border-slate-700/80 hover:border-indigo-500/60 bg-slate-950/50 hover:bg-slate-950/80"
          } ${isUploading ? "opacity-60 pointer-events-none" : ""}`}
        >
          <div className="w-9 h-9 mx-auto mb-2 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
          </div>
          <p className="text-xs font-medium text-slate-200">
            {isUploading ? "Memproses & Mengindeks PDF..." : "Unggah Dokumen PDF"}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Klik atau seret file PDF ke sini
          </p>
        </div>

        {uploadStatus && (
          <div
            className={`mt-3 p-2.5 rounded-xl text-xs flex items-start gap-2 animate-fade-in-up ${
              uploadStatus.type === "success"
                ? "bg-emerald-950/70 text-emerald-300 border border-emerald-800/60"
                : "bg-rose-950/70 text-rose-300 border border-rose-800/60"
            }`}
          >
            {uploadStatus.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="break-all leading-relaxed">{uploadStatus.text}</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
            <Database className="w-3 h-3 text-indigo-400" />
            <span>Dokumen</span>
          </div>
          <p className="text-base font-bold text-slate-100">{documents.length}</p>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
            <Layers className="w-3 h-3 text-violet-400" />
            <span>Total Chunks</span>
          </div>
          <p className="text-base font-bold text-slate-100">{totalChunks}</p>
        </div>
      </div>

      {/* Search Docs */}
      <div className="relative mb-3">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari dokumen..."
          className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/70 transition"
        />
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto pr-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
          Basis Pengetahuan ({filteredDocs.length})
        </h2>
        {filteredDocs.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center">
            <p className="text-xs text-slate-500">
              {documents.length === 0
                ? "Belum ada dokumen di database."
                : "Tidak ada dokumen yang cocok."}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredDocs.map((doc, idx) => {
              const isDeleting = deletingFilename === doc.filename;
              const isConfirming = confirmDeleteFile === doc.filename;

              return (
                <li
                  key={`${doc.filename}-${idx}`}
                  className="p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800 hover:border-slate-700 transition group"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1.5">
                        <p
                          className="text-xs font-medium text-slate-200 truncate group-hover:text-white transition"
                          title={doc.filename}
                        >
                          {doc.filename}
                        </p>

                        {isDeleting ? (
                          <Loader2 className="w-3.5 h-3.5 text-rose-400 animate-spin shrink-0 mt-0.5" />
                        ) : isConfirming ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteFile(null);
                                onDeleteDocument(doc.filename);
                              }}
                              className="p-1 rounded-md bg-rose-500/20 text-rose-300 hover:bg-rose-500/35 border border-rose-500/30 transition cursor-pointer"
                              title="Konfirmasi hapus"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteFile(null)}
                              className="p-1 rounded-md bg-slate-700/60 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                              title="Batal"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteFile(doc.filename)}
                            className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-70 group-hover:opacity-100 transition shrink-0 cursor-pointer"
                            title={`Hapus ${doc.filename}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700/60 text-[10px] text-slate-400">
                          {doc.total_chunks} chunks
                        </span>
                        {isConfirming ? (
                          <span className="text-[10px] text-rose-400 font-medium">
                            Hapus dokumen?
                          </span>
                        ) : (
                          doc.uploaded_at && (
                            <span className="text-[10px] text-slate-500">
                              {formatDate(doc.uploaded_at)}
                            </span>
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

      {/* Retrieval Settings (Top-K) */}
      <div className="mt-4 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            Retrieval Top-K
          </span>
          <span className="text-[11px] font-semibold text-indigo-300">
            {topK} chunks
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[3, 5, 8, 10].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => onTopKChange(val)}
              className={`py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                topK === val
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-950/70 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {val}
            </button>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
          <span>Portfolio Project</span>
          <span className="font-semibold text-slate-300">Daniar Priambodo</span>
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
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 h-full">{sidebarContent}</aside>
        </div>
      )}
    </>
  );
}
