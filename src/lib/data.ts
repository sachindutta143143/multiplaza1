import { and, asc, desc, eq, gte, lte, like, or, sql } from "drizzle-orm";
import { db, ensureDbReady } from "@/db";
import {
  bills,
  billItems,
  catalogItems,
  customers,
  payments,
  appSettings,
  backups,
  users,
} from "@/db/schema";
import { billTotal, deriveStatus, dueAmount, itemSummary, nextBillNo } from "./billing";
import { getSettings } from "./settings";
import type { BillDTO, BillItemDTO, BillStatus, CustomerDTO, MonthlySummary } from "./types";

// ----------------------- Serializers -----------------------
type BillRow = typeof bills.$inferSelect;
type ItemRow = typeof billItems.$inferSelect;
type CustomerRow = typeof customers.$inferSelect;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function serializeCustomer(c: CustomerRow): CustomerDTO {
  return {
    id: c.id,
    name: c.name,
    mobile: c.mobile,
    address: c.address,
    email: c.email,
    gstin: c.gstin,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
  };
}

interface JoinedBill extends BillRow {
  customer: CustomerRow | null;
  items: ItemRow[];
}

export function serializeBill(b: JoinedBill): BillDTO {
  const items: BillItemDTO[] = (b.items ?? []).map((i) => ({
    id: i.id,
    itemName: i.itemName,
    rate: num(i.rate),
    qty: num(i.qty),
    amount: num(i.amount),
  }));
  const total = num(b.totalAmount);
  const paid = num(b.amountPaid);
  return {
    id: b.id,
    billNo: b.billNo,
    customerId: b.customerId,
    customerName: b.customer?.name ?? "—",
    customerMobile: b.customer?.mobile ?? null,
    billDate: b.billDate,
    orderNo: b.orderNo,
    items,
    itemSummary: itemSummary(items),
    totalAmount: total,
    amountPaid: paid,
    dueAmount: dueAmount(total, paid),
    status: b.status as BillStatus,
    remarks: b.remarks,
    createdAt: b.createdAt.toISOString(),
  };
}

// ----------------------- Customers -----------------------
export async function listCustomers(search?: string): Promise<CustomerDTO[]> {
  await ensureDbReady();
  const rows = await db.query.customers.findMany({
    where: search
      ? or(
          like(customers.name, `%${search}%`),
          like(customers.mobile, `%${search}%`),
          like(customers.address, `%${search}%`),
          like(customers.email, `%${search}%`)
        )
      : undefined,
    orderBy: [asc(customers.name)],
  });
  return rows.map(serializeCustomer);
}

export async function getCustomer(id: number) {
  await ensureDbReady();
  const row = await db.query.customers.findFirst({ where: eq(customers.id, id) });
  return row ? serializeCustomer(row) : null;
}

export async function createCustomer(input: {
  name: string;
  mobile?: string | null;
  address?: string | null;
  email?: string | null;
  gstin?: string | null;
  notes?: string | null;
}): Promise<CustomerDTO> {
  await ensureDbReady();
  const [row] = await db
    .insert(customers)
    .values({
      name: input.name.trim(),
      mobile: input.mobile?.trim() || null,
      address: input.address?.trim() || null,
      email: input.email?.trim() || null,
      gstin: input.gstin?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .returning();
  return serializeCustomer(row);
}

export async function updateCustomer(
  id: number,
  input: Partial<{ name: string; mobile: string; address: string; email: string; gstin: string; notes: string }>
): Promise<CustomerDTO | null> {
  await ensureDbReady();
  const [row] = await db
    .update(customers)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.mobile !== undefined ? { mobile: input.mobile.trim() || null } : {}),
      ...(input.address !== undefined ? { address: input.address.trim() || null } : {}),
      ...(input.email !== undefined ? { email: input.email.trim() || null } : {}),
      ...(input.gstin !== undefined ? { gstin: input.gstin.trim() || null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes.trim() || null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(customers.id, id))
    .returning();
  return row ? serializeCustomer(row) : null;
}

export async function deleteCustomer(id: number): Promise<{ ok: boolean; error?: string }> {
  await ensureDbReady();
  const count = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(bills)
    .where(eq(bills.customerId, id));
  if (Number(count[0]?.n ?? 0) > 0) {
    return { ok: false, error: "Customer has bills/orders and cannot be deleted." };
  }
  await db.delete(customers).where(eq(customers.id, id));
  return { ok: true };
}

// ----------------------- Catalog -----------------------
export async function listCatalog() {
  await ensureDbReady();
  const rows = await db.query.catalogItems.findMany({ orderBy: [asc(catalogItems.name)] });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    defaultRate: num(r.defaultRate),
    category: r.category,
    active: r.active,
  }));
}

export async function upsertCatalogItem(input: {
  id?: number;
  name: string;
  defaultRate: number;
  category?: string;
  active?: boolean;
}) {
  await ensureDbReady();
  if (input.id) {
    const [row] = await db
      .update(catalogItems)
      .set({
        name: input.name.trim(),
        defaultRate: String(input.defaultRate || 0),
        category: input.category?.trim() || "General",
        ...(input.active !== undefined ? { active: input.active } : {}),
      })
      .where(eq(catalogItems.id, input.id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(catalogItems)
    .values({
      name: input.name.trim(),
      defaultRate: String(input.defaultRate || 0),
      category: input.category?.trim() || "General",
      active: input.active ?? true,
    })
    .returning();
  return row;
}

export async function deleteCatalogItem(id: number) {
  await ensureDbReady();
  await db.delete(catalogItems).where(eq(catalogItems.id, id));
}

// ----------------------- Bills -----------------------
export interface BillFilter {
  from?: string;
  to?: string;
  customerId?: number;
  status?: BillStatus;
  search?: string;
  year?: number;
  month?: number;
}

export async function findBills(filter: BillFilter = {}): Promise<BillDTO[]> {
  await ensureDbReady();
  const conds = [];
  if (filter.from) conds.push(gte(bills.billDate, filter.from));
  if (filter.to) conds.push(lte(bills.billDate, filter.to));
  if (filter.customerId) conds.push(eq(bills.customerId, filter.customerId));
  if (filter.status) conds.push(eq(bills.status, filter.status));
  if (filter.search) {
    const q = `%${filter.search}%`;
    conds.push(
      or(
        like(bills.billNo, q),
        like(bills.orderNo, q),
        sql`${bills.customerId} IN (SELECT id FROM ${customers} WHERE ${customers.name} LIKE ${q} OR ${customers.mobile} LIKE ${q})`
      )
    );
  }
  const rows = await db.query.bills.findMany({
    where: conds.length ? and(...conds) : undefined,
    with: { customer: true, items: true },
    orderBy: [desc(bills.billDate), desc(bills.id)],
  });
  return rows.map(serializeBill);
}

export async function getBill(id: number): Promise<BillDTO | null> {
  await ensureDbReady();
  const row = await db.query.bills.findFirst({
    where: eq(bills.id, id),
    with: { customer: true, items: true, payments: true },
  });
  if (!row) return null;
  const dto = serializeBill(row);
  return {
    ...dto,
    payments: [...row.payments]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((p) => ({
        id: p.id,
        amount: num(p.amount),
        method: p.method,
        note: p.note,
        createdAt: p.createdAt.toISOString(),
      })),
  };
}

export interface BillItemInput {
  itemName: string;
  rate: number;
  qty: number;
}

export interface BillInput {
  billNo: string;
  customerId?: number;
  newCustomer?: { name: string; mobile?: string; address?: string };
  billDate: string;
  orderNo?: string | null;
  items: BillItemInput[];
  amountPaid: number;
  status?: BillStatus | "auto";
  remarks?: string | null;
}

function validateBillInput(input: BillInput) {
  if (!input.billDate) throw new Error("Bill date is required");
  if (!input.items.length || input.items.every((i) => !i.itemName.trim()))
    throw new Error("At least one item is required");
  const clean = input.items
    .filter((i) => i.itemName.trim())
    .map((i) => {
      const rate = num(i.rate);
      const qty = num(i.qty) || 1;
      return { itemName: i.itemName.trim(), rate, qty, amount: Math.round(rate * qty * 100) / 100 };
    });
  const total = billTotal(clean);
  if (total <= 0) throw new Error("Bill total must be greater than zero");
  const paid = Math.min(num(input.amountPaid), total);
  return { clean, total, paid };
}

async function resolveCustomerId(input: BillInput): Promise<number> {
  if (input.customerId) {
    const c = await getCustomer(input.customerId);
    if (!c) throw new Error("Selected customer not found");
    return c.id;
  }
  if (input.newCustomer?.name?.trim()) {
    const c = await createCustomer({
      name: input.newCustomer.name,
      mobile: input.newCustomer.mobile,
      address: input.newCustomer.address,
    });
    return c.id;
  }
  throw new Error("Customer is required");
}

export async function nextBillNumber(dateISO: string): Promise<string> {
  await ensureDbReady();
  const settings = await getSettings();
  const year = Number(dateISO.slice(0, 4));
  const all = await db.select({ billNo: bills.billNo }).from(bills);
  return nextBillNo(
    all.map((r) => r.billNo),
    settings.billPrefix || "MP",
    year
  );
}

export async function clearAllBillingData(keepCustomers = false): Promise<{ billsCleared: number; customersCleared: number }> {
  await ensureDbReady();
  return db.transaction(async (tx) => {
    const billCountRes = await tx.select({ n: sql<number>`count(*)::int` }).from(bills);
    const billsCleared = Number(billCountRes[0]?.n ?? 0);
    await tx.delete(payments);
    await tx.delete(billItems);
    await tx.delete(bills);

    let customersCleared = 0;
    if (!keepCustomers) {
      const custCountRes = await tx.select({ n: sql<number>`count(*)::int` }).from(customers);
      customersCleared = Number(custCountRes[0]?.n ?? 0);
      await tx.delete(customers);
    }
    return { billsCleared, customersCleared };
  });
}

export async function createBill(input: BillInput, userId?: number): Promise<BillDTO> {
  await ensureDbReady();
  const { clean, total, paid } = validateBillInput(input);
  const customerId = await resolveCustomerId(input);
  const status: BillStatus =
    input.status && input.status !== "auto" ? input.status : deriveStatus(total, paid);

  let finalBillNo = (input.billNo || "").trim();
  if (!finalBillNo) {
    finalBillNo = await nextBillNumber(input.billDate);
  }

  // If bill number already exists, auto-increment to next unique bill number
  const existing = await db.select({ id: bills.id }).from(bills).where(eq(bills.billNo, finalBillNo));
  if (existing.length) {
    finalBillNo = await nextBillNumber(input.billDate);
  }

  // Verify createdBy user exists to avoid foreign key errors
  let safeUserId: number | null = null;
  if (userId) {
    const validUser = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (validUser.length) safeUserId = userId;
  }

  return db.transaction(async (tx) => {
    const [bill] = await tx
      .insert(bills)
      .values({
        billNo: finalBillNo,
        customerId,
        billDate: input.billDate,
        orderNo: input.orderNo?.trim() || null,
        totalAmount: String(total),
        amountPaid: String(paid),
        status,
        remarks: input.remarks?.trim() || null,
        createdBy: safeUserId,
      })
      .returning();

    for (const it of clean) {
      await tx.insert(billItems).values({
        billId: bill.id,
        itemName: it.itemName,
        rate: String(it.rate),
        qty: String(it.qty),
        amount: String(it.amount),
      });
    }
    if (paid > 0) {
      await tx.insert(payments).values({
        billId: bill.id,
        amount: String(paid),
        method: "Cash",
        note: "Payment with bill",
      });
    }
    const row = await tx.query.bills.findFirst({
      where: eq(bills.id, bill.id),
      with: { customer: true, items: true },
    });
    return serializeBill(row as JoinedBill);
  });
}

export async function updateBill(id: number, input: BillInput): Promise<BillDTO> {
  await ensureDbReady();
  const { clean, total, paid } = validateBillInput(input);
  const customerId = await resolveCustomerId(input);
  const status: BillStatus =
    input.status && input.status !== "auto" ? input.status : deriveStatus(total, paid);

  const dup = await db
    .select({ id: bills.id })
    .from(bills)
    .where(and(eq(bills.billNo, input.billNo), sql`${bills.id} <> ${id}`));
  if (dup.length) throw new Error(`Bill number ${input.billNo} already exists`);

  return db.transaction(async (tx) => {
    await tx.update(bills)
      .set({
        billNo: input.billNo.trim(),
        customerId,
        billDate: input.billDate,
        orderNo: input.orderNo?.trim() || null,
        totalAmount: String(total),
        amountPaid: String(paid),
        status,
        remarks: input.remarks?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(bills.id, id));
    await tx.delete(billItems).where(eq(billItems.billId, id));
    for (const it of clean) {
      await tx.insert(billItems).values({
        billId: id,
        itemName: it.itemName,
        rate: String(it.rate),
        qty: String(it.qty),
        amount: String(it.amount),
      });
    }
    const row = await tx.query.bills.findFirst({
      where: eq(bills.id, id),
      with: { customer: true, items: true },
    });
    return serializeBill(row as JoinedBill);
  });
}

export async function deleteBill(id: number): Promise<void> {
  await ensureDbReady();
  await db.delete(bills).where(eq(bills.id, id));
}

export async function recordPayment(
  id: number,
  amount: number,
  method = "Cash",
  note?: string
): Promise<BillDTO | null> {
  await ensureDbReady();
  const bill = await getBill(id);
  if (!bill) return null;
  const amt = num(amount);
  if (amt <= 0) throw new Error("Payment amount must be greater than zero");
  const newPaid = Math.min(bill.totalAmount, Math.round((bill.amountPaid + amt) * 100) / 100);
  const status = deriveStatus(bill.totalAmount, newPaid);
  return db.transaction(async (tx) => {
    await tx
      .update(bills)
      .set({ amountPaid: String(newPaid), status, updatedAt: new Date() })
      .where(eq(bills.id, id));
    await tx.insert(payments).values({
      billId: id,
      amount: String(amt),
      method,
      note: note?.trim() || null,
    });
    const row = await tx.query.bills.findFirst({
      where: eq(bills.id, id),
      with: { customer: true, items: true },
    });
    return serializeBill(row as JoinedBill);
  });
}

// ----------------------- Aggregations -----------------------
export async function monthlySummary(year: number): Promise<MonthlySummary[]> {
  await ensureDbReady();
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const all = await findBills({ from: start, to: end });
  const map = new Map<number, MonthlySummary>();
  for (let m = 1; m <= 12; m++) {
    map.set(m, {
      month: m,
      label: new Date(year, m - 1, 1).toLocaleString("en-US", { month: "long" }),
      totalBills: 0,
      totalAmount: 0,
      totalPayment: 0,
      totalDue: 0,
    });
  }
  for (const b of all) {
    const m = Number(b.billDate.slice(5, 7));
    const row = map.get(m)!;
    row.totalBills += 1;
    row.totalAmount = Math.round((row.totalAmount + b.totalAmount) * 100) / 100;
    row.totalPayment = Math.round((row.totalPayment + b.amountPaid) * 100) / 100;
    row.totalDue = Math.round((row.totalDue + b.dueAmount) * 100) / 100;
  }
  return [...map.values()];
}

export async function statusBreakdown(list?: BillDTO[]) {
  const all = list ?? (await findBills());
  const result = { paid: 0, due: 0, pending: 0, paidCount: 0, dueCount: 0, pendingCount: 0 };
  for (const b of all) {
    if (b.status === "paid") {
      result.paid += b.totalAmount;
      result.paidCount++;
    } else if (b.status === "due") {
      result.due += b.dueAmount;
      result.dueCount++;
    } else {
      result.pending += b.totalAmount - b.amountPaid;
      result.pendingCount++;
    }
  }
  return result;
}

export async function customerDetail(id: number) {
  await ensureDbReady();
  const customer = await getCustomer(id);
  if (!customer) return null;
  const all = await findBills({ customerId: id });
  const totalAmount = all.reduce((s, b) => s + b.totalAmount, 0);
  const totalPayment = all.reduce((s, b) => s + b.amountPaid, 0);
  const recent = [...all].sort((a, b) => b.billDate.localeCompare(a.billDate) || b.id - a.id).slice(0, 6);
  return {
    customer,
    stats: {
      orderCount: all.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalPayment: Math.round(totalPayment * 100) / 100,
      totalDue: Math.round((totalAmount - totalPayment) * 100) / 100,
    },
    recentBills: recent,
  };
}

export async function customerOutstanding() {
  await ensureDbReady();
  const all = await findBills();
  const map = new Map<number, { customerId: number; name: string; mobile: string | null; bills: number; due: number; pending: number }>();
  for (const b of all) {
    if (b.dueAmount <= 0) continue;
    const key = b.customerId;
    const row = map.get(key) ?? {
      customerId: key,
      name: b.customerName,
      mobile: b.customerMobile,
      bills: 0,
      due: 0,
      pending: 0,
    };
    row.bills += 1;
    row.due = Math.round((row.due + b.dueAmount) * 100) / 100;
    if (b.status === "pending") row.pending = Math.round((row.pending + b.dueAmount) * 100) / 100;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.due - a.due);
}

export async function paymentHistory(limit = 200) {
  await ensureDbReady();
  const rows = await db.query.payments.findMany({
    orderBy: [desc(payments.createdAt)],
    limit,
    with: { bill: { with: { customer: true } } },
  });
  return rows.map((p) => ({
    id: p.id,
    billId: p.billId,
    billNo: p.bill?.billNo ?? "-",
    customerName: p.bill?.customer?.name ?? "-",
    billDate: p.bill?.billDate ?? "",
    amount: num(p.amount),
    method: p.method,
    note: p.note,
    createdAt: p.createdAt.toISOString(),
  }));
}

export async function itemWiseSales(year: number) {
  await ensureDbReady();
  const all = await findBills({ from: `${year}-01-01`, to: `${year}-12-31` });
  const map = new Map<string, { item: string; qty: number; amount: number; bills: number }>();
  for (const b of all) {
    for (const it of b.items) {
      const row = map.get(it.itemName) ?? { item: it.itemName, qty: 0, amount: 0, bills: 0 };
      row.qty = Math.round((row.qty + it.qty) * 100) / 100;
      row.amount = Math.round((row.amount + it.amount) * 100) / 100;
      row.bills += 1;
      map.set(it.itemName, row);
    }
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

export async function topCustomers(year: number, limit = 8) {
  await ensureDbReady();
  const all = await findBills({ from: `${year}-01-01`, to: `${year}-12-31` });
  const map = new Map<number, { name: string; orders: number; amount: number; paid: number }>();
  for (const b of all) {
    const row = map.get(b.customerId) ?? { name: b.customerName, orders: 0, amount: 0, paid: 0 };
    row.orders += 1;
    row.amount = Math.round((row.amount + b.totalAmount) * 100) / 100;
    row.paid = Math.round((row.paid + b.amountPaid) * 100) / 100;
    map.set(b.customerId, row);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, limit);
}

export async function latestBillMonth(): Promise<{ year: number; month: number }> {
  await ensureDbReady();
  const rows = await db
    .select({ d: sql<string>`to_char(max(${bills.billDate}), 'YYYY-MM-DD')` })
    .from(bills);
  const d = rows[0]?.d;
  const now = new Date();
  if (!d) return { year: now.getFullYear(), month: now.getMonth() + 1 };
  return { year: Number(d.slice(0, 4)), month: Number(d.slice(5, 7)) };
}

// ----------------------- Backup / Restore -----------------------
export async function buildSnapshot() {
  await ensureDbReady();
  const [cust, cat, bs, bis, pays, settingsRows, backupRows] = await Promise.all([
    db.select().from(customers),
    db.select().from(catalogItems),
    db.select().from(bills),
    db.select().from(billItems),
    db.select().from(payments),
    db.select().from(appSettings),
    db.select().from(backups).orderBy(desc(backups.createdAt)).limit(50),
  ]);
  return {
    app: "multi-plaza-billing",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: settingsRows[0]?.data ?? null,
    customers: cust,
    catalogItems: cat,
    bills: bs,
    billItems: bis,
    payments: pays,
    backups: backupRows,
  };
}

type Snapshot = Awaited<ReturnType<typeof buildSnapshot>>;

function toDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? undefined : d;
}

export async function restoreSnapshot(snap: Snapshot) {
  await ensureDbReady();
  if (!snap || snap.app !== "multi-plaza-billing" || !Array.isArray(snap.customers)) {
    throw new Error("Invalid backup file");
  }
  await db.transaction(async (tx) => {
    await tx.delete(payments);
    await tx.delete(billItems);
    await tx.delete(bills);
    await tx.delete(customers);
    await tx.delete(catalogItems);

    const custMap = new Map<number, number>();
    for (const c of snap.customers) {
      const [row] = await tx
        .insert(customers)
        .values({
          name: c.name,
          mobile: c.mobile,
          address: c.address,
          email: c.email,
          gstin: c.gstin,
          notes: c.notes,
          createdAt: toDate(c.createdAt),
        })
        .returning({ id: customers.id });
      custMap.set(c.id, row.id);
    }

    const itemMap = new Map<number, number>();
    for (const it of snap.catalogItems ?? []) {
      const [row] = await tx
        .insert(catalogItems)
        .values({
          name: it.name,
          defaultRate: String(it.defaultRate ?? 0),
          category: it.category ?? "General",
          active: it.active ?? true,
        })
        .returning({ id: catalogItems.id });
      itemMap.set(it.id, row.id);
    }

    const billMap = new Map<number, number>();
    for (const b of snap.bills) {
      const newCustomerId = custMap.get(b.customerId);
      if (!newCustomerId) continue;
      const [row] = await tx
        .insert(bills)
        .values({
          billNo: b.billNo,
          customerId: newCustomerId,
          billDate: b.billDate,
          orderNo: b.orderNo,
          totalAmount: String(b.totalAmount),
          amountPaid: String(b.amountPaid),
          status: b.status,
          remarks: b.remarks,
          createdAt: toDate(b.createdAt),
        })
        .returning({ id: bills.id });
      billMap.set(b.id, row.id);
    }

    for (const bi of snap.billItems ?? []) {
      const newBillId = billMap.get(bi.billId);
      if (!newBillId) continue;
      await tx.insert(billItems).values({
        billId: newBillId,
        itemName: bi.itemName,
        rate: String(bi.rate),
        qty: String(bi.qty),
        amount: String(bi.amount),
      });
    }

    for (const p of snap.payments ?? []) {
      const newBillId = billMap.get(p.billId);
      if (!newBillId) continue;
      await tx.insert(payments).values({
        billId: newBillId,
        amount: String(p.amount),
        method: p.method ?? "Cash",
        note: p.note,
        createdAt: toDate(p.createdAt),
      });
    }

    if (snap.settings) {
      await tx
        .insert(appSettings)
        .values({ id: 1, data: snap.settings as object, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: appSettings.id,
          set: { data: snap.settings as object, updatedAt: new Date() },
        });
    }
  });
}

export async function logBackup(input: {
  filename: string;
  kind: "local" | "email";
  emailTo?: string | null;
  sizeBytes: number;
  status: string;
  note?: string | null;
}) {
  await ensureDbReady();
  const [row] = await db
    .insert(backups)
    .values({
      filename: input.filename,
      kind: input.kind,
      emailTo: input.emailTo ?? null,
      sizeBytes: input.sizeBytes,
      status: input.status,
      note: input.note ?? null,
    })
    .returning();
  return row;
}

export async function listBackups() {
  await ensureDbReady();
  const rows = await db.select().from(backups).orderBy(desc(backups.createdAt)).limit(100);
  return rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    kind: r.kind,
    emailTo: r.emailTo,
    sizeBytes: r.sizeBytes,
    status: r.status,
    note: r.note,
    createdAt: r.createdAt.toISOString(),
  }));
}

export { getSettings };
