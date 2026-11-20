import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureSchema, getDb } from "@/lib/server/db";
import { setAuthCookie, signAuthToken } from "@/lib/server/auth";

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,30}$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawUsername =
      typeof body?.username === "string" ? body.username.trim() : "";
    const username = rawUsername.toLowerCase();
    const password = typeof body?.password === "string" ? body.password : "";
    const guestId =
      typeof body?.guestId === "string" &&
      /^guest_[a-zA-Z0-9_-]{8,80}$/.test(body.guestId.trim())
        ? body.guestId.trim()
        : null;

    if (!USERNAME_REGEX.test(username)) {
      return NextResponse.json(
        {
          detail:
            "Username harus 3 sampai 30 karakter (huruf, angka, titik, garis bawah, atau strip).",
        },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { detail: "Password minimal 6 karakter." },
        { status: 400 }
      );
    }

    await ensureSchema();
    const sql = getDb();

    const existing = await sql`
      SELECT id FROM users WHERE LOWER(username) = ${username} LIMIT 1;
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        { detail: "Username sudah terdaftar. Silakan gunakan username lain atau masuk." },
        { status: 409 }
      );
    }

    const adminUsername = process.env.ADMIN_USERNAME?.trim().toLowerCase();
    const role: "admin" | "user" =
      adminUsername && username === adminUsername ? "admin" : "user";

    const passwordHash = await bcrypt.hash(password, 10);

    const inserted = await sql`
      INSERT INTO users (username, name, password_hash, role)
      VALUES (${username}, ${rawUsername}, ${passwordHash}, ${role})
      RETURNING id, username, role, created_at;
    `;

    const userRow = inserted[0];
    const userId = String(userRow.id);

    // Migrasikan riwayat chat dari guestId jika ada
    if (guestId) {
      await sql`
        UPDATE chat_sessions
        SET owner_id = ${userId}
        WHERE owner_id = ${guestId};
      `;
    }

    const token = await signAuthToken({
      userId,
      username: String(userRow.username),
      role,
    });

    const res = NextResponse.json({
      user: {
        id: userId,
        username: String(userRow.username),
        role,
      },
    });
    setAuthCookie(res, token);
    return res;
  } catch (error: unknown) {
    console.error("Register error:", error);
    const detail =
      error instanceof Error ? error.message : "Gagal mendaftarkan akun.";
    return NextResponse.json({ detail }, { status: 500 });
  }
}
