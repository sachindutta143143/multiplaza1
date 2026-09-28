"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Pencil, Trash2, IndianRupee, Printer, FileSpreadsheet, Layers, CalendarDays } from "lucide-react";
import { Button, ConfirmDialog, EmptyState, Input, Modal, Panel, Select, StatusBadge } from "@/components/ui";
import BillForm from "@/components/bill-form";
import PaymentModal from "@/components/payment-modal";
import { DownloadLink } from "@/components/download-link";
import { apiFetch, useBills } from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/toast";
import { formatDate, inr } from "@/lib/format";
import type { BillDTO } from "@/lib/types";

export default function MobileDashboardView() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: billsData, isLoading } = useBills({});
  const allBills = billsData?.bills ?? [];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editBill, setEditBill] = useState<BillDTO | null>(null);
  const [payBill, setPayBill] = useState<BillDTO | null>(null);
  const [deleteBill, setDeleteBill] = useState<BillDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredBills = useMemo(() => {
    return allBills.filter((b) => {
      const matchSearch =
        !search.trim() ||
        b.billNo.toLowerCase().includes(search.toLowerCase()) ||
        b.customerName.toLowerCase().includes(search.toLowerCase()) ||
        (b.customerMobile && b.customerMobile.includes(search));

      const matchStatus = statusFilter === "all" || b.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [allBills, search, statusFilter]);

  const totals = useMemo(() => {
    return filteredBills.reduce(
      (acc, b) => ({
        count: acc.count + 1,
        total: acc.total + b.totalAmount,
        paid: acc.paid + b.amountPaid,
        due: acc.due + b.dueAmount,
      }),
      { count: 0, total: 0, paid: 0, due: 0 }
    );
  }, [filteredBills]);

  async function confirmDelete() {
    if (!deleteBill) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/bills/${deleteBill.id}`, { method: "DELETE" });
      qc.invalidateQueries({ queryKey: ["bills"] });
      toast.success(`${deleteBill.billNo} deleted`);
      setDeleteBill(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-3 p-2.5 sm:hidden">
      {/* Mobile Header Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0b2f4f] via-[#0d3a63] to-[#1479c9] p-4 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-sky-200">Total Billed</p>
            <p className="mt-0.5 text-2xl font-black tabular">{inr(totals.total)}</p>
          </div>
          <Link href="/new-entry">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-black text-white shadow-md active:scale-95 transition"
            >
              <Plus className="h-4 w-4" /> New Entry
            </button>
          </Link>
        </div>
        <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-white/20 pt-2.5 text-center">
          <div>
            <p className="text-[11px] font-bold text-sky-100">Total Bills</p>
            <p className="text-sm font-black tabular">{totals.count}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-emerald-200">Payment</p>
            <p className="text-sm font-black tabular text-emerald-100">{inr(totals.paid, false)}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-rose-200">Due Balance</p>
            <p className="text-sm font-black tabular text-rose-100">{inr(totals.due, false)}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bill, customer, phone..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs shadow-sm outline-none focus:border-sky-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold shadow-sm outline-none"
        >
          <option value="all">All</option>
          <option value="paid">Paid</option>
          <option value="due">Due</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Bills Cards on Mobile */}
      {isLoading ? (
        <div className="space-y-2 py-2">
          <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
        </div>
      ) : filteredBills.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">
          <p className="text-sm font-bold">No bills found</p>
          <p className="mt-1 text-xs">Tap New Entry above to create your first bill!</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredBills.map((b) => (
            <div
              key={b.id}
              className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm active:bg-sky-50/50 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-black text-[#0f3d63]">{b.billNo}</span>
                    <span className="text-[11px] text-slate-400">· {formatDate(b.billDate)}</span>
                  </div>
                  <p className="mt-0.5 text-sm font-bold text-slate-800">{b.customerName}</p>
                  {b.customerMobile && (
                    <p className="text-xs text-slate-500 tabular">{b.customerMobile}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-600 line-clamp-1">{b.itemSummary}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-black tabular text-slate-900">{inr(b.totalAmount)}</p>
                  <div className="mt-1 flex justify-end">
                    <StatusBadge status={b.status} due={b.dueAmount} />
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-bold">
                <span className="text-slate-500">
                  Paid: <b className="text-emerald-700 tabular">{inr(b.amountPaid)}</b>
                  {b.dueAmount > 0 && (
                    <span className="ml-2 text-rose-600">Due: <b className="tabular">{inr(b.dueAmount)}</b></span>
                  )}
                </span>
                <div className="flex items-center gap-1.5">
                  {b.dueAmount > 0 && (
                    <button
                      type="button"
                      onClick={() => setPayBill(b)}
                      className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200"
                    >
                      Pay
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditBill(b)}
                    className="rounded-lg bg-slate-100 p-1.5 text-slate-600"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteBill(b)}
                    className="rounded-lg bg-rose-50 p-1.5 text-rose-600"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <Modal open={!!editBill} onClose={() => setEditBill(null)} title={editBill ? `Edit ${editBill.billNo}` : ""} size="lg">
        {editBill && <BillForm editBill={editBill} onSaved={() => setEditBill(null)} />}
      </Modal>
      <PaymentModal bill={payBill} onClose={() => setPayBill(null)} />
      <ConfirmDialog
        open={!!deleteBill}
        onClose={() => setDeleteBill(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Bill?"
        message={<>Permanently delete bill <b>{deleteBill?.billNo}</b>?</>}
      />
    </div>
  );
}
