"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays, Plus, FileX2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Button, EmptyState, Panel, Select, Spinner, StatusBadge, TableSkeleton } from "@/components/ui";
import { useBills, useMeta, useReports } from "@/lib/hooks";
import { MONTHS, formatDate, inr, todayISO } from "@/lib/format";
import type { BillDTO } from "@/lib/types";

function rangeOf(year: number, month: number) {
  const mm = String(month).padStart(2, "0");
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${new Date(year, month, 0).getDate()}` };
}

export default function MonthlyViewPage() {
  const { data: meta, isLoading } = useMeta();
  const latest = meta?.latestMonth;
  const [year, setYear] = useState(latest?.year ?? new Date().getFullYear());
  const [month, setMonth] = useState(latest?.month ?? new Date().getMonth() + 1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (latest && !ready) {
      setYear(latest.year);
      setMonth(latest.month);
      setReady(true);
    }
  }, [latest, ready]);

  const range = rangeOf(year, month);
  const { data, isLoading: billsLoading } = useBills({ from: range.from, to: range.to, enabled: ready });
  const { data: reports } = useReports(year);
  const bills = data?.bills ?? [];

  const totals = useMemo(() => {
    const t = { count: bills.length, amount: 0, paid: 0, due: 0 };
    bills.forEach((b) => {
      t.amount += b.totalAmount;
      t.paid += b.amountPaid;
      t.due += b.dueAmount;
    });
    return t;
  }, [bills]);

  const groups = useMemo(() => {
    const m = new Map<string, BillDTO[]>();
    bills.forEach((b) => {
      const arr = m.get(b.billDate) ?? [];
      arr.push(b);
      m.set(b.billDate, arr);
    });
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [bills]);

  function shift(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  }

  const chartData = (reports?.monthly ?? []).map((r) => ({
    month: r.label.slice(0, 3),
    Amount: r.totalAmount,
    Payment: r.totalPayment,
    Due: r.totalDue,
  }));

  if (isLoading || !ready) return <Spinner label="Loading monthly view" />;

  return (
    <div className="p-3 sm:p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-100 text-sky-700">
            <CalendarDays className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-black text-[#0f3d63]">Monthly View</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-auto py-1.5">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </Select>
          <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-auto py-1.5">
            {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
          <Button variant="secondary" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Link href="/new-entry"><Button variant="success"><Plus className="h-4 w-4" /> New</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Bills this month" value={String(totals.count)} tone="sky" />
        <MiniStat label="Total amount" value={inr(totals.amount)} tone="emerald" />
        <MiniStat label="Collected" value={inr(totals.paid)} tone="violet" />
        <MiniStat label="Outstanding" value={inr(totals.due)} tone="rose" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title={`${MONTHS[month - 1]} ${year} — day-by-day entries`} icon={<CalendarDays className="h-5 w-5" />} bodyClassName="p-0">
          {billsLoading ? (
            <TableSkeleton rows={8} cols={6} />
          ) : groups.length === 0 ? (
            <EmptyState
              icon={<FileX2 className="h-8 w-8" />}
              title="No entries this month"
              message={`No bills were recorded in ${MONTHS[month - 1]} ${year}.`}
              action={<Link href="/new-entry"><Button variant="success"><Plus className="h-4 w-4" /> New Entry</Button></Link>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-[#eef5fb] text-xs uppercase text-[#0f3d63]">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">Bill No.</th>
                    <th className="px-3 py-2 text-left font-bold">Customer</th>
                    <th className="px-3 py-2 text-left font-bold">Items</th>
                    <th className="px-3 py-2 text-right font-bold">Total</th>
                    <th className="px-3 py-2 text-right font-bold">Paid</th>
                    <th className="px-3 py-2 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map(([date, list]) => (
                    <Fragment key={date}>
                      <tr className="bg-slate-50">
                        <td colSpan={6} className="px-3 py-1.5 text-xs font-black uppercase tracking-wide text-slate-500">
                          {formatDate(date)} <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px]">{list.length} entry{list.length > 1 ? "ies" : ""}</span>
                        </td>
                      </tr>
                      {list.map((b) => (
                        <tr key={b.id} className="border-b border-slate-100 hover:bg-sky-50/60">
                          <td className="px-3 py-2 font-semibold text-[#0f3d63]">{b.billNo}</td>
                          <td className="px-3 py-2">
                            <Link href={`/customers/${b.customerId}`} className="font-medium hover:text-[#1479c9] hover:underline">
                              {b.customerName}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-slate-600">{b.itemSummary}</td>
                          <td className="px-3 py-2 text-right tabular">{inr(b.totalAmount)}</td>
                          <td className="px-3 py-2 text-right tabular">{inr(b.amountPaid)}</td>
                          <td className="px-3 py-2"><StatusBadge status={b.status} due={b.dueAmount} /></td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title={`${year} — monthly trend`} icon={<CalendarDays className="h-5 w-5" />}>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => inr(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Amount" fill="#1479c9" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Payment" fill="#16a34a" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Due" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: "sky" | "emerald" | "violet" | "rose" }) {
  const tones = {
    sky: "from-sky-50 to-white text-sky-800 ring-sky-100",
    emerald: "from-emerald-50 to-white text-emerald-800 ring-emerald-100",
    violet: "from-violet-50 to-white text-violet-800 ring-violet-100",
    rose: "from-rose-50 to-white text-rose-800 ring-rose-100",
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br p-4 ring-1 ${tones[tone]}`}>
      <p className="text-xl font-black tabular">{value}</p>
      <p className="text-xs font-bold uppercase tracking-wide opacity-75">{label}</p>
    </div>
  );
}
