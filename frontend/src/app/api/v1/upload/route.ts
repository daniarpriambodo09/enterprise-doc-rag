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
import { extractImageContentWithGroq } from "@/lib/server/groq";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let targetFilename = "";
    let isFirstBatch = true;
    let pages: ExtractedPdfPage[] = [];
    let ingestionMode: "multimodal" | "text-fallback" | "groq-vision" | "client-ocr" =
      "multimodal";

    if (contentType.includes("application/json")) {
      // Mode 0: Teks hasil Client-Side OCR (Tesseract.js)
      const body = await req.json();
      targetFilename =
        typeof body?.filename === "string" ? body.filename.trim() : "";
      const extractedText =
        typeof body?.extractedText === "string" ? body.extractedText.trim() : "";
      const pageNumber = Math.max(1, Number(body?.pageNumber) || 1);
      isFirstBatch = body?.isFirstBatch !== false && body?.isFirstBatch !== "false";

      if (!targetFilename) {
        return NextResponse.json(
          { detail: "Field 'filename' wajib disertakan." },
          { status: 400 }
        );
      }

      ingestionMode = "client-ocr";
      pages = extractedText ? [{ pageNumber, text: extractedText }] : [];
    } else {
      const formData = await req.formData();

      const imageBase64Raw = formData.get("imageBase64");
      const isImageMode =
        typeof imageBase64Raw === "string" && imageBase64Raw.length > 0;

      const isFirstBatchRaw = formData.get("isFirstBatch");
      isFirstBatch = String(isFirstBatchRaw ?? "true") !== "false";

      if (isImageMode) {
        // Mode 1: Fallback Gambar Halaman via Groq Vision
        const filenameRaw = formData.get("filename");
        targetFilename =
          typeof filenameRaw === "string" ? filenameRaw.trim() : "";
        if (!targetFilename) {
          return NextResponse.json(
            { detail: "Field 'filename' wajib disertakan untuk upload gambar." },
            { status: 400 }
          );
        }

        const pageNumberRaw = formData.get("pageNumber");
        const pageNumber = Math.max(
          1,
          Number.parseInt(String(pageNumberRaw ?? "1"), 10) || 1
        );

        try {
          const extractedText = await extractImageContentWithGroq(
            imageBase64Raw,
            pageNumber
          );
          ingestionMode = "groq-vision";
          pages = extractedText ? [{ pageNumber, text: extractedText }] : [];
        } catch (groqErr) {
          const msg =
            groqErr instanceof Error ? groqErr.message : String(groqErr);
          if (msg.includes("NO_GROQ_VISION_MODEL") || /404|model_not_found/i.test(msg)) {
            return NextResponse.json(
              { detail: "NO_GROQ_VISION_MODEL" },
              { status: 404 }
            );
          }
          throw groqErr;
        }
      } else {
        // Mode 2: Upload PDF (Gemini Vision + Fallback unpdf)
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

        targetFilename = file.name;

        const pageOffsetRaw = formData.get("pageOffset");
        const pageOffset = Math.max(
          0,
          Number.parseInt(String(pageOffsetRaw ?? "0"), 10) || 0
        );

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let multimodalError: unknown = null;

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

        // Cek apakah PDF kosong setelah fallback unpdf karena Gemini 503
        const preChunks = chunkPages(pages, targetFilename, 800, 150);
        if (
          preChunks.length === 0 &&
          multimodalError &&
          isVisionUnavailableError(multimodalError)
        ) {
          return NextResponse.json(
            { detail: "GEMINI_503_SCAN_PDF" },
            { status: 503 }
          );
        }
      }
    }

    const chunks = chunkPages(pages, targetFilename, 800, 150);
    if (chunks.length === 0) {
      return NextResponse.json(
        {
          detail:
            "Tidak ada teks atau konten visual yang bisa diekstrak dari dokumen ini.",
        },
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
        WHERE filename = ${targetFilename}
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
      ingestionMode === "client-ocr"
        ? "OCR Lokal (Tesseract)"
        : ingestionMode === "groq-vision"
        ? "Groq Vision AI"
        : ingestionMode === "multimodal"
        ? "Multimodal AI (Teks & Visual)"
        : "Ekstraksi Teks (Fallback)";

    return NextResponse.json({
      status: "success",
      filename: targetFilename,
      total_chunks: chunks.length,
      overwritten_chunks: overwrittenChunks,
      ingestion_mode: ingestionMode,
      message: `${targetFilename} berhasil diproses (${chunks.length} chunks) via ${modeLabel}.`,
    });
  } catch (error: unknown) {
    console.error("Upload error:", error);
    const detail =
      error instanceof Error ? error.message : "Gagal memproses dokumen PDF.";
    return NextResponse.json({ detail }, { status: 500 });
  }
}
