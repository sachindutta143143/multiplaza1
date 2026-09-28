"use client";

/**
 * Bulletproof token persistence for all devices (Mobile Chrome, Safari, Android, Desktop).
 * Synchronizes across:
 *   1. in-memory variable
 *   2. localStorage
 *   3. sessionStorage
 *   4. document.cookie (accessible to both client and server)
 *   5. window.name (sandboxed iframe fallback)
 */

const KEY = "mp_token";
let memoryToken: string | null = null;

function safeStorage(kind: "local" | "session"): Storage | null {
  try {
    const s = kind === "local" ? window.localStorage : window.sessionStorage;
    const probe = "__probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  try {
    const match = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]*)"));
    return match ? decodeURIComponent(match[2]) : null;
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, days = 30) {
  if (typeof document === "undefined") return;
  try {
    const maxAge = days * 24 * 60 * 60;
    // SameSite=Lax without Secure works everywhere over both HTTP (local IP) and HTTPS
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    // ignore
  }
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  } catch {
    // ignore
  }
}

function readWindowName(): string | null {
  try {
    const raw = window.name;
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj && typeof obj[KEY] === "string" ? obj[KEY] : null;
  } catch {
    return null;
  }
}

function writeWindowName(token: string | null) {
  try {
    let obj: Record<string, unknown> = {};
    try {
      obj = window.name ? JSON.parse(window.name) : {};
    } catch {
      obj = {};
    }
    if (token) obj[KEY] = token;
    else delete obj[KEY];
    window.name = Object.keys(obj).length ? JSON.stringify(obj) : "";
  } catch {
    // ignore
  }
}

export function getStoredToken(): string | null {
  if (memoryToken) return memoryToken;
  if (typeof window === "undefined") return null;

  try {
    // 1. Check document.cookie
    const fromCookie = getCookie("mp_token") || getCookie("mp_session");
    if (fromCookie) {
      memoryToken = fromCookie;
      return fromCookie;
    }

    // 2. Check localStorage
    const local = safeStorage("local")?.getItem(KEY);
    if (local) {
      memoryToken = local;
      return local;
    }

    // 3. Check sessionStorage
    const session = safeStorage("session")?.getItem(KEY);
    if (session) {
      memoryToken = session;
      return session;
    }
  } catch {
    // ignore
  }

  // 4. Check window.name
  const winToken = readWindowName();
  if (winToken) {
    memoryToken = winToken;
    return winToken;
  }

  return null;
}

export function setStoredToken(token: string) {
  memoryToken = token;
  if (typeof window === "undefined") return;

  // Sync to cookie
  setCookie("mp_token", token, 30);

  // Sync to localStorage
  try {
    safeStorage("local")?.setItem(KEY, token);
  } catch {
    // ignore
  }

  // Sync to sessionStorage
  try {
    safeStorage("session")?.setItem(KEY, token);
  } catch {
    // ignore
  }

  // Sync to window.name
  writeWindowName(token);
}

export function clearStoredToken() {
  memoryToken = null;
  if (typeof window === "undefined") return;

  clearCookie("mp_token");
  clearCookie("mp_session");

  try {
    safeStorage("local")?.removeItem(KEY);
  } catch {
    // ignore
  }
  try {
    safeStorage("session")?.removeItem(KEY);
  } catch {
    // ignore
  }

  writeWindowName(null);
}
