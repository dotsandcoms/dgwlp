import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isAllowedOrigin, looksLikeEmail, scrubText } from "@/lib/security";

/**
 * POST /api/contact
 * Body: { name, email, subject?, msg, company? }
 * `company` is a honeypot — if filled, pretend success and drop.
 */
export async function POST(req) {
  try {
    if (!isAllowedOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip = clientIp(req);
    const limited = rateLimit(`contact:${ip}`, { limit: 5, windowMs: 10 * 60_000 });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec || 60) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    // Honeypot
    if (body.company || body.website || body.url) {
      return NextResponse.json({ ok: true });
    }

    const name = scrubText(body.name, 120);
    const email = scrubText(body.email, 254);
    const subject = scrubText(body.subject, 200) || "Website enquiry";
    const msg = scrubText(body.msg || body.message, 5000);

    if (!name || !looksLikeEmail(email) || !msg || msg.length < 10) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const key = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM || "Doron Goldstein Photography <onboarding@resend.dev>";
    const to = process.env.CONTACT_TO || from.match(/<([^>]+)>/)?.[1] || "orders@dotsandcoms.co.za";

    if (!key) {
      // Demo mode — accept without sending
      return NextResponse.json({ ok: true, skipped: true });
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px">
        <h2>New website enquiry</h2>
        <p><b>From:</b> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
        <p><b>Subject:</b> ${escapeHtml(subject)}</p>
        <pre style="white-space:pre-wrap;font-family:inherit;background:#f6f6f4;padding:12px;border-radius:6px">${escapeHtml(msg)}</pre>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `[Contact] ${subject}`,
        html,
      }),
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
