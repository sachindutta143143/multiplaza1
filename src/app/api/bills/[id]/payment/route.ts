import { NextResponse, type NextRequest } from "next/server";
import { recordPayment } from "@/lib/data";
import { getSessionFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSessionFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const body = await req.json();
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Please enter a valid payment amount" }, { status: 400 });
    }
    const bill = await recordPayment(Number(id), amount, body.method || "Cash", body.note || "");
    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    return NextResponse.json({ bill });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not record payment";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
