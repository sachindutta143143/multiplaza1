"use client";

import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { X, Inbox, Loader2, AlertTriangle } from "lucide-react";
import { inr } from "@/lib/format";
import type { BillStatus } from "@/lib/types";

// ---------------- Button ----------------
type Variant = "primary" | "secondary" | "success" | "danger" | "ghost" | "warning";

const variants: Record<Variant, string> = {
  primary: "bg-[#1479c9] hover:bg-[#0f67b0] text-white shadow-sm",
  secondary: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300",
  success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
  danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-sm",
  warning: "bg-amber-500 hover:bg-amber-600 text-white shadow-sm",
  ghost: "bg-transparent hover:bg-slate-200/70 text-slate-700",
};

export function Button({
  variant = "primary",
  className = "",
  loading = false,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

// ---------------- Card / panel ----------------
export function Panel({
  title,
  icon,
  actions,
  children,
  className = "",
  bodyClassName = "",
  id,
}: {
  title?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-[#eef5fb] to-white px-4 py-2.5">
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#0f3d63]">
            <span className="text-[#1479c9]">{icon}</span>
            {title}
          </h2>
          {actions}
        </header>
      )}
      <div className={bodyClassName || "p-4"}>{children}</div>
    </section>
  );
}

// ---------------- Modal ----------------
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  const w = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" }[size];
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-[2px] sm:items-center">
      <div className={`w-full ${w} my-8 rounded-2xl bg-white shadow-2xl animate-[pop_.18s_ease-out]`}>
        <header className="flex items-center justify-between rounded-t-2xl border-b border-slate-100 bg-gradient-to-r from-[#eef5fb] to-white px-5 py-3.5">
          <h3 className="text-base font-bold text-[#0f3d63]">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50 px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

// ---------------- Confirm dialog ----------------
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  loading = false,
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-full p-2 ${danger ? "bg-rose-100 text-rose-600" : "bg-sky-100 text-sky-600"}`}>
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="text-sm leading-relaxed text-slate-600">{message}</div>
      </div>
    </Modal>
  );
}

// ---------------- Status badge ----------------
export function StatusBadge({ status, due }: { status: BillStatus; due?: number }) {
  if (status === "paid")
    return <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">Paid</span>;
  if (status === "due")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
        Due {due ? inr(due, false) : ""}
      </span>
    );
  return <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200">Pending</span>;
}

// ---------------- Empty state ----------------
export function EmptyState({
  title = "Nothing here yet",
  message,
  icon,
  action,
}: {
  title?: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-400 ring-1 ring-sky-100">
        {icon ?? <Inbox className="h-8 w-8" />}
      </div>
      <h3 className="text-base font-bold text-slate-700">{title}</h3>
      {message && <p className="max-w-sm text-sm text-slate-500">{message}</p>}
      {action}
    </div>
  );
}

// ---------------- Skeletons ----------------
export function TableSkeleton({ rows = 6, cols = 8 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse p-4">
      <div className="mb-4 h-7 w-48 rounded bg-slate-200" />
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="mb-2 flex gap-3">
          {Array.from({ length: cols }).map((__, c) => (
            <div key={c} className="h-5 flex-1 rounded bg-slate-100" style={{ flexGrow: c === 1 ? 2 : 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 h-4 w-24 rounded bg-slate-200" />
      <div className="h-8 w-32 rounded bg-slate-100" />
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
      {label && <span className="text-sm font-medium">{label}…</span>}
    </div>
  );
}

// ---------------- Form fields ----------------
export function Field({ label, children, hint, className = "" }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`${inputBase} ${className}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, ...rest } = props;
  return (
    <select {...rest} className={`${inputBase} pr-8 ${className}`}>
      {children}
    </select>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return <textarea {...rest} className={`${inputBase} min-h-[72px] ${className}`} />;
}
