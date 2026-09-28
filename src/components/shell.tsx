"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FilePlus2,
  Search,
  Users,
  CalendarDays,
  BarChart3,
  Database,
  LifeBuoy,
  Settings as SettingsIcon,
  Info,
  Printer,
  Menu,
  X,
  LogOut,
  ChevronDown,
  UserCog,
} from "lucide-react";
import { clearStoredToken, useMeta } from "@/lib/hooks";
import { timeNow, formatDateLong } from "@/lib/format";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/new-entry", label: "New Entry", icon: FilePlus2 },
  { href: "/customers?focus=1", label: "Search Customer", icon: Search },
  { href: "/customers", label: "All Customers", icon: Users },
  { href: "/monthly", label: "Monthly View", icon: CalendarDays },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/payments", label: "Payment Summary", icon: Database },
  { href: "/backup", label: "Backup / Restore", icon: LifeBuoy },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
  { href: "/about", label: "About", icon: Info },
];

function BrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  return (
    <div className={`${dim} grid shrink-0 place-items-center rounded-xl bg-white shadow-md`}>
      <Printer className={size === "sm" ? "h-5 w-5 text-[#0b3d66]" : "h-6 w-6 text-[#0b3d66]"} />
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#0b2f4f] to-[#0a2540] text-slate-200">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
        <BrandMark />
        <div>
          <p className="text-lg font-black leading-tight text-white">Multi Plaza</p>
          <p className="text-[11px] font-medium text-sky-200/80">Order &amp; Billing Management</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const path = item.href.split("?")[0];
          const active = pathname === path || (path !== "/dashboard" && pathname.startsWith(path) && path !== "/customers");
          const activeCustomers = path === "/customers" && pathname.startsWith("/customers");
          const isActive = active || activeCustomers;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-[#1479c9] text-white shadow-lg shadow-sky-900/40"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${isActive ? "text-white" : "text-sky-300/80 group-hover:text-white"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-4 py-4 text-center">
        <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-white/10">
          <Printer className="h-7 w-7 text-sky-200" />
        </div>
        <p className="text-sm font-bold text-white">Your Trusted Partner</p>
        <p className="text-[11px] text-sky-200/70">Sales • Service • Support</p>
      </div>
    </div>
  );
}

function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const router = useRouter();
  const { data } = useMeta();
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);

  const settings = data?.settings;
  const brands = settings?.brands ?? ["KONICA MINOLTA", "TOSHIBA", "RICOH", "DUPLO"];

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    clearStoredToken();
    router.push("/login");
  }

  return (
    <header className="no-print sticky top-0 z-40 border-b border-[#0a2540] bg-gradient-to-r from-[#0b2f4f] via-[#0d3a63] to-[#0b2f4f] text-white shadow-md">
      <div className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4">
        {/* Hamburger menu: visible on mobile AND desktop */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="rounded-lg p-2 text-white hover:bg-white/10 active:bg-white/20 transition lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <Link href="/dashboard" className="flex items-center gap-2.5">
          <BrandMark size="sm" />
          <div className="hidden xs:block sm:block">
            <p className="text-base sm:text-lg font-black leading-tight text-white">{settings?.businessName ?? "Multi Plaza"}</p>
            <p className="text-[10px] sm:text-[11px] font-medium text-sky-200/80 hidden sm:block">{settings?.tagline ?? "Customer Order & Billing Management"}</p>
          </div>
        </Link>

        {/* Brand Badges - Desktop only */}
        <div className="ml-1 hidden items-center gap-3 rounded-lg bg-white/95 px-4 py-1.5 shadow-inner md:flex">
          <div className="flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-[#1f5fa8] text-[9px] font-black text-white">KM</span>
            <span className="text-[11px] font-bold text-[#1f5fa8]">{brands[0]}</span>
          </div>
          {brands.slice(1).map((b, i) => (
            <span key={b} className={`text-sm font-black tracking-wide ${i === 0 ? "text-red-600" : i === 1 ? "text-[#c62828]" : "text-[#1f5fa8]"}`}>
              {b}
            </span>
          ))}
        </div>

        {/* Search input */}
        <form
          className="ml-auto flex-1 max-w-[220px] sm:max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) router.push(`/customers?q=${encodeURIComponent(q.trim())}`);
          }}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-lg border border-white/20 bg-white py-1.5 pl-8 pr-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>
        </form>

        {/* Admin dropdown: visible on both MOBILE and DESKTOP! */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenu((m) => !m)}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs sm:text-sm font-semibold hover:bg-white/10 active:bg-white/20 text-white transition"
            aria-label="Admin account menu"
          >
            <UserCog className="h-4 w-4 text-sky-200" />
            <span className="max-w-[70px] truncate sm:max-w-none">{data?.user?.name ?? "Admin"}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
              <div className="absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-700 shadow-2xl">
                <div className="border-b border-slate-100 px-4 py-2">
                  <p className="text-xs font-bold text-slate-900">{data?.user?.name ?? "Administrator"}</p>
                  <p className="text-[11px] text-slate-500">@{data?.user?.username ?? "admin"}</p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setMenu(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700"
                >
                  <SettingsIcon className="h-4 w-4 text-slate-500" /> Settings
                </Link>
                <Link
                  href="/backup"
                  onClick={() => setMenu(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700"
                >
                  <LifeBuoy className="h-4 w-4 text-slate-500" /> Backup / Restore
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function StatusFooter() {
  const { data } = useMeta();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const name = data?.settings?.businessName ?? "Multi Plaza";
  const tagline = data?.settings?.tagline ?? "Customer Order & Billing Management";
  return (
    <footer className="no-print mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600">
      <span className="font-bold text-[#0f3d63]">{name}</span>
      <span className="text-slate-300">|</span>
      <span>{tagline}</span>
      <span className="text-slate-300">|</span>
      <span>Version 1.0</span>
      <span className="ml-auto font-semibold text-slate-700" suppressHydrationWarning>
        {mounted ? `${formatDateLong(now)} \u00A0 ${timeNow()}` : ""}
      </span>
    </footer>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();

  // Close drawer on path change
  useEffect(() => setDrawer(false), [pathname]);

  // Lock background scroll when mobile drawer is open
  useEffect(() => {
    if (drawer) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <TopBar onOpenMenu={() => setDrawer(true)} />
      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar */}
        <aside className="no-print hidden w-64 shrink-0 lg:block">
          <SidebarContent />
        </aside>

        {/* Mobile drawer (Hamburger sidebar for phone & tablet) */}
        {drawer && (
          <div className="no-print fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px]"
              onClick={() => setDrawer(false)}
              aria-hidden="true"
            />
            <div className="relative z-10 h-full w-72 shadow-2xl animate-[slideIn_.2s_ease-out]">
              <button
                type="button"
                onClick={() => setDrawer(false)}
                className="absolute right-3 top-3.5 z-20 rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white focus:outline-none"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent onNavigate={() => setDrawer(false)} />
            </div>
          </div>
        )}

        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="flex-1">{children}</div>
          <StatusFooter />
        </main>
      </div>
    </div>
  );
}
