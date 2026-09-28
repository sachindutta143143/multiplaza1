import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, ensureDbReady } from "./index";
import {
  users,
  customers,
  catalogItems,
  bills,
  billItems,
  payments,
  appSettings,
  backups,
} from "./schema";
import { DEFAULT_SETTINGS } from "../lib/settings";
import { deriveStatus } from "../lib/billing";

// ---------------- Deterministic RNG ----------------
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260915);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const rint = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

// ---------------- Catalog ----------------
const CATALOG: { name: string; rate: number; category: string }[] = [
  { name: "Service", rate: 800, category: "Service" },
  { name: "Toner", rate: 1200, category: "Consumable" },
  { name: "Drum", rate: 1900, category: "Spare Part" },
  { name: "Roller", rate: 450, category: "Spare Part" },
  { name: "Chip", rate: 250, category: "Spare Part" },
  { name: "Fuser", rate: 3500, category: "Spare Part" },
  { name: "Developer", rate: 1600, category: "Consumable" },
  { name: "Cleaning Blade", rate: 350, category: "Spare Part" },
  { name: "Corona Assembly", rate: 700, category: "Spare Part" },
  { name: "Teflon Roller", rate: 950, category: "Spare Part" },
  { name: "Gear Kit", rate: 650, category: "Spare Part" },
  { name: "Machine Cleaning", rate: 500, category: "Service" },
  { name: "Cartridge", rate: 2800, category: "Consumable" },
];

// ---------------- Customers ----------------
const CUSTOMERS_SEED = [
  { name: "Rahul Das", mobile: "9876543210", address: "Silchar", email: "rahul.das@gmail.com" },
  { name: "Amit Sharma", mobile: "9864512087", address: "Silchar", email: "amit.sharma@yahoo.in" },
  { name: "Neha Enterprises", mobile: "9435112233", address: "Silchar", email: "neha.ent@gmail.com" },
  { name: "Rakesh Yadav", mobile: "9954221100", address: "Hailakandi", email: null },
  { name: "S.K. Traders", mobile: "9706114455", address: "Silchar", email: "sktraders@rediffmail.com" },
  { name: "Priya Office", mobile: "9854332211", address: "Karimganj", email: null },
  { name: "ABC Corporation", mobile: "9401155667", address: "Guwahati", email: "accounts@abccorp.in" },
  { name: "Ratan Das", mobile: "9874561230", address: "Silchar", email: null },
  { name: "Moon Photo Studio", mobile: "9435001122", address: "Silchar", email: null },
  { name: "City Cyber Cafe", mobile: "9954400112", address: "Silchar", email: "citycyber@gmail.com" },
  { name: "Green Valley School", mobile: "9401234567", address: "Hailakandi", email: "office@gvs.edu.in" },
  { name: "Jai Maa Stationers", mobile: "9864009988", address: "Karimganj", email: null },
];

type Line = { itemName: string; rate: number; qty: number };
type SeedBill = {
  no: number | null; // fixed bill suffix; null = auto
  day: number;
  customer: string;
  orderNo: string | null;
  lines: Line[];
  paid: number;
  status: "paid" | "due" | "pending";
  remarks: string | null;
};

const totalOf = (lines: Line[]) => lines.reduce((s, l) => s + l.rate * l.qty, 0);

const PENDING_REMARKS = ["Pending - will pay on next visit", "Follow up required", "Waiting for payment"];
const DUE_REMARKS = ["Partial payment received", "Balance amount pending"];
const PAID_REMARKS: (string | null)[] = [null, null, null, "Paid in cash", "Received via UPI"];

function makeOrderNo(): string | null {
  const r = rng();
  if (r < 0.45) return null;
  if (r < 0.75) return String(rint(102, 199));
  if (r < 0.9) return "Long";
  return null;
}

// Generate random bill lines whose total matches the target exactly
function randomLines(target: number, isLast: boolean): Line[] {
  if (isLast) {
    // remainder bill: prefer an exact catalog match, else a service/parts line
    const exact = CATALOG.find((c) => c.rate === target);
    if (exact) return [{ itemName: exact.name, rate: exact.rate, qty: 1 }];
    const half = target / 2;
    const match2 = CATALOG.filter((c) => c.rate <= half);
    if (match2.length) {
      const c = pick(match2);
      const qty = Math.floor(target / c.rate);
      const rest = Math.round((target - c.rate * qty) * 100) / 100;
      if (rest === 0 && qty >= 1) return [{ itemName: c.name, rate: c.rate, qty }];
    }
    const name = pick(["Service", "Repair Work", "Spare Parts", "Machine Servicing", "General Service"]);
    return [{ itemName: name, rate: target, qty: 1 }];
  }
  const c = pick(CATALOG);
  const maxQty = c.rate <= 500 ? 3 : 2;
  const qty = rint(1, maxQty);
  return [{ itemName: c.name, rate: c.rate, qty }];
}

interface MonthTarget {
  month: number;
  count: number;
  total: number;
  payment: number;
  fixed: SeedBill[];
}

function buildMonth(target: MonthTarget): SeedBill[] {
  const randomCount = target.count - target.fixed.length;
  const fixedTotal = target.fixed.reduce((s, b) => s + totalOf(b.lines), 0);
  const fixedPaid = target.fixed.reduce((s, b) => s + b.paid, 0);
  const randomTargetTotal = target.total - fixedTotal;
  const randomTargetPaid = target.payment - fixedPaid;
  const reduction = randomTargetTotal - randomTargetPaid;

  for (let attempt = 0; attempt < 20000; attempt++) {
    const billsArr: SeedBill[] = [];
    let used = 0;
    let failed = false;
    for (let i = 0; i < randomCount; i++) {
      const remaining = randomCount - i;
      const budget = randomTargetTotal - used;
      let lines: Line[];
      if (i === randomCount - 1) {
        if (budget < 250 || budget > 6000) {
          failed = true;
          break;
        }
        lines = randomLines(budget, true);
      } else {
        const cap = budget - (remaining - 1) * 250;
        lines = randomLines(0, false);
        let amt = totalOf(lines);
        let guard = 0;
        while ((amt > cap || amt > budget * 0.45) && guard < 40) {
          const cheap = CATALOG.filter((c) => c.rate <= Math.max(250, cap));
          if (!cheap.length) break;
          const c = pick(cheap);
          lines = [{ itemName: c.name, rate: c.rate, qty: 1 }];
          amt = totalOf(lines);
          guard++;
        }
        if (amt > cap || amt > budget * 0.5) {
          failed = true;
          break;
        }
      }
      used += totalOf(lines);
      const isRahul = false;
      void isRahul;
      billsArr.push({
        no: null,
        day: rint(1, 27),
        customer: pick(CUSTOMERS_SEED.slice(1)).name,
        orderNo: makeOrderNo(),
        lines,
        paid: totalOf(lines),
        status: "paid",
        remarks: pick(PAID_REMARKS),
      });
    }
    if (failed || used !== randomTargetTotal) continue;

    // Distribute the payment reduction => pending whole bills + at most one partial
    let r = reduction;
    const order = billsArr.map((_, i) => i).sort(() => rng() - 0.5);
    for (const idx of order) {
      if (r <= 0) break;
      const b = billsArr[idx];
      const amt = totalOf(b.lines);
      if (amt <= r + 0.001) {
        b.paid = 0;
        b.status = "pending";
        b.remarks = pick(PENDING_REMARKS);
        r = Math.round((r - amt) * 100) / 100;
      } else {
        b.paid = Math.round((amt - r) * 100) / 100;
        b.status = "due";
        b.remarks = pick(DUE_REMARKS);
        r = 0;
      }
    }
    if (r > 0.01) continue;

    const all = [...target.fixed, ...billsArr].sort((a, b) => a.day - b.day);
    return all;
  }
  throw new Error(`Could not generate month ${target.month} to match targets`);
}

function fixedBill(
  no: number,
  day: number,
  customer: string,
  lines: Line[],
  paid: number,
  status: "paid" | "due" | "pending",
  orderNo: string | null = null,
  remarks: string | null = null
): SeedBill {
  return { no, day, customer, orderNo, lines, paid, status, remarks };
}

export async function runSeed(options: { force?: boolean } = {}) {
  await ensureDbReady();
  const existing = await db.select().from(users).limit(1);
  if (existing.length && !options.force) {
    return { skipped: true as const };
  }

  await db.transaction(async (tx) => {
    await tx.delete(payments);
    await tx.delete(billItems);
    await tx.delete(bills);
    await tx.delete(customers);
    await tx.delete(catalogItems);
    await tx.delete(backups);
    await tx.delete(appSettings);
    await tx.delete(users);

    const passwordHash = await bcrypt.hash("admin123", 10);
    const [admin] = await tx
      .insert(users)
      .values({ username: "admin", passwordHash, name: "Admin", role: "admin" })
      .returning();

    await tx.insert(appSettings).values({ id: 1, data: { ...DEFAULT_SETTINGS } });

    for (const c of CATALOG) {
      await tx.insert(catalogItems).values({
        name: c.name,
        defaultRate: String(c.rate),
        category: c.category,
      });
    }

    const custIds = new Map<string, number>();
    for (const c of CUSTOMERS_SEED) {
      const [row] = await tx
        .insert(customers)
        .values({ name: c.name, mobile: c.mobile, address: c.address, email: c.email })
        .returning({ id: customers.id });
      custIds.set(c.name, row.id);
    }

    // September 2026 — exact records shown in the dashboard screenshot
    const september: SeedBill[] = [
      fixedBill(210, 1, "Rahul Das", [{ itemName: "Service", rate: 800, qty: 1 }], 800, "paid", null, null),
      fixedBill(211, 3, "Amit Sharma", [{ itemName: "Toner", rate: 1200, qty: 1 }], 1000, "due", "123", "Partial payment received"),
      fixedBill(212, 5, "Neha Enterprises", [{ itemName: "Drum", rate: 1900, qty: 1 }], 1900, "paid"),
      fixedBill(213, 8, "Rakesh Yadav", [{ itemName: "Roller", rate: 450, qty: 2 }], 500, "due", "Long", "Balance amount pending"),
      fixedBill(214, 12, "S.K. Traders", [{ itemName: "Chip", rate: 250, qty: 5 }], 1250, "paid"),
      fixedBill(234, 15, "Rahul Das", [{ itemName: "Toner", rate: 5, qty: 1 }], 3, "pending", "Long", "Pending - follow up"),
      fixedBill(215, 20, "Priya Office", [{ itemName: "Service", rate: 800, qty: 1 }], 0, "pending", null, "Waiting for payment"),
      fixedBill(216, 28, "ABC Corporation", [{ itemName: "Fuser", rate: 3500, qty: 1 }], 3500, "paid"),
    ];

    const targets: MonthTarget[] = [
      { month: 1, count: 12, total: 18500, payment: 16200, fixed: [] },
      { month: 2, count: 18, total: 24700, payment: 22500, fixed: [] },
      { month: 3, count: 15, total: 20400, payment: 18900, fixed: [] },
      { month: 4, count: 20, total: 28300, payment: 26000, fixed: [] },
      {
        month: 5,
        count: 17,
        total: 22600,
        payment: 20800,
        fixed: [
          fixedBill(150, 8, "Rahul Das", [{ itemName: "Roller", rate: 450, qty: 2 }], 500, "due", null, "Balance amount pending"),
        ],
      },
      { month: 6, count: 14, total: 19750, payment: 18900, fixed: [] },
      {
        month: 7,
        count: 16,
        total: 21200,
        payment: 19400,
        fixed: [
          fixedBill(176, 18, "Rahul Das", [{ itemName: "Fuser", rate: 3500, qty: 1 }], 3500, "paid"),
        ],
      },
      {
        month: 8,
        count: 19,
        total: 26800,
        payment: 23900,
        fixed: [
          fixedBill(198, 25, "Rahul Das", [{ itemName: "Toner", rate: 1200, qty: 1 }], 1000, "due", null, "Partial payment received"),
        ],
      },
    ];

    const months = targets.map(buildMonth);
    months.push(september);

    // Assign sequential bill numbers, skipping fixed ones
    const usedNumbers = new Set<number>();
    months.flat().forEach((b) => b.no && usedNumbers.add(b.no));
    let autoNo = 0;
    const nextNo = () => {
      do {
        autoNo++;
      } while (usedNumbers.has(autoNo));
      usedNumbers.add(autoNo);
      return autoNo;
    };

    let billCount = 0;
    for (let mi = 0; mi < months.length; mi++) {
      const month = mi + 1;
      for (const b of months[mi]) {
        const suffix = b.no ?? nextNo();
        const billNo = `MP/26-${String(suffix).padStart(3, "0")}`;
        const day = String(b.day).padStart(2, "0");
        const mm = String(month).padStart(2, "0");
        const total = totalOf(b.lines);
        const expected = deriveStatus(total, b.paid);
        const status = b.status;
        void expected;
        const [bill] = await tx
          .insert(bills)
          .values({
            billNo,
            customerId: custIds.get(b.customer)!,
            billDate: `2026-${mm}-${day}`,
            orderNo: b.orderNo,
            totalAmount: String(total),
            amountPaid: String(b.paid),
            status,
            remarks: b.remarks,
            createdBy: admin.id,
          })
          .returning({ id: bills.id });
        for (const l of b.lines) {
          await tx.insert(billItems).values({
            billId: bill.id,
            itemName: l.itemName,
            rate: String(l.rate),
            qty: String(l.qty),
            amount: String(l.rate * l.qty),
          });
        }
        if (b.paid > 0) {
          await tx.insert(payments).values({
            billId: bill.id,
            amount: String(b.paid),
            method: rng() < 0.7 ? "Cash" : rng() < 0.5 ? "UPI" : "Bank",
            note: "Payment with bill",
          });
        }
        billCount++;
      }
    }

    return { billCount };
  });

  return { skipped: false as const };
}

// Idempotent startup guard — seeds an empty database automatically.
const globalForSeed = globalThis as typeof globalThis & {
  __mpEnsureSeeded?: Promise<unknown>;
};

export function ensureSeeded(): Promise<unknown> {
  if (!globalForSeed.__mpEnsureSeeded) {
    globalForSeed.__mpEnsureSeeded = runSeed().catch((e) => {
      globalForSeed.__mpEnsureSeeded = undefined;
      throw e;
    });
  }
  return globalForSeed.__mpEnsureSeeded;
}

// Run via: npx tsx src/db/seed.ts
if (require.main === module) {
  runSeed({ force: process.argv.includes("--force") })
    .then((r) => {
      console.log("Seed complete:", r);
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
