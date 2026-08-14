"use client";
import React, { useEffect, useState } from "react";
import {
  X, MapPin, CreditCard, Truck, Package, Loader2, Mail, ChevronRight, Phone, User,
} from "lucide-react";
import { C, HEAD, zar } from "@/lib/pricing";
import { friendlyError } from "@/lib/errors";
import * as db from "@/lib/admin-data";
import { Plate, Pill, StatusBadge } from "./primitives";

export const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled", "refunded"];

const STATUS_FLOW = ["pending", "paid", "shipped", "delivered"];

function statusSteps(status) {
  const raw = String(status || "pending").toLowerCase();
  const idx = STATUS_FLOW.indexOf(raw);
  return STATUS_FLOW.map((label, i) => ({
    label: label[0].toUpperCase() + label.slice(1),
    done: idx >= 0 && i <= idx,
    current: idx === i,
  }));
}

function customerLabel(o) {
  return o.customerName || o.email || "Customer";
}

/**
 * Admin orders table + detail modal. Click a row to manage status, tracking, and view full details.
 */
export function LiveOrders({ orders, compact, onChanged, toast }) {
  const [selectedId, setSelectedId] = useState(null);

  if (orders.length === 0) {
    return <p className="text-[14px] text-neutral-500 py-8 text-center">No orders yet.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-[14px]" style={{ minWidth: compact ? 560 : 780 }}>
          {!compact && (
            <thead>
              <tr className="text-left text-neutral-500 text-[12px]" style={{ borderBottom: `1px solid ${C.line}` }}>
                {["ORDER", "CUSTOMER", "DATE", "ITEMS", "TOTAL", "STATUS", ""].map((h) => (
                  <th key={h || "open"} className="py-3 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                onClick={() => setSelectedId(o.id)}
                className="cursor-pointer hover:bg-black/[0.02] transition-colors"
                style={{ borderBottom: `1px solid ${C.line}` }}
              >
                <td className="py-3 align-top">
                  <div style={{ fontFamily: HEAD }}>{o.order_no}</div>
                  {compact && (
                    <div className="text-[12px] text-neutral-500 mt-0.5 max-w-[160px] truncate">
                      {customerLabel(o)}
                      {o.deliveryCity ? ` · ${o.deliveryCity}` : ""}
                    </div>
                  )}
                </td>
                {!compact && (
                  <td className="py-3 align-top max-w-[220px]">
                    <div className="text-[13px] truncate" style={{ fontFamily: HEAD }}>{customerLabel(o)}</div>
                    {o.customerName && o.email && (
                      <div className="text-[12px] text-neutral-500 truncate mt-0.5">{o.email}</div>
                    )}
                    {(o.customerPhone || o.deliveryCity) && (
                      <div className="text-[12px] text-neutral-400 truncate mt-0.5">
                        {[o.customerPhone, o.deliveryCity].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </td>
                )}
                <td className="text-neutral-600 align-top py-3">
                  {new Date(o.created_at).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="text-neutral-600 align-top py-3">{o.item_count} item{o.item_count === 1 ? "" : "s"}</td>
                <td className="align-top py-3">{zar((o.total_cents || 0) / 100)}</td>
                <td className="align-top py-3"><StatusBadge s={o.status} /></td>
                {!compact && (
                  <td className="py-3 text-right text-neutral-400 align-top">
                    <ChevronRight size={16} className="inline-block" />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedId && (
        <AdminOrderModal
          orderId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={onChanged}
          toast={toast}
        />
      )}
    </>
  );
}

function AdminOrderModal({ orderId, onClose, onChanged, toast }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("pending");
  const [tracking, setTracking] = useState("");

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const detail = await db.fetchOrderDetail(orderId);
        if (cancelled) return;
        setOrder(detail);
        setStatus(detail.status || "pending");
        setTracking(detail.tracking || "");
      } catch (e) {
        if (!cancelled) {
          toast?.(friendlyError(e, "Could not load order"));
          onClose();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orderId, onClose, toast]);

  const save = async () => {
    if (!order) return;
    const statusChanged = status !== order.status;
    const trackingChanged = (tracking || "") !== (order.tracking || "");
    if (!statusChanged && !trackingChanged) {
      toast?.("No changes to save");
      return;
    }
    setSaving(true);
    try {
      const updated = await db.updateOrder(order.id, {
        status,
        tracking_no: tracking,
      });
      setOrder(updated);
      setStatus(updated.status);
      setTracking(updated.tracking || "");
      toast?.(`Order ${updated.order_no} updated`);
      onChanged?.();

      // Status emails are wired here; /api/email no-ops until Resend templates are ready.
      if (statusChanged) {
        const mail = await db.notifyOrderStatusEmail(updated, status);
        if (mail?.ok) toast?.(`Customer notified (${status})`);
        else if (mail?.skipped) {
          // Quiet — RESEND_API_KEY missing or invalid email is expected for now
        }
      }
    } catch (e) {
      toast?.(friendlyError(e, "Update failed"));
    } finally {
      setSaving(false);
    }
  };

  const d = order?.delivery;
  const steps = statusSteps(status);
  const dirty = order && (status !== order.status || (tracking || "") !== (order.tracking || ""));

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="admin-order-title">
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
            <p className="text-[11px] tracking-[.2em] mb-1" style={{ fontFamily: HEAD, color: C.green }}>ORDER DETAIL</p>
            <h2 id="admin-order-title" className="text-[26px] leading-none" style={{ fontFamily: HEAD, fontWeight: 300 }}>
              {order?.order_no || "…"}
            </h2>
            <p className="text-[13px] text-neutral-500 mt-2">
              {order ? `${order.date} · ${order.item_count} item${order.item_count === 1 ? "" : "s"}` : "Loading…"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {order && <StatusBadge s={status} />}
            <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
          {loading || !order ? (
            <div className="py-16 flex justify-center text-neutral-400">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between gap-2">
                  {steps.map((s, i) => (
                    <React.Fragment key={s.label}>
                      <div className="flex flex-col items-center gap-1.5 min-w-0">
                        <div
                          className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px]"
                          style={{
                            background: s.done ? C.green : "transparent",
                            border: `1.5px solid ${s.done ? C.green : C.line}`,
                            color: s.done ? "#fff" : C.line,
                          }}
                        >
                          {s.done ? "✓" : ""}
                        </div>
                        <span className="text-[10px] sm:text-[11px] tracking-[.06em] text-center" style={{ fontFamily: HEAD, color: s.done ? C.ink : C.gray }}>
                          {s.label}
                        </span>
                      </div>
                      {i < steps.length - 1 && (
                        <div className="flex-1 h-px mb-5" style={{ background: steps[i + 1].done || s.current ? C.green : C.line }} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="p-4 space-y-4" style={{ background: "#faf9f6", borderRadius: 8 }}>
                <h3 className="text-[12px] tracking-[.14em] text-neutral-500 flex items-center gap-1.5" style={{ fontFamily: HEAD }}>
                  <Package size={13} /> MANAGE ORDER
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-[11px] tracking-[.08em] text-neutral-500 mb-1.5" style={{ fontFamily: HEAD }}>STATUS</span>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3 text-[14px] outline-none bg-white appearance-none"
                      style={{ border: `1px solid ${C.line}`, borderRadius: 4, fontFamily: HEAD, height: 42, boxSizing: "border-box" }}
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-[11px] tracking-[.08em] text-neutral-500 mb-1.5" style={{ fontFamily: HEAD }}>TRACKING NO.</span>
                    <input
                      value={tracking}
                      onChange={(e) => setTracking(e.target.value)}
                      placeholder="Courier tracking number"
                      className="w-full px-3 text-[14px] outline-none bg-white"
                      style={{ border: `1px solid ${C.line}`, borderRadius: 4, height: 42, boxSizing: "border-box" }}
                    />
                  </label>
                </div>
                <p className="text-[12px] text-neutral-500 leading-relaxed">
                  Saving a new status will email the customer when transactional mail is connected (Resend).
                </p>
              </div>

              <div>
                <h3 className="text-[12px] tracking-[.14em] mb-3 text-neutral-500" style={{ fontFamily: HEAD }}>ITEMS</h3>
                <div className="space-y-3">
                  {(order.lines || []).map((line, i) => (
                    <div key={`${line.name}-${i}`} className="flex gap-3 p-3" style={{ background: "#faf9f6", borderRadius: 6 }}>
                      <Plate product={line} showSig={false} style={{ width: 64, height: 64, borderRadius: 4, flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] truncate" style={{ fontFamily: HEAD }}>{line.name}</div>
                        <div className="text-[12px] text-neutral-500 mt-0.5">{line.summary}</div>
                        <div className="text-[12px] text-neutral-500 mt-1">Qty {line.qty}</div>
                      </div>
                      <div className="text-[14px] shrink-0" style={{ fontFamily: HEAD }}>{zar(line.price * (line.qty || 1))}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <h3 className="text-[12px] tracking-[.14em] mb-2 text-neutral-500 flex items-center gap-1.5" style={{ fontFamily: HEAD }}>
                    <MapPin size={13} /> DELIVERY
                  </h3>
                  {d ? (
                    <p className="text-[13px] text-neutral-700 leading-relaxed">
                      {d.street}<br />
                      {d.suburb && <>{d.suburb}<br /></>}
                      {d.city}{d.province ? `, ${d.province}` : ""}<br />
                      {d.postal}
                      {d.country && <span className="block">{d.country}</span>}
                      {order.shippingMethod && (
                        <span className="block text-neutral-500 mt-2 capitalize">{order.shippingMethod} shipping</span>
                      )}
                      {d.notes && <span className="block text-neutral-500 mt-2">{d.notes}</span>}
                    </p>
                  ) : (
                    <p className="text-[13px] text-neutral-500">No address on file.</p>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-[12px] tracking-[.14em] mb-2 text-neutral-500 flex items-center gap-1.5" style={{ fontFamily: HEAD }}>
                      <User size={13} /> CUSTOMER
                    </h3>
                    <p className="text-[14px] text-neutral-800 leading-relaxed" style={{ fontFamily: HEAD }}>
                      {order.customerName || "—"}
                    </p>
                    {order.email && (
                      <p className="text-[13px] text-neutral-600 mt-1.5 flex items-center gap-1.5">
                        <Mail size={12} className="shrink-0 text-neutral-400" />
                        <a href={`mailto:${order.email}`} className="hover:underline break-all" onClick={(e) => e.stopPropagation()}>
                          {order.email}
                        </a>
                      </p>
                    )}
                    {order.customerPhone && (
                      <p className="text-[13px] text-neutral-600 mt-1 flex items-center gap-1.5">
                        <Phone size={12} className="shrink-0 text-neutral-400" />
                        <a href={`tel:${order.customerPhone}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                          {order.customerPhone}
                        </a>
                      </p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-[12px] tracking-[.14em] mb-2 text-neutral-500 flex items-center gap-1.5" style={{ fontFamily: HEAD }}>
                      <CreditCard size={13} /> PAYMENT
                    </h3>
                    <p className="text-[13px] text-neutral-700">{order.pay || "Card"}</p>
                  </div>
                  {tracking && (
                    <div>
                      <h3 className="text-[12px] tracking-[.14em] mb-2 text-neutral-500 flex items-center gap-1.5" style={{ fontFamily: HEAD }}>
                        <Truck size={13} /> TRACKING
                      </h3>
                      <p className="text-[13px] text-neutral-700" style={{ fontFamily: HEAD }}>{tracking}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2" style={{ borderTop: `1px solid ${C.line}` }}>
                <div className="flex justify-between text-[13px] py-1"><span className="text-neutral-500">Subtotal</span><span>{zar(order.subtotal)}</span></div>
                <div className="flex justify-between text-[13px] py-1"><span className="text-neutral-500">Shipping</span><span>{order.shipping === 0 ? "Free" : zar(order.shipping)}</span></div>
                <div className="flex justify-between text-[16px] pt-2" style={{ fontFamily: HEAD, fontWeight: 600 }}><span>Total</span><span>{zar(order.total)}</span></div>
              </div>
            </>
          )}
        </div>

        <div className="shrink-0 px-6 py-4 flex flex-wrap gap-3 justify-between items-center" style={{ borderTop: `1px solid ${C.line}` }}>
          <button type="button" onClick={onClose} className="text-[13px] text-neutral-500">Close</button>
          <Pill onClick={save} disabled={saving || loading || !dirty} style={{ opacity: saving || !dirty ? 0.55 : 1 }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? "Saving…" : "Save changes"}
          </Pill>
        </div>
      </div>
    </div>
  );
}
