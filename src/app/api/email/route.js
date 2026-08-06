import { NextResponse } from "next/server";

// POST /api/email  { type: 'receipt'|'shipping', order }
// Sends a transactional email via Resend. No-ops (200) if RESEND_API_KEY
// is not set, so the checkout flow works in demo mode without failing.
export async function POST(req) {
  try {
    const { type, order } = await req.json();
    const key = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM || "Doron Goldstein Photography <onboarding@resend.dev>";
    if (!key || !order?.email) return NextResponse.json({ skipped: true });

    const rand = (n) => "R" + Number(n || 0).toLocaleString("en-ZA");
    const rows = (order.items || [])
      .map((i) => `<tr><td style="padding:6px 0">${i.name} (${i.summary}) × ${i.qty}</td><td align="right">${rand(i.price * i.qty)}</td></tr>`)
      .join("");
    const subject = type === "shipping"
      ? `Your order ${order.id} has shipped`
      : `Order confirmed — ${order.id}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
        <h2 style="letter-spacing:1px">DORON GOLDSTEIN <span style="color:#556B2F">PHOTOGRAPHY</span></h2>
        <p>Thank you for your order <b>${order.id}</b>.</p>
        <table style="width:100%;font-size:14px;border-top:1px solid #eee;margin-top:8px">${rows}</table>
        <p style="text-align:right;font-weight:bold">Total: ${rand(order.total)}</p>
        <p style="color:#666;font-size:12px">We'll email tracking as soon as your print ships.</p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: order.email, subject, html }),
    });
    const data = await res.json();
    return NextResponse.json({ ok: res.ok, data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
