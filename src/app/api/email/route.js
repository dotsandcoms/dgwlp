import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isAllowedOrigin } from "@/lib/security";
import { resolveEmailType, sendOrderStatusEmail } from "@/lib/order-email";
import { sendEmailServer } from "@/lib/emails";

// POST /api/email  { type|template, order|variables, to? }
// Prefer the Supabase send-email edge function; keep this route as a
// compatibility shim for older callers and local preview tooling.
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
    const type = resolveEmailType(body.template || body.type);

    // New shape: { to, template, variables } — proxy to edge function
    if (body.to && (body.template || body.variables) && !body.order) {
      const result = await sendEmailServer({
        to: body.to,
        template: type,
        variables: body.variables || {},
        bcc: body.bcc,
      });
      if (result.skipped) return NextResponse.json({ skipped: true });
      if (result.error) return NextResponse.json({ error: result.error }, { status: 502 });
      return NextResponse.json({ ok: true, messageId: result.messageId });
    }

    const result = await sendOrderStatusEmail({ type, order: body.order });

    if (result.error === "Invalid payload") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    if (result.skipped) {
      return NextResponse.json({ skipped: true });
    }
    return NextResponse.json({ ok: true, messageId: result.messageId });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
