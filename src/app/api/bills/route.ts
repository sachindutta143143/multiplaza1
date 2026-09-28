import { NextResponse, type NextRequest } from "next/server";
import { createBill, findBills } from "@/lib/data";
import { getSessionFromRequest } from "@/lib/auth";
import type { BillStatus } from "@/lib/types";

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const from = sp.get("from") || undefined;
  const to = sp.get("to") || undefined;
  const customerId = sp.get("customerId") ? Number(sp.get("customerId")) : undefined;
  const status = (sp.get("status") as BillStatus) || undefined;
  const search = sp.get("search")?.trim() || undefined;
  const list = await findBills({ from, to, customerId, status, search });
  return NextResponse.json({ bills: list });
}

export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "At least one item is required in the bill." }, { status: 400 });
    }
    const bill = await createBill(
      {
        billNo: String(body.billNo ?? "").trim(),
        customerId: body.customerId ? Number(body.customerId) : undefined,
        newCustomer: body.newCustomer,
        billDate: body.billDate,
        orderNo: body.orderNo ?? null,
        items: body.items,
        amountPaid: Number(body.amountPaid ?? 0),
        status: body.status ?? "auto",
        remarks: body.remarks ?? null,
      },
      user.id
    );
    return NextResponse.json({ bill }, { status: 201 });
  } catch (e) {
    console.error("Create bill error:", e);
    const msg = e instanceof Error ? e.message : "Could not create bill";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
