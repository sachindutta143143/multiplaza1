import { NextResponse, type NextRequest } from "next/server";
import { deleteCatalogItem } from "@/lib/data";
import { getSessionFromRequest } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSessionFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteCatalogItem(Number(id));
  return NextResponse.json({ ok: true });
}
