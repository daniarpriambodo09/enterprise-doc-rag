import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPasscode } from "@/lib/server/auth";
import { ensureSchema, getDb } from "@/lib/server/db";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  const authError = verifyAdminPasscode(req);
  if (authError) return authError;

  try {
    const { filename: rawFilename } = await context.params;
    const filename = decodeURIComponent(rawFilename);

    await ensureSchema();
    const sql = getDb();

    const deletedRows = await sql`
      DELETE FROM document_chunks
      WHERE filename = ${filename}
      RETURNING id;
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
      message: `Dokumen '${filename}' (${deletedCount} chunks) berhasil dihapus dari database.`,
    });
  } catch (error: unknown) {
    console.error("Delete document error:", error);
    const detail =
      error instanceof Error ? error.message : "Gagal menghapus dokumen.";
    return NextResponse.json({ detail }, { status: 500 });
  }
}
