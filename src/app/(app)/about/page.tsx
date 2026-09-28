"use client";

import Link from "next/link";
import {
  Printer,
  ShieldCheck,
  BarChart3,
  Database,
  LifeBuoy,
  FileSpreadsheet,
  Users,
  ReceiptText,
  Cpu,
} from "lucide-react";
import { Panel } from "@/components/ui";

const FEATURES = [
  { icon: ReceiptText, title: "Billing & Orders", text: "Create bills with multiple items/services, auto bill numbers, order numbers and remarks." },
  { icon: Users, title: "Customer Management", text: "Customer profiles with mobile, address, email, GSTIN, full ledger and outstanding view." },
  { icon: BarChart3, title: "Charts & Reports", text: "Month-wise summaries, payment status pie, trends, top customers and item sales analytics." },
  { icon: Database, title: "Persistent Storage", text: "All data lives safely in a PostgreSQL database on this computer." },
  { icon: LifeBuoy, title: "Backup & Email Copy", text: "One-click JSON backup to this computer plus an email-ready copy; restore any time." },
  { icon: FileSpreadsheet, title: "Excel & Print", text: "Export bills, customers, monthly, item, payment and outstanding reports to Excel." },
  { icon: ShieldCheck, title: "Protected Login", text: "Password-protected access with encrypted passwords and secure session cookies." },
  { icon: Cpu, title: "Desktop-style UI", text: "Built for shop-floor use — fast, responsive, with optimistic updates and empty/loading states." },
];

export default function AboutPage() {
  return (
    <div className="p-3 sm:p-4">
      <Panel className="overflow-hidden">
        <div className="flex flex-col items-center gap-5 bg-gradient-to-br from-[#0b2f4f] to-[#14507f] px-6 py-10 text-center text-white sm:py-12">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-xl">
            <Printer className="h-9 w-9 text-[#0b2f4f]" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Multi Plaza</h1>
            <p className="mt-1 text-sm font-medium text-sky-100/90">Customer Order &amp; Billing Management</p>
            <p className="mt-1 text-xs uppercase tracking-[0.3em] text-sky-200/80">Sales • Service • Support</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 text-xs font-bold">
            {["KONICA MINOLTA", "TOSHIBA", "RICOH", "DUPLO"].map((b, i) => (
              <span key={b} className={`rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20 ${i === 1 ? "text-rose-200" : "text-sky-100"}`}>
                {b}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-sky-300 hover:shadow-md">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-50 text-[#1479c9]">
                <f.icon className="h-5 w-5" />
              </div>
              <p className="mt-2 text-sm font-bold text-slate-800">{f.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{f.text}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 px-6 py-5 text-center text-xs text-slate-500">
          <p className="font-semibold text-slate-600">Version 1.0</p>
          <p className="mt-1">
            Built with Next.js, PostgreSQL (Drizzle ORM), Recharts and ExcelJS. Demo login:{" "}
            <span className="font-bold text-slate-700">admin / admin123</span>
          </p>
          <Link href="/dashboard" className="mt-3 inline-block rounded-lg bg-[#1479c9] px-5 py-2 text-sm font-bold text-white hover:bg-[#0f67b0]">
            Go to Dashboard
          </Link>
        </div>
      </Panel>
    </div>
  );
}
