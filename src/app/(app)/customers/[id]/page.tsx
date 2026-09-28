"use client";

import { useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Mail,
  Pencil,
  Trash2,
  IndianRupee,
  ClipboardList,
  FileSpreadsheet,
  Hash,
} from "lucide-react";
import { Button, ConfirmDialog, EmptyState, Modal, Panel, Spinner, StatusBadge } from "@/components/ui";
import CustomerFormModal from "@/components/customer-form-modal";
import BillForm from "@/components/bill-form";
import PaymentModal from "@/components/payment-modal";
import { DownloadLink } from "@/components/download-link";
import { apiFetch, useCustomer } from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/toast";
import { useRouter } from "next/navigation";
import { formatDate, inr } from "@/lib/format";
import type { BillDTO } from "@/lib/types";

export default function CustomerLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const customerId = Number(id);
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { data, isLoading, error } = useCustomer(customerId);

  const [editCust, setEditCust] = useState(false);
  const [editBill, setEditBill] = useState<BillDTO | null>(null);
  const [payBill, setPayBill] = useState<BillDTO | null>(null);
  const [deleteBill, setDeleteBill] = useState<BillDTO | null>(null);
  const [deleteCust, setDeleteCust] = useState(false);
  const [busy, setBusy] = useState(false);

  async function removeBill() {
    if (!deleteBill) return;
    const b = deleteBill;
    setBusy(true);
    try {
      await apiFetch(`/api/bills/${b.id}`, { method: "DELETE" });
      toast.success(`${b.billNo} deleted`);
      qc.invalidateQueries({ queryKey: ["customer", customerId] });
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      setDeleteBill(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeCustomer() {
    setBusy(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Delete failed");
      }
      toast.success("Customer deleted");
      router.push("/customers");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
      setBusy(false);
      setDeleteCust(false);
    }
  }

  if (isLoading) return <Spinner label="Loading customer ledger" />;
  if (error || !data)
    return (
      <div className="p-6">
        <EmptyState title="Customer not found" message="This customer may have been deleted." action={<Link href="/customers"><Button>Back to customers</Button></Link>} />
      </div>
    );

  const { customer, stats, recentBills } = data;
  const bills = [...recentBills].sort((a, b) => b.billDate.localeCompare(a.billDate) || b.id - a.id);

  return (
    <div className="p-3 sm:p-4">
      <Link href="/customers" className="mb-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#1479c9] hover:underline">
        <ArrowLeft className="h-4 w-4" /> All customers
      </Link>

      <Panel className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#1479c9] to-[#0b2f4f] text-xl font-black text-white">
              {customer.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800">{customer.name}</h1>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {customer.mobile || "—"}</span>
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {customer.email || "—"}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {customer.address || "—"}</span>
                {customer.gstin && <span className="flex items-center gap-1 font-semibold"><Hash className="h-3.5 w-3.5" /> {customer.gstin}</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditCust(true)}><Pencil className="h-4 w-4" /> Edit</Button>
            <Button variant="danger" onClick={() => setDeleteCust(true)}><Trash2 className="h-4 w-4" /> Delete</Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total Orders" value={String(stats.orderCount)} tone="sky" />
          <Stat label="Total Amount" value={inr(stats.totalAmount)} tone="emerald" />
          <Stat label="Total Payment" value={inr(stats.totalPayment)} tone="violet" />
          <Stat label="Total Due" value={inr(stats.totalDue)} tone="rose" />
        </div>
      </Panel>

      <Panel
        title={`Order Ledger (${bills.length})`}
        icon={<ClipboardList className="h-5 w-5" />}
        bodyClassName="p-0"
        actions={
          <DownloadLink href={`/api/export?kind=bills&customerId=${customer.id}&from=2000-01-01&to=2099-12-31`}>
            <Button variant="secondary" className="px-3 py-1 text-xs"><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</Button>
          </DownloadLink>
        }
      >
        {bills.length === 0 ? (
          <EmptyState title="No orders yet" message="Bills for this customer will appear here." action={<Link href="/new-entry"><Button variant="success">New Entry</Button></Link>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-[#eef5fb] text-xs uppercase text-[#0f3d63]">
                <tr>
                  <th className="px-3 py-2 text-left font-bold">Date</th>
                  <th className="px-3 py-2 text-left font-bold">Bill No.</th>
                  <th className="px-3 py-2 text-left font-bold">Items</th>
                  <th className="px-3 py-2 text-right font-bold">Total</th>
                  <th className="px-3 py-2 text-right font-bold">Paid</th>
                  <th className="px-3 py-2 text-right font-bold">Due</th>
                  <th className="px-3 py-2 font-bold">Status</th>
                  <th className="px-3 py-2 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100 hover:bg-sky-50/60">
                    <td className="whitespace-nowrap px-3 py-2 tabular">{formatDate(b.billDate)}</td>
                    <td className="px-3 py-2 font-semibold text-[#0f3d63]">{b.billNo}</td>
                    <td className="px-3 py-2" title={b.items.map((i) => `${i.itemName} ×${i.qty}`).join(", ")}>{b.itemSummary}</td>
                    <td className="px-3 py-2 text-right tabular">{inr(b.totalAmount)}</td>
                    <td className="px-3 py-2 text-right tabular text-emerald-700">{inr(b.amountPaid)}</td>
                    <td className="px-3 py-2 text-right tabular text-rose-600">{inr(b.dueAmount)}</td>
                    <td className="px-3 py-2"><StatusBadge status={b.status} due={b.dueAmount} /></td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        {b.dueAmount > 0 && (
                          <button title="Record payment" onClick={() => setPayBill(b)} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50">
                            <IndianRupee className="h-4 w-4" />
                          </button>
                        )}
                        <button title="Edit bill" onClick={() => setEditBill(b)} className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button title="Delete bill" onClick={() => setDeleteBill(b)} className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <CustomerFormModal open={editCust} customer={customer} onClose={() => setEditCust(false)} />
      <Modal open={!!editBill} onClose={() => setEditBill(null)} title={editBill ? `Edit Bill ${editBill.billNo}` : ""} size="xl">
        {editBill && <BillForm editBill={editBill} onSaved={() => setEditBill(null)} />}
      </Modal>
      <PaymentModal bill={payBill} onClose={() => setPayBill(null)} />
      <ConfirmDialog
        open={!!deleteBill}
        onClose={() => setDeleteBill(null)}
        onConfirm={removeBill}
        loading={busy}
        title="Delete bill?"
        message={<>Bill <b>{deleteBill?.billNo}</b> ({inr(deleteBill?.totalAmount ?? 0)}) will be permanently deleted.</>}
      />
      <ConfirmDialog
        open={deleteCust}
        onClose={() => setDeleteCust(false)}
        onConfirm={removeCustomer}
        loading={busy}
        title="Delete customer?"
        message={<>Customer <b>{customer.name}</b> will be permanently deleted. This works only when they have no bills.</>}
      />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "sky" | "emerald" | "violet" | "rose" }) {
  const tones = {
    sky: "bg-sky-50 text-sky-800 ring-sky-100",
    emerald: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    violet: "bg-violet-50 text-violet-800 ring-violet-100",
    rose: "bg-rose-50 text-rose-800 ring-rose-100",
  };
  return (
    <div className={`rounded-xl p-3 ring-1 ${tones[tone]}`}>
      <p className="text-lg font-black tabular">{value}</p>
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
}
