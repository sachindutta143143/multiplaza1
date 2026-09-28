import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { restoreSnapshot } from "@/lib/data";

export async function POST(req: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const snapshot = await req.json();
    await restoreSnapshot(snapshot);
    return NextResponse.json({
      ok: true,
      counts: {
        customers: Array.isArray(snapshot.customers) ? snapshot.customers.length : 0,
        bills: Array.isArray(snapshot.bills) ? snapshot.bills.length : 0,
        items: Array.isArray(snapshot.catalogItems) ? snapshot.catalogItems.length : 0,
        payments: Array.isArray(snapshot.payments) ? snapshot.payments.length : 0,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Restore failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
