"use client";

import { FilePlus2 } from "lucide-react";
import BillForm from "@/components/bill-form";

export default function NewEntryPage() {
  return (
    <div className="p-3 sm:p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
          <FilePlus2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-black text-[#0f3d63]">New Entry — Customer Billing</h1>
          <p className="text-xs text-slate-500">Create a new bill / service order. Bill number is suggested automatically.</p>
        </div>
      </div>
      <BillForm />
    </div>
  );
}
