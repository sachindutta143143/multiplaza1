import { NextResponse, type NextRequest } from "next/server";
import { listCatalog, upsertCatalogItem } from "@/lib/data";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!(await getSessionFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ items: await listCatalog() });
}

export async function POST(req: NextRequest) {
  if (!(await getSessionFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 });
    }
    const item = await upsertCatalogItem({
      id: body.id ? Number(body.id) : undefined,
      name: String(body.name),
      defaultRate: Number(body.defaultRate ?? 0),
      category: body.category ?? "General",
      active: body.active,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save item";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
