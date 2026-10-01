"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X, Loader2, Truck } from "lucide-react";
import { C, HEAD, zar } from "@/lib/pricing";
import { Plate, Pill } from "@/components/primitives";
import { saveQuotedCheckout } from "@/components/checkout";
import { useCart, useToast } from "@/context/providers";

export default function QuoteResponsePage() {
  return (
    <React.Suspense fallback={<QuoteShell loading />}>
      <QuoteResponseInner />
    </React.Suspense>
  );
}

function QuoteShell({ loading, children }) {
  return (
    <div className="max-w-[640px] mx-auto px-5 py-16">
      {loading ? (
        <div className="flex items-center justify-center gap-2 text-neutral-500">
          <Loader2 className="animate-spin" size={18} /> Loading quote…
        </div>
      ) : children}
    </div>
  );
}

function QuoteResponseInner() {
  const params = useSearchParams();
  const router = useRouter();
  const cart = useCart();
  const { toast } = useToast();
  const token = params.get("token") || "";
  const action = String(params.get("action") || "").toLowerCase();

  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (!token) {
      setError("Missing quote link.");
      return;
    }
    let cancelled = false;
    fetch(`/api/order/quote?token=${encodeURIComponent(token)}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return;
        if (!ok) {
          setError(d.error || "Quote not found");
          return;
        }
        setOrder(d.order);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load quote");
      });
    return () => { cancelled = true; };
  }, [token]);

  const run = async (act) => {
    if (!token || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/order/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: act }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed");

      if (act === "decline") {
        setDone("declined");
        toast("Quote declined — order cancelled");
        return;
      }

      // confirm → restore cart with shipping and go to checkout payment
      const o = data.order;
      const nextItems = (o.items || []).map((item) => ({
        ...item,
        key: Math.random().toString(36).slice(2),
        product: {
          name: item.name,
          image: item.image || null,
          colour: item.printColour || "bw",
          grad: ["#2f2f2d", "#a9a49b"],
          angle: 120,
        },
      }));
      cart.replace(nextItems);
      saveQuotedCheckout({
        orderDbId: o.dbId,
        orderNo: o.id,
        shipping: o.shipping,
        subtotal: o.subtotal,
        total: o.total,
        email: o.email,
        delivery: o.delivery,
        items: o.items,
        token,
      });
      toast("Quote accepted — continue to payment");
      router.push("/checkout");
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  // Auto-run when action is in the URL
  useEffect(() => {
    if (!order || done || busy) return;
    if (action === "confirm" || action === "decline") {
      run(action);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, action]);

  if (error && !order) {
    return (
      <QuoteShell>
        <h1 className="text-[28px] mb-3" style={{ fontFamily: HEAD, fontWeight: 300 }}>Quote unavailable</h1>
        <p className="text-neutral-600 text-[14px] mb-6">{error}</p>
        <Pill onClick={() => router.push("/shop")}>Browse the collection</Pill>
      </QuoteShell>
    );
  }

  if (!order) return <QuoteShell loading />;

  if (done === "declined") {
    return (
      <QuoteShell>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#fef2f2" }}>
            <X size={18} color="#dc2626" />
          </div>
          <h1 className="text-[28px]" style={{ fontFamily: HEAD, fontWeight: 300 }}>Quote declined</h1>
        </div>
        <p className="text-neutral-600 text-[14px] mb-6">
          Order {order.id} has been cancelled. If you change your mind, place a new order from the shop.
        </p>
        <Pill onClick={() => router.push("/shop")}>Back to shop</Pill>
      </QuoteShell>
    );
  }

  const items = order.items || [];

  return (
    <QuoteShell>
      <div className="flex items-center gap-2 mb-2" style={{ color: C.green }}>
        <Truck size={16} />
        <span className="text-[12px] tracking-[.16em]" style={{ fontFamily: HEAD }}>INTERNATIONAL SHIPPING QUOTE</span>
      </div>
      <h1 className="text-[28px] sm:text-[34px] mb-2" style={{ fontFamily: HEAD, fontWeight: 300 }}>
        Order {order.id}
      </h1>
      <p className="text-neutral-600 text-[14px] mb-8">
        Review the shipping amount below. Confirm to continue to payment, or decline to cancel the order.
      </p>

      <div className="space-y-3 mb-6">
        {items.map((i, idx) => (
          <div key={`${i.name}-${idx}`} className="flex gap-3 p-3" style={{ background: "#faf9f6", borderRadius: 6 }}>
            <Plate
              product={{ name: i.name, colour: i.printColour || "bw", grad: ["#2f2f2d", "#a9a49b"], angle: 120 }}
              showSig={false}
              style={{ width: 56, height: 56, borderRadius: 4, flexShrink: 0 }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[14px] truncate" style={{ fontFamily: HEAD }}>{i.name}</div>
              <div className="text-[12px] text-neutral-500">{i.summary}</div>
              <div className="text-[12px] text-neutral-500">Qty {i.qty}</div>
            </div>
            <div className="text-[14px]" style={{ fontFamily: HEAD }}>{zar(i.price * (i.qty || 1))}</div>
          </div>
        ))}
      </div>

      <div className="p-4 mb-6" style={{ border: `1px solid ${C.line}`, borderRadius: 6 }}>
        <div className="flex justify-between text-[14px] mb-1"><span className="text-neutral-600">Subtotal</span><span>{zar(order.subtotal)}</span></div>
        <div className="flex justify-between text-[14px] mb-2"><span className="text-neutral-600">International shipping</span><span>{zar(order.shipping)}</span></div>
        <div className="flex justify-between text-[16px] pt-2" style={{ borderTop: `1px solid ${C.line}`, fontFamily: HEAD, fontWeight: 600 }}>
          <span>Total</span><span>{zar(order.total)}</span>
        </div>
      </div>

      {error && <p className="text-[13px] text-red-700 mb-4">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-3">
        <Pill
          onClick={() => run("confirm")}
          style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto", flex: 1 }}
        >
          <span className="inline-flex items-center gap-2 justify-center w-full">
            <Check size={16} /> {busy ? "Please wait…" : "Accept quote & pay"}
          </span>
        </Pill>
        <button
          type="button"
          disabled={busy}
          onClick={() => run("decline")}
          className="px-5 py-3 text-[13px] tracking-[.06em]"
          style={{ border: `1px solid ${C.line}`, borderRadius: 4, fontFamily: HEAD, opacity: busy ? 0.5 : 1 }}
        >
          Decline
        </button>
      </div>
    </QuoteShell>
  );
}
