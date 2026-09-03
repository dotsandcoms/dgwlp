/**
 * Trigger transactional emails via the Supabase `send-email` edge function.
 *
 * Browser (session JWT):
 *   await sendEmail({ to, template: 'shipped', variables: { ... } });
 *
 * Server / webhooks (service role):
 *   await sendEmailServer({ to, template: 'paid', variables: { ... } });
 */

import { browserClient, hasSupabase } from "@/lib/supabase";

/** Normalize line items so the email template always gets an absolute image URL when available. */
function mapEmailItems(items) {
  return (Array.isArray(items) ? items : []).map((i) => ({
    name: i?.name,
    summary: i?.summary,
    material: i?.material || i?.material_id,
    size: i?.size || i?.size_id,
    frameCol: i?.frameCol || i?.frame_colour_id,
    qty: i?.qty || 1,
    price: i?.price,
    image: i?.image || i?.imageUrl || i?.product?.image || null,
  }));
}

/** Build variables for order status templates from an order-shaped object. */
export function orderEmailVariables(order = {}, status) {
  return {
    orderId: order.order_no || order.id,
    id: order.order_no || order.id,
    email: order.email,
    items: mapEmailItems(order.lines || order.items || []),
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    tax: order.tax,
    taxLabel: order.taxLabel,
    tracking: order.tracking || order.tracking_no || null,
    status: status || order.status || null,
    delivery: order.delivery || null,
    date: order.date || null,
  };
}

/**
 * Browser / client invoke (uses the signed-in user's JWT).
 * @returns {{ ok?: boolean, skipped?: boolean, error?: string, messageId?: string }}
 */
export async function sendEmail({ to, template, variables, bcc } = {}) {
  if (!hasSupabase) return { skipped: true };
  const sb = browserClient();
  if (!sb) return { skipped: true };

  const { data, error } = await sb.functions.invoke("send-email", {
    body: { to, template, variables, bcc },
  });

  if (error) {
    return { error: error.message || "Send failed" };
  }
  if (data?.error) {
    return { error: String(data.error) };
  }
  return { ok: true, messageId: data?.messageId };
}

/**
 * Server-side invoke with the service role key (webhooks, API routes).
 * @returns {{ ok?: boolean, skipped?: boolean, error?: string, messageId?: string }}
 */
export async function sendEmailServer({ to, template, variables, bcc } = {}) {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  ).replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !serviceKey) return { skipped: true };

  try {
    const res = await fetch(`${url}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, template, variables, bcc }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: data?.error || `Send failed (${res.status})` };
    }
    return { ok: true, messageId: data?.messageId };
  } catch (e) {
    return { error: e?.message || "Send failed" };
  }
}

/** Convenience: email a customer about an order status change (browser). */
export async function sendOrderStatusEmailClient(order, status) {
  const to = order?.email;
  if (!to) return { skipped: true };

  // Prefer lines that already have images (admin enrich / cart); otherwise look them up.
  let payload = order;
  try {
    const needsImages = (order.lines || order.items || []).some((i) => i?.name && !i?.image);
    if (needsImages && hasSupabase) {
      const sb = browserClient();
      if (sb) {
        const { enrichOrdersWithImages } = await import("@/lib/orders");
        const [enriched] = await enrichOrdersWithImages(sb, [{
          ...order,
          lines: order.lines || order.items || [],
        }]);
        if (enriched) payload = { ...order, lines: enriched.lines, items: enriched.lines };
      }
    }
  } catch {
    // still send without images
  }

  return sendEmail({
    to,
    template: status || "receipt",
    variables: orderEmailVariables(payload, status),
  });
}

/** Convenience: email from server/webhook after payment. */
export async function sendOrderStatusEmailServer(order, status) {
  const to = order?.email;
  if (!to) return { skipped: true };
  return sendEmailServer({
    to,
    template: status || "receipt",
    variables: orderEmailVariables(order, status),
  });
}
