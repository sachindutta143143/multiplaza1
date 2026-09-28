import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { getSessionFromRequest } from "@/lib/auth";
import {
  customerOutstanding,
  findBills,
  listCustomers,
  monthlySummary,
  paymentHistory,
  itemWiseSales,
} from "@/lib/data";
import { formatDate } from "@/lib/format";

async function sendWorkbook(wb: ExcelJS.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function headerStyle(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F5B8C" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFB7C9D9" } },
      left: { style: "thin", color: { argb: "FFB7C9D9" } },
      bottom: { style: "thin", color: { argb: "FFB7C9D9" } },
      right: { style: "thin", color: { argb: "FFB7C9D9" } },
    };
  });
}

export async function GET(req: NextRequest) {
  if (!(await getSessionFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const kind = sp.get("kind") || "bills";
  const wb = new ExcelJS.Workbook();
  wb.creator = "Multi Plaza Billing";
  wb.created = new Date();

  if (kind === "customers") {
    const ws = wb.addWorksheet("Customers");
    ws.columns = [
      { header: "Sl. No.", key: "sl", width: 8 },
      { header: "Name", key: "name", width: 26 },
      { header: "Mobile", key: "mobile", width: 16 },
      { header: "Address", key: "address", width: 30 },
      { header: "Email", key: "email", width: 26 },
      { header: "GSTIN", key: "gstin", width: 18 },
    ];
    headerStyle(ws.getRow(1));
    const rows = await listCustomers();
    rows.forEach((c, i) => ws.addRow({ sl: i + 1, name: c.name, mobile: c.mobile ?? "", address: c.address ?? "", email: c.email ?? "", gstin: c.gstin ?? "" }));
    return sendWorkbook(wb, "multiplaza-customers.xlsx");
  }

  if (kind === "monthly") {
    const year = Number(sp.get("year")) || new Date().getFullYear();
    const ws = wb.addWorksheet(`Monthly ${year}`);
    ws.columns = [
      { header: "Month", key: "m", width: 14 },
      { header: "Total Bills", key: "bills", width: 12 },
      { header: "Total Amount", key: "amount", width: 16 },
      { header: "Total Payment", key: "payment", width: 16 },
      { header: "Total Due", key: "due", width: 14 },
    ];
    headerStyle(ws.getRow(1));
    const summary = await monthlySummary(year);
    for (const r of summary) ws.addRow({ m: r.label, bills: r.totalBills, amount: r.totalAmount, payment: r.totalPayment, due: r.totalDue });
    const total = summary.reduce(
      (a, r) => ({ bills: a.bills + r.totalBills, amount: a.amount + r.totalAmount, payment: a.payment + r.totalPayment, due: a.due + r.totalDue }),
      { bills: 0, amount: 0, payment: 0, due: 0 }
    );
    const tr = ws.addRow({ m: "TOTAL", bills: total.bills, amount: total.amount, payment: total.payment, due: total.due });
    tr.eachCell((c) => (c.font = { bold: true }));
    return sendWorkbook(wb, `multiplaza-monthly-${year}.xlsx`);
  }

  if (kind === "payments") {
    const ws = wb.addWorksheet("Payments");
    ws.columns = [
      { header: "Date", key: "date", width: 12 },
      { header: "Bill No.", key: "bill", width: 14 },
      { header: "Customer", key: "customer", width: 24 },
      { header: "Amount", key: "amount", width: 12 },
      { header: "Method", key: "method", width: 12 },
      { header: "Note", key: "note", width: 24 },
    ];
    headerStyle(ws.getRow(1));
    const pays = await paymentHistory(500);
    pays.forEach((p) => ws.addRow({ date: formatDate(p.billDate), bill: p.billNo, customer: p.customerName, amount: p.amount, method: p.method, note: p.note ?? "" }));
    return sendWorkbook(wb, "multiplaza-payments.xlsx");
  }

  if (kind === "outstanding") {
    const ws = wb.addWorksheet("Outstanding");
    ws.columns = [
      { header: "Customer", key: "name", width: 26 },
      { header: "Mobile", key: "mobile", width: 16 },
      { header: "Pending Bills", key: "bills", width: 14 },
      { header: "Total Due", key: "due", width: 14 },
    ];
    headerStyle(ws.getRow(1));
    const rows = await customerOutstanding();
    rows.forEach((r) => ws.addRow({ name: r.name, mobile: r.mobile ?? "", bills: r.bills, due: r.due }));
    return sendWorkbook(wb, "multiplaza-outstanding.xlsx");
  }

  if (kind === "items") {
    const year = Number(sp.get("year")) || new Date().getFullYear();
    const ws = wb.addWorksheet(`Item Sales ${year}`);
    ws.columns = [
      { header: "Item", key: "item", width: 22 },
      { header: "Bills", key: "bills", width: 10 },
      { header: "Quantity", key: "qty", width: 12 },
      { header: "Amount", key: "amount", width: 14 },
    ];
    headerStyle(ws.getRow(1));
    const rows = await itemWiseSales(year);
    rows.forEach((r) => ws.addRow({ item: r.item, bills: r.bills, qty: r.qty, amount: r.amount }));
    return sendWorkbook(wb, `multiplaza-item-report-${year}.xlsx`);
  }

  // default: bills
  const from = sp.get("from") || undefined;
  const to = sp.get("to") || undefined;
  const customerId = sp.get("customerId") ? Number(sp.get("customerId")) : undefined;
  const search = sp.get("search") || undefined;
  const list = await findBills({ from, to, customerId, search });
  const ws = wb.addWorksheet("Bills");
  ws.columns = [
    { header: "Sl. No.", key: "sl", width: 8 },
    { header: "Date", key: "date", width: 12 },
    { header: "Bill No.", key: "bill", width: 14 },
    { header: "Customer", key: "customer", width: 24 },
    { header: "Order No.", key: "order", width: 12 },
    { header: "Items", key: "items", width: 30 },
    { header: "Total", key: "total", width: 12 },
    { header: "Payment", key: "payment", width: 12 },
    { header: "Due", key: "due", width: 12 },
    { header: "Status", key: "status", width: 10 },
    { header: "Remarks", key: "remarks", width: 20 },
  ];
  headerStyle(ws.getRow(1));
  list.forEach((b, i) => {
    ws.addRow({
      sl: i + 1,
      date: formatDate(b.billDate),
      bill: b.billNo,
      customer: b.customerName,
      order: b.orderNo ?? "-",
      items: b.items.map((it) => `${it.itemName} (${it.qty})`).join(", "),
      total: b.totalAmount,
      payment: b.amountPaid,
      due: b.dueAmount,
      status: b.status === "paid" ? "Paid" : b.status === "due" ? "Due" : "Pending",
      remarks: b.remarks ?? "",
    });
  });
  const t = ws.addRow({
    sl: "",
    date: "",
    bill: "",
    customer: "TOTAL",
    total: list.reduce((s, b) => s + b.totalAmount, 0),
    payment: list.reduce((s, b) => s + b.amountPaid, 0),
    due: list.reduce((s, b) => s + b.dueAmount, 0),
  });
  t.eachCell((c) => (c.font = { bold: true }));
  const rangeLabel = from || to ? `${from ? formatDate(from) : "start"} to ${to ? formatDate(to) : "today"}` : "all records";
  return sendWorkbook(wb, `multiplaza-bills-${rangeLabel.replace(/\s+/g, "-")}.xlsx`);
}
