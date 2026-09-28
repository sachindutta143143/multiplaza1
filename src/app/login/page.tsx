"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Printer,
  Lock,
  User,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  BarChart3,
  Database,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { apiFetch, getStoredToken, setStoredToken } from "@/lib/hooks";
import { Button } from "@/components/ui";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");

  // Sign In fields
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Create Account fields
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function navigateToDashboard(token?: string) {
    const next =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
    const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

    router.push(destination);
    // Instant fallback if router.push doesn't complete
    setTimeout(() => {
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/login")) {
        window.location.assign(destination);
      }
    }, 600);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (res.token) {
        setStoredToken(res.token);
      }
      setSuccessMsg("Signed in successfully! Opening dashboard...");
      navigateToDashboard(res.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid username or password.");
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    const cleanName = name.trim();
    const cleanUser = username.trim().toLowerCase();

    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }
    if (cleanUser.length < 3) {
      setError("Username must be at least 3 characters long.");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please retype carefully.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{ token: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name: cleanName, username: cleanUser, password }),
      });
      if (res.token) {
        setStoredToken(res.token);
      }
      setSuccessMsg("Account created successfully! Opening dashboard...");
      navigateToDashboard(res.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account. Please try again.");
      setLoading(false);
    }
  }

  async function handleQuickDemoLogin() {
    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string }>("/api/auth/demo", {
        method: "POST",
      });
      if (res.token) {
        setStoredToken(res.token);
      }
      setSuccessMsg("Demo login successful! Opening dashboard...");
      navigateToDashboard(res.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo login failed.");
      setLoading(false);
    }
  }

  function switchTab(newMode: Mode) {
    setMode(newMode);
    setError("");
    setSuccessMsg("");
    if (newMode === "signup") {
      setName("");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
    } else {
      setUsername("admin");
      setPassword("admin123");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#08233a] via-[#0d3a63] to-[#14507f] p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-2">
        {/* Left Side: Brand Panel */}
        <div className="relative hidden flex-col justify-between bg-gradient-to-b from-[#0b2f4f] to-[#114b7a] p-8 text-white md:flex">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-white shadow-lg">
                <Printer className="h-7 w-7 text-[#0b2f4f]" />
              </div>
              <div>
                <p className="text-2xl font-black">Multi Plaza</p>
                <p className="text-xs text-sky-200/80">Customer Order &amp; Billing Management</p>
              </div>
            </div>
            <div className="mt-10 space-y-5">
              {[
                { icon: BarChart3, title: "Orders & Billing", text: "Create bills with automatic serial numbers, item catalogs, and taxes." },
                { icon: Database, title: "Desktop Data Storage", text: "All data stays securely stored on your computer with one-click backups." },
                { icon: ShieldCheck, title: "Secure Authentication", text: "Protected sign in with custom user accounts and passwords." },
              ].map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
                    <f.icon className="h-5 w-5 text-sky-200" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{f.title}</p>
                    <p className="text-xs leading-relaxed text-sky-100/75">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-sky-200/70">KONICA MINOLTA • TOSHIBA • RICOH • DUPLO</p>
        </div>

        {/* Right Side: Form Panel */}
        <div className="p-6 sm:p-9">
          <div className="mb-6 flex items-center gap-3 md:hidden">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#0b2f4f]">
              <Printer className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xl font-black text-[#0b2f4f]">Multi Plaza</p>
              <p className="text-[11px] text-slate-500">Billing Management</p>
            </div>
          </div>

          {/* Quick Direct Access Banner for Mobile & First Time Users */}
          <div className="mb-5 rounded-xl border border-emerald-300 bg-emerald-50/90 p-3.5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                  One-Tap Mobile Demo Access
                </p>
                <p className="text-[11px] text-emerald-800">
                  Instantly open dashboard without typing password
                </p>
              </div>
              <a
                href="/api/auth/demo?redirect=/dashboard"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-800 active:scale-95 transition"
              >
                <Sparkles className="h-3.5 w-3.5" /> Open Demo <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => switchTab("signin")}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition ${
                mode === "signin"
                  ? "bg-[#1479c9] text-white shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LogIn className="h-4 w-4" /> Sign In
            </button>
            <button
              type="button"
              onClick={() => switchTab("signup")}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition ${
                mode === "signup"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserPlus className="h-4 w-4" /> Create Account
            </button>
          </div>

          {mode === "signin" ? (
            <>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800">Welcome Back</h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">Sign in to access your dashboard and records.</p>

              <form onSubmit={handleSignIn} className="mt-5 space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Username</label>
                  <div className="relative rounded-lg border border-slate-300 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username (e.g. admin)"
                      autoFocus
                      required
                      className="w-full bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Password</label>
                  <div className="relative rounded-lg border border-slate-300 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      className="w-full bg-transparent py-2.5 pl-9 pr-10 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                    {error}
                  </div>
                )}

                {successMsg && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    {successMsg}
                  </div>
                )}

                <Button type="submit" loading={loading} className="w-full py-2.5 font-bold">
                  <LogIn className="h-4 w-4" /> Sign In
                </Button>
              </form>

              {/* Demo Credentials Box */}
              <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50/80 p-3.5 text-xs text-sky-900">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-950">Default Demo Credentials:</span>
                  <button
                    type="button"
                    onClick={handleQuickDemoLogin}
                    disabled={loading}
                    className="inline-flex items-center gap-1 rounded-md bg-[#1479c9] px-2.5 py-1 font-bold text-white hover:bg-[#0f67b0] transition"
                  >
                    <Sparkles className="h-3 w-3" /> Quick Demo Login
                  </button>
                </div>
                <p className="mt-1 font-mono text-slate-700">
                  Username: <b className="text-slate-900">admin</b> &nbsp;|&nbsp; Password: <b className="text-slate-900">admin123</b>
                </p>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800">Create New Account</h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">Sign up in seconds to start managing your shop billing.</p>

              <form onSubmit={handleSignUp} className="mt-5 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Full Name</label>
                  <div className="relative rounded-lg border border-slate-300 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe / Store Manager"
                      autoFocus
                      required
                      className="w-full bg-transparent py-2 pl-9 pr-3 text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Choose Username</label>
                  <div className="relative rounded-lg border border-slate-300 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                      placeholder="e.g. johndoe"
                      required
                      className="w-full bg-transparent py-2 pl-9 pr-3 text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Password</label>
                  <div className="relative rounded-lg border border-slate-300 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 4 characters"
                      required
                      className="w-full bg-transparent py-2 pl-9 pr-10 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Confirm Password</label>
                  <div className="relative rounded-lg border border-slate-300 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Retype password"
                      required
                      className="w-full bg-transparent py-2 pl-9 pr-3 text-sm outline-none"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                    {error}
                  </div>
                )}

                {successMsg && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    {successMsg}
                  </div>
                )}

                <Button type="submit" variant="success" loading={loading} className="w-full py-2.5 font-bold">
                  <UserPlus className="h-4 w-4" /> Create Account &amp; Start
                </Button>
              </form>

              <p className="mt-4 text-center text-xs text-slate-500">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchTab("signin")}
                  className="font-bold text-[#1479c9] hover:underline"
                >
                  Sign In here
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
