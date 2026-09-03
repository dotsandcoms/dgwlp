import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isAllowedOrigin } from "@/lib/security";
import { resolveEmailType, sendOrderStatusEmail } from "@/lib/order-email";

// POST /api/email  { type: 'receipt'|'pending'|'paid'|'shipped'|'shipping'|'delivered'|'cancelled'|'refunded', order }
// Sends a transactional email via Resend. No-ops (200) if RESEND_API_KEY
// is not set, so checkout / admin status updates work without failing.
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
    const type = resolveEmailType(body.type);
    const result = await sendOrderStatusEmail({ type, order: body.order });

    if (result.error === "Invalid payload") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    if (result.error === "Send failed") {
      return NextResponse.json({ error: "Send failed" }, { status: 502 });
    }
    if (result.skipped) {
      return NextResponse.json({ skipped: true });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
