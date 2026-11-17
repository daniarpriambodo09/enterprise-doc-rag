import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getDb } from "@/lib/server/db";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { detail: "Format ID sesi tidak valid." },
        { status: 400 }
      );
    }

    await ensureSchema();
    const sql = getDb();

    const sessionRows = await sql`
      SELECT id, title, created_at, updated_at
      FROM chat_sessions
      WHERE id = ${id}::uuid;
    `;

    if (sessionRows.length === 0) {
      return NextResponse.json(
        { detail: "Sesi percakapan tidak ditemukan." },
        { status: 404 }
      );
    }

    const messageRows = await sql`
      SELECT id, role, content, sources, created_at
      FROM chat_messages
      WHERE session_id = ${id}::uuid
      ORDER BY created_at ASC;
    `;

    const s = sessionRows[0];
    return NextResponse.json({
      session: {
        id: String(s.id),
        title: String(s.title),
        created_at: s.created_at ? new Date(String(s.created_at)).toISOString() : "",
        updated_at: s.updated_at ? new Date(String(s.updated_at)).toISOString() : "",
      },
      messages: messageRows.map((m) => ({
        id: String(m.id),
        role: m.role === "user" ? "user" : "assistant",
        content: String(m.content),
        sources: Array.isArray(m.sources) ? m.sources : [],
        created_at: m.created_at ? new Date(String(m.created_at)).toISOString() : "",
      })),
    });
  } catch (error: unknown) {
    console.error("Get session detail error:", error);
    const detail =
      error instanceof Error ? error.message : "Gagal memuat detail sesi.";
    return NextResponse.json({ detail }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { detail: "Format ID sesi tidak valid." },
        { status: 400 }
      );
    }

    await ensureSchema();
    const sql = getDb();

    const deletedRows = await sql`
      DELETE FROM chat_sessions
      WHERE id = ${id}::uuid
      RETURNING id;
    `;

    if (deletedRows.length === 0) {
      return NextResponse.json(
        { detail: "Sesi percakapan tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      id,
      message: "Sesi percakapan berhasil dihapus.",
    });
  } catch (error: unknown) {
    console.error("Delete session error:", error);
    const detail =
      error instanceof Error ? error.message : "Gagal menghapus sesi percakapan.";
    return NextResponse.json({ detail }, { status: 500 });
  }
}
