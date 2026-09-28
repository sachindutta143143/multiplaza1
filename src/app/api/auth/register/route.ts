import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { ensureDbReady } from "@/db";
import { ensureSeeded } from "@/db/seed";

export async function POST(req: NextRequest) {
  try {
    await ensureDbReady();
    await ensureSeeded();
    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();
    const rawUsername = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!name) {
      return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    }

    const username = rawUsername.replace(/[^a-z0-9._-]/g, "");
    if (!username || username.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters long (letters and numbers only)." },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters long." },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "This username is already taken. Please choose another username." },
        { status: 409 }
      );
    }

    const total = await db.select({ id: users.id }).from(users);
    const role = total.length === 0 ? "admin" : "staff";

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(users)
      .values({ username, passwordHash, name, role })
      .returning();

    const sessionUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    };

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
      ok: true,
      token,
      user: sessionUser,
      message: "Account created successfully!",
    });

    res.cookies.set("mp_session", token, cookieOptions);
    res.cookies.set("mp_token", token, { ...cookieOptions, httpOnly: false });
    return res;
  } catch (e) {
    console.error("Register error:", e);
    const msg = e instanceof Error ? e.message : "Failed to create account. Please try again.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
