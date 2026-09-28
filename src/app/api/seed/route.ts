import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runSeed } from "@/db/seed";

export async function POST(req: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    const result = await runSeed({ force: Boolean(body.force) });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Seeding failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
