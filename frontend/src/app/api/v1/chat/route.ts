import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { ensureSchema, getDb } from "@/lib/server/db";
import { getEmbedding } from "@/lib/server/gemini";

export const maxDuration = 60;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SYSTEM_PROMPT = `Kamu adalah Asisten AI Analisis Dokumen Perusahaan yang akurat dan objektif.
Aturan wajib:
1. Jawab pertanyaan HANYA berdasarkan konteks dokumen yang diberikan di bawah ini (serta riwayat percakapan untuk memahami rujukan pertanyaan lanjutan).
2. Setiap klaim atau angka penting WAJIB menyertakan sitasi sumber dengan format [Nama File, Hal. X].
3. Jika jawaban tidak ditemukan secara eksplisit di dalam konteks, katakan dengan jujur: "Maaf, informasi tersebut tidak ditemukan dalam dokumen yang tersedia." Jangan mengarang atau berasumsi.
4. Jika konteks memuat tabel Markdown atau deskripsi visual [Analisis Visual/Gambar Halaman X], baca dan manfaatkan informasinya dengan teliti sebelum menjawab.
5. Gunakan Bahasa Indonesia yang formal, jelas, dan terstruktur.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    const topK = Math.min(20, Math.max(1, Number(body?.top_k) || 5));
    const requestedSessionId =
      typeof body?.session_id === "string" && UUID_REGEX.test(body.session_id)
        ? body.session_id
        : null;

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

    // 1. Pastikan sesi percakapan tersedia atau buat sesi baru
    let activeSessionId: string | null = null;
    if (requestedSessionId) {
      const existing = await sql`
        SELECT id FROM chat_sessions WHERE id = ${requestedSessionId}::uuid;
      `;
      if (existing.length > 0) {
        activeSessionId = String(existing[0].id);
      }
    }

    if (!activeSessionId) {
      const cleanTitle =
        query.length > 45 ? `${query.slice(0, 45).trimEnd()}...` : query;
      const insertedSession = await sql`
        INSERT INTO chat_sessions (title)
        VALUES (${cleanTitle})
        RETURNING id;
      `;
      activeSessionId = String(insertedSession[0].id);
    }

    // 2. Ambil 6 pesan terakhir untuk konteks percakapan lanjutan (follow-up questions)
    const historyRows = await sql`
      SELECT role, content
      FROM chat_messages
      WHERE session_id = ${activeSessionId}::uuid
      ORDER BY created_at DESC
      LIMIT 6;
    `;
    const conversationHistory = historyRows
      .reverse()
      .map((m) => ({
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: String(m.content),
      }));

    // 3. Simpan pesan user ke database
    await sql`
      INSERT INTO chat_messages (session_id, role, content, sources)
      VALUES (${activeSessionId}::uuid, 'user', ${query}, NULL);
    `;

    // 4. Hybrid Search (70% Semantic Cosine Similarity + 30% PostgreSQL ts_rank Lexical Score)
    const queryEmbedding = await getEmbedding(query);
    const vecLiteral = JSON.stringify(queryEmbedding);

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

    let answerText: string;
    let sources: {
      filename: string;
      page_number: number;
      score: number;
      snippet: string;
    }[] = [];

    if (rows.length === 0) {
      answerText =
        "Belum ada dokumen yang diunggah atau tidak ditemukan konteks yang relevan.";
    } else {
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
          ...conversationHistory,
          { role: "user", content: userMessage },
        ],
        temperature: 0.1,
        max_completion_tokens: 1500,
      });

      answerText =
        completion.choices?.[0]?.message?.content ||
        "Maaf, tidak ada respons yang dihasilkan oleh model.";

      sources = rows.map((c) => ({
        filename: String(c.filename),
        page_number: Number(c.page_number),
        score: Number(c.score),
        snippet: String(c.content).slice(0, 250) + "...",
      }));
    }

    // 5. Simpan balasan assistant beserta sources & perbarui updated_at sesi
    const sourcesJson = JSON.stringify(sources);
    await sql`
      INSERT INTO chat_messages (session_id, role, content, sources)
      VALUES (${activeSessionId}::uuid, 'assistant', ${answerText}, ${sourcesJson}::jsonb);
    `;

    await sql`
      UPDATE chat_sessions
      SET updated_at = NOW()
      WHERE id = ${activeSessionId}::uuid;
    `;

    return NextResponse.json({
      session_id: activeSessionId,
      answer: answerText,
      sources,
    });
  } catch (error: unknown) {
    console.error("Chat error:", error);
    const detail =
      error instanceof Error ? error.message : "Gagal mendapatkan respons dari AI.";
    return NextResponse.json({ detail }, { status: 500 });
  }
}
