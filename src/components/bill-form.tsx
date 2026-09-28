"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Save, UserPlus, Wand2 } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { useCatalog, useCustomers, useSaveBill, apiFetch } from "@/lib/hooks";
import { useToast } from "@/components/toast";
import { billTotal, deriveStatus, dueAmount, lineAmount } from "@/lib/billing";
import { inr, todayISO } from "@/lib/format";
import type { BillDTO, BillItemDTO, BillStatus } from "@/lib/types";
import { useRouter } from "next/navigation";

interface DraftLine {
  itemName: string;
  rate: number;
  qty: number;
}

const blankLine = (): DraftLine => ({ itemName: "", rate: 0, qty: 1 });

export default function BillForm({
  editBill,
  onSaved,
  compact = false,
}: {
  editBill?: BillDTO | null;
  onSaved?: (bill: BillDTO) => void;
  compact?: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const { data: custData } = useCustomers();
  const { data: catData } = useCatalog();
  const saveBill = useSaveBill();

  const [billDate, setBillDate] = useState(editBill?.billDate ?? todayISO());
  const [billNo, setBillNo] = useState(editBill?.billNo ?? "");
  const [customerId, setCustomerId] = useState<number | "">(editBill?.customerId ?? "");
  const [orderNo, setOrderNo] = useState(editBill?.orderNo ?? "");
  const [lines, setLines] = useState<DraftLine[]>(
    editBill
      ? editBill.items.map((i: BillItemDTO) => ({ itemName: i.itemName, rate: i.rate, qty: i.qty }))
      : [blankLine()]
  );
  const [paid, setPaid] = useState<number>(editBill?.amountPaid ?? 0);
  const [statusMode, setStatusMode] = useState<BillStatus | "auto">(editBill?.status ?? "auto");
  const [remarks, setRemarks] = useState(editBill?.remarks ?? "");
  const [newCust, setNewCust] = useState(false);
  const [cName, setCName] = useState("");
  const [cMobile, setCMobile] = useState("");
  const [cAddress, setCAddress] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  // Suggest next bill number when date changes (for new bills only)
  useEffect(() => {
    if (editBill) return;
    let alive = true;
    setSuggesting(true);
    apiFetch<{ billNo: string }>(`/api/bills/next-no?date=${billDate}`)
      .then((d) => {
        if (alive && d.billNo && !billNo) {
          setBillNo(d.billNo);
        }
      })
      .catch(() => void 0)
      .finally(() => {
        if (alive) setSuggesting(false);
      });
    return () => {
      alive = false;
    };
  }, [billDate, editBill, billNo]);

  const catalog = catData?.items ?? [];
  const customers = custData?.customers ?? [];

  const total = useMemo(() => billTotal(lines), [lines]);
  const effectivePaid = Math.min(paid || 0, total);
  const autoStatus = deriveStatus(total, effectivePaid);
  const effectiveStatus = statusMode === "auto" ? autoStatus : statusMode;
  const due = dueAmount(total, effectivePaid);

  function updateLine(i: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function pickCatalogItem(i: number, name: string) {
    const match = catalog.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (match) {
      setLines((prev) =>
        prev.map((l, idx) => (idx === i ? { ...l, itemName: match.name, rate: match.defaultRate } : l))
      );
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanLines = lines.filter((l) => l.itemName.trim());
    if (!cleanLines.length) {
      toast.error("Please add at least one item or service.");
      return;
    }
    if (total <= 0) {
      toast.error("Total amount must be greater than zero.");
      return;
    }
    if (!newCust && !customerId) {
      toast.error("Please select an existing customer or click 'New Customer'.");
      return;
    }
    if (newCust && !cName.trim()) {
      toast.error("Please enter the new customer name.");
      return;
    }

    try {
      const payload = {
        ...(editBill ? { id: editBill.id } : {}),
        billNo: billNo.trim(),
        customerId: newCust ? undefined : Number(customerId),
        newCustomer: newCust ? { name: cName.trim(), mobile: cMobile.trim(), address: cAddress.trim() } : undefined,
        billDate,
        orderNo: orderNo.trim() || null,
        items: cleanLines.map((l) => ({
          itemName: l.itemName.trim(),
          rate: Number(l.rate) || 0,
          qty: Number(l.qty) || 1,
        })),
        amountPaid: effectivePaid,
        status: statusMode,
        remarks: remarks.trim() || null,
      };

      const { bill } = await saveBill.mutateAsync(payload);
      toast.success(editBill ? `Bill ${bill.billNo} updated successfully!` : `Bill ${bill.billNo} saved successfully!`);

      if (onSaved) {
        onSaved(bill);
      } else {
        // Redirect to dashboard with view=all so the user immediately sees their new bill
        router.push("/dashboard?view=all");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save bill. Please try again.");
    }
  }

  return (
    <form onSubmit={submit} className={compact ? "" : "rounded-xl border border-slate-200 bg-white p-5 shadow-sm"}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Bill Date">
          <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} required />
        </Field>
        <Field label="Bill No." hint={suggesting ? "Generating serial number..." : undefined}>
          <Input
            value={billNo}
            onChange={(e) => setBillNo(e.target.value.toUpperCase())}
            placeholder="Auto-generated if left blank"
          />
        </Field>
        <Field label="Order No. (Optional)">
          <Input value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="e.g. 123 or Service Call" />
        </Field>
        <Field label="Payment Status">
          <Select value={statusMode} onChange={(e) => setStatusMode(e.target.value as BillStatus | "auto")}>
            <option value="auto">Auto (Calculated from payment)</option>
            <option value="paid">Paid (Fully settled)</option>
            <option value="due">Due (Partial payment)</option>
            <option value="pending">Pending (Unpaid)</option>
          </Select>
        </Field>
      </div>

      {/* Customer Selection / Creation */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Customer Details</p>
          <button
            type="button"
            onClick={() => setNewCust((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              newCust ? "bg-slate-700 text-white" : "bg-[#1479c9] text-white hover:bg-[#0f67b0]"
            }`}
          >
            {newCust ? <UserPlus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {newCust ? "Select Existing Customer" : "+ Add New Customer"}
          </button>
        </div>
        {newCust ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              placeholder="Customer / Business Name *"
              value={cName}
              onChange={(e) => setCName(e.target.value)}
              required
            />
            <Input placeholder="Mobile Number" value={cMobile} onChange={(e) => setCMobile(e.target.value)} />
            <Input placeholder="Address / Location" value={cAddress} onChange={(e) => setCAddress(e.target.value)} />
          </div>
        ) : (
          <Select value={customerId} onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">-- Choose Existing Customer --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.mobile ? `(${c.mobile})` : ""} {c.address ? `- ${c.address}` : ""}
              </option>
            ))}
          </Select>
        )}
      </div>

      {/* Bill Items Table */}
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-[#eef5fb] text-xs uppercase tracking-wide text-[#0f3d63]">
            <tr>
              <th className="px-3 py-2.5 text-left font-bold">Item / Description</th>
              <th className="w-28 px-3 py-2.5 text-right font-bold">Rate (₹)</th>
              <th className="w-24 px-3 py-2.5 text-right font-bold">Quantity</th>
              <th className="w-32 px-3 py-2.5 text-right font-bold">Amount</th>
              <th className="w-12 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-2 py-1.5">
                  <input
                    list="catalog-list"
                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-sky-400"
                    value={l.itemName}
                    placeholder="Type item or select (e.g. Toner, Drum, Service)"
                    onChange={(e) => updateLine(i, { itemName: e.target.value })}
                    onBlur={(e) => pickCatalogItem(i, e.target.value)}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-right tabular outline-none focus:border-sky-400"
                    value={l.rate || ""}
                    placeholder="0"
                    onChange={(e) => updateLine(i, { rate: Number(e.target.value) })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min={1}
                    step="1"
                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-right tabular outline-none focus:border-sky-400"
                    value={l.qty}
                    onChange={(e) => updateLine(i, { qty: Number(e.target.value) })}
                  />
                </td>
                <td className="px-3 py-1.5 text-right font-bold tabular text-slate-800">
                  {inr(lineAmount(l.rate, l.qty))}
                </td>
                <td className="px-2 text-center">
                  <button
                    type="button"
                    onClick={() => setLines((prev) => (prev.length > 1 ? prev.filter((_, x) => x !== i) : prev))}
                    className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <datalist id="catalog-list">
          {catalog.map((c) => (
            <option key={c.id} value={c.name}>
              ₹{c.defaultRate} · {c.category}
            </option>
          ))}
        </datalist>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-3 py-2.5">
          <button
            type="button"
            onClick={() => setLines((p) => [...p, blankLine()])}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200/80 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Add Another Item
          </button>
          <div className="flex items-center gap-6 text-sm">
            <span className="font-bold text-slate-700">
              Total Amount: <span className="text-base text-[#0f3d63] font-black">{inr(total)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Payment and Due Calculation */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Amount Paid Now (₹)">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={paid || ""}
            placeholder="0"
            onChange={(e) => setPaid(Number(e.target.value))}
          />
        </Field>
        <Field label="Due Amount (Balance)">
          <div className="flex h-[38px] items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold tabular text-rose-600">
            {inr(Math.max(0, due))}
          </div>
        </Field>
        <Field label="Quick Actions">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1 px-2 text-xs"
              onClick={() => setPaid(total)}
            >
              <Wand2 className="h-3.5 w-3.5" /> Full Paid
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1 px-2 text-xs"
              onClick={() => setPaid(0)}
            >
              Unpaid (Full Due)
            </Button>
          </div>
        </Field>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label={`Calculated Status: ${effectiveStatus.toUpperCase()}`}>
          <div
            className={`flex h-[38px] items-center rounded-lg px-3 text-sm font-bold ${
              effectiveStatus === "paid"
                ? "bg-emerald-50 text-emerald-700"
                : effectiveStatus === "due"
                ? "bg-rose-50 text-rose-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {effectiveStatus === "paid"
              ? "Fully Paid (Settled)"
              : effectiveStatus === "due"
              ? `${inr(due)} Outstanding Balance`
              : "Payment Pending"}
          </div>
        </Field>
        <Field label="Notes / Remarks">
          <Input
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional remarks (e.g. Received via UPI / Next visit payment)"
          />
        </Field>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/dashboard")}
        >
          Cancel
        </Button>
        <Button type="submit" variant="success" loading={saveBill.isPending} className="px-6 py-2">
          <Save className="h-4 w-4" />
          {editBill ? "Update Bill" : "Save & Print Bill"}
        </Button>
      </div>
    </form>
  );
}
