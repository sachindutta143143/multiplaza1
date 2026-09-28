import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";
import { ensureDbReady } from "@/db";

export async function POST(req: NextRequest) {
  try {
    await ensureDbReady();
    await ensureSeeded();
    const body = await req.json();
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (!user) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const sessionUser = { id: user.id, username: user.username, name: user.name, role: user.role };
    const token = await createSession(sessionUser);

    const host = (req.headers.get("host") ?? req.headers.get("x-forwarded-host") ?? "").toLowerCase();
    const proto = (req.headers.get("x-forwarded-proto") ?? "").split(",")[0].trim();
    const isLocalHost =
      host.startsWith("localhost") ||
      host.startsWith("127.") ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      host.startsWith("172.") ||
      host.startsWith("0.0.0.0");
    const isHttps = proto === "https" && !isLocalHost;

    const cookieOptions = {
      httpOnly: true,
      sameSite: (isHttps ? "none" : "lax") as "none" | "lax",
      secure: isHttps,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    };

    const res = NextResponse.json({
      token,
      user: sessionUser,
    });

    res.cookies.set("mp_session", token, cookieOptions);
    res.cookies.set("mp_token", token, { ...cookieOptions, httpOnly: false });
    return res;
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}
