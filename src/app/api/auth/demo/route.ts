import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { signToken } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";
import { ensureDbReady } from "@/db";

function getCookieOptions(req: NextRequest) {
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

  return {
    httpOnly: true,
    sameSite: (isHttps ? "none" : "lax") as "none" | "lax",
    secure: isHttps,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

async function getAdminToken() {
  await ensureDbReady();
  await ensureSeeded();

  const [admin] = await db
    .select()
    .from(users)
    .where(eq(users.username, "admin"))
    .limit(1);

  if (!admin) {
    throw new Error("Demo admin user not found");
  }

  const sessionUser = {
    id: admin.id,
    username: admin.username,
    name: admin.name,
    role: admin.role,
  };

  const token = await signToken(sessionUser);
  return { admin: sessionUser, token };
}

// Browser direct link navigation (e.g. <a href="/api/auth/demo">)
export async function GET(req: NextRequest) {
  try {
    const { token } = await getAdminToken();
    const cookieOptions = getCookieOptions(req);
    // Append token to redirect URL so mobile phone immediately captures it into localStorage!
    const destination = `/dashboard?token=${encodeURIComponent(token)}`;

    const res = new NextResponse(null, {
      status: 302,
      headers: {
        Location: destination,
        "Access-Control-Allow-Origin": "*",
      },
    });

    res.cookies.set("mp_session", token, cookieOptions);
    res.cookies.set("mp_token", token, { ...cookieOptions, httpOnly: false });
    return res;
  } catch (e) {
    console.error("Demo GET error:", e);
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

// AJAX / Fetch call from JavaScript button
export async function POST(req: NextRequest) {
  try {
    const { admin, token } = await getAdminToken();
    const cookieOptions = getCookieOptions(req);

    const res = NextResponse.json({
      ok: true,
      token,
      user: admin,
      message: "Demo session created successfully",
    });

    res.cookies.set("mp_session", token, cookieOptions);
    res.cookies.set("mp_token", token, { ...cookieOptions, httpOnly: false });
    return res;
  } catch (e) {
    console.error("Demo POST error:", e);
    const msg = e instanceof Error ? e.message : "Demo login failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
