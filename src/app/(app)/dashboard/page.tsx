"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CalendarDays,
  FileSpreadsheet,
  Printer,
  Plus,
  Search,
  Pencil,
  Trash2,
  IndianRupee,
  UserRound,
  ClipboardList,
  BarChart3,
  Users,
  Package,
  Database,
  FileX2,
  Phone,
  MapPin,
  RotateCcw,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  Panel,
  Select,
  Spinner,
  StatusBadge,
  TableSkeleton,
} from "@/components/ui";
import BillForm from "@/components/bill-form";
import PaymentModal from "@/components/payment-modal";
import { DownloadLink } from "@/components/download-link";
import MobileDashboardView from "@/components/mobile-dashboard-view";
import {
  apiFetch,
  qk,
  useBills,
  useCustomer,
  useCustomers,
  useMeta,
  useReports,
  type ReportsData,
} from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/toast";
import { MONTHS, formatDate, inr, todayISO } from "@/lib/format";
import type { BillDTO } from "@/lib/types";

interface AppliedFilter {
  from: string;
  to: string;
  customerId: number | "";
}

function monthRange(year: number, month: number) {
  const mm = String(month).padStart(2, "0");
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${new Date(year, month, 0).getDate()}` };
}

function DashboardInner() {
  const toast = useToast();
  const qc = useQueryClient();
  const router = useRouter();
  const params = useSearchParams();
  const { data: meta, isLoading: metaLoading } = useMeta();
  const currentYear = new Date().getFullYear();
  const { data: reportsData, isLoading: reportsLoading } = useReports(meta?.latestMonth?.year ?? currentYear);

  const [year, setYear] = useState(meta?.latestMonth?.year ?? currentYear);
  // Default to "all" months so all bills (past demo bills + today's newly created bills) are ALWAYS visible!
  const [month, setMonth] = useState<number | "all">("all");
  const [fromDraft, setFromDraft] = useState("");
  const [toDraft, setToDraft] = useState("");
  const [customerDraft, setCustomerDraft] = useState<number | "">("");
  const [searchDraft, setSearchDraft] = useState("");

  // Default applied filter shows ALL bills from all time so no entry is ever hidden!
  const [applied, setApplied] = useState<AppliedFilter>({
    from: "2000-01-01",
    to: "2099-12-31",
    customerId: "",
  });
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [editBill, setEditBill] = useState<BillDTO | null>(null);
  const [payBill, setPayBill] = useState<BillDTO | null>(null);
  const [deleteBill, setDeleteBill] = useState<BillDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Clear demo data confirmation
  const [confirmClearData, setConfirmClearData] = useState(false);
  const [clearingData, setClearingData] = useState(false);

  const { data: custData } = useCustomers();
  const customers = custData?.customers ?? [];

  // Check URL token (e.g. from mobile one-tap demo redirect: /dashboard?token=xyz)
  useEffect(() => {
    const urlToken = params.get("token");
    if (urlToken) {
      const { setStoredToken } = require("@/lib/hooks");
      setStoredToken(urlToken);
    }
  }, [params]);

  // Handle URL query parameters without hiding all records by default
  useEffect(() => {
    const initCustomer = params.get("customer");
    if (initCustomer) {
      setSelectedCustomer(Number(initCustomer));
      setCustomerDraft(Number(initCustomer));
      setApplied((prev) => ({ ...prev, customerId: Number(initCustomer) }));
    }

    if (params.get("today") === "1") {
      const today = todayISO();
      setFromDraft(today);
      setToDraft(today);
      setApplied({ from: today, to: today, customerId: initCustomer ? Number(initCustomer) : "" });
    }
  }, [params]);

  const billsQuery = useBills({
    from: applied?.from,
    to: applied?.to,
    customerId: applied?.customerId === "" ? undefined : applied?.customerId,
    search: searchDraft || undefined,
    enabled: !!applied,
  });
  const bills = billsQuery.data?.bills ?? [];

  // Default selected customer if none selected yet
  useEffect(() => {
    if (!selectedCustomer && bills.length > 0) {
      setSelectedCustomer(bills[0].customerId);
    }
  }, [bills, selectedCustomer]);

  const customerPanel = useCustomer(selectedCustomer);

  const summary = useMemo(() => {
    const s = { bills: 0, amount: 0, payment: 0, due: 0, paidCount: 0, dueCount: 0, pendingCount: 0 };
    for (const b of bills) {
      s.bills++;
      s.amount += b.totalAmount;
      s.payment += b.amountPaid;
      s.due += b.dueAmount;
      if (b.status === "paid") s.paidCount++;
      else if (b.status === "due") s.dueCount++;
      else s.pendingCount++;
    }
    return s;
  }, [bills]);

  const pieData = [
    { name: "Paid", value: summary.paidCount, color: "#16a34a" },
    { name: "Due", value: summary.dueCount, color: "#ef4444" },
    { name: "Pending", value: summary.pendingCount, color: "#f59e0b" },
  ].filter((d) => d.value > 0);

  function applyFilters() {
    let range;
    if (fromDraft || toDraft) {
      range = { from: fromDraft || `${year}-01-01`, to: toDraft || `${year}-12-31` };
    } else if (month === "all") {
      range = { from: `${year}-01-01`, to: `${year}-12-31` };
    } else {
      range = monthRange(year, month);
    }
    setApplied({ ...range, customerId: customerDraft });
  }

  function showAllRecords() {
    setMonth("all");
    setFromDraft("");
    setToDraft("");
    setCustomerDraft("");
    setSearchDraft("");
    setApplied({ from: "2000-01-01", to: "2099-12-31", customerId: "" });
  }

  function setToday() {
    const t = todayISO();
    setFromDraft(t);
    setToDraft(t);
    setApplied({ from: t, to: t, customerId: customerDraft });
  }

  // Clean base URL for Excel export (SSR and initial render match 100%)
  const exportUrl = useMemo(() => {
    if (!applied) return "#";
    const sp = new URLSearchParams({ kind: "bills", from: applied.from, to: applied.to });
    if (applied.customerId) sp.set("customerId", String(applied.customerId));
    if (searchDraft) sp.set("search", searchDraft);
    return `/api/export?${sp.toString()}`;
  }, [applied, searchDraft]);

  // ---------- Delete bill ----------
  async function confirmDelete() {
    if (!deleteBill) return;
    const target = deleteBill;
    setDeleting(true);
    const ctxKey = ["bills"];
    await qc.cancelQueries({ queryKey: ctxKey });
    const snapshots = qc.getQueriesData<{ bills: BillDTO[] }>({ queryKey: ctxKey });
    snapshots.forEach(([key, data]) => {
      if (data) {
        qc.setQueryData(key, { ...data, bills: data.bills.filter((b) => b.id !== target.id) });
      }
    });
    setDeleteBill(null);
    toast.info(`Deleting ${target.billNo}...`);
    try {
      await apiFetch(`/api/bills/${target.id}`, { method: "DELETE" });
      qc.invalidateQueries({ queryKey: ctxKey });
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["customer"] });
      toast.success(`${target.billNo} deleted successfully.`);
    } catch (e) {
      snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(e instanceof Error ? e.message : "Failed to delete bill.");
    } finally {
      setDeleting(false);
    }
  }

  // ---------- Settle payment ----------
  async function quickPay(bill: BillDTO) {
    const amount = bill.dueAmount;
    toast.info(`Recording payment of ${inr(amount)} for ${bill.billNo}...`);
    try {
      await apiFetch<{ bill: BillDTO }>(`/api/bills/${bill.id}/payment`, {
        method: "POST",
        body: JSON.stringify({ amount, method: "Cash" }),
      });
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["customer"] });
      toast.success(`Bill ${bill.billNo} marked as fully paid!`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
    }
  }

  // ---------- Clear Demo Data ----------
  async function handleClearDemoData() {
    setClearingData(true);
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>("/api/data/manage", {
        method: "POST",
        body: JSON.stringify({ action: "clear", keepCustomers: false }),
      });
      toast.success(res.message || "All demo bills and customers cleared! Your app is now ready for your shop.");
      qc.invalidateQueries();
      setConfirmClearData(false);
      showAllRecords();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to clear demo data.");
    } finally {
      setClearingData(false);
    }
  }

  const rangeLabel =
    month === "all" && !fromDraft && !toDraft
      ? "All Billing Records"
      : month !== "all" && !fromDraft && !toDraft
      ? `Records - ${MONTHS[(month as number) - 1]} ${year}`
      : `Records (${formatDate(applied.from)} to ${formatDate(applied.to)})`;

  return (
    <>
      {/* Dedicated Touch-Responsive Mobile Cards View (< 640px) */}
      <MobileDashboardView />

      {/* Desktop Full Table & Analytics View (>= 640px) */}
      <div className="hidden sm:block p-3 sm:p-4 space-y-4">
        {/* Filter bar */}
        <Panel className="no-print" bodyClassName="p-3 sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[auto_auto_auto_1fr_auto] lg:items-end">
          <h2 className="col-span-full text-sm font-black uppercase tracking-wide text-[#0f3d63] lg:sr-only">
            Filter Records
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:flex lg:items-center">
            <label className="text-sm">
              <span className="mr-1 font-semibold text-slate-600">Month:</span>
              <Select
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value === "all" ? "all" : Number(e.target.value));
                  setFromDraft("");
                  setToDraft("");
                }}
                className="mt-0 inline-block w-auto py-1.5"
              >
                <option value="all">All Months</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm">
              <span className="mr-1 font-semibold text-slate-600">Year:</span>
              <Select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="mt-0 inline-block w-auto py-1.5"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm">
              <span className="mr-1 font-semibold text-slate-600">Customer:</span>
              <Select
                value={customerDraft}
                onChange={(e) => setCustomerDraft(e.target.value ? Number(e.target.value) : "")}
                className="mt-0 w-auto py-1.5"
              >
                <option value="">All Customers</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mr-1 font-semibold text-slate-600">From Date:</span>
              <Input
                type="date"
                value={fromDraft}
                onChange={(e) => setFromDraft(e.target.value)}
                className="mt-0 py-1.5"
              />
            </label>
            <label className="text-sm">
              <span className="mr-1 font-semibold text-slate-600">To Date:</span>
              <Input
                type="date"
                value={toDraft}
                onChange={(e) => setToDraft(e.target.value)}
                className="mt-0 py-1.5"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search Bill No / Order / Name"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                className="py-1.5 pl-8"
              />
            </div>
            <Button onClick={applyFilters} className="px-5">
              <Search className="h-4 w-4" /> Show
            </Button>
          </div>

          <div className="col-span-full flex flex-wrap gap-2 lg:col-span-5 pt-1 border-t border-slate-100">
            <Link href="/new-entry">
              <Button variant="success" className="px-5 font-bold">
                <Plus className="h-4 w-4" /> New Entry
              </Button>
            </Link>
            <DownloadLink href={exportUrl}>
              <Button className="bg-[#1f5fa8] px-5 hover:bg-[#1a4f8b]">
                <FileSpreadsheet className="h-4 w-4" /> Export (Excel)
              </Button>
            </DownloadLink>
            <Button variant="danger" className="px-5" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="secondary" onClick={setToday}>
              <CalendarDays className="h-4 w-4" /> Today
            </Button>
            <Button variant="secondary" onClick={showAllRecords}>
              <Layers className="h-4 w-4" /> Show All Records
            </Button>
          </div>
        </div>
      </Panel>

      {/* Main Grid: Records Table + Right Customer Panel */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left Column: Records & Summary Charts */}
        <div className="space-y-4">
          <Panel
            id="print-area"
            title={
              <>
                {rangeLabel} <span className="text-slate-500 font-normal">(Total Bills: {summary.bills})</span>
              </>
            }
            icon={<ClipboardList className="h-5 w-5" />}
            bodyClassName="p-0"
            actions={
              <span className="hidden text-xs font-medium text-slate-400 sm:block">
                Click any row to inspect customer history
              </span>
            }
          >
            {billsQuery.isLoading ? (
              <TableSkeleton rows={8} cols={10} />
            ) : bills.length === 0 ? (
              <EmptyState
                icon={<FileX2 className="h-8 w-8" />}
                title="No billing records found"
                message="There are no bills matching your current filter. Create a new bill entry or click 'Show All Records'."
                action={
                  <div className="flex gap-2">
                    <Link href="/new-entry">
                      <Button variant="success">
                        <Plus className="h-4 w-4" /> Create First Entry
                      </Button>
                    </Link>
                    <Button variant="secondary" onClick={showAllRecords}>
                      Show All Records
                    </Button>
                  </div>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#1f5fa8] to-[#2a74bd] text-left text-xs uppercase tracking-wide text-white">
                      <th className="px-3 py-2.5 font-bold">Sl. No.</th>
                      <th className="px-3 py-2.5 font-bold">Date</th>
                      <th className="px-3 py-2.5 font-bold">Bill No.</th>
                      <th className="px-3 py-2.5 font-bold">Customer</th>
                      <th className="px-3 py-2.5 font-bold">Order No.</th>
                      <th className="px-3 py-2.5 font-bold">Items</th>
                      <th className="px-3 py-2.5 text-right font-bold">Rate</th>
                      <th className="px-3 py-2.5 text-right font-bold">Qty</th>
                      <th className="px-3 py-2.5 text-right font-bold">Total</th>
                      <th className="px-3 py-2.5 text-right font-bold">Payment</th>
                      <th className="px-3 py-2.5 font-bold">Status / Remarks</th>
                      <th className="no-print px-3 py-2.5 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((b, i) => {
                      const first = b.items[0];
                      return (
                        <tr
                          key={b.id}
                          onClick={() => setSelectedCustomer(b.customerId)}
                          className={`cursor-pointer border-b border-slate-100 text-slate-700 transition-colors hover:bg-sky-50/70 ${
                            selectedCustomer === b.customerId ? "bg-sky-100/70" : ""
                          }`}
                        >
                          <td className="px-3 py-2 tabular">{i + 1}</td>
                          <td className="whitespace-nowrap px-3 py-2 tabular">{formatDate(b.billDate)}</td>
                          <td className="whitespace-nowrap px-3 py-2 font-semibold text-[#0f3d63]">{b.billNo}</td>
                          <td className="px-3 py-2 font-medium">{b.customerName}</td>
                          <td className="px-3 py-2">{b.orderNo ?? "-"}</td>
                          <td className="px-3 py-2" title={b.items.map((x) => `${x.itemName} (${x.qty})`).join(", ")}>
                            {b.itemSummary}
                          </td>
                          <td className="px-3 py-2 text-right tabular">{first ? inr(first.rate, false) : "-"}</td>
                          <td className="px-3 py-2 text-right tabular">{b.items.reduce((s, x) => s + x.qty, 0)}</td>
                          <td className="px-3 py-2 text-right font-bold tabular">{inr(b.totalAmount, false)}</td>
                          <td className="px-3 py-2 text-right tabular">
                            <span
                              className={
                                b.status === "paid"
                                  ? "font-semibold text-emerald-700"
                                  : b.status === "due"
                                  ? "font-semibold text-rose-700"
                                  : "font-semibold text-amber-700"
                              }
                            >
                              {inr(b.amountPaid, false)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-col gap-1">
                              <StatusBadge status={b.status} due={b.dueAmount} />
                              {b.remarks && <span className="text-[11px] text-slate-500">{b.remarks}</span>}
                            </div>
                          </td>
                          <td className="no-print px-2 sm:px-3 py-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              {b.dueAmount > 0 && (
                                <button
                                  type="button"
                                  title="Mark Full Payment"
                                  onClick={() => quickPay(b)}
                                  className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 transition"
                                >
                                  <IndianRupee className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                title="Partial Payment"
                                onClick={() => setPayBill(b)}
                                className="rounded-lg p-2 text-sky-600 hover:bg-sky-50 active:bg-sky-100 transition"
                              >
                                <IndianRupee className="h-4 w-4 opacity-50" />
                              </button>
                              <button
                                type="button"
                                title="Edit Bill"
                                onClick={() => setEditBill(b)}
                                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Delete Bill"
                                onClick={() => setDeleteBill(b)}
                                className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 text-sm font-bold text-[#0f3d63]">
                      <td colSpan={8} className="px-3 py-2.5 text-right">
                        Total ({summary.bills} Bills)
                      </td>
                      <td className="px-3 py-2.5 text-right tabular">{inr(summary.amount)}</td>
                      <td className="px-3 py-2.5 text-right tabular">{inr(summary.payment)}</td>
                      <td className="px-3 py-2.5 tabular text-rose-600">{inr(summary.due)}</td>
                      <td className="no-print" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Panel>

          {/* Month Wise Summary + Status Chart */}
          <div className="no-print grid gap-4 lg:grid-cols-2">
            <MonthWiseTable
              year={year}
              loading={reportsLoading}
              reports={reportsData}
              selectedMonth={month}
              onPick={(m) => {
                setMonth(m);
                setFromDraft("");
                setToDraft("");
                const r = monthRange(year, m);
                setApplied({ ...r, customerId: customerDraft });
              }}
            />
            <SummaryCards
              summary={summary}
              pieData={pieData}
              label={month === "all" ? `${year}` : `${MONTHS[month - 1]} ${year}`}
              billCount={summary.bills}
            />
          </div>
        </div>

        {/* Right Rail: Customer Details Panel + Quick Actions */}
        <div className="no-print space-y-4">
          <CustomerPanel
            loading={customerPanel.isLoading}
            data={customerPanel.data}
            onEdit={() => {}}
          />
          <QuickActions
            onToday={setToday}
            onShowAll={showAllRecords}
            onClearDemo={() => setConfirmClearData(true)}
          />
        </div>
      </div>

      {/* Edit Bill Modal */}
      <Modal
        open={!!editBill}
        onClose={() => setEditBill(null)}
        title={editBill ? `Edit Bill ${editBill.billNo}` : ""}
        size="xl"
      >
        {editBill && (
          <BillForm
            editBill={editBill}
            onSaved={() => {
              setEditBill(null);
              billsQuery.refetch();
            }}
          />
        )}
      </Modal>

      {/* Payment Modal */}
      <PaymentModal
        bill={payBill}
        onClose={() => setPayBill(null)}
        onPaid={() => {
          billsQuery.refetch();
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteBill}
        onClose={() => setDeleteBill(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Bill?"
        message={
          <>
            Bill <b>{deleteBill?.billNo}</b> for <b>{deleteBill?.customerName}</b> ({inr(deleteBill?.totalAmount ?? 0)})
            will be permanently removed.
          </>
        }
      />

      {/* Clear Demo Data Confirmation */}
      <ConfirmDialog
        open={confirmClearData}
        onClose={() => setConfirmClearData(false)}
        onConfirm={handleClearDemoData}
        loading={clearingData}
        title="Clear All Demo Bills?"
        message="This will delete all demo bills and demo customer records so you can start fresh with your real shop data. Your login and settings will remain safe."
        confirmLabel="Yes, Clear All Demo Data"
      />
      </div>
    </>
  );
}

// ---------------- Month-wise table ----------------
function MonthWiseTable({
  year,
  loading,
  reports,
  selectedMonth,
  onPick,
}: {
  year: number;
  loading: boolean;
  reports?: ReportsData;
  selectedMonth: number | "all";
  onPick: (m: number) => void;
}) {
  return (
    <Panel title={`Month Wise Summary (${year})`} icon={<BarChart3 className="h-5 w-5" />} bodyClassName="p-0">
      {loading || !reports ? (
        <TableSkeleton rows={12} cols={4} />
      ) : (
        <div className="max-h-[380px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#eef5fb] text-xs uppercase text-[#0f3d63]">
              <tr>
                <th className="px-3 py-2 text-left font-bold">Month</th>
                <th className="px-3 py-2 text-right font-bold">Total Bills</th>
                <th className="px-3 py-2 text-right font-bold">Total Amount</th>
                <th className="px-3 py-2 text-right font-bold">Total Payment</th>
                <th className="px-3 py-2 text-right font-bold">Total Due</th>
              </tr>
            </thead>
            <tbody>
              {reports.monthly.map((m) => {
                const active = selectedMonth === m.month;
                const empty = m.totalBills === 0;
                return (
                  <tr
                    key={m.month}
                    onClick={() => !empty && onPick(m.month)}
                    className={`border-b border-slate-100 ${
                      empty ? "cursor-default text-slate-300" : "cursor-pointer hover:bg-sky-50"
                    } ${active ? "bg-[#1479c9] font-bold text-white hover:bg-[#1479c9]!" : ""}`}
                  >
                    <td className="px-3 py-1.5 font-medium">{m.label}</td>
                    <td className={`px-3 py-1.5 text-right tabular ${active ? "text-white" : ""}`}>{m.totalBills}</td>
                    <td className={`px-3 py-1.5 text-right tabular ${active ? "text-white" : ""}`}>
                      {inr(m.totalAmount)}
                    </td>
                    <td className={`px-3 py-1.5 text-right tabular ${active ? "text-white" : ""}`}>
                      {inr(m.totalPayment)}
                    </td>
                    <td
                      className={`px-3 py-1.5 text-right tabular ${
                        active ? "text-white" : m.totalDue > 0 ? "text-rose-600 font-bold" : ""
                      }`}
                    >
                      {inr(m.totalDue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

// ---------------- Summary cards + pie ----------------
function SummaryCards({
  summary,
  pieData,
  label,
  billCount,
}: {
  summary: {
    bills: number;
    amount: number;
    payment: number;
    due: number;
    paidCount: number;
    dueCount: number;
    pendingCount: number;
  };
  pieData: { name: string; value: number; color: string }[];
  label: string;
  billCount: number;
}) {
  const cards = [
    { label: "Total Bills", value: String(billCount), icon: ClipboardList, bg: "bg-sky-100 text-sky-700" },
    { label: "Total Amount", value: inr(summary.amount), icon: Database, bg: "bg-emerald-100 text-emerald-700" },
    { label: "Total Payment", value: inr(summary.payment), icon: IndianRupee, bg: "bg-violet-100 text-violet-700" },
    { label: "Total Due", value: inr(summary.due), icon: IndianRupee, bg: "bg-rose-100 text-rose-700" },
  ];
  return (
    <Panel title={`${label} Summary`} icon={<ClipboardList className="h-5 w-5" />}>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-xl p-3 ${c.bg}`}>
            <c.icon className="h-5 w-5 opacity-70" />
            <p className="mt-1.5 text-xl font-black leading-tight tabular">{c.value}</p>
            <p className="text-xs font-bold opacity-80">{c.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-sm font-bold text-slate-600">Payment Status ({label})</p>
      {billCount === 0 ? (
        <div className="py-10 text-center text-sm text-slate-400">No bills in this period</div>
      ) : (
        <div className="relative mx-auto h-[210px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={78}
                innerRadius={0}
                label={({ percent }) => (percent && percent > 0 ? `${Math.round(percent * 100)}%` : "")}
              >
                {pieData.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${Number(value)} bills`, "Bills"]} />
              <Legend
                verticalAlign="middle"
                align="right"
                layout="vertical"
                iconType="circle"
                formatter={(value) => {
                  const item = pieData.find((p) => p.name === value);
                  return (
                    <span className="text-xs font-semibold text-slate-600">
                      {value} ({item?.value ?? 0})
                    </span>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

// ---------------- Customer details panel ----------------
function CustomerPanel({
  loading,
  data,
  onEdit: _onEdit,
}: {
  loading: boolean;
  data:
    | {
        customer: { id: number; name: string; mobile: string | null; address: string | null };
        stats: { orderCount: number; totalAmount: number; totalPayment: number; totalDue: number };
        recentBills: BillDTO[];
      }
    | undefined;
  onEdit: () => void;
}) {
  if (loading)
    return (
      <Panel title="Customer Details" icon={<UserRound className="h-5 w-5" />}>
        <Spinner label="Loading customer details..." />
      </Panel>
    );

  if (!data) {
    return (
      <Panel title="Customer Details" icon={<UserRound className="h-5 w-5" />}>
        <EmptyState
          icon={<UserRound className="h-8 w-8" />}
          title="No customer selected"
          message="Click any bill in the records table to view customer profile and order history."
        />
      </Panel>
    );
  }

  const { customer, stats, recentBills } = data;
  return (
    <Panel
      title="Customer Details"
      icon={<UserRound className="h-5 w-5" />}
      actions={
        <Link href={`/customers/${customer.id}`}>
          <Button variant="secondary" className="px-3 py-1 text-xs">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        </Link>
      }
    >
      <div className="space-y-1.5 text-sm">
        <DetailRow label="Name" value={<b>{customer.name}</b>} />
        <DetailRow
          label="Mobile"
          value={
            <span className="flex items-center gap-1.5 tabular">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              {customer.mobile || "-"}
            </span>
          }
        />
        <DetailRow
          label="Address"
          value={
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {customer.address || "-"}
            </span>
          }
        />
      </div>
      <div className="mt-3 space-y-1 border-t border-dashed border-slate-200 pt-3 text-sm">
        <DetailRow label="Total Orders" value={<b>{stats.orderCount}</b>} />
        <DetailRow label="Total Amount" value={<b className="tabular">{inr(stats.totalAmount)}</b>} />
        <DetailRow
          label="Total Payment"
          value={<b className="tabular text-emerald-700">{inr(stats.totalPayment)}</b>}
        />
        <DetailRow label="Total Due" value={<b className="tabular text-rose-600">{inr(stats.totalDue)}</b>} />
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-sm font-bold text-[#0f3d63]">
        <ClipboardList className="h-4 w-4" /> Recent Orders ({customer.name})
      </p>
      {recentBills.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-400">No previous orders found</p>
      ) : (
        <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-[#eef5fb] text-[#0f3d63]">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Date</th>
                <th className="px-2 py-1.5 text-left font-bold">Bill No.</th>
                <th className="px-2 py-1.5 text-right font-bold">Total</th>
                <th className="px-2 py-1.5 text-right font-bold">Payment</th>
                <th className="px-2 py-1.5 text-right font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBills.map((b) => (
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="whitespace-nowrap px-2 py-1.5 tabular">{formatDate(b.billDate)}</td>
                  <td className="px-2 py-1.5 font-semibold">{b.billNo}</td>
                  <td className="px-2 py-1.5 text-right tabular">{inr(b.totalAmount, false)}</td>
                  <td className="px-2 py-1.5 text-right tabular">{inr(b.amountPaid, false)}</td>
                  <td className="px-2 py-1.5 text-right">
                    <StatusBadge status={b.status} due={b.dueAmount} />
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

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-28 shrink-0 font-semibold text-slate-500">{label}</span>
      <span className="flex-1">{value}</span>
    </div>
  );
}

// ---------------- Quick actions ----------------
function QuickActions({
  onToday,
  onShowAll,
  onClearDemo,
}: {
  onToday: () => void;
  onShowAll: () => void;
  onClearDemo: () => void;
}) {
  const actions = [
    { label: "Today's Entries", icon: ClipboardList, onClick: onToday, color: "text-sky-600" },
    { label: "Show All Records", icon: Layers, onClick: onShowAll, color: "text-indigo-600" },
    { label: "Monthly Report", icon: BarChart3, href: "/reports", color: "text-[#1479c9]" },
    { label: "Customer Ledger", icon: Users, href: "/customers", color: "text-emerald-600" },
    { label: "Payment Summary", icon: Database, href: "/payments", color: "text-amber-600" },
    { label: "Item Sales", icon: Package, href: "/reports", color: "text-violet-600" },
    { label: "Excel Export", icon: FileSpreadsheet, href: "/reports", color: "text-green-700" },
    { label: "Clear Demo Data", icon: Trash2, onClick: onClearDemo, color: "text-rose-600" },
  ];
  return (
    <Panel title="Quick Actions" icon={<BarChart3 className="h-5 w-5" />}>
      <div className="grid grid-cols-2 gap-2.5">
        {actions.map((a) => {
          const inner = (
            <div className="flex h-full flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-2 py-3.5 text-center transition hover:border-sky-300 hover:shadow-sm">
              <a.icon className={`h-5 w-5 ${a.color}`} />
              <span className="text-xs font-bold text-[#0f3d63]">{a.label}</span>
            </div>
          );
          return a.href ? (
            <Link key={a.label} href={a.href} className="block active:scale-95 transition">
              {inner}
            </Link>
          ) : (
            <button key={a.label} type="button" onClick={a.onClick} className="w-full text-left active:scale-95 transition">
              {inner}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Spinner label="Loading dashboard..." />}>
      <DashboardInner />
    </Suspense>
  );
}
