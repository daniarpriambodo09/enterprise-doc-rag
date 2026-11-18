import { NextRequest, NextResponse } from "next/server";
import { getCurrentActor, hasValidAdminPasscode } from "@/lib/server/auth";
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
    const isAdminPass = hasValidAdminPasscode(req);
    const isAdmin =
      isAdminPass || (actor.type === "user" && actor.role === "admin");

    if (actor.type === "guest" && !isAdminPass) {
      return NextResponse.json(
        {
          detail:
            "Mode Demo Publik: Masuk ke akun Anda atau masukkan Admin Passcode untuk menghapus dokumen.",
        },
        { status: 401 }
      );
    }

    const sql = getDb();

    let deletedRows: Record<string, unknown>[] = [];
    if (isAdmin) {
      deletedRows = await sql`
        DELETE FROM document_chunks
        WHERE filename = ${filename}
        RETURNING id;
      `;
    } else {
      // User biasa hanya boleh menghapus dokumen pribadinya sendiri
      deletedRows = await sql`
        DELETE FROM document_chunks
        WHERE filename = ${filename}
          AND owner_id = ${actor.id}
          AND is_public = FALSE
        RETURNING id;
      `;
    }

    const deletedCount = deletedRows.length;
    if (deletedCount === 0) {
      const exists = await sql`
        SELECT id FROM document_chunks WHERE filename = ${filename} LIMIT 1;
      `;
      if (exists.length > 0) {
        return NextResponse.json(
          {
            detail:
              "Anda tidak memiliki izin untuk menghapus dokumen publik atau dokumen milik pengguna lain.",
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { detail: `Dokumen '${filename}' tidak ditemukan.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      filename,
      deleted_chunks: deletedCount,
      message: `Dokumen '${filename}' (${deletedCount} chunks) berhasil dihapus dari database.`,
    });
  } catch (error: unknown) {
    console.error("Delete document error:", error);
    const detail =
      error instanceof Error ? error.message : "Gagal menghapus dokumen.";
    return NextResponse.json({ detail }, { status: 500 });
  }
}
