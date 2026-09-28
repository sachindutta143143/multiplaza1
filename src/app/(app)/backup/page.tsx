"use client";

import { useRef, useState } from "react";
import {
  LifeBuoy,
  HardDriveDownload,
  Mail,
  History,
  Upload,
  FileJson,
  CheckCircle2,
  ShieldCheck,
  Info,
} from "lucide-react";
import { Button, ConfirmDialog, EmptyState, Panel, Spinner, TableSkeleton } from "@/components/ui";
import { DownloadLink } from "@/components/download-link";
import { apiFetch, useBackups, withToken } from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/toast";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/format";
import type { BackupRecord } from "@/lib/types";

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function BackupPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const router = useRouter();
  const { data, isLoading } = useBackups();
  const backups = data?.backups ?? [];

  const [busy, setBusy] = useState<"" | "local" | "email" | "restore">("");
  const [email, setEmail] = useState("");
  const [confirmRestore, setConfirmRestore] = useState<unknown | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function createBackup(kind: "local" | "email") {
    if (kind === "email" && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    setBusy(kind);
    try {
      const res = await apiFetch<{
        filename: string;
        downloadUrl: string;
        mailTo: string | null;
        status: string;
        counts: { customers: number; bills: number; payments: number; items: number };
      }>("/api/backup", { method: "POST", body: JSON.stringify({ kind, email: email || undefined }) });

      // Save the file on this computer
      const a = document.createElement("a");
      a.href = withToken(res.downloadUrl);
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      if (kind === "email") {
        toast.success(`Backup ready (${res.counts.bills} bills). Attach ${res.filename} to the email that opened.`);
        if (res.mailTo) {
          const url = res.mailTo;
          setTimeout(() => window.open(url, "_blank"), 600);
        }
      } else {
        toast.success(`Backup saved on this computer: ${res.filename}`);
      }
      qc.invalidateQueries({ queryKey: ["backups"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backup failed");
    } finally {
      setBusy("");
    }
  }

  function pickFile() {
    fileRef.current?.click();
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (json.app !== "multi-plaza-billing") {
        toast.error("This is not a Multi Plaza backup file");
        return;
      }
      setConfirmRestore(json);
    } catch {
      toast.error("Could not read the backup file");
    }
  }

  async function doRestore() {
    if (!confirmRestore) return;
    setBusy("restore");
    try {
      const res = await apiFetch<{ counts: { customers: number; bills: number } }>("/api/backup/restore", {
        method: "POST",
        body: JSON.stringify(confirmRestore),
      });
      toast.success(`Restored ${res.counts.bills} bills and ${res.counts.customers} customers`);
      qc.clear();
      setConfirmRestore(null);
      setTimeout(() => router.refresh(), 400);
      setTimeout(() => window.location.assign("/dashboard"), 900);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="p-3 sm:p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-100 text-teal-700">
          <LifeBuoy className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-black text-[#0f3d63]">Backup &amp; Restore</h1>
          <p className="text-xs text-slate-500">Your data stays on this computer — take regular backups and email a copy off-site.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Local backup */}
        <Panel title="Backup to this computer" icon={<HardDriveDownload className="h-5 w-5" />}>
          <div className="flex flex-col items-start gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-sky-50 text-sky-600">
              <HardDriveDownload className="h-7 w-7" />
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              Creates a complete snapshot (customers, items, bills, payments &amp; settings) saved into the{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">backups/</code> folder on this computer and downloaded by your browser.
            </p>
            <Button variant="primary" loading={busy === "local"} onClick={() => createBackup("local")}>
              <HardDriveDownload className="h-4 w-4" /> Backup now
            </Button>
          </div>
        </Panel>

        {/* Email backup */}
        <Panel title="Email a backup copy" icon={<Mail className="h-5 w-5" />}>
          <div className="flex flex-col gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
              <Mail className="h-7 w-7" />
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              Generate the snapshot, then attach it to an email draft that opens automatically — a simple off-computer safety copy.
            </p>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-backup-email@gmail.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
            <Button className="bg-rose-600 hover:bg-rose-700" loading={busy === "email"} onClick={() => createBackup("email")}>
              <Mail className="h-4 w-4" /> Backup &amp; compose email
            </Button>
          </div>
        </Panel>
      </div>

      {/* Restore */}
      <Panel className="mt-4" title="Restore from backup file" icon={<Upload className="h-5 w-5" />}>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <FileJson className="h-6 w-6" />
          </div>
          <p className="flex-1 text-sm text-slate-600">
            Select a previously saved <b>multiplaza-backup-*.json</b> file. Restoring will <b>replace</b> all current customers, bills and settings with the snapshot.
          </p>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFileChange} />
          <Button variant="warning" onClick={pickFile}><Upload className="h-4 w-4" /> Choose backup file…</Button>
        </div>
      </Panel>

      {/* History */}
      <Panel className="mt-4" title="Backup history (saved on this computer)" icon={<History className="h-5 w-5" />} bodyClassName="p-0">
        {isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : backups.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="h-8 w-8" />}
            title="No backups yet"
            message="Take your first backup — it only takes a moment and protects all your billing records."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-[#eef5fb] text-xs uppercase text-[#0f3d63]">
                <tr>
                  <th className="px-3 py-2 text-left font-bold">When</th>
                  <th className="px-3 py-2 text-left font-bold">File</th>
                  <th className="px-3 py-2 font-bold">Type</th>
                  <th className="px-3 py-2 text-left font-bold">Destination / Status</th>
                  <th className="px-3 py-2 text-right font-bold">Size</th>
                  <th className="px-3 py-2 text-right font-bold">Download</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b: BackupRecord) => (
                  <tr key={b.id} className="border-b border-slate-100 hover:bg-sky-50/60">
                    <td className="whitespace-nowrap px-3 py-2 text-xs tabular text-slate-500">{formatDateTime(b.createdAt)}</td>
                    <td className="px-3 py-2 font-mono text-xs font-semibold text-[#0f3d63]">{b.filename}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${b.kind === "email" ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200" : "bg-sky-50 text-sky-700 ring-1 ring-sky-200"}`}>
                        {b.kind === "email" ? "Email" : "Computer"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        {b.note || b.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular">{humanSize(b.sizeBytes)}</td>
                    <td className="px-3 py-2 text-right">
                      <DownloadLink href={`/api/backup/download?filename=${encodeURIComponent(b.filename)}`}>
                        <Button variant="secondary" className="px-2.5 py-1 text-xs"><HardDriveDownload className="h-3.5 w-3.5" /> Save</Button>
                      </DownloadLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
        <div>
          <p className="font-bold">Recommended routine</p>
          <p className="mt-0.5 text-sky-800">
            Take a <b>computer backup daily</b> and an <b>email backup weekly</b> (e.g., to your Gmail). After restoring, the app reloads automatically. All backup files are standard JSON you can keep on a pen drive too.
          </p>
        </div>
      </div>

      {busy === "restore" && (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-900/40">
          <div className="flex items-center gap-3 rounded-xl bg-white px-6 py-4 font-semibold shadow-xl">
            <Spinner label="" /> Restoring your data…
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmRestore}
        onClose={() => setConfirmRestore(null)}
        onConfirm={doRestore}
        loading={busy === "restore"}
        confirmLabel="Restore now"
        title="Replace current data with this backup?"
        message="This permanently overwrites all current customers, bills, payments and settings on this computer. The action cannot be undone."
      />
    </div>
  );
}
