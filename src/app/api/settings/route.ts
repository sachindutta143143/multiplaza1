import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSettings, saveSettings } from "@/lib/settings";
import { getSessionFromRequest } from "@/lib/auth";
import type { SettingsData } from "@/lib/types";

export async function GET(req: NextRequest) {
  if (!(await getSessionFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getSettings();
  const safe: SettingsData = { ...settings, smtpPass: settings.smtpPass ? "********" : "" };
  return NextResponse.json({ settings: safe });
}

export async function PUT(req: NextRequest) {
  const current = await getSessionFromRequest(req);
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();

    if (body.section === "account") {
      const { name, username, currentPassword, newPassword } = body;
      const [user] = await db.select().from(users).where(eq(users.id, current.id)).limit(1);
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      const ok = await bcrypt.compare(String(currentPassword ?? ""), user.passwordHash);
      if (!ok) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      const patch: { name?: string; username?: string; passwordHash?: string } = {};
      if (name?.trim()) patch.name = name.trim();
      if (username?.trim() && username.trim().toLowerCase() !== user.username) {
        const [exists] = await db
          .select()
          .from(users)
          .where(eq(users.username, username.trim().toLowerCase()))
          .limit(1);
        if (exists) return NextResponse.json({ error: "Username already taken" }, { status: 400 });
        patch.username = username.trim().toLowerCase();
      }
      if (newPassword) {
        if (String(newPassword).length < 4)
          return NextResponse.json({ error: "New password must be at least 4 characters" }, { status: 400 });
        patch.passwordHash = await bcrypt.hash(String(newPassword), 10);
      }
      await db.update(users).set(patch).where(eq(users.id, current.id));
      return NextResponse.json({ ok: true });
    }

    if (body.section === "business") {
      const existing = await getSettings();
      const merged: SettingsData = {
        ...existing,
        businessName: body.businessName ?? existing.businessName,
        tagline: body.tagline ?? existing.tagline,
        brands: Array.isArray(body.brands)
          ? body.brands.map((b: string) => String(b).trim().toUpperCase()).filter(Boolean)
          : existing.brands,
        address: body.address ?? existing.address,
        phone: body.phone ?? existing.phone,
        email: body.email ?? existing.email,
        currency: body.currency ?? existing.currency,
        billPrefix: (body.billPrefix ?? existing.billPrefix ?? "MP").toUpperCase(),
        financialTagline: body.financialTagline ?? existing.financialTagline,
        backupEmail: body.backupEmail ?? existing.backupEmail,
      };
      await saveSettings(merged);
      return NextResponse.json({ ok: true, settings: merged });
    }

    if (body.section === "smtp") {
      const existing = await getSettings();
      const merged: SettingsData = {
        ...existing,
        smtpHost: body.smtpHost?.trim() || undefined,
        smtpPort: body.smtpPort ? Number(body.smtpPort) : undefined,
        smtpUser: body.smtpUser?.trim() || undefined,
        smtpPass: body.smtpPass && body.smtpPass !== "********" ? body.smtpPass : existing.smtpPass,
      };
      await saveSettings(merged);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown settings section" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not save settings" }, { status: 500 });
  }
}
