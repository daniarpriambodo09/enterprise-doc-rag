import { SignJWT, jwtVerify } from "jose";
import { NextResponse } from "next/server";

export const AUTH_COOKIE_NAME = "auth_token";
const GUEST_COOKIE_NAME = "guest_id";

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.JWT_SECRET?.trim() ||
    "tanyadoc-dev-fallback-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

export interface AuthTokenPayload {
  userId: string;
  username: string;
  role: "admin" | "user";
}

export type Actor =
  | {
      type: "user";
      id: string;
      username: string;
      role: "admin" | "user";
    }
  | {
      type: "guest";
      id: string;
      role: "guest";
    };

function parseCookieHeader(cookieHeader: string | null, name: string): string {
  if (!cookieHeader) return "";
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return "";
}

export async function signAuthToken(payload: AuthTokenPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    username: payload.username,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifyAuthToken(
  token: string
): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (
      typeof payload.userId === "string" &&
      typeof payload.username === "string"
    ) {
      return {
        userId: payload.userId,
        username: payload.username,
        role: payload.role === "admin" ? "admin" : "user",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getCurrentActor(request: Request): Promise<Actor> {
  const cookieHeader = request.headers.get("cookie");
  const token = parseCookieHeader(cookieHeader, AUTH_COOKIE_NAME);

  if (token) {
    const verified = await verifyAuthToken(token);
    if (verified) {
      return {
        type: "user",
        id: verified.userId,
        username: verified.username,
        role: verified.role,
      };
    }
  }

  const headerGuestId = request.headers.get("x-guest-id")?.trim();
  const cookieGuestId = parseCookieHeader(cookieHeader, GUEST_COOKIE_NAME);
  const rawGuestId = headerGuestId || cookieGuestId;
  const safeGuestId =
    rawGuestId && /^guest_[a-zA-Z0-9_-]{8,80}$/.test(rawGuestId)
      ? rawGuestId
      : "guest_anonymous";

  return {
    type: "guest",
    id: safeGuestId,
    role: "guest",
  };
}

export function hasValidAdminPasscode(request: Request): boolean {
  const configuredPasscode = process.env.ADMIN_PASSCODE?.trim();
  if (!configuredPasscode) return false;
  const provided = request.headers.get("x-admin-passcode")?.trim();
  return Boolean(provided && provided === configuredPasscode);
}

export function isAdminPasscodeConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSCODE?.trim());
}

export function setAuthCookie(res: NextResponse, token: string): void {
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 hari
  });
}

export function clearAuthCookie(res: NextResponse): void {
  res.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}
