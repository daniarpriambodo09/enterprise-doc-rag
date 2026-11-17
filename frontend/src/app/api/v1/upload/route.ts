import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";
import { ensureSchema, getDb } from "@/lib/server/db";
import { chunkPages } from "@/lib/server/chunker";
import {
  extractMultimodalPdfContent,
  getBatchEmbeddings,
  isVisionUnavailableError,
  type ExtractedPdfPage,
} from "@/lib/server/gemini";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { detail: "File PDF wajib disertakan." },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { detail: "Saat ini hanya mendukung file PDF." },
        { status: 400 }
      );
    }

    const pageOffsetRaw = formData.get("pageOffset");
    const pageOffset = Math.max(
      0,
      Number.parseInt(String(pageOffsetRaw ?? "0"), 10) || 0
    );
    const isFirstBatchRaw = formData.get("isFirstBatch");
    const isFirstBatch = String(isFirstBatchRaw ?? "true") !== "false";

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let pages: ExtractedPdfPage[] = [];
    let ingestionMode: "multimodal" | "text-fallback" = "multimodal";
    let multimodalError: unknown = null;

    // Utama: Ekstraksi Multimodal (Teks + Gambar/Grafik/Diagram/Tabel) via Gemini Vision
    try {
      pages = await extractMultimodalPdfContent(buffer);
    } catch (err) {
      multimodalError = err;
      console.warn(
        "Multimodal PDF extraction failed or exceeded limit, falling back to unpdf:",
        err
      );
      ingestionMode = "text-fallback";
      const { text } = await extractText(new Uint8Array(arrayBuffer), {
        mergePages: false,
      });
      pages = text.map((pageText, idx) => ({
        pageNumber: idx + 1,
        text: pageText,
      }));
    }

    if (pageOffset > 0) {
      pages = pages.map((p) => ({
        ...p,
        pageNumber: p.pageNumber + pageOffset,
      }));
    }

    const chunks = chunkPages(pages, file.name, 800, 150);
    if (chunks.length === 0) {
      if (multimodalError && isVisionUnavailableError(multimodalError)) {
        return NextResponse.json(
          {
            detail:
              "Server Gemini Vision sedang sibuk (503) dan PDF ini berupa hasil scan gambar tanpa teks. Silakan coba unggah kembali beberapa saat lagi.",
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { detail: "Tidak ada teks atau konten visual yang bisa diekstrak dari PDF ini." },
        { status: 400 }
      );
    }

    // Generate embedding dalam batch (maks 50 per request)
    const embeddings: number[][] = [];
    const batchSize = 50;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batchTexts = chunks.slice(i, i + batchSize).map((c) => c.content);
      const batchEmbeddings = await getBatchEmbeddings(batchTexts);
      embeddings.push(...batchEmbeddings);
    }

    await ensureSchema();
    const sql = getDb();

    // Anti-duplikasi: hanya hapus chunk lama pada batch pertama
    let overwrittenChunks = 0;
    if (isFirstBatch) {
      const deletedRows = await sql`
        DELETE FROM document_chunks
        WHERE filename = ${file.name}
        RETURNING id;
      `;
      overwrittenChunks = deletedRows.length;
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const vecLiteral = JSON.stringify(embeddings[i]);
      await sql`
        INSERT INTO document_chunks (filename, page_number, chunk_index, content, embedding)
        VALUES (${chunk.filename}, ${chunk.page_number}, ${chunk.chunk_index}, ${chunk.content}, ${vecLiteral}::vector);
      `;
    }

    const modeLabel =
      ingestionMode === "multimodal"
        ? "Multimodal AI (Teks & Visual)"
        : "Ekstraksi Teks (Fallback)";

    return NextResponse.json({
      status: "success",
      filename: file.name,
      total_chunks: chunks.length,
      overwritten_chunks: overwrittenChunks,
      ingestion_mode: ingestionMode,
      message: `${file.name} berhasil diproses (${chunks.length} chunks) via ${modeLabel}.`,
    });
  } catch (error: unknown) {
    console.error("Upload error:", error);
    const detail =
      error instanceof Error ? error.message : "Gagal memproses dokumen PDF.";
    return NextResponse.json({ detail }, { status: 500 });
  }
}
