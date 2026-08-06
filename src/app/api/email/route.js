import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isAllowedOrigin, looksLikeEmail, scrubText } from "@/lib/security";

// POST /api/email  { type: 'receipt'|'shipping', order }
// Sends a transactional email via Resend. No-ops (200) if RESEND_API_KEY
// is not set, so the checkout flow works in demo mode without failing.
export async function POST(req) {
  try {
    if (!isAllowedOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip = clientIp(req);
    const limited = rateLimit(`email:${ip}`, { limit: 10, windowMs: 10 * 60_000 });
    if (!limited.ok) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const type = body.type === "shipping" ? "shipping" : "receipt";
    const order = body.order;
    if (!order || typeof order !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const email = scrubText(order.email, 254);
    if (!looksLikeEmail(email)) {
      return NextResponse.json({ skipped: true });
    }

    const key = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM || "Doron Goldstein Photography <onboarding@resend.dev>";
    if (!key) return NextResponse.json({ skipped: true });

    const orderId = scrubText(String(order.id || ""), 40) || "order";
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

    const subject = type === "shipping"
      ? `Your order ${orderId} has shipped`
      : `Order confirmed — ${orderId}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
        <h2 style="letter-spacing:1px">DORON GOLDSTEIN <span style="color:#556B2F">PHOTOGRAPHY</span></h2>
        <p>Thank you for your order <b>${escapeHtml(orderId)}</b>.</p>
        <table style="width:100%;font-size:14px;border-top:1px solid #eee;margin-top:8px">${rows}</table>
        <p style="text-align:right;font-weight:bold">Total: ${rand(order.total)}</p>
        <p style="color:#666;font-size:12px">We'll email tracking as soon as your print ships.</p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: email, subject, html }),
    });
    if (!res.ok) return NextResponse.json({ error: "Send failed" }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
