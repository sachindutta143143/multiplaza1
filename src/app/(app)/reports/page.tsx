"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  FileSpreadsheet,
  TrendingUp,
  Users,
  Package,
  PieChart as PieIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Button, Panel, Select, Spinner, TableSkeleton } from "@/components/ui";
import { DownloadLink } from "@/components/download-link";
import { useMeta, useReports } from "@/lib/hooks";
import { inr } from "@/lib/format";

const PIE_COLORS = ["#16a34a", "#ef4444", "#f59e0b"];

export default function ReportsPage() {
  const { data: meta } = useMeta();
  const [year, setYear] = useState(meta?.latestMonth?.year ?? new Date().getFullYear());
  useEffect(() => {
    if (meta?.latestMonth?.year) setYear(meta.latestMonth.year);
  }, [meta]);
  const { data, isLoading } = useReports(year);

  const monthlyData = useMemo(
    () =>
      (data?.monthly ?? []).map((m) => ({
        month: m.label.slice(0, 3),
        Amount: m.totalAmount,
        Payment: m.totalPayment,
        Due: m.totalDue,
        Bills: m.totalBills,
      })),
    [data]
  );

  const topData = useMemo(
    () => [...(data?.topCustomers ?? [])].slice(0, 8).map((t) => ({ name: t.name.split(" ")[0], full: t.name, Business: t.amount, Collected: t.paid })),
    [data]
  );

  const pieData = data
    ? [
        { name: "Paid", value: data.status.paidCount },
        { name: "Due", value: data.status.dueCount },
        { name: "Pending", value: data.status.pendingCount },
      ].filter((p) => p.value > 0)
    : [];

  return (
    <div className="p-3 sm:p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-700">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-[#0f3d63]">Reports &amp; Analytics</h1>
            <p className="text-xs text-slate-500">Business performance, payments and item sales</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-auto py-1.5">
            {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
          <DownloadLink href={`/api/export?kind=monthly&year=${year}`}>
            <Button variant="secondary"><FileSpreadsheet className="h-4 w-4" /> Monthly Excel</Button>
          </DownloadLink>
          <DownloadLink href={`/api/export?kind=items&year=${year}`}>
            <Button variant="secondary"><Package className="h-4 w-4" /> Item Excel</Button>
          </DownloadLink>
        </div>
      </div>

      {isLoading || !data ? (
        <TableSkeleton rows={10} cols={5} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <YearStat label="Total Bills" value={String(data.totals.bills)} icon={BarChart3} tone="sky" />
            <YearStat label="Total Amount" value={inr(data.totals.amount)} icon={TrendingUp} tone="emerald" />
            <YearStat label="Collected" value={inr(data.totals.payment)} icon={TrendingUp} tone="violet" />
            <YearStat label="Outstanding" value={inr(data.totals.due)} icon={TrendingUp} tone="rose" />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <Panel className="xl:col-span-2" title={`Amount vs Collection — ${year}`} icon={<BarChart3 className="h-5 w-5" />}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={64} tickFormatter={(v) => `₹${Number(v) / 1000}k`} />
                  <Tooltip formatter={(v) => inr(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Amount" fill="#1479c9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Payment" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Due" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title={`Payment Status — ${year}`} icon={<PieIcon className="h-5 w-5" />}>
              {pieData.length === 0 ? (
                <Empty label="No bills this year" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={90} label={(d) => `${d.value}`}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Panel>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <Panel className="xl:col-span-2" title="Collection trend" icon={<TrendingUp className="h-5 w-5" />}>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gAmt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1479c9" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#1479c9" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gPay" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={64} tickFormatter={(v) => `₹${Number(v) / 1000}k`} />
                  <Tooltip formatter={(v) => inr(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="Amount" stroke="#1479c9" fill="url(#gAmt)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Payment" stroke="#16a34a" fill="url(#gPay)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Bills per month" icon={<BarChart3 className="h-5 w-5" />}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyData} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="Bills" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <Panel title="Top customers by business" icon={<Users className="h-5 w-5" />}>
              {topData.length === 0 ? (
                <Empty label="No customer data" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart layout="vertical" data={topData} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${Number(v) / 1000}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                    <Tooltip formatter={(v) => inr(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Business" fill="#1479c9" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Collected" fill="#16a34a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel title={`Item-wise sales — ${year}`} icon={<Package className="h-5 w-5" />} bodyClassName="p-0">
              {data.items.length === 0 ? (
                <Empty label="No item sales recorded" />
              ) : (
                <div className="max-h-[320px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[#eef5fb] text-xs uppercase text-[#0f3d63]">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold">Item</th>
                        <th className="px-3 py-2 text-right font-bold">Bills</th>
                        <th className="px-3 py-2 text-right font-bold">Qty</th>
                        <th className="px-3 py-2 text-right font-bold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((it) => (
                        <tr key={it.item} className="border-b border-slate-100 hover:bg-sky-50/60">
                          <td className="px-3 py-2 font-medium">{it.item}</td>
                          <td className="px-3 py-2 text-right tabular">{it.bills}</td>
                          <td className="px-3 py-2 text-right tabular">{it.qty}</td>
                          <td className="px-3 py-2 text-right font-bold tabular">{inr(it.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function YearStat({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof BarChart3; tone: "sky" | "emerald" | "violet" | "rose" }) {
  const tones = {
    sky: "bg-sky-50 text-sky-700 ring-sky-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
  };
  return (
    <div className={`flex items-center gap-3 rounded-xl p-4 ring-1 ${tones[tone]}`}>
      <div className="grid h-11 w-11 place-items-center rounded-lg bg-white/70">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-lg font-black leading-tight tabular">{value}</p>
        <p className="text-[11px] font-bold uppercase tracking-wide opacity-75">{label}</p>
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="grid h-[260px] place-items-center text-sm text-slate-400">
      {label}
    </div>
  );
}
