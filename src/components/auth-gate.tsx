"use client";

import { useEffect, type ReactNode } from "react";
import { setStoredToken } from "@/lib/hooks";

export default function AuthGate({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlToken = new URLSearchParams(window.location.search).get("token");
    if (urlToken) {
      setStoredToken(urlToken);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  return <>{children}</>;
}
