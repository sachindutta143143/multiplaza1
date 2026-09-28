import { NextResponse, type NextRequest } from "next/server";
import { createCustomer, listCustomers } from "@/lib/data";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!(await getSessionFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = req.nextUrl.searchParams.get("q")?.trim() || undefined;
  const rows = await listCustomers(q);
  return NextResponse.json({ customers: rows });
}

export async function POST(req: NextRequest) {
  if (!(await getSessionFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }
    const customer = await createCustomer(body);
    return NextResponse.json({ customer }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create customer" }, { status: 500 });
  }
}
