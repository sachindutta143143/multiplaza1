"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings as SettingsIcon,
  Building2,
  KeyRound,
  Package,
  AlertTriangle,
  Plus,
  Trash2,
  Pencil,
  Mail,
  Database,
  Save,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button, ConfirmDialog, Field, Input, Panel, Select, Spinner } from "@/components/ui";
import {
  apiFetch,
  useCatalog,
  useDeleteCatalogItem,
  useSaveCatalogItem,
} from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/toast";
import type { SettingsData } from "@/lib/types";

export default function SettingsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [savingBiz, setSavingBiz] = useState(false);

  useEffect(() => {
    apiFetch<{ settings: SettingsData }>("/api/settings")
      .then((d) => setSettings(d.settings))
      .catch(() => void 0);
  }, []);

  async function saveBusiness(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSavingBiz(true);
    try {
      await apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          section: "business",
          businessName: settings.businessName,
          tagline: settings.tagline,
          brands: settings.brands,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
          currency: settings.currency,
          billPrefix: settings.billPrefix,
          financialTagline: settings.financialTagline,
          backupEmail: settings.backupEmail,
        }),
      });
      toast.success("Business profile saved successfully!");
      qc.invalidateQueries({ queryKey: ["meta"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSavingBiz(false);
    }
  }

  return (
    <div className="p-3 sm:p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-200 text-slate-700">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-black text-[#0f3d63]">Settings &amp; Configuration</h1>
          <p className="text-xs text-slate-500">Manage your business profile, user security, product catalog, and database.</p>
        </div>
      </div>

      {!settings ? (
        <Spinner label="Loading settings..." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {/* Business Profile */}
          <Panel title="Business Profile" icon={<Building2 className="h-5 w-5" />}>
            <form onSubmit={saveBusiness} className="grid gap-4 sm:grid-cols-2">
              <Field label="Business / Shop Name" className="sm:col-span-2">
                <Input
                  value={settings.businessName}
                  onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                />
              </Field>
              <Field label="Tagline" className="sm:col-span-2">
                <Input
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                />
              </Field>
              <Field label="Supported Brands (Comma separated)" className="sm:col-span-2">
                <Input
                  value={settings.brands.join(", ")}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      brands: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </Field>
              <Field label="Phone Number">
                <Input value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
              </Field>
              <Field label="Email Address">
                <Input value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} />
              </Field>
              <Field label="Shop Address" className="sm:col-span-2">
                <Input value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} />
              </Field>
              <Field label="Bill Serial Prefix">
                <Input
                  maxLength={6}
                  value={settings.billPrefix}
                  onChange={(e) => setSettings({ ...settings, billPrefix: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Currency Symbol">
                <Input
                  maxLength={3}
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                />
              </Field>
              <Field label="Header Subtitle" className="sm:col-span-2">
                <Input
                  value={settings.financialTagline}
                  onChange={(e) => setSettings({ ...settings, financialTagline: e.target.value })}
                />
              </Field>
              <Field label="Default Email for Backups" className="sm:col-span-2">
                <Input
                  value={settings.backupEmail ?? ""}
                  onChange={(e) => setSettings({ ...settings, backupEmail: e.target.value })}
                  placeholder="e.g. backup@yourbusiness.com"
                />
              </Field>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" variant="success" loading={savingBiz}>
                  <Save className="h-4 w-4" /> Save Business Profile
                </Button>
              </div>
            </form>
          </Panel>

          <div className="space-y-4">
            <AccountPanel />
            <SmtpPanel />
          </div>

          {/* Item Catalog */}
          <Panel className="xl:col-span-2" title="Item &amp; Service Catalog" icon={<Package className="h-5 w-5" />}>
            <CatalogManager />
          </Panel>

          {/* Data Management: Clear Demo vs Reload Demo */}
          <Panel className="xl:col-span-2" title="Data Management" icon={<Database className="h-5 w-5" />}>
            <DataManagementZone />
          </Panel>
        </div>
      )}
    </div>
  );
}

function AccountPanel() {
  const toast = useToast();
  const [name, setName] = useState("Admin");
  const [username, setUsername] = useState("admin");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ user: { name: string; username: string } }>("/api/auth/me")
      .then((d) => {
        setName(d.user.name);
        setUsername(d.user.username);
      })
      .catch(() => void 0);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) return toast.error("Please enter your current password to confirm changes.");
    setSaving(true);
    try {
      await apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ section: "account", name, username, currentPassword, newPassword }),
      });
      toast.success("Account credentials updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title="Login &amp; Security" icon={<KeyRound className="h-5 w-5" />}>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Display Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Username">
          <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} />
        </Field>
        <Field label="Current Password *">
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Required to apply changes"
            required
          />
        </Field>
        <Field label="New Password (Optional)" hint="Leave empty to keep existing password">
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 4 characters"
          />
        </Field>
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" loading={saving}>
            <Save className="h-4 w-4" /> Update Account
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function SmtpPanel() {
  const toast = useToast();
  const [form, setForm] = useState({ smtpHost: "", smtpPort: 587, smtpUser: "", smtpPass: "" });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ settings: SettingsData }>("/api/settings")
      .then((d) => {
        setForm({
          smtpHost: d.settings.smtpHost ?? "",
          smtpPort: d.settings.smtpPort ?? 587,
          smtpUser: d.settings.smtpUser ?? "",
          smtpPass: d.settings.smtpPass ?? "",
        });
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/settings", { method: "PUT", body: JSON.stringify({ section: "smtp", ...form }) });
      toast.success("Email configuration saved successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save email settings");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return <Spinner label="Loading..." />;

  return (
    <Panel title="Email &amp; SMTP Settings (Optional)" icon={<Mail className="h-5 w-5" />}>
      <p className="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
        Email backup automatically generates an email draft with your backup file ready to attach. SMTP details are optional.
      </p>
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <Field label="SMTP Host">
          <Input value={form.smtpHost} onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} placeholder="e.g. smtp.gmail.com" />
        </Field>
        <Field label="SMTP Port">
          <Input type="number" value={form.smtpPort} onChange={(e) => setForm({ ...form, smtpPort: Number(e.target.value) })} />
        </Field>
        <Field label="SMTP Username">
          <Input value={form.smtpUser} onChange={(e) => setForm({ ...form, smtpUser: e.target.value })} />
        </Field>
        <Field label="SMTP Password">
          <Input
            type="password"
            value={form.smtpPass}
            onChange={(e) => setForm({ ...form, smtpPass: e.target.value })}
            placeholder={form.smtpPass ? "********" : "••••••••"}
          />
        </Field>
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" loading={saving}>
            <Save className="h-4 w-4" /> Save Email Settings
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function CatalogManager() {
  const { data, isLoading } = useCatalog();
  const saveItem = useSaveCatalogItem();
  const deleteItem = useDeleteCatalogItem();
  const toast = useToast();
  const [name, setName] = useState("");
  const [rate, setRate] = useState(0);
  const [category, setCategory] = useState("Consumable");
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const items = data?.items ?? [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please enter item name");
    try {
      await saveItem.mutateAsync({ id: editId ?? undefined, name: name.trim(), defaultRate: Number(rate) || 0, category });
      toast.success(editId ? "Item updated successfully!" : "Item added to catalog!");
      setName("");
      setRate(0);
      setEditId(null);
      setCategory("Consumable");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save item");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      {isLoading ? (
        <Spinner label="Loading catalog..." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[440px] text-sm">
            <thead className="bg-[#eef5fb] text-xs uppercase text-[#0f3d63]">
              <tr>
                <th className="px-3 py-2.5 text-left font-bold">Item Description</th>
                <th className="px-3 py-2.5 text-left font-bold">Category</th>
                <th className="px-3 py-2.5 text-right font-bold">Default Rate (₹)</th>
                <th className="px-3 py-2.5 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium">{i.name}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{i.category}</td>
                  <td className="px-3 py-2 text-right tabular">₹ {i.defaultRate.toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button
                        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
                        title="Edit Item"
                        onClick={() => {
                          setEditId(i.id);
                          setName(i.name);
                          setRate(i.defaultRate);
                          setCategory(i.category);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50"
                        title="Delete Item"
                        onClick={() => setDeleteTarget({ id: i.id, name: i.name })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={submit} className="h-fit rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
        <p className="mb-2.5 text-sm font-bold text-[#0f3d63]">{editId ? "Edit Item / Service" : "Add New Item / Service"}</p>
        <div className="space-y-2.5">
          <Input placeholder="Item Name (e.g. Toner, Drum, Servicing)" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input type="number" min={0} placeholder="Default Rate (₹)" value={rate || ""} onChange={(e) => setRate(Number(e.target.value))} />
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option>Consumable</option>
            <option>Spare Part</option>
            <option>Service</option>
            <option>General</option>
          </Select>
          <div className="flex gap-2 pt-1">
            <Button type="submit" variant="success" className="flex-1" loading={saveItem.isPending}>
              <Plus className="h-4 w-4" /> {editId ? "Update Item" : "Add Item"}
            </Button>
            {editId && (
              <Button type="button" variant="secondary" onClick={() => { setEditId(null); setName(""); setRate(0); }}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteItem.mutateAsync(deleteTarget.id);
            toast.success(`${deleteTarget.name} removed from catalog.`);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not delete");
          }
          setDeleteTarget(null);
        }}
        loading={deleteItem.isPending}
        title="Remove Catalog Item?"
        message={<>Are you sure you want to delete <b>{deleteTarget?.name}</b>? Existing past bills will not be affected.</>}
      />
    </div>
  );
}

function DataManagementZone() {
  const toast = useToast();
  const qc = useQueryClient();
  const router = useRouter();
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleClearData() {
    setBusy(true);
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>("/api/data/manage", {
        method: "POST",
        body: JSON.stringify({ action: "clear", keepCustomers: false }),
      });
      toast.success(res.message || "All demo bills and customers cleared! Your app is now fresh.");
      qc.invalidateQueries();
      setConfirmClear(false);
      setTimeout(() => router.push("/dashboard?view=all"), 500);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to clear data.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResetDemo() {
    setBusy(true);
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>("/api/data/manage", {
        method: "POST",
        body: JSON.stringify({ action: "reset-demo" }),
      });
      toast.success(res.message || "Demo data restored successfully.");
      qc.invalidateQueries();
      setConfirmReset(false);
      setTimeout(() => router.push("/dashboard"), 500);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to restore demo data.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Option 1: Clear Demo Data / Start Fresh */}
      <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-950">Clear Demo Data (Start Fresh for Your Shop)</p>
            <p className="text-xs text-amber-800">
              Removes all demo bills, payments, and sample records so you can start entering your own real customer orders. Your admin login stays active.
            </p>
          </div>
        </div>
        <Button variant="danger" onClick={() => setConfirmClear(true)}>
          Clear Demo Data
        </Button>
      </div>

      {/* Option 2: Restore Demo Data */}
      <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50/70 p-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-sky-100 text-[#1479c9]">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-sky-950">Reload Demo Dataset</p>
            <p className="text-xs text-sky-800">
              Loads the realistic demo dataset with September 2026 bills, Rahul Das ledger, and monthly charts for testing.
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => setConfirmReset(true)}>
          <Sparkles className="h-4 w-4" /> Load Demo Data
        </Button>
      </div>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={handleClearData}
        loading={busy}
        title="Clear All Demo Bills and Data?"
        message="This will delete all demo bills, items, payments, and customers. Your login and shop settings will be preserved. Use this to start fresh with your real business data."
        confirmLabel="Yes, Clear Everything"
      />

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={handleResetDemo}
        loading={busy}
        title="Reload Demo Dataset?"
        message="This will replace current bills with the sample September 2026 demo bills and customers. Are you sure?"
        confirmLabel="Load Demo Data"
        danger={false}
      />
    </div>
  );
}
