import { NextResponse } from "next/server";
import {
  resolveEmailType,
  buildOrderEmailHtml,
  sampleOrderForPreview,
  STATUS_COPY,
} from "@/lib/order-email";

/**
 * GET /api/email/preview?type=shipped
 * Renders the branded order email HTML with sample data for design review.
 * Does not send anything.
 */
export async function GET(req) {
  const url = new URL(req.url);
  const type = resolveEmailType(url.searchParams.get("type") || "shipped");
  const order = sampleOrderForPreview(type);
  const html = buildOrderEmailHtml({ type, order });

  // Optional JSON meta for tooling
  if (url.searchParams.get("format") === "json") {
    return NextResponse.json({
      type,
      subject: STATUS_COPY[type].subject(order.id),
      order,
      html,
    });
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
