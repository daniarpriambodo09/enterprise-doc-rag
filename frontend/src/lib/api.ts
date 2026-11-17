import { PDFDocument } from "pdf-lib";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
const MAX_UPLOAD_BATCH_BYTES = 2.5 * 1024 * 1024; // 2.5 MB per batch agar payload Gemini Vision ringan & di bawah limit 4.5 MB Vercel

export interface SourceCitation {
    filename: string;
    page_number: number;
    score: number;
    snippet: string;
}

export interface ChatResponse {
    session_id?: string;
    answer: string;
    sources: SourceCitation[];
}

export interface DocumentItem {
    filename: string;
    total_chunks: number;
    uploaded_at: string;
}

export interface ChatSessionItem {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

export interface SessionMessageItem {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: SourceCitation[];
    created_at: string;
}

export interface SessionDetailResponse {
    session: ChatSessionItem;
    messages: SessionMessageItem[];
}

export async function fetchDocuments(): Promise<DocumentItem[]> {
    const res = await fetch(`${API_BASE_URL}/documents`);
    if (!res.ok) throw new Error("Gagal mengambil daftar dokumen");
    return res.json();
}

async function postUploadBatch(
    filePayload: Blob,
    filename: string,
    pageOffset: number,
    isFirstBatch: boolean
) {
    const formData = new FormData();
    formData.append("file", filePayload, filename);
    formData.append("pageOffset", String(pageOffset));
    formData.append("isFirstBatch", isFirstBatch ? "true" : "false");

    const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Gagal mengunggah file" }));
        throw new Error(err.detail || "Gagal mengunggah file");
    }
    return res.json();
}

async function createSubPdfBytes(
    sourceDoc: PDFDocument,
    startIdx: number,
    endIdx: number
): Promise<Uint8Array> {
    const subDoc = await PDFDocument.create();
    const pageIndices = Array.from(
        { length: endIdx - startIdx },
        (_, i) => startIdx + i
    );
    const copiedPages = await subDoc.copyPages(sourceDoc, pageIndices);
    for (const page of copiedPages) {
        subDoc.addPage(page);
    }
    return subDoc.save();
}

export async function uploadDocument(
    file: File,
    onProgress?: (statusText: string) => void
) {
    if (file.size <= MAX_UPLOAD_BATCH_BYTES) {
        return postUploadBatch(file, file.name, 0, true);
    }

    onProgress?.("Memecah PDF berukuran besar ke dalam beberapa batch...");
    const sourceBuffer = await file.arrayBuffer();
    const sourceDoc = await PDFDocument.load(sourceBuffer);
    const totalPages = sourceDoc.getPageCount();

    let totalChunks = 0;
    let lastIngestionMode: string = "multimodal";
    let isFirst = true;
    let cursor = 0;

    while (cursor < totalPages) {
        let batchEnd = Math.min(cursor + 2, totalPages);
        let subBytes = await createSubPdfBytes(sourceDoc, cursor, batchEnd);

        // Jika 2 halaman masih > 2.5 MB, turunkan ke 1 halaman per batch
        if (subBytes.byteLength > MAX_UPLOAD_BATCH_BYTES && batchEnd - cursor > 1) {
            batchEnd = cursor + 1;
            subBytes = await createSubPdfBytes(sourceDoc, cursor, batchEnd);
        }

        if (subBytes.byteLength > 4.4 * 1024 * 1024) {
            throw new Error(
                `Halaman ${cursor + 1} terlalu besar (${(subBytes.byteLength / (1024 * 1024)).toFixed(1)} MB) untuk batas request 4.5 MB Vercel.`
            );
        }

        onProgress?.(`Memproses halaman ${cursor + 1}–${batchEnd} dari ${totalPages}...`);
        const batchArrayBuffer = subBytes.slice().buffer;
        const batchBlob = new Blob([batchArrayBuffer], { type: "application/pdf" });
        const res = await postUploadBatch(batchBlob, file.name, cursor, isFirst);

        totalChunks += Number(res.total_chunks) || 0;
        if (res.ingestion_mode) {
            lastIngestionMode = res.ingestion_mode;
        }
        isFirst = false;
        cursor = batchEnd;
    }

    return {
        status: "success",
        filename: file.name,
        total_chunks: totalChunks,
        ingestion_mode: lastIngestionMode,
        message: `${file.name} berhasil diproses (${totalChunks} chunks dari ${totalPages} halaman).`,
    };
}

export async function sendChatQuery(
    query: string,
    topK: number = 5,
    sessionId?: string | null
): Promise<ChatResponse> {
    const res = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            query,
            top_k: topK,
            ...(sessionId ? { session_id: sessionId } : {}),
        }),
    });

    if (!res.ok) throw new Error("Gagal mendapatkan respons dari AI");
    return res.json();
}

export interface DeleteDocumentResponse {
    status: string;
    filename: string;
    deleted_chunks: number;
    message: string;
}

export async function deleteDocument(filename: string): Promise<DeleteDocumentResponse> {
    const res = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(filename)}`, {
        method: "DELETE",
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Gagal menghapus dokumen" }));
        throw new Error(err.detail || "Gagal menghapus dokumen");
    }
    return res.json();
}

export async function fetchSessions(): Promise<ChatSessionItem[]> {
    const res = await fetch(`${API_BASE_URL}/sessions`);
    if (!res.ok) throw new Error("Gagal mengambil riwayat percakapan");
    return res.json();
}

export async function fetchSessionDetail(sessionId: string): Promise<SessionDetailResponse> {
    const res = await fetch(`${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}`);
    if (!res.ok) throw new Error("Gagal memuat detail sesi percakapan");
    return res.json();
}

export async function deleteSession(sessionId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Gagal menghapus sesi percakapan");
}
