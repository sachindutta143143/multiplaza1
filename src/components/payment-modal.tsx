"use client";

import { useEffect, useState } from "react";
import { IndianRupee } from "lucide-react";
import { Button, Field, Input, Modal, Select } from "@/components/ui";
import { useAddPayment } from "@/lib/hooks";
import { useToast } from "@/components/toast";
import { inr, formatDate } from "@/lib/format";
import type { BillDTO } from "@/lib/types";

export default function PaymentModal({
  bill,
  onClose,
  onPaid,
}: {
  bill: BillDTO | null;
  onClose: () => void;
  onPaid?: (bill: BillDTO) => void;
}) {
  const toast = useToast();
  const addPayment = useAddPayment();
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("Cash");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (bill) {
      setAmount(bill.dueAmount);
      setMethod("Cash");
      setNote("");
    }
  }, [bill]);

  if (!bill) return null;

  async function submit() {
    if (!bill || amount <= 0 || amount > bill.dueAmount + 0.001) {
      toast.error("Enter an amount up to the due balance");
      return;
    }
    try {
      const { bill: updated } = await addPayment.mutateAsync({ id: bill.id, amount, method, note });
      toast.success(`Payment of ${inr(amount)} recorded for ${updated.billNo}`);
      onPaid?.(updated);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record payment");
    }
  }

  return (
    <Modal
      open={!!bill}
      onClose={onClose}
      title={`Record Payment — ${bill.billNo}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="success" loading={addPayment.isPending} onClick={submit}>
            <IndianRupee className="h-4 w-4" /> Record Payment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Customer</span>
            <span className="font-bold">{bill.customerName}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Date</span>
            <span className="tabular">{formatDate(bill.billDate)}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Bill Total</span>
            <span className="tabular">{inr(bill.totalAmount)}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Already Paid</span>
            <span className="tabular text-emerald-700">{inr(bill.amountPaid)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-slate-200 pt-1.5">
            <span className="font-bold text-slate-700">Due Balance</span>
            <span className="font-black tabular text-rose-600">{inr(bill.dueAmount)}</span>
          </div>
        </div>
        <Field label="Amount ₹">
          <Input
            type="number"
            min={0}
            max={bill.dueAmount}
            step="0.01"
            value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value))}
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option>Cash</option>
              <option>UPI</option>
              <option>Card</option>
              <option>Cheque</option>
              <option>Bank Transfer</option>
            </Select>
          </Field>
          <Field label="Note (optional)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. part payment" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
