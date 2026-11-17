import { PDFDocument } from "pdf-lib";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
const MAX_UPLOAD_BATCH_BYTES = 2 * 1024 * 1024; // 2 MB: PDF > 2 MB dipecah 1 halaman/batch agar cepat & bebas timeout Vercel

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
        let detail = `Gagal mengunggah file (HTTP ${res.status})`;
        try {
            const err = await res.json();
            if (err?.detail) detail = err.detail;
        } catch {
            if (res.status === 504) {
                detail = "Server timeout saat memproses PDF. Silakan coba lagi atau gunakan file yang lebih ringkas.";
            }
        }
        throw new Error(detail);
    }
    return res.json();
}

async function postUploadImagePage(
    imageBase64: string,
    filename: string,
    pageNumber: number,
    isFirstBatch: boolean
) {
    const formData = new FormData();
    formData.append("imageBase64", imageBase64);
    formData.append("filename", filename);
    formData.append("pageNumber", String(pageNumber));
    formData.append("isFirstBatch", isFirstBatch ? "true" : "false");

    const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        let detail = `Gagal memproses gambar halaman ${pageNumber} (HTTP ${res.status})`;
        try {
            const err = await res.json();
            if (err?.detail) detail = err.detail;
        } catch {
            // fallback
        }
        throw new Error(detail);
    }
    return res.json();
}

async function postUploadExtractedText(
    filename: string,
    pageNumber: number,
    extractedText: string,
    isFirstBatch: boolean
) {
    const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            filename,
            pageNumber,
            extractedText,
            isFirstBatch,
        }),
    });

    if (!res.ok) {
        let detail = `Gagal menyimpan hasil OCR halaman ${pageNumber} (HTTP ${res.status})`;
        try {
            const err = await res.json();
            if (err?.detail) detail = err.detail;
        } catch {
            // fallback
        }
        throw new Error(detail);
    }
    return res.json();
}

async function processRenderedPagesWithFallback(
    renderedPages: { pageIndex: number; base64: string }[],
    filename: string,
    pageOffset: number,
    totalPages: number,
    isFirstBatchStart: boolean,
    onProgress?: (statusText: string) => void
): Promise<{ totalChunks: number; ingestionMode: string }> {
    let totalChunks = 0;
    let ingestionMode = "groq-vision";
    let groqVisionAvailable = true;

    for (let i = 0; i < renderedPages.length; i++) {
        const pageNum = pageOffset + i + 1;
        const isFirst = isFirstBatchStart && i === 0;

        if (groqVisionAvailable) {
            onProgress?.(
                `Gemini sibuk, mengalihkan analisis visual ke Groq Vision (Halaman ${pageNum}/${totalPages})...`
            );
            try {
                const res = await postUploadImagePage(
                    renderedPages[i].base64,
                    filename,
                    pageNum,
                    isFirst
                );
                totalChunks += Number(res.total_chunks) || 0;
                continue;
            } catch (groqErr) {
                const msg = groqErr instanceof Error ? groqErr.message : "";
                const shouldFallbackToOcr =
                    msg.includes("NO_GROQ_VISION_MODEL") ||
                    /\b(404|503|429)\b|model_not_found/i.test(msg);

                if (!shouldFallbackToOcr) {
                    throw groqErr;
                }
                groqVisionAvailable = false;
            }
        }

        // Jaring pengaman terakhir: Client-Side OCR (Tesseract.js) di browser
        onProgress?.(
            `Membaca teks scan dengan OCR lokal (Halaman ${pageNum}/${totalPages})...`
        );
        const Tesseract = await import("tesseract.js");
        const { data } = await Tesseract.recognize(
            renderedPages[i].base64,
            "ind+eng"
        );
        const ocrText = (data?.text || "").trim();
        if (!ocrText) {
            continue;
        }

        const res = await postUploadExtractedText(
            filename,
            pageNum,
            ocrText,
            isFirst
        );
        totalChunks += Number(res.total_chunks) || 0;
        ingestionMode = "client-ocr";
    }

    if (totalChunks === 0) {
        throw new Error(
            "Tidak ada teks yang berhasil diekstrak dari gambar PDF melalui Vision API maupun OCR lokal."
        );
    }

    return { totalChunks, ingestionMode };
}

async function renderPdfBytesToJpeg(
    pdfBuffer: ArrayBuffer
): Promise<{ pageIndex: number; base64: string }[]> {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
    const pdf = await loadingTask.promise;
    const rendered: { pageIndex: number; base64: string }[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("Canvas 2D context tidak tersedia di browser.");
        }

        await page.render({ canvas, canvasContext: context, viewport }).promise;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        rendered.push({ pageIndex: i - 1, base64: dataUrl });
    }

    return rendered;
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
        try {
            return await postUploadBatch(file, file.name, 0, true);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "";
            if (msg !== "GEMINI_503_SCAN_PDF") throw err;

            // Auto-Fallback ke Client-Side PDF-to-Image + Groq Vision / Tesseract OCR
            const buffer = await file.arrayBuffer();
            const renderedPages = await renderPdfBytesToJpeg(buffer);
            const fallbackRes = await processRenderedPagesWithFallback(
                renderedPages,
                file.name,
                0,
                renderedPages.length,
                true,
                onProgress
            );

            return {
                status: "success",
                filename: file.name,
                total_chunks: fallbackRes.totalChunks,
                ingestion_mode: fallbackRes.ingestionMode,
                message: `${file.name} berhasil diproses (${fallbackRes.totalChunks} chunks).`,
            };
        }
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
        const batchEnd = cursor + 1;
        const subBytes = await createSubPdfBytes(sourceDoc, cursor, batchEnd);

        if (subBytes.byteLength > 4.4 * 1024 * 1024) {
            throw new Error(
                `Halaman ${cursor + 1} terlalu besar (${(subBytes.byteLength / (1024 * 1024)).toFixed(1)} MB) untuk batas request 4.5 MB Vercel.`
            );
        }

        onProgress?.(`Memproses halaman ${cursor + 1} dari ${totalPages}...`);
        const batchArrayBuffer = subBytes.slice().buffer;
        const batchBlob = new Blob([batchArrayBuffer], { type: "application/pdf" });

        try {
            const res = await postUploadBatch(batchBlob, file.name, cursor, isFirst);
            totalChunks += Number(res.total_chunks) || 0;
            if (res.ingestion_mode) {
                lastIngestionMode = res.ingestion_mode;
            }
            isFirst = false;
        } catch (err) {
            const msg = err instanceof Error ? err.message : "";
            if (msg !== "GEMINI_503_SCAN_PDF") throw err;

            const renderedPages = await renderPdfBytesToJpeg(batchArrayBuffer);
            const fallbackRes = await processRenderedPagesWithFallback(
                renderedPages,
                file.name,
                cursor,
                totalPages,
                isFirst,
                onProgress
            );
            totalChunks += fallbackRes.totalChunks;
            lastIngestionMode = fallbackRes.ingestionMode;
            isFirst = false;
        }

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
