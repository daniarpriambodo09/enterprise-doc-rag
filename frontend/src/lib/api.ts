const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

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

export async function uploadDocument(file: File) {
    const formData = new FormData();
    formData.append("file", file);

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
