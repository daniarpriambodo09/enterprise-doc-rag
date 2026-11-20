import { connection, NextRequest, NextResponse } from "next/server";
import { getCurrentActor } from "@/lib/server/auth";
import { ensureSchema, getDb } from "@/lib/server/db";

export async function GET(req: NextRequest) {
  await connection();
  try {
    await ensureSchema();
    const actor = await getCurrentActor(req);

    // Isolasi ketat per user: pengunjung yang belum login tidak melihat dokumen siapa pun
    if (actor.type !== "user") {
      return NextResponse.json([]);
    }

    const sql = getDb();

    const rows = await sql`
      SELECT
        filename,
        COUNT(*)::int AS total_chunks,
        MAX(created_at) AS uploaded_at
      FROM document_chunks
      WHERE user_id = ${actor.id}::uuid
      GROUP BY filename
      ORDER BY uploaded_at DESC;
    `;

    return NextResponse.json(
      rows.map((r) => ({
        filename: String(r.filename),
        total_chunks: Number(r.total_chunks),
        uploaded_at: r.uploaded_at
          ? new Date(String(r.uploaded_at)).toISOString()
          : "",
        can_delete: true,
      }))
    );
  } catch (error: unknown) {
    console.error("List documents error:", error);
    const detail =
      error instanceof Error ? error.message : "Gagal mengambil daftar dokumen.";
    return NextResponse.json({ detail }, { status: 500 });
  }
}
