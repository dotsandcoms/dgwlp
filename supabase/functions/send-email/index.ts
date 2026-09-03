/**
 * Supabase Edge Function: send-email
 *
 * Invoke (browser / app):
 *   await supabase.functions.invoke('send-email', {
 *     body: { to, template, variables },
 *   });
 *
 * Invoke (server / webhook — service role):
 *   POST {SUPABASE_URL}/functions/v1/send-email
 *   Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
 *
 * Secrets (Dashboard → Edge Functions → Secrets):
 *   RESEND_API_KEY
 *   EMAIL_FROM  (or RESEND_VERIFIED_SENDER)
 *   SITE_URL    (optional; defaults to NEXT-style site)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BRAND = {
  green: "#556B2F",
  greenSoft: "#eef1e8",
  ink: "#1a1a1a",
  dark: "#141412",
  gray: "#6b7280",
  line: "#e6e6e3",
  wall: "#eceae6",
  white: "#ffffff",
};

const MATERIAL_LABEL: Record<string, string> = {
  paper: "Paper — unframed",
  paper_framed: "Paper — framed",
  canvas_rolled: "Canvas — rolled",
  canvas_framed: "Canvas — framed",
  canvas_mounted: "Canvas — mounted",
};

const FRAME_LABEL: Record<string, string> = {
  black: "Black",
  white: "White",
  oak: "Walnut",
};

const ORDER_TEMPLATES = new Set([
  "receipt",
  "pending",
  "paid",
  "shipping",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

const STATUS_COPY: Record<
  string,
  {
    eyebrow: string;
    title: string;
    subject: (id: string) => string;
    intro: (id: string) => string;
    footer: string;
  }
> = {
  receipt: {
    eyebrow: "ORDER CONFIRMED",
    title: "Thank you for your order",
    subject: (id) => `Order confirmed — ${id}`,
    intro: (id) =>
      `We've received your order <strong style="color:${BRAND.ink}">${id}</strong> and will begin preparing your prints.`,
    footer: "We'll email tracking as soon as your print ships.",
  },
  pending: {
    eyebrow: "ORDER RECEIVED",
    title: "We're preparing your order",
    subject: (id) => `Order received — ${id}`,
    intro: (id) =>
      `We've received your order <strong style="color:${BRAND.ink}">${id}</strong> and are awaiting payment confirmation.`,
    footer: "We'll email you when payment is confirmed.",
  },
  paid: {
    eyebrow: "PAYMENT RECEIVED",
    title: "Payment confirmed",
    subject: (id) => `Payment received — ${id}`,
    intro: (id) =>
      `Payment for order <strong style="color:${BRAND.ink}">${id}</strong> is confirmed. Your prints are now being prepared.`,
    footer: "You'll get another email with tracking once your order ships.",
  },
  shipping: {
    eyebrow: "ON ITS WAY",
    title: "Your order has shipped",
    subject: (id) => `Your order ${id} has shipped`,
    intro: (id) =>
      `Good news — order <strong style="color:${BRAND.ink}">${id}</strong> is on its way to you.`,
    footer: "Keep an eye out for your courier.",
  },
  shipped: {
    eyebrow: "ON ITS WAY",
    title: "Your order has shipped",
    subject: (id) => `Your order ${id} has shipped`,
    intro: (id) =>
      `Good news — order <strong style="color:${BRAND.ink}">${id}</strong> is on its way to you.`,
    footer: "Keep an eye out for your courier.",
  },
  delivered: {
    eyebrow: "DELIVERED",
    title: "Your order has arrived",
    subject: (id) => `Delivered — ${id}`,
    intro: (id) =>
      `Your order <strong style="color:${BRAND.ink}">${id}</strong> has been marked as delivered.`,
    footer: "We hope you enjoy your print. Thank you for supporting the work.",
  },
  cancelled: {
    eyebrow: "CANCELLED",
    title: "Order cancelled",
    subject: (id) => `Order cancelled — ${id}`,
    intro: (id) =>
      `Order <strong style="color:${BRAND.ink}">${id}</strong> has been cancelled.`,
    footer: "If you have questions, reply to this email and we'll help.",
  },
  refunded: {
    eyebrow: "REFUND",
    title: "Refund processed",
    subject: (id) => `Refund processed — ${id}`,
    intro: (id) =>
      `A refund for order <strong style="color:${BRAND.ink}">${id}</strong> has been processed.`,
    footer: "Allow a few business days for it to appear on your statement.",
  },
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function scrub(value: unknown, max = 500) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

function zar(n: number) {
  return "R" + Number(n || 0).toLocaleString("en-ZA");
}

function looksLikeEmail(v: unknown) {
  return typeof v === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) &&
    v.length < 254;
}

function siteUrl() {
  return (Deno.env.get("SITE_URL") || Deno.env.get("NEXT_PUBLIC_SITE_URL") ||
    "https://dgwlp.vercel.app").replace(/\/$/, "");
}

function formatItemSummary(item: Record<string, unknown>) {
  const existing = scrub(item?.summary, 200);
  if (existing && !/^[a-z0-9_]+(?:\s*·\s*[a-z0-9_x]+)*$/i.test(existing.replace(/\s/g, " "))) {
    return existing;
  }
  const parts: string[] = [];
  const mat = scrub(item?.material || item?.material_id, 60);
  const size = scrub(item?.size || item?.size_id, 40);
  const frame = scrub(item?.frameCol || item?.frame_colour_id || item?.frameColour, 40);
  if (mat) parts.push(MATERIAL_LABEL[mat] || mat.replace(/_/g, " "));
  if (size) {
    parts.push(size.includes("x") ? size.replace(/x/i, " × ") + " mm" : size);
  }
  if (frame) parts.push(FRAME_LABEL[frame] || frame);
  return parts.join(" · ") || existing;
}

function formatDeliveryBlock(delivery: Record<string, unknown> | null | undefined) {
  if (!delivery || typeof delivery !== "object") return "";
  const lines = [
    scrub(delivery.name || delivery.full_name, 120),
    scrub(delivery.phone || delivery.mobile, 40),
    scrub(delivery.line1 || delivery.address || delivery.street, 160),
    scrub(delivery.line2 || delivery.suburb, 120),
    [scrub(delivery.city, 80), scrub(delivery.province || delivery.state, 80)].filter(Boolean).join(", "),
    scrub(delivery.postal || delivery.postal_code || delivery.zip, 20),
    scrub(delivery.country || (delivery.destination === "za" ? "South Africa" : ""), 80),
  ].filter(Boolean);
  if (!lines.length) return "";
  return lines.map((l) => escapeHtml(l)).join("<br/>");
}

function buildOrderEmailHtml(template: string, vars: Record<string, unknown>) {
  const copy = STATUS_COPY[template] || STATUS_COPY.receipt;
  const orderId = scrub(vars.orderId || vars.id || vars.order_no, 40) || "order";
  const tracking = scrub(vars.tracking || vars.tracking_no, 80);
  const dateLabel = scrub(vars.date, 40);
  const site = siteUrl();
  const items = Array.isArray(vars.items) ? vars.items.slice(0, 50) : [];

  const itemRows = items.map((raw, idx) => {
    const i = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const name = scrub(i.name, 120) || "Print";
    const summary = formatItemSummary(i);
    const qty = Math.min(99, Math.max(1, Number(i.qty) || 1));
    const unit = Number(i.price) || 0;
    const line = unit * qty;
    const border = idx === 0 ? "none" : `1px solid ${BRAND.line}`;
    return `
      <tr>
        <td style="padding:16px 0;border-top:${border};vertical-align:top;">
          <div style="font-family:Jost,Poppins,Arial,sans-serif;font-size:15px;font-weight:500;color:${BRAND.ink};">${escapeHtml(name)}</div>
          ${summary ? `<div style="font-family:Poppins,Arial,sans-serif;font-size:12px;color:${BRAND.gray};margin-top:4px;line-height:1.45;">${escapeHtml(summary)}</div>` : ""}
          <div style="font-family:Poppins,Arial,sans-serif;font-size:12px;color:${BRAND.gray};margin-top:6px;">Qty ${qty}${unit ? ` · ${zar(unit)} each` : ""}</div>
        </td>
        <td align="right" style="padding:16px 0;border-top:${border};vertical-align:top;white-space:nowrap;font-family:Jost,Poppins,Arial,sans-serif;font-size:14px;color:${BRAND.ink};">${zar(line)}</td>
      </tr>`;
  }).join("");

  const subtotal = vars.subtotal != null ? Number(vars.subtotal) : null;
  const shipping = vars.shipping != null ? Number(vars.shipping) : null;
  const tax = vars.tax != null ? Number(vars.tax) : null;
  const taxLabel = scrub(vars.taxLabel || "Tax", 40);
  const total = Number(vars.total) || 0;

  const totalsRows: Array<[string, string]> = [];
  if (subtotal != null && !Number.isNaN(subtotal)) totalsRows.push(["Subtotal", zar(subtotal)]);
  if (shipping != null && !Number.isNaN(shipping)) {
    totalsRows.push(["Shipping", shipping === 0 ? "Complimentary" : zar(shipping)]);
  }
  if (tax != null && tax > 0) totalsRows.push([taxLabel || "Tax", zar(tax)]);
  totalsRows.push(["Total", zar(total)]);

  const totalsHtml = totalsRows.map(([label, value], idx) => {
    const isTotal = idx === totalsRows.length - 1;
    return `
      <tr>
        <td style="padding:${isTotal ? "12px 0 0" : "4px 0"};font-family:Poppins,Arial,sans-serif;font-size:${isTotal ? "14px" : "13px"};color:${isTotal ? BRAND.ink : BRAND.gray};font-weight:${isTotal ? "600" : "400"};border-top:${isTotal ? `1px solid ${BRAND.line}` : "none"};">${escapeHtml(label)}</td>
        <td align="right" style="padding:${isTotal ? "12px 0 0" : "4px 0"};font-family:Jost,Poppins,Arial,sans-serif;font-size:${isTotal ? "16px" : "13px"};color:${BRAND.ink};font-weight:${isTotal ? "600" : "400"};border-top:${isTotal ? `1px solid ${BRAND.line}` : "none"};">${escapeHtml(value)}</td>
      </tr>`;
  }).join("");

  const deliveryHtml = formatDeliveryBlock(
    vars.delivery && typeof vars.delivery === "object"
      ? vars.delivery as Record<string, unknown>
      : null,
  );

  const trackingBlock = tracking
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;background:${BRAND.greenSoft};border-radius:4px;"><tr><td style="padding:18px 20px;"><div style="font-family:Jost,Poppins,Arial,sans-serif;font-size:11px;letter-spacing:0.18em;color:${BRAND.green};margin-bottom:6px;">TRACKING</div><div style="font-family:Jost,Poppins,Arial,sans-serif;font-size:16px;color:${BRAND.ink};font-weight:500;">${escapeHtml(tracking)}</div><div style="font-family:Poppins,Arial,sans-serif;font-size:12px;color:${BRAND.gray};margin-top:6px;">Use this reference with your courier.</div></td></tr></table>`
    : "";

  const deliveryBlock = deliveryHtml
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;"><tr><td style="padding-bottom:10px;font-family:Jost,Poppins,Arial,sans-serif;font-size:11px;letter-spacing:0.18em;color:${BRAND.gray};">DELIVERY ADDRESS</td></tr><tr><td style="font-family:Poppins,Arial,sans-serif;font-size:14px;line-height:1.6;color:${BRAND.ink};">${deliveryHtml}</td></tr></table>`
    : "";

  const subject = copy.subject(orderId);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(subject)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet"/>
</head>
<body style="margin:0;padding:0;background:${BRAND.wall};color:${BRAND.ink};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.wall};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND.white};border-radius:4px;overflow:hidden;box-shadow:0 8px 28px rgba(20,20,18,0.06);">
        <tr><td style="background:${BRAND.dark};padding:22px 28px;text-align:center;">
          <a href="${escapeHtml(site)}" style="text-decoration:none;">
            <div style="font-family:Jost,Poppins,Arial,sans-serif;font-size:15px;letter-spacing:0.14em;">
              <span style="color:${BRAND.white};">DORON GOLDSTEIN </span><span style="color:${BRAND.green};">PHOTOGRAPHY</span>
            </div>
          </a>
        </td></tr>
        <tr><td style="background:${BRAND.greenSoft};padding:14px 28px;text-align:center;border-bottom:1px solid ${BRAND.line};">
          <div style="font-family:Jost,Poppins,Arial,sans-serif;font-size:11px;letter-spacing:0.22em;color:${BRAND.green};font-weight:500;">${escapeHtml(copy.eyebrow)}</div>
        </td></tr>
        <tr><td style="padding:36px 28px 28px;">
          <h1 style="margin:0 0 14px;font-family:Jost,Poppins,Arial,sans-serif;font-size:28px;font-weight:300;line-height:1.2;color:${BRAND.ink};">${escapeHtml(copy.title)}</h1>
          <p style="margin:0 0 24px;font-family:Poppins,Arial,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.gray};font-weight:300;">${copy.intro(escapeHtml(orderId))}</p>
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
          <div style="font-family:Jost,Poppins,Arial,sans-serif;font-size:11px;letter-spacing:0.18em;color:${BRAND.gray};margin-bottom:4px;">YOUR PRINTS</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${itemRows || `<tr><td style="padding:16px 0;font-family:Poppins,Arial,sans-serif;font-size:14px;color:${BRAND.gray};">No line items</td></tr>`}
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">${totalsHtml}</table>
          ${trackingBlock}
          ${deliveryBlock}
          <p style="margin:28px 0 0;font-family:Poppins,Arial,sans-serif;font-size:13px;line-height:1.55;color:${BRAND.gray};">${escapeHtml(copy.footer)}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;"><tr><td style="background:${BRAND.green};border-radius:4px;">
            <a href="${escapeHtml(site)}/account" style="display:inline-block;padding:12px 22px;font-family:Jost,Poppins,Arial,sans-serif;font-size:12px;letter-spacing:0.12em;color:${BRAND.white};text-decoration:none;">VIEW YOUR ORDERS</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="background:${BRAND.dark};padding:24px 28px;text-align:center;">
          <div style="font-family:Jost,Poppins,Arial,sans-serif;font-size:12px;letter-spacing:0.12em;margin-bottom:10px;">
            <span style="color:${BRAND.white};">DORON GOLDSTEIN </span><span style="color:${BRAND.green};">PHOTOGRAPHY</span>
          </div>
          <div style="font-family:Poppins,Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.55);line-height:1.6;">
            Signed wildlife prints · South Africa &amp; worldwide<br/>
            <a href="${escapeHtml(site)}/shop" style="color:${BRAND.green};text-decoration:none;">Shop</a>
            &nbsp;·&nbsp;
            <a href="${escapeHtml(site)}/contact" style="color:${BRAND.green};text-decoration:none;">Contact</a>
          </div>
        </td></tr>
      </table>
      <div style="font-family:Poppins,Arial,sans-serif;font-size:11px;color:#9a9a94;margin-top:18px;">You're receiving this because you placed an order with Doron Goldstein Photography.</div>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

function generateEmailBody(template: string, vars: Record<string, unknown>) {
  if (ORDER_TEMPLATES.has(template)) {
    return buildOrderEmailHtml(template, vars);
  }
  // Generic fallback (broadcast-style)
  const subject = scrub(vars.subject, 200) || "Message from Doron Goldstein Photography";
  const message = scrub(vars.message, 5000) || "";
  const html = `<!DOCTYPE html><html><body style="font-family:Poppins,Arial,sans-serif;background:${BRAND.wall};padding:32px;"><div style="max-width:560px;margin:auto;background:#fff;padding:28px;border-radius:4px;"><h2 style="font-family:Jost,Arial,sans-serif;font-weight:300;">${escapeHtml(subject)}</h2><p style="color:${BRAND.gray};line-height:1.6;white-space:pre-wrap;">${escapeHtml(message)}</p></div></body></html>`;
  return { subject, html };
}

function isTrustedServiceCaller(authHeader: string | null) {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return !!serviceKey && authHeader === `Bearer ${serviceKey}`;
}

async function getAuthenticatedUser(authHeader: string) {
  const supabaseUserClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error } = await supabaseUserClient.auth.getUser();
  if (error || !user) return null;
  return user;
}

function resolveFromAddress() {
  const emailFrom = Deno.env.get("EMAIL_FROM");
  if (emailFrom) return emailFrom;
  const verified = Deno.env.get("RESEND_VERIFIED_SENDER") || "orders@dgwlp.co.za";
  if (verified === "onboarding@resend.dev") {
    return "Doron Goldstein Photography <onboarding@resend.dev>";
  }
  if (verified.includes("@")) {
    return `Doron Goldstein Photography <${verified}>`;
  }
  return `Doron Goldstein Photography <noreply@${verified}>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured in Edge Function secrets");
    }

    const body = await req.json().catch(() => ({}));
    const { to, template, variables, bcc } = body as {
      to?: string | string[];
      template?: string;
      variables?: Record<string, unknown>;
      bcc?: string | string[];
    };

    if (!to && !bcc) throw new Error("Missing recipient email (to or bcc)");
    if (!template) throw new Error("Missing email template identifier");

    const authHeader = req.headers.get("Authorization");
    if (!isTrustedServiceCaller(authHeader)) {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const user = await getAuthenticatedUser(authHeader);
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const emailVars = { ...(variables || {}) };
    if (!emailVars.recipientEmail) {
      const primaryTo = Array.isArray(to) ? to[0] : to;
      if (primaryTo) emailVars.recipientEmail = primaryTo;
    }

    const resolvedTemplate = ORDER_TEMPLATES.has(String(template))
      ? String(template)
      : String(template || "receipt");
    const { subject, html } = generateEmailBody(resolvedTemplate, emailVars);

    let finalTo = to ? (Array.isArray(to) ? to : [to]) : undefined;
    let finalBcc = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined;
    finalTo = finalTo?.map((e) => scrub(e, 254)).filter(looksLikeEmail);
    finalBcc = finalBcc?.map((e) => scrub(e, 254)).filter(looksLikeEmail);
    if ((!finalTo || !finalTo.length) && (!finalBcc || !finalBcc.length)) {
      throw new Error("No valid recipient email");
    }

    const fromAddress = resolveFromAddress();
    const payload: Record<string, unknown> = {
      from: fromAddress,
      subject,
      html,
    };
    if (finalTo?.length) payload.to = finalTo;
    if (finalBcc?.length) {
      payload.bcc = finalBcc;
      if (!payload.to) payload.to = [fromAddress.match(/<([^>]+)>/)?.[1] || fromAddress];
    }

    console.info(
      `Dispatching Resend template [${resolvedTemplate}] to ${(finalTo || []).join(", ") || "bcc-only"}`,
    );

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API dispatch failed: ${errorText}`);
    }

    const responseData = await response.json();
    return new Response(
      JSON.stringify({ success: true, messageId: responseData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Edge Function Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});
