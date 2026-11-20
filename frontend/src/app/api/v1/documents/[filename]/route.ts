import { NextRequest, NextResponse } from "next/server";
import { getCurrentActor } from "@/lib/server/auth";
import { ensureSchema, getDb } from "@/lib/server/db";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename: rawFilename } = await context.params;
    const filename = decodeURIComponent(rawFilename);

    await ensureSchema();
    const actor = await getCurrentActor(req);

    if (actor.type !== "user") {
      return NextResponse.json(
        {
          detail:
            "Silakan masuk ke akun Anda terlebih dahulu untuk menghapus dokumen.",
        },
        { status: 401 }
      );
    }

    const sql = getDb();

    const deletedRows = await sql`
      DELETE FROM document_chunks
      WHERE filename = ${filename}
        AND user_id = ${actor.id}::uuid
      RETURNING id;
    `;

    await sql`
      DELETE FROM documents
      WHERE filename = ${filename}
        AND user_id = ${actor.id}::uuid;
    `;

    const deletedCount = deletedRows.length;
    if (deletedCount === 0) {
      return NextResponse.json(
        { detail: `Dokumen '${filename}' tidak ditemukan.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      filename,
      deleted_chunks: deletedCount,
      message: `Dokumen '${filename}' (${deletedCount} chunks) berhasil dihapus.`,
    });
  } catch (error: unknown) {
    console.error("Delete document error:", error);
    const detail =
      error instanceof Error ? error.message : "Gagal menghapus dokumen.";
    return NextResponse.json({ detail }, { status: 500 });
  }
}
