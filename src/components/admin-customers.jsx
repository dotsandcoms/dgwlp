"use client";
import React, { useCallback, useEffect, useState } from "react";
import {
  X, MapPin, Loader2, Users, ChevronRight, Mail, Phone, User, Package, Plus, Trash2,
} from "lucide-react";
import { C, HEAD, zar } from "@/lib/pricing";
import { friendlyError } from "@/lib/errors";
import * as db from "@/lib/admin-data";
import { emptyAddress } from "@/lib/address";
import { AddressFields } from "./address-fields";
import { PasswordInput } from "./password-input";
import { Pill } from "./primitives";

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function customerLabel(c) {
  return c?.full_name || c?.email || "Customer";
}

const inp = {
  className: "w-full px-3 text-[14px] outline-none bg-white",
  style: { border: `1px solid ${C.line}`, borderRadius: 4, height: 42, boxSizing: "border-box" },
};

/**
 * Admin customers table + detail modal. Click a row to view and edit account details.
 */
export function LiveCustomers({ toast }) {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    return db.fetchCustomers()
      .then(setCustomers)
      .catch((e) => toast(friendlyError(e, "Failed to load customers")))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    reload();
  }, [reload]);

  const openCreate = () => {
    setCreating(true);
    setSelectedId(null);
  };

  const closeModal = () => {
    setSelectedId(null);
    setCreating(false);
  };

  if (loading && customers.length === 0) {
    return (
      <div className="py-24 flex items-center justify-center gap-2 text-neutral-500 text-[14px]">
        <Loader2 size={16} className="animate-spin" /> Loading customers…
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: C.greenSoft, color: C.green }}>
            <Users size={18} />
          </div>
          <div>
            <h2 className="text-[20px]" style={{ fontFamily: HEAD }}>Customers</h2>
            <p className="text-[13px] text-neutral-500">{customers.length} registered account{customers.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <Pill onClick={openCreate} size="sm"><Plus size={14} className="inline mr-1.5" />Add customer</Pill>
      </div>

      {customers.length === 0 ? (
        <p className="text-[14px] text-neutral-500 py-12 text-center">No accounts yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]" style={{ minWidth: 720 }}>
            <thead>
              <tr className="text-left text-neutral-500 text-[12px]" style={{ borderBottom: `1px solid ${C.line}` }}>
                {["CUSTOMER", "EMAIL", "PHONE", "JOINED", ""].map((h) => (
                  <th key={h || "open"} className="py-3 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => { setCreating(false); setSelectedId(c.id); }}
                  className="cursor-pointer hover:bg-black/[0.02] transition-colors"
                  style={{ borderBottom: `1px solid ${C.line}` }}
                >
                  <td className="py-3 align-top">
                    <div style={{ fontFamily: HEAD }}>{customerLabel(c)}</div>
                  </td>
                  <td className="py-3 align-top text-neutral-600 max-w-[240px] truncate">
                    {c.email || <span className="text-neutral-400">—</span>}
                  </td>
                  <td className="py-3 align-top text-neutral-600">{c.phone || "—"}</td>
                  <td className="py-3 align-top text-neutral-500">{fmtDate(c.created_at)}</td>
                  <td className="py-3 text-right text-neutral-400 align-top">
                    <ChevronRight size={16} className="inline-block" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {customers.some((c) => !c.email) && (
        <p className="text-[12px] text-neutral-500 mt-4">
          Email addresses require <code className="font-mono">admin_list_customers</code> in Supabase. Run <code className="font-mono">supabase/admin_customers.sql</code> if emails are missing.
        </p>
      )}

      {(selectedId || creating) && (
        <AdminCustomerModal
          customerId={creating ? null : selectedId}
          isNew={creating}
          onClose={closeModal}
          onChanged={reload}
          toast={toast}
        />
      )}
    </>
  );
}

function AdminCustomerModal({ customerId, isNew, onClose, onChanged, toast }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    address: emptyAddress(),
  });

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  useEffect(() => {
    if (isNew) {
      setCustomer(null);
      setForm({ full_name: "", email: "", phone: "", password: "", address: emptyAddress() });
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const detail = await db.fetchCustomerDetail(customerId);
        if (cancelled) return;
        if (!detail) {
          toast?.(friendlyError("Customer not found"));
          onClose();
          return;
        }
        setCustomer(detail);
        setForm({
          full_name: detail.full_name || "",
          email: detail.email || "",
          phone: detail.phone || "",
          password: "",
          address: detail.address ? { ...emptyAddress(), ...detail.address } : emptyAddress(),
        });
      } catch (e) {
        if (!cancelled) {
          toast?.(friendlyError(e, "Could not load customer"));
          onClose();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [customerId, isNew, onClose, toast]);

  const patch = (partial) => setForm((prev) => ({ ...prev, ...partial }));

  const dirty = isNew
    ? Boolean(form.full_name && form.email && form.password)
    : customer && (
      form.full_name !== (customer.full_name || "")
      || form.email !== (customer.email || "")
      || form.phone !== (customer.phone || "")
      || JSON.stringify(form.address) !== JSON.stringify(customer.address ? { ...emptyAddress(), ...customer.address } : emptyAddress())
    );

  const save = async () => {
    if (!dirty && !isNew) {
      toast?.("No changes to save");
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const created = await db.createCustomer({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          address: form.address,
        });
        toast?.(`Account created for ${created.email || created.full_name}`);
        onChanged?.();
        onClose();
        return;
      }

      const updated = await db.updateCustomer(customer.id, {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        address: form.address,
      });
      setCustomer(updated);
      setForm({
        full_name: updated.full_name || "",
        email: updated.email || "",
        phone: updated.phone || "",
        password: "",
        address: updated.address ? { ...emptyAddress(), ...updated.address } : emptyAddress(),
      });
      toast?.(`Customer updated`);
      onChanged?.();
    } catch (e) {
      toast?.(friendlyError(e, isNew ? "Could not create customer" : "Update failed"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!customer || isNew) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await db.deleteCustomer(customer.id);
      toast?.("Customer deleted");
      onChanged?.();
      onClose();
    } catch (e) {
      toast?.(friendlyError(e, "Delete failed"));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const title = isNew ? "New customer" : (customer?.full_name || customer?.email || "Customer");
  const d = form.address;
  const orders = customer?.orders || [];

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="admin-customer-title">
      <div className="absolute inset-0" style={{ background: "rgba(20,20,18,.55)" }} onClick={onClose} />
      <div
        className="relative w-full sm:max-w-[680px] max-h-[92vh] bg-white flex flex-col overflow-hidden sm:rounded-2xl rounded-t-2xl"
        style={{ boxShadow: "0 24px 80px rgba(0,0,0,.28)" }}
      >
        <div
          className="shrink-0 px-6 pt-5 pb-4 flex items-start justify-between gap-4"
          style={{ borderBottom: `1px solid ${C.line}`, background: `linear-gradient(180deg, ${C.greenSoft}, #fff 88%)` }}
        >
          <div>
            <p className="text-[11px] tracking-[.2em] mb-1" style={{ fontFamily: HEAD, color: C.green }}>
              {isNew ? "NEW ACCOUNT" : "CUSTOMER DETAIL"}
            </p>
            <h2 id="admin-customer-title" className="text-[26px] leading-none" style={{ fontFamily: HEAD, fontWeight: 300 }}>
              {loading && !isNew ? "…" : title}
            </h2>
            {!isNew && customer && (
              <p className="text-[13px] text-neutral-500 mt-2">
                Joined {fmtDate(customer.created_at)} · {customer.order_count || 0} order{(customer.order_count || 0) === 1 ? "" : "s"}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
          {loading && !isNew ? (
            <div className="py-16 flex justify-center text-neutral-400">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : (
            <>
              <div className="p-4 space-y-4" style={{ background: "#faf9f6", borderRadius: 8 }}>
                <h3 className="text-[12px] tracking-[.14em] text-neutral-500 flex items-center gap-1.5" style={{ fontFamily: HEAD }}>
                  <User size={13} /> ACCOUNT
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block sm:col-span-2">
                    <span className="block text-[11px] tracking-[.08em] text-neutral-500 mb-1.5" style={{ fontFamily: HEAD }}>FULL NAME</span>
                    <input value={form.full_name} onChange={(e) => patch({ full_name: e.target.value })} className={inp.className} style={inp.style} />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] tracking-[.08em] text-neutral-500 mb-1.5" style={{ fontFamily: HEAD }}>EMAIL</span>
                    <input type="email" value={form.email} onChange={(e) => patch({ email: e.target.value })} className={inp.className} style={inp.style} />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] tracking-[.08em] text-neutral-500 mb-1.5" style={{ fontFamily: HEAD }}>PHONE</span>
                    <input value={form.phone} onChange={(e) => patch({ phone: e.target.value })} className={inp.className} style={inp.style} />
                  </label>
                  {isNew && (
                    <label className="block sm:col-span-2">
                      <span className="block text-[11px] tracking-[.08em] text-neutral-500 mb-1.5" style={{ fontFamily: HEAD }}>PASSWORD</span>
                      <PasswordInput
                        value={form.password}
                        onChange={(e) => patch({ password: e.target.value })}
                        placeholder="At least 6 characters"
                        autoComplete="new-password"
                        className={inp.className}
                        style={inp.style}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-[12px] tracking-[.14em] mb-3 text-neutral-500 flex items-center gap-1.5" style={{ fontFamily: HEAD }}>
                  <MapPin size={13} /> DEFAULT DELIVERY ADDRESS
                </h3>
                <AddressFields value={form.address} onChange={(address) => patch({ address })} />
              </div>

              {!isNew && (
                <div>
                  <h3 className="text-[12px] tracking-[.14em] mb-3 text-neutral-500 flex items-center gap-1.5" style={{ fontFamily: HEAD }}>
                    <Package size={13} /> ORDERS
                  </h3>
                  {orders.length === 0 ? (
                    <p className="text-[13px] text-neutral-500">No orders yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {orders.map((o) => (
                        <div key={o.id} className="flex items-center justify-between gap-3 p-3 text-[13px]" style={{ background: "#faf9f6", borderRadius: 6 }}>
                          <div>
                            <div style={{ fontFamily: HEAD }}>{o.order_no}</div>
                            <div className="text-[12px] text-neutral-500 mt-0.5 capitalize">{o.status} · {fmtDate(o.created_at)}</div>
                          </div>
                          <div style={{ fontFamily: HEAD }}>{zar((o.total_cents || 0) / 100)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!isNew && customer && (
                <div className="grid sm:grid-cols-2 gap-4 text-[13px] text-neutral-600">
                  {customer.email && (
                    <p className="flex items-center gap-1.5">
                      <Mail size={12} className="shrink-0 text-neutral-400" />
                      <a href={`mailto:${customer.email}`} className="hover:underline break-all" onClick={(e) => e.stopPropagation()}>
                        {customer.email}
                      </a>
                    </p>
                  )}
                  {customer.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone size={12} className="shrink-0 text-neutral-400" />
                      <a href={`tel:${customer.phone}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                        {customer.phone}
                      </a>
                    </p>
                  )}
                  {d?.city && (
                    <p className="sm:col-span-2 text-neutral-500">
                      {d.street}{d.suburb ? `, ${d.suburb}` : ""} · {d.city}{d.province ? `, ${d.province}` : ""} · {d.postal}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 px-6 py-4 flex flex-wrap gap-3 justify-between items-center" style={{ borderTop: `1px solid ${C.line}` }}>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="text-[13px] text-neutral-500">Close</button>
            {!isNew && customer && (
              <button
                type="button"
                onClick={remove}
                disabled={deleting || (customer.order_count || 0) > 0}
                className="text-[13px] flex items-center gap-1.5"
                style={{ color: (customer.order_count || 0) > 0 ? C.gray : "#b33" }}
                title={(customer.order_count || 0) > 0 ? "Customers with orders cannot be deleted" : undefined}
              >
                <Trash2 size={14} />
                {deleting ? "Deleting…" : confirmDelete ? "Confirm delete" : "Delete account"}
              </button>
            )}
          </div>
          <Pill onClick={save} disabled={saving || loading || !dirty} style={{ opacity: saving || !dirty ? 0.55 : 1 }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? "Saving…" : isNew ? "Create account" : "Save changes"}
          </Pill>
        </div>
      </div>
    </div>
  );
}
