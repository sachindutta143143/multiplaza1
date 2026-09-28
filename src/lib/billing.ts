import type { BillItemDTO, BillStatus } from "./types";

export function lineAmount(rate: number, qty: number): number {
  return Math.round(((Number(rate) || 0) * (Number(qty) || 0)) * 100) / 100;
}

export function billTotal(items: Pick<BillItemDTO, "rate" | "qty">[]): number {
  return Math.round(items.reduce((sum, it) => sum + lineAmount(it.rate, it.qty), 0) * 100) / 100;
}

export function deriveStatus(total: number, paid: number): BillStatus {
  const p = Number(paid) || 0;
  const t = Number(total) || 0;
  if (p <= 0) return "pending";
  if (p + 0.001 >= t) return "paid";
  return "due";
}

export function dueAmount(total: number, paid: number): number {
  return Math.max(0, Math.round((Number(total) - Number(paid)) * 100) / 100);
}

export function itemSummary(items: { itemName: string; qty: number }[]): string {
  if (!items.length) return "-";
  const parts = items.map((i) =>
    Number(i.qty) > 1 ? `${i.itemName} ×${i.qty}` : i.itemName
  );
  const s = parts.join(", ");
  return s.length > 42 ? s.slice(0, 39) + "…" : s;
}

/** Next bill number e.g. MP/26-0211 based on the largest existing suffix for that year prefix. */
export function nextBillNo(existing: string[], prefix: string, year: number): string {
  const yy = String(year).slice(-2);
  const start = `${prefix}/${yy}-`;
  let max = 0;
  for (const b of existing) {
    if (b.startsWith(start)) {
      const n = parseInt(b.slice(start.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return `${start}${String(max + 1).padStart(3, "0")}`;
}
