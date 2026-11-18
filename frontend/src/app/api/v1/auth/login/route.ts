import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureSchema, getDb } from "@/lib/server/db";
import { setAuthCookie, signAuthToken } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const guestId =
      typeof body?.guestId === "string" && /^guest_[a-zA-Z0-9_-]{8,80}$/.test(body.guestId.trim())
        ? body.guestId.trim()
        : null;

    if (!email || !password) {
      return NextResponse.json(
        { detail: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    await ensureSchema();
    const sql = getDb();

    const rows = await sql`
      SELECT id, name, email, password_hash, role
      FROM users
      WHERE email = ${email}
      LIMIT 1;
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { detail: "Email atau password salah." },
        { status: 401 }
      );
    }

    const userRow = rows[0];
    const isMatch = await bcrypt.compare(password, String(userRow.password_hash));
    if (!isMatch) {
      return NextResponse.json(
        { detail: "Email atau password salah." },
        { status: 401 }
      );
    }

    const userId = String(userRow.id);
    const role: "admin" | "user" = userRow.role === "admin" ? "admin" : "user";

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
      email: String(userRow.email),
      name: String(userRow.name),
      role,
    });

    const res = NextResponse.json({
      user: {
        id: userId,
        name: String(userRow.name),
        email: String(userRow.email),
        role,
      },
    });
    setAuthCookie(res, token);
    return res;
  } catch (error: unknown) {
    console.error("Login error:", error);
    const detail = error instanceof Error ? error.message : "Gagal masuk.";
    return NextResponse.json({ detail }, { status: 500 });
  }
}
