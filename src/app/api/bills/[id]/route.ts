import { NextResponse, type NextRequest } from "next/server";
import { deleteBill, getBill, updateBill } from "@/lib/data";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSessionFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const bill = await getBill(Number(id));
  if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  return NextResponse.json({ bill });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSessionFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const body = await req.json();
    if (!Array.isArray(body.items)) {
      return NextResponse.json({ error: "Items are required" }, { status: 400 });
    }
    const bill = await updateBill(Number(id), {
      billNo: String(body.billNo ?? "").trim(),
      customerId: body.customerId ? Number(body.customerId) : undefined,
      newCustomer: body.newCustomer,
      billDate: body.billDate,
      orderNo: body.orderNo ?? null,
      items: body.items,
      amountPaid: Number(body.amountPaid ?? 0),
      status: body.status ?? "auto",
      remarks: body.remarks ?? null,
    });
    return NextResponse.json({ bill });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update bill";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSessionFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteBill(Number(id));
  return NextResponse.json({ ok: true });
}
