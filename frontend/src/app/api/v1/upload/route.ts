import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";
import { ensureSchema, getDb } from "@/lib/server/db";
import { chunkPages } from "@/lib/server/chunker";
import { getBatchEmbeddings } from "@/lib/server/gemini";

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

    const arrayBuffer = await file.arrayBuffer();
    const { text } = await extractText(new Uint8Array(arrayBuffer), {
      mergePages: false,
    });
    const pages = text.map((pageText, idx) => ({
      pageNumber: idx + 1,
      text: pageText,
    }));

    const chunks = chunkPages(pages, file.name, 800, 150);
    if (chunks.length === 0) {
      return NextResponse.json(
        { detail: "Tidak ada teks yang bisa diekstrak dari PDF ini." },
        { status: 400 }
      );
    }

    // Generate embedding dalam batch (maks 50 per request untuk keamanan kuota/payload)
    const embeddings: number[][] = [];
    const batchSize = 50;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batchTexts = chunks.slice(i, i + batchSize).map((c) => c.content);
      const batchEmbeddings = await getBatchEmbeddings(batchTexts);
      embeddings.push(...batchEmbeddings);
    }

    await ensureSchema();
    const sql = getDb();

    // Anti-duplikasi: hapus chunk lama jika filename sudah ada
    const deletedRows = await sql`
      DELETE FROM document_chunks
      WHERE filename = ${file.name}
      RETURNING id;
    `;
    const overwrittenChunks = deletedRows.length;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const vecLiteral = JSON.stringify(embeddings[i]);
      await sql`
        INSERT INTO document_chunks (filename, page_number, chunk_index, content, embedding)
        VALUES (${chunk.filename}, ${chunk.page_number}, ${chunk.chunk_index}, ${chunk.content}, ${vecLiteral}::vector);
      `;
    }

    return NextResponse.json({
      status: "success",
      filename: file.name,
      total_chunks: chunks.length,
      overwritten_chunks: overwrittenChunks,
      message: `Dokumen berhasil diproses menjadi ${chunks.length} bagian dan disimpan ke database.`,
    });
  } catch (error: unknown) {
    console.error("Upload error:", error);
    const detail =
      error instanceof Error ? error.message : "Gagal memproses dokumen PDF.";
    return NextResponse.json({ detail }, { status: 500 });
  }
}
