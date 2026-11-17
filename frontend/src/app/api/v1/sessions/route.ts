import { connection, NextResponse } from "next/server";
import { ensureSchema, getDb } from "@/lib/server/db";

export async function GET() {
  await connection();
  try {
    await ensureSchema();
    const sql = getDb();

    const rows = await sql`
      SELECT id, title, created_at, updated_at
      FROM chat_sessions
      ORDER BY updated_at DESC;
    `;

    return NextResponse.json(
      rows.map((r) => ({
        id: String(r.id),
        title: String(r.title),
        created_at: r.created_at ? new Date(String(r.created_at)).toISOString() : "",
        updated_at: r.updated_at ? new Date(String(r.updated_at)).toISOString() : "",
      }))
    );
  } catch (error: unknown) {
    console.error("List sessions error:", error);
    const detail =
      error instanceof Error ? error.message : "Gagal mengambil riwayat sesi.";
    return NextResponse.json({ detail }, { status: 500 });
  }
}
