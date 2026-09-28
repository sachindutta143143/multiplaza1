import { NextResponse, type NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getSessionFromRequest } from "@/lib/auth";
import { buildSnapshot, getSettings, logBackup } from "@/lib/data";

const BACKUP_DIR = path.join(process.cwd(), "backups");

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${String(d.getMilliseconds()).padStart(3, "0")}`;
}

export async function GET(req: NextRequest) {
  if (!(await getSessionFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { listBackups } = await import("@/lib/data");
  return NextResponse.json({ backups: await listBackups() });
}

export async function POST(req: NextRequest) {
  if (!(await getSessionFromRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const kind: "local" | "email" = body.kind === "email" ? "email" : "local";
    const snapshot = await buildSnapshot();
    const json = JSON.stringify(snapshot, null, 2);
    const sizeBytes = Buffer.byteLength(json, "utf8");
    const filename = `multiplaza-backup-${stamp()}.json`;

    await fs.mkdir(BACKUP_DIR, { recursive: true });
    await fs.writeFile(path.join(BACKUP_DIR, filename), json, "utf8");

    const settings = await getSettings();
    const emailTo =
      kind === "email"
        ? String(body.email || settings.backupEmail || settings.email || "").trim()
        : null;

    let status = "saved on this computer";
    let note: string | null = null;
    let mailTo: string | null = null;

    if (kind === "email") {
      const subject = encodeURIComponent(`Multi Plaza – Data backup ${new Date().toLocaleDateString("en-IN")}`);
      const bodyText = encodeURIComponent(
        `Please find attached the latest Multi Plaza billing data backup (${filename}).\n\n` +
          `Customers: ${snapshot.customers.length}, Bills: ${snapshot.bills.length}, Payments: ${snapshot.payments.length}.\n\n` +
          `The backup file was downloaded by your browser — attach it to this email and send it to keep an off-computer copy.`
      );
      mailTo = emailTo ? `mailto:${emailTo}?subject=${subject}&body=${bodyText}` : `mailto:?subject=${subject}&body=${bodyText}`;
      status = "ready to email";
      note = emailTo ? `Prepared for ${emailTo}` : "No backup email configured in Settings";
    }

    await logBackup({ filename, kind, emailTo, sizeBytes, status, note });

    return NextResponse.json({
      ok: true,
      filename,
      sizeBytes,
      kind,
      downloadUrl: `/api/backup/download?filename=${encodeURIComponent(filename)}`,
      mailTo,
      status,
      note,
      counts: {
        customers: snapshot.customers.length,
        items: snapshot.catalogItems.length,
        bills: snapshot.bills.length,
        payments: snapshot.payments.length,
      },
    });
  } catch (e) {
    console.error("backup failed", e);
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}
