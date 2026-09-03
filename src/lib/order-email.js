/**
 * Server-side order status emails via Resend.
 * Used by /api/email and payment webhooks. No-ops when RESEND_API_KEY is unset.
 *
 * Brand tokens mirror the storefront (olive, ink, soft wall background, Jost/Poppins).
 */

import { looksLikeEmail, scrubText } from "@/lib/security";
import { MATERIALS, FRAME_COLOURS } from "@/lib/pricing";

const BRAND = {
  green: "#556B2F",
  greenDark: "#3f5122",
  greenSoft: "#eef1e8",
  ink: "#1a1a1a",
  dark: "#141412",
  gray: "#6b7280",
  line: "#e6e6e3",
  wall: "#eceae6",
  white: "#ffffff",
};

const MATERIAL_LABEL = Object.fromEntries(MATERIALS.map((m) => [m.id, m.label]));
const FRAME_LABEL = Object.fromEntries(FRAME_COLOURS.map((f) => [f.id, f.label]));

export const STATUS_COPY = {
  receipt: {
    eyebrow: "ORDER CONFIRMED",
    title: "Thank you for your order",
    subject: (id) => `Order confirmed — ${id}`,
    intro: (id) => `We've received your order <strong style="color:${BRAND.ink}">${id}</strong> and will begin preparing your prints.`,
    footer: "We'll email tracking as soon as your print ships.",
  },
  pending: {
    eyebrow: "ORDER RECEIVED",
    title: "We're preparing your order",
    subject: (id) => `Order received — ${id}`,
    intro: (id) => `We've received your order <strong style="color:${BRAND.ink}">${id}</strong> and are awaiting payment confirmation.`,
    footer: "We'll email you when payment is confirmed.",
  },
  paid: {
    eyebrow: "PAYMENT RECEIVED",
    title: "Payment confirmed",
    subject: (id) => `Payment received — ${id}`,
    intro: (id) => `Payment for order <strong style="color:${BRAND.ink}">${id}</strong> is confirmed. Your prints are now being prepared.`,
    footer: "You'll get another email with tracking once your order ships.",
  },
  shipping: {
    eyebrow: "ON ITS WAY",
    title: "Your order has shipped",
    subject: (id) => `Your order ${id} has shipped`,
    intro: (id) => `Good news — order <strong style="color:${BRAND.ink}">${id}</strong> is on its way to you.`,
    footer: "Keep an eye out for your courier.",
  },
  shipped: {
    eyebrow: "ON ITS WAY",
    title: "Your order has shipped",
    subject: (id) => `Your order ${id} has shipped`,
    intro: (id) => `Good news — order <strong style="color:${BRAND.ink}">${id}</strong> is on its way to you.`,
    footer: "Keep an eye out for your courier.",
  },
  delivered: {
    eyebrow: "DELIVERED",
    title: "Your order has arrived",
    subject: (id) => `Delivered — ${id}`,
    intro: (id) => `Your order <strong style="color:${BRAND.ink}">${id}</strong> has been marked as delivered.`,
    footer: "We hope you enjoy your print. Thank you for supporting the work.",
  },
  cancelled: {
    eyebrow: "CANCELLED",
    title: "Order cancelled",
    subject: (id) => `Order cancelled — ${id}`,
    intro: (id) => `Order <strong style="color:${BRAND.ink}">${id}</strong> has been cancelled.`,
    footer: "If you have questions, reply to this email and we'll help.",
  },
  refunded: {
    eyebrow: "REFUND",
    title: "Refund processed",
    subject: (id) => `Refund processed — ${id}`,
    intro: (id) => `A refund for order <strong style="color:${BRAND.ink}">${id}</strong> has been processed.`,
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

function zar(n) {
  return "R" + Number(n || 0).toLocaleString("en-ZA");
}

/** Only absolute http(s) URLs are safe/useful in email clients. */
export function safeEmailImageUrl(raw) {
  const s = scrubText(String(raw || ""), 500);
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return null;
}

function itemThumbHtml(imageUrl, name) {
  const src = safeEmailImageUrl(imageUrl);
  if (src) {
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(name || "Print")}" width="64" height="64" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:4px;background:${BRAND.wall};border:0;" />`;
  }
  return `<div style="width:64px;height:64px;border-radius:4px;background:${BRAND.wall};border:1px solid ${BRAND.line};"></div>`;
}

/** Turn raw DB ids into storefront-style line summaries. */
export function formatItemSummary(item) {
  if (item?.summary && String(item.summary).trim()) {
    // Already human-readable from cart (e.g. "Paper — framed · 1200 × 800 mm · Black")
    const s = String(item.summary).trim();
    if (!/^[a-z0-9_]+(?:\s*·\s*[a-z0-9_x]+)*$/i.test(s.replace(/\s/g, " "))) return s;
  }
  const parts = [];
  const mat = item?.material || item?.material_id;
  const size = item?.size || item?.size_id;
  const frame = item?.frameCol || item?.frame_colour_id || item?.frameColour;
  if (mat) parts.push(MATERIAL_LABEL[mat] || String(mat).replace(/_/g, " "));
  if (size) {
    const pretty = String(size).includes("x")
      ? String(size).replace(/x/i, " × ") + " mm"
      : String(size);
    parts.push(pretty);
  }
  if (frame) parts.push(FRAME_LABEL[frame] || String(frame));
  if (parts.length) return parts.join(" · ");
  return scrubText(item?.summary, 160) || "";
}

function siteBaseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://dgwlp.vercel.app").replace(/\/$/, "");
}

function formatDeliveryBlock(delivery) {
  if (!delivery || typeof delivery !== "object") return "";
  const name = scrubText(delivery.name || delivery.full_name || "", 120);
  const phone = scrubText(delivery.phone || delivery.mobile || "", 40);
  const line1 = scrubText(delivery.line1 || delivery.address || delivery.street || "", 160);
  const line2 = scrubText(delivery.line2 || delivery.suburb || "", 120);
  const city = scrubText(delivery.city || "", 80);
  const province = scrubText(delivery.province || delivery.state || "", 80);
  const postal = scrubText(delivery.postal || delivery.postal_code || delivery.zip || "", 20);
  const country = scrubText(delivery.country || (delivery.destination === "za" ? "South Africa" : ""), 80);

  const lines = [
    name,
    phone,
    line1,
    line2,
    [city, province].filter(Boolean).join(", "),
    postal,
    country,
  ].filter(Boolean);

  if (!lines.length) return "";

  return lines.map((l) => escapeHtml(l)).join("<br/>");
}

/**
 * Build branded HTML for an order status email.
 * Exported for the preview route and unit inspection.
 */
export function buildOrderEmailHtml({ type, order }) {
  const resolved = resolveEmailType(type);
  const copy = STATUS_COPY[resolved];
  const orderId = scrubText(String(order?.id || ""), 40) || "order";
  const tracking = scrubText(String(order?.tracking || ""), 80);
  const dateLabel = scrubText(String(order?.date || ""), 40);
  const site = siteBaseUrl();
  const items = Array.isArray(order?.items) ? order.items.slice(0, 50) : [];

  const itemRows = items
    .map((i, idx) => {
      const name = scrubText(i?.name, 120) || "Print";
      const summary = formatItemSummary(i);
      const qty = Math.min(99, Math.max(1, Number(i?.qty) || 1));
      const unit = Number(i?.price) || 0;
      const line = unit * qty;
      const border = idx === 0 ? "none" : `1px solid ${BRAND.line}`;
      const thumb = itemThumbHtml(i?.image || i?.imageUrl || i?.hero_image, name);
      return `
        <tr>
          <td style="padding:16px 0;border-top:${border};vertical-align:top;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td width="72" valign="top" style="width:72px;padding-right:12px;">${thumb}</td>
                <td valign="top" style="font-family:Poppins,Arial,sans-serif;">
                  <div style="font-family:Jost,Poppins,Century Gothic,Futura,Arial,sans-serif;font-size:15px;font-weight:500;color:${BRAND.ink};letter-spacing:0.02em;">
                    ${escapeHtml(name)}
                  </div>
                  ${summary ? `<div style="font-size:12px;color:${BRAND.gray};margin-top:4px;line-height:1.45;">${escapeHtml(summary)}</div>` : ""}
                  <div style="font-size:12px;color:${BRAND.gray};margin-top:6px;">Qty ${qty}${unit ? ` · ${zar(unit)} each` : ""}</div>
                </td>
              </tr>
            </table>
          </td>
          <td align="right" style="padding:16px 0;border-top:${border};vertical-align:top;white-space:nowrap;font-family:Jost,Poppins,Arial,sans-serif;font-size:14px;color:${BRAND.ink};">
            ${zar(line)}
          </td>
        </tr>`;
    })
    .join("");

  const subtotal = order?.subtotal != null ? Number(order.subtotal) : null;
  const shipping = order?.shipping != null ? Number(order.shipping) : null;
  const total = Number(order?.total) || 0;
  const tax = order?.tax != null ? Number(order.tax) : null;
  const taxLabel = scrubText(String(order?.taxLabel || "Tax"), 40);

  const totalsRows = [];
  if (subtotal != null && !Number.isNaN(subtotal)) {
    totalsRows.push(["Subtotal", zar(subtotal)]);
  }
  if (shipping != null && !Number.isNaN(shipping)) {
    totalsRows.push(["Shipping", shipping === 0 ? "Complimentary" : zar(shipping)]);
  }
  if (tax != null && tax > 0) {
    totalsRows.push([taxLabel || "Tax", zar(tax)]);
  }
  totalsRows.push(["Total", zar(total)]);

  const totalsHtml = totalsRows
    .map(([label, value], idx) => {
      const isTotal = idx === totalsRows.length - 1;
      return `
        <tr>
          <td style="padding:${isTotal ? "12px 0 0" : "4px 0"};font-family:Poppins,Arial,sans-serif;font-size:${isTotal ? "14px" : "13px"};color:${isTotal ? BRAND.ink : BRAND.gray};font-weight:${isTotal ? "600" : "400"};border-top:${isTotal ? `1px solid ${BRAND.line}` : "none"};">
            ${escapeHtml(label)}
          </td>
          <td align="right" style="padding:${isTotal ? "12px 0 0" : "4px 0"};font-family:Jost,Poppins,Arial,sans-serif;font-size:${isTotal ? "16px" : "13px"};color:${BRAND.ink};font-weight:${isTotal ? "600" : "400"};border-top:${isTotal ? `1px solid ${BRAND.line}` : "none"};">
            ${escapeHtml(value)}
          </td>
        </tr>`;
    })
    .join("");

  const deliveryHtml = formatDeliveryBlock(order?.delivery);
  const trackingBlock = tracking
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;background:${BRAND.greenSoft};border-radius:4px;">
        <tr>
          <td style="padding:18px 20px;">
            <div style="font-family:Jost,Poppins,Arial,sans-serif;font-size:11px;letter-spacing:0.18em;color:${BRAND.green};margin-bottom:6px;">TRACKING</div>
            <div style="font-family:Jost,Poppins,Arial,sans-serif;font-size:16px;color:${BRAND.ink};font-weight:500;">${escapeHtml(tracking)}</div>
            <div style="font-family:Poppins,Arial,sans-serif;font-size:12px;color:${BRAND.gray};margin-top:6px;">Use this reference with your courier.</div>
          </td>
        </tr>
      </table>`
    : "";

  const deliveryBlock = deliveryHtml
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
        <tr>
          <td style="padding-bottom:10px;font-family:Jost,Poppins,Arial,sans-serif;font-size:11px;letter-spacing:0.18em;color:${BRAND.gray};">
            DELIVERY ADDRESS
          </td>
        </tr>
        <tr>
          <td style="font-family:Poppins,Arial,sans-serif;font-size:14px;line-height:1.6;color:${BRAND.ink};">
            ${deliveryHtml}
          </td>
        </tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <title>${escapeHtml(copy.subject(orderId))}</title>
  <link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet"/>
</head>
<body style="margin:0;padding:0;background:${BRAND.wall};color:${BRAND.ink};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapeHtml(copy.title)} — ${escapeHtml(orderId)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.wall};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND.white};border-radius:4px;overflow:hidden;box-shadow:0 8px 28px rgba(20,20,18,0.06);">
          <!-- Brand bar -->
          <tr>
            <td style="background:${BRAND.dark};padding:22px 28px;text-align:center;">
              <a href="${escapeHtml(site)}" style="text-decoration:none;">
                <div style="font-family:Jost,Poppins,Century Gothic,Futura,Arial,sans-serif;font-size:15px;letter-spacing:0.14em;font-weight:400;">
                  <span style="color:${BRAND.white};">DORON GOLDSTEIN </span><span style="color:${BRAND.green};">PHOTOGRAPHY</span>
                </div>
              </a>
            </td>
          </tr>
          <!-- Status strip -->
          <tr>
            <td style="background:${BRAND.greenSoft};padding:14px 28px;text-align:center;border-bottom:1px solid ${BRAND.line};">
              <div style="font-family:Jost,Poppins,Arial,sans-serif;font-size:11px;letter-spacing:0.22em;color:${BRAND.green};font-weight:500;">
                ${escapeHtml(copy.eyebrow)}
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 28px 28px;">
              <h1 style="margin:0 0 14px;font-family:Jost,Poppins,Century Gothic,Futura,Arial,sans-serif;font-size:28px;font-weight:300;line-height:1.2;color:${BRAND.ink};letter-spacing:0.01em;">
                ${escapeHtml(copy.title)}
              </h1>
              <p style="margin:0 0 24px;font-family:Poppins,Arial,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.gray};font-weight:300;">
                ${copy.intro(escapeHtml(orderId))}
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.wall};border-radius:4px;margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 16px;width:50%;vertical-align:top;">
                    <div style="font-family:Jost,Poppins,Arial,sans-serif;font-size:10px;letter-spacing:0.16em;color:${BRAND.gray};margin-bottom:4px;">ORDER</div>
                    <div style="font-family:Jost,Poppins,Arial,sans-serif;font-size:14px;color:${BRAND.ink};">${escapeHtml(orderId)}</div>
                  </td>
                  <td style="padding:14px 16px;width:50%;vertical-align:top;text-align:right;">
                    <div style="font-family:Jost,Poppins,Arial,sans-serif;font-size:10px;letter-spacing:0.16em;color:${BRAND.gray};margin-bottom:4px;">${dateLabel ? "DATE" : "STATUS"}</div>
                    <div style="font-family:Jost,Poppins,Arial,sans-serif;font-size:14px;color:${BRAND.ink};">${escapeHtml(dateLabel || copy.eyebrow)}</div>
                  </td>
                </tr>
              </table>

              <div style="font-family:Jost,Poppins,Arial,sans-serif;font-size:11px;letter-spacing:0.18em;color:${BRAND.gray};margin-bottom:4px;">
                YOUR PRINTS
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${itemRows || `<tr><td style="padding:16px 0;font-family:Poppins,Arial,sans-serif;font-size:14px;color:${BRAND.gray};">No line items</td></tr>`}
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                ${totalsHtml}
              </table>

              ${trackingBlock}
              ${deliveryBlock}

              <p style="margin:28px 0 0;font-family:Poppins,Arial,sans-serif;font-size:13px;line-height:1.55;color:${BRAND.gray};">
                ${escapeHtml(copy.footer)}
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td style="background:${BRAND.green};border-radius:4px;">
                    <a href="${escapeHtml(site)}/account" style="display:inline-block;padding:12px 22px;font-family:Jost,Poppins,Arial,sans-serif;font-size:12px;letter-spacing:0.12em;color:${BRAND.white};text-decoration:none;">
                      VIEW YOUR ORDERS
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:${BRAND.dark};padding:24px 28px;text-align:center;">
              <div style="font-family:Jost,Poppins,Arial,sans-serif;font-size:12px;letter-spacing:0.12em;margin-bottom:10px;">
                <span style="color:${BRAND.white};">DORON GOLDSTEIN </span><span style="color:${BRAND.green};">PHOTOGRAPHY</span>
              </div>
              <div style="font-family:Poppins,Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.55);line-height:1.6;">
                Signed wildlife prints · South Africa &amp; worldwide<br/>
                <a href="${escapeHtml(site)}/shop" style="color:${BRAND.green};text-decoration:none;">Shop</a>
                &nbsp;·&nbsp;
                <a href="${escapeHtml(site)}/contact" style="color:${BRAND.green};text-decoration:none;">Contact</a>
              </div>
            </td>
          </tr>
        </table>
        <div style="font-family:Poppins,Arial,sans-serif;font-size:11px;color:#9a9a94;margin-top:18px;line-height:1.5;max-width:560px;">
          You’re receiving this because you placed an order with Doron Goldstein Photography.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Sample order used by /api/email/preview */
export function sampleOrderForPreview(type = "shipped") {
  return {
    id: "DG-1042",
    email: "collector@example.com",
    date: "3 Sep 2026",
    subtotal: 5400,
    shipping: 0,
    total: 5400,
    tracking: type === "shipped" || type === "shipping" || type === "delivered" ? "CPX-884291SA" : null,
    delivery: {
      name: "Thandi Molefe",
      phone: "+27 82 555 0142",
      line1: "14 Rivonia Road",
      line2: "Sandton",
      city: "Johannesburg",
      province: "Gauteng",
      postal: "2196",
      country: "South Africa",
      destination: "za",
    },
    items: [
      {
        name: "Shadowed King",
        summary: "Paper — unframed · 400 × 300 mm · Black",
        qty: 1,
        price: 1500,
        image: "https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=128&h=128&q=80",
      },
      {
        name: "Elephant Herd",
        summary: "Canvas — mounted · 1200 × 600 mm",
        qty: 1,
        price: 3900,
        image: "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=128&h=128&q=80",
      },
    ],
  };
}

/** Map a Supabase orders row (+ order_items) into the payload sendOrderStatusEmail expects. */
export function orderPayloadFromDbRow(row) {
  if (!row) return null;
  const items = (row.order_items || []).map((i) => ({
    name: i.product_name,
    material_id: i.material_id,
    size_id: i.size_id,
    frame_colour_id: i.frame_colour_id,
    summary: formatItemSummary(i),
    qty: i.qty || 1,
    price: (i.unit_price_cents || 0) / 100,
    image: null,
  }));
  return {
    id: row.order_no || row.id,
    email: row.email,
    items,
    subtotal: row.subtotal_cents != null ? row.subtotal_cents / 100 : undefined,
    shipping: row.shipping_cents != null ? row.shipping_cents / 100 : undefined,
    total: row.total_cents != null ? row.total_cents / 100 : 0,
    tracking: row.tracking_no || null,
    status: row.status || null,
    delivery: row.delivery || null,
    date: row.created_at
      ? new Date(row.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : undefined,
  };
}

/**
 * Attach public print image URLs to email line items by product name.
 * @param {import("@supabase/supabase-js").SupabaseClient} sb
 * @param {object} order
 */
export async function enrichOrderEmailImages(sb, order) {
  if (!sb || !order) return order;
  const items = Array.isArray(order.items) ? order.items : [];
  const names = [...new Set(items.map((i) => i?.name).filter(Boolean))];
  if (!names.length) return order;

  const { data: products, error } = await sb
    .from("products")
    .select("name,hero_image")
    .in("name", names);
  if (error || !products?.length) return order;

  const { imageUrl } = await import("@/lib/supabase");
  const byName = new Map(
    products.map((p) => [String(p.name || "").trim().toLowerCase(), p])
  );

  return {
    ...order,
    items: items.map((item) => {
      if (safeEmailImageUrl(item?.image)) return item;
      const p = byName.get(String(item?.name || "").trim().toLowerCase());
      if (!p?.hero_image) return item;
      return { ...item, image: imageUrl(p.hero_image) };
    }),
  };
}

const ORDER_EMAIL_SELECT = `
  id,order_no,email,status,total_cents,subtotal_cents,shipping_cents,tracking_no,delivery,created_at,
  order_items(product_name,size_id,material_id,frame_colour_id,unit_price_cents,qty)
`;

/**
 * Load an order by order_no and send a status email via the send-email edge function
 * (falls back to direct Resend if the function is unavailable).
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
  const order = await enrichOrderEmailImages(sb, orderPayloadFromDbRow(data));
  return sendOrderStatusEmail({ type, order });
}

/**
 * Send a transactional order email.
 * Prefers the Supabase `send-email` edge function (service role); falls back to
 * direct Resend when SUPABASE_SERVICE_ROLE_KEY / function is unavailable.
 * @param {{ type?: string, order: object }} opts
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

  const resolved = resolveEmailType(type);

  // Preferred path: Supabase edge function
  try {
    const { sendOrderStatusEmailServer } = await import("@/lib/emails");
    const viaFn = await sendOrderStatusEmailServer(order, resolved);
    if (viaFn?.ok) return viaFn;
    if (viaFn?.error && !viaFn?.skipped) {
      // Fall through to direct Resend if the function isn't deployed yet
      console.warn("send-email edge function failed, falling back:", viaFn.error);
    } else if (viaFn?.skipped) {
      // no supabase service key — try direct Resend
    } else {
      return viaFn;
    }
  } catch (e) {
    console.warn("send-email invoke error, falling back:", e?.message || e);
  }

  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Doron Goldstein Photography <onboarding@resend.dev>";
  if (!key) return { skipped: true };

  const orderId = scrubText(String(order.id || ""), 40) || "order";
  const subject = STATUS_COPY[resolved].subject(orderId);
  const html = buildOrderEmailHtml({ type: resolved, order });

  const ordersBcc = (
    process.env.ORDERS_BCC ||
    process.env.ORDERS_TO ||
    from.match(/<([^>]+)>/)?.[1] ||
    "orders@dgwlp.co.za"
  ).trim().toLowerCase();
  const payload = { from, to: email, subject, html };
  if (looksLikeEmail(ordersBcc) && ordersBcc !== email.toLowerCase()) {
    payload.bcc = [ordersBcc];
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { error: "Send failed", detail: detail.slice(0, 200) };
  }
  return { ok: true };
}
