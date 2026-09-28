import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Providers from "@/components/providers";

export const metadata: Metadata = {
  title: "Multi Plaza — Customer Order & Billing Management",
  description: "Customer order, billing and payment management for Multi Plaza (Sales | Service | Support).",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-100 text-slate-900 antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
