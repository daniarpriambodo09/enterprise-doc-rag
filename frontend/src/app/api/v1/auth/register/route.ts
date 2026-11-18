import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureSchema, getDb } from "@/lib/server/db";
import { setAuthCookie, signAuthToken } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const guestId =
      typeof body?.guestId === "string" && /^guest_[a-zA-Z0-9_-]{8,80}$/.test(body.guestId.trim())
        ? body.guestId.trim()
        : null;

    if (!name || name.length < 2) {
      return NextResponse.json(
        { detail: "Nama minimal 2 karakter." },
        { status: 400 }
      );
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { detail: "Format email tidak valid." },
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
      SELECT id FROM users WHERE email = ${email} LIMIT 1;
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        { detail: "Email sudah terdaftar. Silakan masuk." },
        { status: 409 }
      );
    }

    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const role: "admin" | "user" =
      adminEmail && email === adminEmail ? "admin" : "user";

    const passwordHash = await bcrypt.hash(password, 10);

    const inserted = await sql`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (${name}, ${email}, ${passwordHash}, ${role})
      RETURNING id, name, email, role, created_at;
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
    console.error("Register error:", error);
    const detail =
      error instanceof Error ? error.message : "Gagal mendaftarkan akun.";
    return NextResponse.json({ detail }, { status: 500 });
  }
}
