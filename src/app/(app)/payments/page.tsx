"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Database,
  IndianRupee,
  FileSpreadsheet,
  Users,
  Clock,
  CheckCircle2,
  ReceiptText,
} from "lucide-react";
import { Button, EmptyState, Panel, Select, Spinner, StatusBadge, TableSkeleton } from "@/components/ui";
import PaymentModal from "@/components/payment-modal";
import { DownloadLink } from "@/components/download-link";
import { apiFetch, useBills, useMeta, useReports } from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/toast";
import { formatDate, formatDateTime, inr } from "@/lib/format";
import type { BillDTO } from "@/lib/types";

export default function PaymentsPage() {
  const { data: meta } = useMeta();
  const year = meta?.latestMonth?.year ?? new Date().getFullYear();
  const { data, isLoading } = useReports(year);
  const { data: billsData, isLoading: billsLoading } = useBills({});
  const allBills = billsData?.bills ?? [];
  const [payBill, setPayBill] = useState<BillDTO | null>(null);
  const qc = useQueryClient();
  const toast = useToast();
  const [filter, setFilter] = useState<"all" | "due" | "pending">("all");

  const totals = useMemo(() => {
    if (!data) return { due: 0, pending: 0, customers: 0 };
    const due = data.outstanding.reduce((s, o) => s + o.due - o.pending, 0);
    const pending = data.outstanding.reduce((s, o) => s + o.pending, 0);
    return { due, pending, customers: data.outstanding.length };
  }, [data]);

  async function optimisticPay(bill: BillDTO) {
    const amount = bill.dueAmount;
    const ctx = ["bills"];
    await qc.cancelQueries({ queryKey: ctx });
    const snaps = qc.getQueriesData<{ bills: BillDTO[] }>({ queryKey: ctx });
    snaps.forEach(([k, v]) => {
      if (v) qc.setQueryData(k, { bills: v.bills.map((b) => (b.id === bill.id ? { ...b, amountPaid: b.totalAmount, dueAmount: 0, status: "paid" as const } : b)) });
    });
    setPayBill(null);
    toast.info(`Recording ${inr(amount)} for ${bill.billNo}…`);
    try {
      await apiFetch(`/api/bills/${bill.id}/payment`, { method: "POST", body: JSON.stringify({ amount, method: "Cash" }) });
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["customer"] });
      toast.success(`${bill.billNo} settled`);
    } catch (e) {
      snaps.forEach(([k, v]) => qc.setQueryData(k, v));
      toast.error(e instanceof Error ? e.message : "Payment failed");
    }
  }

  return (
    <div className="p-3 sm:p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-[#0f3d63]">Payment Summary</h1>
            <p className="text-xs text-slate-500">Outstanding dues, pending payments and collection history</p>
          </div>
        </div>
        <div className="flex gap-2">
          <DownloadLink href="/api/export?kind=outstanding">
            <Button variant="secondary"><FileSpreadsheet className="h-4 w-4" /> Outstanding</Button>
          </DownloadLink>
          <DownloadLink href="/api/export?kind=payments">
            <Button variant="secondary"><ReceiptText className="h-4 w-4" /> Payment Log</Button>
          </DownloadLink>
        </div>
      </div>

      {isLoading || !data ? (
        <TableSkeleton rows={8} cols={5} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={IndianRupee} label="Partially Due" value={inr(totals.due)} tone="rose" />
            <Stat icon={Clock} label="Pending (unpaid)" value={inr(totals.pending)} tone="amber" />
            <Stat icon={Users} label="Customers with dues" value={String(totals.customers)} tone="sky" />
            <Stat icon={CheckCircle2} label="Total outstanding" value={inr(totals.due + totals.pending)} tone="violet" />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <Panel title="Outstanding by customer" icon={<Users className="h-5 w-5" />} bodyClassName="p-0">
              {data.outstanding.length === 0 ? (
                <EmptyState icon={<CheckCircle2 className="h-8 w-8" />} title="All settled 🎉" message="No customer has an outstanding balance." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead className="bg-[#eef5fb] text-xs uppercase text-[#0f3d63]">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold">Customer</th>
                        <th className="px-3 py-2 text-right font-bold">Bills</th>
                        <th className="px-3 py-2 text-right font-bold">Pending</th>
                        <th className="px-3 py-2 text-right font-bold">Total Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.outstanding.map((o) => (
                        <tr key={o.customerId} className="border-b border-slate-100 hover:bg-sky-50/60">
                          <td className="px-3 py-2">
                            <Link href={`/customers/${o.customerId}`} className="font-semibold hover:text-[#1479c9] hover:underline">
                              {o.name}
                            </Link>
                            {o.mobile && <span className="block text-xs text-slate-400 tabular">{o.mobile}</span>}
                          </td>
                          <td className="px-3 py-2 text-right tabular">{o.bills}</td>
                          <td className="px-3 py-2 text-right tabular text-amber-700">{o.pending > 0 ? inr(o.pending) : "—"}</td>
                          <td className="px-3 py-2 text-right font-black tabular text-rose-600">{inr(o.due)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title="Recent payments collected" icon={<ReceiptText className="h-5 w-5" />} bodyClassName="p-0">
              {data.payments.length === 0 ? (
                <EmptyState title="No payments recorded" message="Collected payments will appear here." />
              ) : (
                <div className="max-h-[380px] overflow-auto">
                  <table className="w-full min-w-[440px] text-sm">
                    <thead className="sticky top-0 bg-[#eef5fb] text-xs uppercase text-[#0f3d63]">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold">When</th>
                        <th className="px-3 py-2 text-left font-bold">Bill</th>
                        <th className="px-3 py-2 text-left font-bold">Customer</th>
                        <th className="px-3 py-2 font-bold">Method</th>
                        <th className="px-3 py-2 text-right font-bold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payments.slice(0, 60).map((p) => (
                        <tr key={p.id} className="border-b border-slate-100">
                          <td className="whitespace-nowrap px-3 py-2 text-xs tabular text-slate-500">{formatDateTime(p.createdAt)}</td>
                          <td className="px-3 py-2 font-semibold text-[#0f3d63]">{p.billNo}</td>
                          <td className="px-3 py-2">{p.customerName}</td>
                          <td className="px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold">{p.method}</span></td>
                          <td className="px-3 py-2 text-right font-bold tabular text-emerald-700">{inr(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>

          <UnpaidBills bills={allBills} loading={billsLoading} filter={filter} setFilter={setFilter} onPay={setPayBill} onQuickPay={optimisticPay} />
        </>
      )}
      <PaymentModal bill={payBill} onClose={() => setPayBill(null)} />
    </div>
  );
}

function UnpaidBills({
  bills,
  loading,
  filter,
  setFilter,
  onPay,
  onQuickPay,
}: {
  bills: BillDTO[];
  loading: boolean;
  filter: "all" | "due" | "pending";
  setFilter: (f: "all" | "due" | "pending") => void;
  onPay: (b: BillDTO) => void;
  onQuickPay: (b: BillDTO) => void;
}) {
  const list = bills.filter((b) => b.dueAmount > 0 && (filter === "all" || b.status === filter));
  return (
    <Panel
      className="mt-4"
      title={`Unpaid / partial bills (${list.length})`}
      icon={<Clock className="h-5 w-5" />}
      bodyClassName="p-0"
      actions={
        <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="w-auto py-1 text-xs">
          <option value="all">All open</option>
          <option value="due">Partially due</option>
          <option value="pending">Pending</option>
        </Select>
      }
    >
      {loading ? (
        <Spinner label="Loading bills" />
      ) : list.length === 0 ? (
        <EmptyState icon={<CheckCircle2 className="h-8 w-8" />} title="Nothing pending" message="All bills in this view are fully paid." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-[#eef5fb] text-xs uppercase text-[#0f3d63]">
              <tr>
                <th className="px-3 py-2 text-left font-bold">Date</th>
                <th className="px-3 py-2 text-left font-bold">Bill No.</th>
                <th className="px-3 py-2 text-left font-bold">Customer</th>
                <th className="px-3 py-2 text-right font-bold">Total</th>
                <th className="px-3 py-2 text-right font-bold">Paid</th>
                <th className="px-3 py-2 text-right font-bold">Due</th>
                <th className="px-3 py-2 font-bold">Status</th>
                <th className="px-3 py-2 text-right font-bold">Collect</th>
              </tr>
            </thead>
            <tbody>
              {list.map((b: BillDTO) => (
                <tr key={b.id} className="border-b border-slate-100 hover:bg-sky-50/60">
                  <td className="whitespace-nowrap px-3 py-2 tabular">{formatDate(b.billDate)}</td>
                  <td className="px-3 py-2 font-semibold text-[#0f3d63]">{b.billNo}</td>
                  <td className="px-3 py-2">
                    <Link href={`/customers/${b.customerId}`} className="font-medium hover:underline">{b.customerName}</Link>
                  </td>
                  <td className="px-3 py-2 text-right tabular">{inr(b.totalAmount)}</td>
                  <td className="px-3 py-2 text-right tabular text-emerald-700">{inr(b.amountPaid)}</td>
                  <td className="px-3 py-2 text-right font-black tabular text-rose-600">{inr(b.dueAmount)}</td>
                  <td className="px-3 py-2"><StatusBadge status={b.status} due={b.dueAmount} /></td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => onPay(b)} className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-[#1479c9] hover:bg-sky-100">Payment…</button>
                      <button onClick={() => onQuickPay(b)} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700">Settle full</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Database; label: string; value: string; tone: "sky" | "emerald" | "violet" | "rose" | "amber" }) {
  const tones = {
    sky: "bg-sky-50 text-sky-700 ring-sky-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
  };
  return (
    <div className={`flex items-center gap-3 rounded-xl p-4 ring-1 ${tones[tone]}`}>
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/70"><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-lg font-black leading-tight tabular">{value}</p>
        <p className="text-[11px] font-bold uppercase tracking-wide opacity-75">{label}</p>
      </div>
    </div>
  );
}
