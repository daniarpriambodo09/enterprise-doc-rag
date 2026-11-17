import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { ensureSchema, getDb } from "@/lib/server/db";
import { getEmbedding } from "@/lib/server/gemini";

export const maxDuration = 60;

const SYSTEM_PROMPT = `Kamu adalah Asisten AI Analisis Dokumen Perusahaan yang akurat dan objektif.
Aturan wajib:
1. Jawab pertanyaan HANYA berdasarkan konteks dokumen yang diberikan di bawah ini.
2. Setiap klaim atau angka penting WAJIB menyertakan sitasi sumber dengan format [Nama File, Hal. X].
3. Jika jawaban tidak ditemukan secara eksplisit di dalam konteks, katakan dengan jujur: "Maaf, informasi tersebut tidak ditemukan dalam dokumen yang tersedia." Jangan mengarang atau berasumsi.
4. Jika konteks memuat tabel Markdown, baca baris dan kolomnya dengan teliti sebelum menjawab.
5. Gunakan Bahasa Indonesia yang formal, jelas, dan terstruktur.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    const topK = Math.min(20, Math.max(1, Number(body?.top_k) || 5));

    if (!query) {
      return NextResponse.json(
        { detail: "Pertanyaan tidak boleh kosong." },
        { status: 400 }
      );
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      throw new Error("GROQ_API_KEY environment variable is not configured.");
    }

    await ensureSchema();
    const sql = getDb();

    const queryEmbedding = await getEmbedding(query);
    const vecLiteral = JSON.stringify(queryEmbedding);

    // Hybrid Search: 70% Semantic Cosine Similarity + 30% PostgreSQL ts_rank Lexical Score
    const rows = await sql`
      WITH candidates AS (
        SELECT
          id,
          filename,
          page_number,
          content,
          (1 - (embedding <=> ${vecLiteral}::vector))::float AS vector_score,
          ts_rank(to_tsvector('simple', content), plainto_tsquery('simple', ${query}))::float AS lexical_score
        FROM document_chunks
        ORDER BY embedding <=> ${vecLiteral}::vector
        LIMIT 15
      ),
      scored AS (
        SELECT
          id,
          filename,
          page_number,
          content,
          vector_score,
          lexical_score,
          CASE
            WHEN MAX(lexical_score) OVER () > 0
              THEN (0.7 * vector_score) + (0.3 * (lexical_score / MAX(lexical_score) OVER ()))
            ELSE (0.7 * vector_score)
          END AS final_score
        FROM candidates
      )
      SELECT
        id,
        filename,
        page_number,
        content,
        ROUND(final_score::numeric, 4)::float AS score
      FROM scored
      ORDER BY final_score DESC
      LIMIT ${topK};
    `;

    if (rows.length === 0) {
      return NextResponse.json({
        answer:
          "Belum ada dokumen yang diunggah atau tidak ditemukan konteks yang relevan.",
        sources: [],
      });
    }

    const contextBlocks = rows.map(
      (chunk) =>
        `--- SUMBER: ${chunk.filename} (Halaman ${chunk.page_number}) ---\n${chunk.content}`
    );
    const fullContext = contextBlocks.join("\n\n");

    const userMessage = `Konteks Dokumen:\n${fullContext}\n\nPertanyaan Pengguna:\n${query}`;

    const groq = new Groq({ apiKey: groqApiKey });
    const completion = await groq.chat.completions.create({
      model: process.env.LLM_MODEL || "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.1,
      max_completion_tokens: 1500,
    });

    const answerText =
      completion.choices?.[0]?.message?.content ||
      "Maaf, tidak ada respons yang dihasilkan oleh model.";

    return NextResponse.json({
      answer: answerText,
      sources: rows.map((c) => ({
        filename: String(c.filename),
        page_number: Number(c.page_number),
        score: Number(c.score),
        snippet: String(c.content).slice(0, 250) + "...",
      })),
    });
  } catch (error: unknown) {
    console.error("Chat error:", error);
    const detail =
      error instanceof Error ? error.message : "Gagal mendapatkan respons dari AI.";
    return NextResponse.json({ detail }, { status: 500 });
  }
}
