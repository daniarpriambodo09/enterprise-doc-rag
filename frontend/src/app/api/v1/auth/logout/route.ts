import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/server/auth";

export async function POST() {
  const res = NextResponse.json({ status: "success", message: "Berhasil keluar." });
  clearAuthCookie(res);
  return res;
}
