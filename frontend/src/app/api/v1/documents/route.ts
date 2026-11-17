import { connection, NextResponse } from "next/server";
import { ensureSchema, getDb } from "@/lib/server/db";

export async function GET() {
  await connection();
  try {
    await ensureSchema();
    const sql = getDb();

    const rows = await sql`
      SELECT
        filename,
        COUNT(*)::int AS total_chunks,
        MAX(created_at) AS uploaded_at
      FROM document_chunks
      GROUP BY filename
      ORDER BY uploaded_at DESC;
    `;

    return NextResponse.json(
      rows.map((r) => ({
        filename: String(r.filename),
        total_chunks: Number(r.total_chunks),
        uploaded_at: r.uploaded_at ? new Date(String(r.uploaded_at)).toISOString() : "",
      }))
    );
  } catch (error: unknown) {
    console.error("List documents error:", error);
    const detail =
      error instanceof Error ? error.message : "Gagal mengambil daftar dokumen.";
    return NextResponse.json({ detail }, { status: 500 });
  }
}
