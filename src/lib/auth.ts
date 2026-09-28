import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "mp_session";
export const TOKEN_STORAGE_KEY = "mp_token";
const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "multi-plaza-billing-secret-key-change-me-2026"
);

export interface SessionUser {
  id: number;
  username: string;
  name: string;
  role: string;
}

export async function signToken(user: SessionUser): Promise<string> {
  return new SignJWT({ username: user.username, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(SECRET);
}

export async function verifyToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!payload.sub) return null;
    return {
      id: Number(payload.sub),
      username: String(payload.username ?? ""),
      name: String(payload.name ?? "Admin"),
      role: String(payload.role ?? "admin"),
    };
  } catch {
    return null;
  }
}

/** Fallback default admin user for LAN devices where cookies/tokens may not be passed */
export async function getDefaultAdminUser(): Promise<SessionUser> {
  try {
    const [admin] = await db
      .select({ id: users.id, username: users.username, name: users.name, role: users.role })
      .from(users)
      .where(eq(users.username, "admin"))
      .limit(1);
    if (admin) return admin;

    const [first] = await db
      .select({ id: users.id, username: users.username, name: users.name, role: users.role })
      .from(users)
      .limit(1);
    if (first) return first;
  } catch {
    // ignore
  }
  return { id: 1, username: "admin", name: "Admin", role: "admin" };
}

async function sessionCookieOptions(maxAge?: number) {
  let isHttps = false;
  try {
    const h = await headers();
    const host = (h.get("host") ?? h.get("x-forwarded-host") ?? "localhost").toLowerCase();
    const proto = (h.get("x-forwarded-proto") ?? "").split(",")[0].trim();
    const isLocalHost =
      host.startsWith("localhost") ||
      host.startsWith("127.") ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      host.startsWith("172.") ||
      host.startsWith("0.0.0.0");
    isHttps = proto === "https" && !isLocalHost;
  } catch {
    isHttps = false;
  }

  return {
    httpOnly: true,
    sameSite: (isHttps ? "none" : "lax") as "none" | "lax",
    secure: isHttps,
    path: "/",
    ...(maxAge ? { maxAge } : { expires: new Date(0) }),
  };
}

export async function createSession(user: SessionUser): Promise<string> {
  const token = await signToken(user);
  try {
    const jar = await cookies();
    const opts = await sessionCookieOptions(60 * 60 * 24 * 365);
    jar.set(COOKIE_NAME, token, opts);
    jar.set("mp_token", token, { ...opts, httpOnly: false });
  } catch {
    // ignore
  }
  return token;
}

export async function destroySession(): Promise<void> {
  try {
    const jar = await cookies();
    const opts = await sessionCookieOptions();
    jar.set(COOKIE_NAME, "", opts);
    jar.set("mp_token", "", { ...opts, httpOnly: false });
  } catch {
    // ignore
  }
}

/**
 * Universal Session Resolver:
 * Resolves logged in user from:
 * 1. Authorization: Bearer <token>
 * 2. Cookie mp_session or mp_token
 * 3. URL query param ?access_token= or ?token=
 * 4. Automatic fallback to default Admin user so LAN mobile/desktop devices are NEVER blocked or 401'd!
 */
export async function getSessionFromRequest(req?: NextRequest | null): Promise<SessionUser> {
  if (req) {
    const authHeader = req.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const cookieToken = req.cookies.get(COOKIE_NAME)?.value ?? req.cookies.get("mp_token")?.value;
    const queryToken = req.nextUrl?.searchParams?.get("access_token") ?? req.nextUrl?.searchParams?.get("token");
    const token = bearer ?? cookieToken ?? queryToken;
    if (token) {
      const user = await verifyToken(token);
      if (user) return user;
    }
  }

  try {
    const jar = await cookies();
    const cookieToken = jar.get(COOKIE_NAME)?.value ?? jar.get("mp_token")?.value;
    let bearer: string | null = null;
    try {
      const h = await headers();
      const auth = h.get("authorization");
      bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    } catch {
      // ignore
    }
    const token = cookieToken ?? bearer;
    if (token) {
      const user = await verifyToken(token);
      if (user) return user;
    }
  } catch {
    // ignore
  }

  // Seamless LAN access: default to active Admin user
  return getDefaultAdminUser();
}

export async function getCurrentUser(req?: NextRequest | null): Promise<SessionUser> {
  return getSessionFromRequest(req);
}

export const SESSION_COOKIE = COOKIE_NAME;
