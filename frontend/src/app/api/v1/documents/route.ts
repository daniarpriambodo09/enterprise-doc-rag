import { connection, NextRequest, NextResponse } from "next/server";
import { getCurrentActor, hasValidAdminPasscode } from "@/lib/server/auth";
import { ensureSchema, getDb } from "@/lib/server/db";

export async function GET(req: NextRequest) {
  await connection();
  try {
    await ensureSchema();
    const actor = await getCurrentActor(req);
    const isAdminPass = hasValidAdminPasscode(req);
    const isAdmin =
      isAdminPass || (actor.type === "user" && actor.role === "admin");

    const sql = getDb();

    const rows = await sql`
      SELECT
        filename,
        COUNT(*)::int AS total_chunks,
        MAX(created_at) AS uploaded_at,
        BOOL_OR(is_public) AS is_public,
        MAX(owner_id) AS owner_id
      FROM document_chunks
      WHERE is_public = TRUE OR owner_id = ${actor.id}
      GROUP BY filename, is_public, owner_id
      ORDER BY uploaded_at DESC;
    `;

    return NextResponse.json(
      rows.map((r) => {
        const isPublic = Boolean(r.is_public);
        const ownerId = String(r.owner_id ?? "public");
        const canDelete =
          isAdmin || (actor.type === "user" && !isPublic && ownerId === actor.id);

        return {
          filename: String(r.filename),
          total_chunks: Number(r.total_chunks),
          uploaded_at: r.uploaded_at
            ? new Date(String(r.uploaded_at)).toISOString()
            : "",
          is_public: isPublic,
          can_delete: canDelete,
        };
      })
    );
  } catch (error: unknown) {
    console.error("List documents error:", error);
    const detail =
      error instanceof Error ? error.message : "Gagal mengambil daftar dokumen.";
    return NextResponse.json({ detail }, { status: 500 });
  }
}
