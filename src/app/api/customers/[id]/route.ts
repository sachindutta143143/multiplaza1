import { NextResponse, type NextRequest } from "next/server";
import { customerDetail, deleteCustomer, updateCustomer } from "@/lib/data";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSessionFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const detail = await customerDetail(Number(id));
  if (!detail) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  return NextResponse.json(detail);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSessionFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const body = await req.json();
    const customer = await updateCustomer(Number(id), body);
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    return NextResponse.json({ customer });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not update customer" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSessionFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await deleteCustomer(Number(id));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ ok: true });
}
