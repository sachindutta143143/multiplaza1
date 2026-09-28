"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BackupRecord,
  BillDTO,
  BillStatus,
  CustomerDTO,
  MonthlySummary,
  SettingsData,
} from "./types";

import {
  getStoredToken,
  setStoredToken,
  clearStoredToken,
} from "./token-store";

export class ApiError extends Error {}

export { getStoredToken, setStoredToken, clearStoredToken };

/** Append the bearer token to a plain GET URL (used for Excel/file downloads). */
export function withToken(url: string): string {
  const token = getStoredToken();
  if (!token) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}access_token=${encodeURIComponent(token)}`;
}

export async function apiFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(url, { ...init, headers, credentials: "include" });
  const text = await res.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON response (e.g. HTML error page or plain text from server)
      if (!res.ok) {
        throw new ApiError(`Server error (${res.status})`);
      }
      return text as unknown as T;
    }
  }

  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status})`);
  return data as T;
}

export const qk = {
  meta: ["meta"] as const,
  bills: (filters: string) => ["bills", filters] as const,
  bill: (id: number) => ["bill", id] as const,
  customers: (q?: string) => ["customers", q ?? ""] as const,
  customer: (id: number) => ["customer", id] as const,
  catalog: ["catalog"] as const,
  reports: (year: number) => ["reports", year] as const,
  backups: ["backups"] as const,
};

// ---------------- Meta ----------------
export function useMeta() {
  return useQuery({
    queryKey: qk.meta,
    queryFn: () => apiFetch<{ user: { name: string; username: string }; settings: SettingsData; latestMonth: { year: number; month: number } }>("/api/meta"),
  });
}

// ---------------- Bills ----------------
export function useBills(params: {
  from?: string;
  to?: string;
  customerId?: number | null;
  status?: BillStatus | "";
  search?: string;
  enabled?: boolean;
}) {
  const sp = new URLSearchParams();
  if (params.from) sp.set("from", params.from);
  if (params.to) sp.set("to", params.to);
  if (params.customerId) sp.set("customerId", String(params.customerId));
  if (params.status) sp.set("status", params.status);
  if (params.search) sp.set("search", params.search);
  const key = sp.toString();
  return useQuery({
    queryKey: qk.bills(key),
    queryFn: () => apiFetch<{ bills: BillDTO[] }>(`/api/bills?${key}`),
    enabled: params.enabled ?? true,
    refetchInterval: 6_000, // Auto-syncs new entries across Desktop 1, Desktop 2, and Mobile every 6 seconds!
  });
}

export function useBill(id: number | null) {
  return useQuery({
    queryKey: id ? qk.bill(id) : ["bill", "none"],
    queryFn: () => apiFetch<{ bill: BillDTO }>(`/api/bills/${id}`),
    enabled: !!id,
  });
}

export function useSaveBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id?: number } & Record<string, unknown>) => {
      const { id, ...body } = payload;
      const url = id ? `/api/bills/${id}` : "/api/bills";
      return apiFetch<{ bill: BillDTO }>(url, { method: id ? "PUT" : "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["bill"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer"] });
    },
  });
}

export function useDeleteBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<{ ok: true }>(`/api/bills/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer"] });
    },
  });
}

export function useAddPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, method, note }: { id: number; amount: number; method: string; note?: string }) =>
      apiFetch<{ bill: BillDTO }>(`/api/bills/${id}/payment`, {
        method: "POST",
        body: JSON.stringify({ amount, method, note }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["bill"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["customer"] });
    },
  });
}

// ---------------- Customers ----------------
export function useCustomers(q?: string) {
  const sp = q ? `?q=${encodeURIComponent(q)}` : "";
  return useQuery({
    queryKey: qk.customers(q),
    queryFn: () => apiFetch<{ customers: CustomerDTO[] }>(`/api/customers${sp}`),
    refetchInterval: 10_000,
  });
}

export function useCustomer(id: number | null) {
  return useQuery({
    queryKey: id ? qk.customer(id) : ["customer", "none"],
    queryFn: () =>
      apiFetch<{
        customer: CustomerDTO;
        stats: { orderCount: number; totalAmount: number; totalPayment: number; totalDue: number };
        recentBills: BillDTO[];
      }>(`/api/customers/${id}`),
    enabled: !!id,
  });
}

export function useSaveCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id?: number } & Record<string, unknown>) => {
      const { id, ...body } = payload;
      const url = id ? `/api/customers/${id}` : "/api/customers";
      return apiFetch<{ customer: CustomerDTO }>(url, { method: id ? "PUT" : "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer"] });
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<{ ok: true }>(`/api/customers/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

// ---------------- Catalog ----------------
export interface CatalogItem {
  id: number;
  name: string;
  defaultRate: number;
  category: string;
  active: boolean;
}

export function useCatalog() {
  return useQuery({
    queryKey: qk.catalog,
    queryFn: () => apiFetch<{ items: CatalogItem[] }>("/api/items"),
  });
}

export function useSaveCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id?: number; name: string; defaultRate: number; category?: string }) =>
      apiFetch("/api/items", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.catalog }),
  });
}

export function useDeleteCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/api/items/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.catalog }),
  });
}

// ---------------- Reports ----------------
export interface ReportsData {
  year: number;
  totals: { bills: number; amount: number; payment: number; due: number };
  monthly: MonthlySummary[];
  items: { item: string; qty: number; amount: number; bills: number }[];
  topCustomers: { name: string; orders: number; amount: number; paid: number }[];
  outstanding: { customerId: number; name: string; mobile: string | null; bills: number; due: number; pending: number }[];
  payments: {
    id: number;
    billId: number;
    billNo: string;
    customerName: string;
    billDate: string;
    amount: number;
    method: string;
    note: string | null;
    createdAt: string;
  }[];
  status: { paid: number; due: number; pending: number; paidCount: number; dueCount: number; pendingCount: number };
}

export function useReports(year: number) {
  return useQuery({
    queryKey: qk.reports(year),
    queryFn: () => apiFetch<ReportsData>(`/api/reports?year=${year}`),
    refetchInterval: 10_000,
  });
}

// ---------------- Backups ----------------
export function useBackups() {
  return useQuery({
    queryKey: qk.backups,
    queryFn: () => apiFetch<{ backups: BackupRecord[] }>("/api/backup"),
  });
}
