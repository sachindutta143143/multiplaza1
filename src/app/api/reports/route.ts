import { NextResponse, type NextRequest } from "next/server";
import {
  customerOutstanding,
  itemWiseSales,
  monthlySummary,
  paymentHistory,
  statusBreakdown,
  topCustomers,
  findBills,
} from "@/lib/data";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!(await getSessionFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const year = Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear();
  const [monthly, items, top, outstanding, payments, yearBills] = await Promise.all([
    monthlySummary(year),
    itemWiseSales(year),
    topCustomers(year),
    customerOutstanding(),
    paymentHistory(300),
    findBills({ from: `${year}-01-01`, to: `${year}-12-31` }),
  ]);
  const status = await statusBreakdown(yearBills);
  const totals = monthly.reduce(
    (acc, m) => ({
      bills: acc.bills + m.totalBills,
      amount: Math.round((acc.amount + m.totalAmount) * 100) / 100,
      payment: Math.round((acc.payment + m.totalPayment) * 100) / 100,
      due: Math.round((acc.due + m.totalDue) * 100) / 100,
    }),
    { bills: 0, amount: 0, payment: 0, due: 0 }
  );
  return NextResponse.json({
    year,
    totals,
    monthly,
    items,
    topCustomers: top,
    outstanding,
    payments,
    status,
  });
}
