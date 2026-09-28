import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import type { SettingsData } from "./types";

export const DEFAULT_SETTINGS: SettingsData = {
  businessName: "Multi Plaza",
  tagline: "Customer Order & Billing Management",
  brands: ["KONICA MINOLTA", "TOSHIBA", "RICOH", "DUPLO"],
  address: "Silchar, Assam, India",
  phone: "+91 98765 43210",
  email: "support@multiplaza.in",
  currency: "₹",
  billPrefix: "MP",
  financialTagline: "Sales | Service | Support",
  backupEmail: "",
};

export async function getSettings(): Promise<SettingsData> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
  if (!rows.length) {
    await db
      .insert(appSettings)
      .values({ id: 1, data: DEFAULT_SETTINGS })
      .onConflictDoNothing();
    return { ...DEFAULT_SETTINGS };
  }
  return { ...DEFAULT_SETTINGS, ...(rows[0].data as SettingsData) };
}

export async function saveSettings(data: SettingsData): Promise<SettingsData> {
  const merged = { ...DEFAULT_SETTINGS, ...data };
  await db
    .insert(appSettings)
    .values({ id: 1, data: merged, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.id, set: { data: merged, updatedAt: new Date() } });
  return merged;
}
