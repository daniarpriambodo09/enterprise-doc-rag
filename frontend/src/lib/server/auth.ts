import { NextRequest, NextResponse } from "next/server";

export function verifyAdminPasscode(req: NextRequest): NextResponse | null {
  const configuredPasscode = process.env.ADMIN_PASSCODE?.trim();
  if (!configuredPasscode) {
    return null;
  }

  const providedPasscode = req.headers.get("x-admin-passcode")?.trim();
  if (!providedPasscode || providedPasscode !== configuredPasscode) {
    return NextResponse.json(
      {
        detail:
          "Mode Demo Publik: Masukkan Admin Passcode untuk mengunggah atau menghapus dokumen.",
      },
      { status: 401 }
    );
  }

  return null;
}
