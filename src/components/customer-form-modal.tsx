"use client";

import { useEffect, useState } from "react";
import { Button, Field, Input, Modal } from "@/components/ui";
import { useSaveCustomer } from "@/lib/hooks";
import { useToast } from "@/components/toast";
import type { CustomerDTO } from "@/lib/types";

export default function CustomerFormModal({
  open,
  customer,
  onClose,
  onSaved,
}: {
  open: boolean;
  customer?: CustomerDTO | null;
  onClose: () => void;
  onSaved?: (c: CustomerDTO) => void;
}) {
  const toast = useToast();
  const save = useSaveCustomer();
  const [form, setForm] = useState({ name: "", mobile: "", address: "", email: "", gstin: "", notes: "" });

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name,
        mobile: customer.mobile ?? "",
        address: customer.address ?? "",
        email: customer.email ?? "",
        gstin: customer.gstin ?? "",
        notes: customer.notes ?? "",
      });
    } else {
      setForm({ name: "", mobile: "", address: "", email: "", gstin: "", notes: "" });
    }
  }, [customer, open]);

  async function submit() {
    if (!form.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    try {
      const { customer: saved } = await save.mutateAsync({ ...(customer ? { id: customer.id } : {}), ...form });
      toast.success(customer ? "Customer updated" : "Customer added");
      onSaved?.(saved);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save customer");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? "Edit Customer" : "New Customer"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="success" loading={save.isPending} onClick={submit}>
            {customer ? "Update" : "Save Customer"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *" className="sm:col-span-2">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer / business name" />
        </Field>
        <Field label="Mobile">
          <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="10-digit mobile" />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="City / full address" />
        </Field>
        <Field label="GSTIN">
          <Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} placeholder="Optional" />
        </Field>
        <Field label="Notes">
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
        </Field>
      </div>
    </Modal>
  );
}
