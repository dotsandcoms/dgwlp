/**
 * Server-side order status emails via Resend.
 * Used by /api/email and payment webhooks. No-ops when RESEND_API_KEY is unset.
 */

import { looksLikeEmail, scrubText } from "@/lib/security";

export const STATUS_COPY = {
  receipt: {
    subject: (id) => `Order confirmed — ${id}`,
    intro: (id) => `Thank you for your order <b>${id}</b>.`,
    footer: "We'll email tracking as soon as your print ships.",
  },
  pending: {
    subject: (id) => `Order received — ${id}`,
    intro: (id) => `We've received your order <b>${id}</b> and are preparing it.`,
    footer: "We'll email you when payment is confirmed.",
  },
  paid: {
    subject: (id) => `Payment received — ${id}`,
    intro: (id) => `Payment for order <b>${id}</b> is confirmed. We're preparing your prints.`,
    footer: "You'll get another email with tracking once your order ships.",
  },
  shipping: {
    subject: (id) => `Your order ${id} has shipped`,
    intro: (id) => `Good news — order <b>${id}</b> is on its way.`,
    footer: "Keep an eye out for your courier.",
  },
  shipped: {
    subject: (id) => `Your order ${id} has shipped`,
    intro: (id) => `Good news — order <b>${id}</b> is on its way.`,
    footer: "Keep an eye out for your courier.",
  },
  delivered: {
    subject: (id) => `Delivered — ${id}`,
    intro: (id) => `Your order <b>${id}</b> has been marked as delivered.`,
    footer: "We hope you enjoy your print. Thank you for supporting the work.",
  },
  cancelled: {
    subject: (id) => `Order cancelled — ${id}`,
    intro: (id) => `Order <b>${id}</b> has been cancelled.`,
    footer: "If you have questions, reply to this email and we'll help.",
  },
  refunded: {
    subject: (id) => `Refund processed — ${id}`,
    intro: (id) => `A refund for order <b>${id}</b> has been processed.`,
    footer: "Allow a few business days for it to appear on your statement.",
  },
};

export function resolveEmailType(raw) {
  const t = String(raw || "receipt").toLowerCase();
  if (STATUS_COPY[t]) return t;
  return "receipt";
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Map a Supabase orders row (+ order_items) into the payload sendOrderStatusEmail expects. */
export function orderPayloadFromDbRow(row) {
  if (!row) return null;
  const items = (row.order_items || []).map((i) => ({
    name: i.product_name,
    summary: [i.material_id, i.size_id, i.frame_colour_id].filter(Boolean).join(" · "),
    qty: i.qty || 1,
    price: (i.unit_price_cents || 0) / 100,
  }));
  return {
    id: row.order_no || row.id,
    email: row.email,
    items,
    total: row.total_cents != null ? row.total_cents / 100 : 0,
    tracking: row.tracking_no || null,
    status: row.status || null,
    delivery: row.delivery || null,
  };
}

const ORDER_EMAIL_SELECT = `
  id,order_no,email,status,total_cents,tracking_no,delivery,
  order_items(product_name,size_id,material_id,frame_colour_id,unit_price_cents,qty)
`;

/**
 * Load an order by order_no and send a status email.
 * @param {import("@supabase/supabase-js").SupabaseClient} sb
 * @param {string} orderNo
 * @param {string} type  receipt|pending|paid|shipped|…
 */
export async function sendOrderStatusEmailByOrderNo(sb, orderNo, type) {
  if (!sb || !orderNo) return { skipped: true };
  const { data, error } = await sb
    .from("orders")
    .select(ORDER_EMAIL_SELECT)
    .eq("order_no", orderNo)
    .maybeSingle();
  if (error || !data) return { skipped: true, error: error?.message };
  return sendOrderStatusEmail({ type, order: orderPayloadFromDbRow(data) });
}

/**
 * Send a transactional order email via Resend.
 * @param {{ type?: string, order: { id?, email, items?, total?, tracking? } }} opts
 * @returns {Promise<{ ok?: boolean, skipped?: boolean, error?: string }>}
 */
export async function sendOrderStatusEmail({ type, order }) {
  if (!order || typeof order !== "object") {
    return { error: "Invalid payload" };
  }

  const email = scrubText(order.email, 254);
  if (!looksLikeEmail(email)) {
    return { skipped: true };
  }

  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Doron Goldstein Photography <onboarding@resend.dev>";
  if (!key) return { skipped: true };

  const resolved = resolveEmailType(type);
  const copy = STATUS_COPY[resolved];
  const orderId = scrubText(String(order.id || ""), 40) || "order";
  const tracking = scrubText(String(order.tracking || ""), 80);
  const rand = (n) => "R" + Number(n || 0).toLocaleString("en-ZA");
  const items = Array.isArray(order.items) ? order.items.slice(0, 50) : [];
  const rows = items
    .map((i) => {
      const name = scrubText(i?.name, 120);
      const summary = scrubText(i?.summary, 160);
      const qty = Math.min(99, Math.max(1, Number(i?.qty) || 1));
      const line = Number(i?.price) * qty;
      return `<tr><td style="padding:6px 0">${escapeHtml(name)} (${escapeHtml(summary)}) × ${qty}</td><td align="right">${rand(line)}</td></tr>`;
    })
    .join("");

  const trackingLine = tracking
    ? `<p style="font-size:14px">Tracking: <b>${escapeHtml(tracking)}</b></p>`
    : "";

  const subject = copy.subject(orderId);
  const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
        <h2 style="letter-spacing:1px">DORON GOLDSTEIN <span style="color:#556B2F">PHOTOGRAPHY</span></h2>
        <p>${copy.intro(escapeHtml(orderId))}</p>
        ${trackingLine}
        <table style="width:100%;font-size:14px;border-top:1px solid #eee;margin-top:8px">${rows}</table>
        <p style="text-align:right;font-weight:bold">Total: ${rand(order.total)}</p>
        <p style="color:#666;font-size:12px">${escapeHtml(copy.footer)}</p>
      </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: email, subject, html }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { error: "Send failed", detail: detail.slice(0, 200) };
  }
  return { ok: true };
}
