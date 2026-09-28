"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Phone,
  MapPin,
  UserX,
  ClipboardList,
} from "lucide-react";
import { Button, ConfirmDialog, EmptyState, Input, Spinner } from "@/components/ui";
import CustomerFormModal from "@/components/customer-form-modal";
import { apiFetch, useCustomers, useReports } from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/toast";
import { inr } from "@/lib/format";
import type { CustomerDTO } from "@/lib/types";

function CustomersInner() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const qc = useQueryClient();

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [debounced, setDebounced] = useState(params.get("q") ?? "");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerDTO | null>(null);
  const [toDelete, setToDelete] = useState<CustomerDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, isError, refetch } = useCustomers(debounced || undefined);
  const { data: reports } = useReports(new Date().getFullYear());
  const customers = data?.customers ?? [];

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (params.get("focus") === "1") {
      const el = document.getElementById("customer-search");
      el?.focus();
    }
  }, [params]);

  const dueMap = useMemo(() => {
    const m = new Map<number, number>();
    reports?.outstanding.forEach((o) => m.set(o.customerId, o.due));
    return m;
  }, [reports]);

  const stats = useMemo(() => {
    const top = reports?.topCustomers ?? [];
    const amountMap = new Map(top.map((t) => [t.name, t]));
    return amountMap;
  }, [reports]);

  async function confirmDelete() {
    if (!toDelete) return;
    const target = toDelete;
    setDeleting(true);
    await qc.cancelQueries({ queryKey: ["customers"] });
    const snapshots = qc.getQueriesData<{ customers: CustomerDTO[] }>({ queryKey: ["customers"] });
    snapshots.forEach(([key, val]) => {
      if (val) qc.setQueryData(key, { customers: val.customers.filter((c) => c.id !== target.id) });
    });
    setToDelete(null);
    toast.info(`Deleting ${target.name}…`);
    try {
      await apiFetch(`/api/customers/${target.id}`, { method: "DELETE" });
      toast.success(`${target.name} deleted`);
    } catch (e) {
      snapshots.forEach(([key, val]) => qc.setQueryData(key, val));
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-3 sm:p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-100 text-sky-700">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-[#0f3d63]">All Customers</h1>
            <p className="text-xs text-slate-500">{customers.length} customer{customers.length === 1 ? "" : "s"} {debounced ? `matching “${debounced}”` : ""}</p>
          </div>
        </div>
        <Button variant="success" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4" /> New Customer
        </Button>
      </div>

      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          id="customer-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, mobile, address or email…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <Spinner label="Loading customers" />
      ) : isError ? (
        <EmptyState
          icon={<UserX className="h-8 w-8" />}
          title="Could not load customers"
          message="Something went wrong while fetching customers."
          action={<Button onClick={() => refetch()}>Retry</Button>}
        />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title={debounced ? "No matches found" : "No customers yet"}
          message={debounced ? "Try a different name or mobile number." : "Add your first customer to start billing."}
          action={
            !debounced ? (
              <Button variant="success" onClick={() => { setEditing(null); setModalOpen(true); }}>
                <Plus className="h-4 w-4" /> Add Customer
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {customers.map((c) => {
            const due = dueMap.get(c.id) ?? 0;
            const yearStat = stats.get(c.name);
            return (
              <div key={c.id} className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/customers/${c.id}`} className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#1479c9] to-[#0b2f4f] text-sm font-black text-white">
                      {c.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold leading-tight text-slate-800 group-hover:text-[#1479c9]">{c.name}</p>
                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        <Phone className="h-3 w-3" /> {c.mobile || "—"}
                      </p>
                    </div>
                  </Link>
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button title="Edit" onClick={() => { setEditing(c); setModalOpen(true); }} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button title="Delete" onClick={() => setToDelete(c)} className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5" /> {c.address || "No address"}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                  <div>
                    <p className="text-sm font-black tabular text-[#0f3d63]">{yearStat?.orders ?? "—"}</p>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Orders {new Date().getFullYear()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-black tabular text-emerald-700">{yearStat ? inr(yearStat.amount, false) : "—"}</p>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Business</p>
                  </div>
                  <div>
                    <p className={`text-sm font-black tabular ${due > 0 ? "text-rose-600" : "text-slate-400"}`}>{due > 0 ? inr(due, false) : "₹0"}</p>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Due</p>
                  </div>
                </div>
                <Link href={`/customers/${c.id}`} className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-sky-50 py-1.5 text-xs font-bold text-[#1479c9] hover:bg-sky-100">
                  <ClipboardList className="h-3.5 w-3.5" /> View ledger
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <CustomerFormModal open={modalOpen} customer={editing} onClose={() => setModalOpen(false)} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete customer?"
        message={
          <>
            <b>{toDelete?.name}</b> will be permanently removed. Customers that already have bills cannot be deleted.
          </>
        }
      />
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<Spinner label="Loading" />}>
      <CustomersInner />
    </Suspense>
  );
}
