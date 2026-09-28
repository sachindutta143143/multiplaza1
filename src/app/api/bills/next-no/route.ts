import { NextResponse, type NextRequest } from "next/server";
import { nextBillNumber } from "@/lib/data";
import { getSessionFromRequest } from "@/lib/auth";
import { todayISO } from "@/lib/format";

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const date = req.nextUrl.searchParams.get("date") || todayISO();
  const billNo = await nextBillNumber(date);
  return NextResponse.json({ billNo });
}
