import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmailServer, orderEmailVariables } from "@/lib/emails";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const ORDER_SELECT = `
  id,order_no,email,user_id,status,total_cents,subtotal_cents,shipping_cents,
  created_at,delivery,payment_provider,tracking_no,shipping_method,
  order_items(product_name,size_id,material_id,frame_colour_id,colour,unit_price_cents,qty)
`;

function mapOrder(row) {
  if (!row) return null;
  const items = (row.order_items || []).map((i) => ({
    name: i.product_name,
    summary: [i.material_id, i.size_id, i.frame_colour_id].filter(Boolean).join(" · "),
    material: i.material_id,
    size: i.size_id,
    frameCol: i.frame_colour_id,
    printColour: i.colour,
    qty: i.qty || 1,
    price: (i.unit_price_cents || 0) / 100,
  }));
  return {
    id: row.order_no || row.id,
    dbId: row.id,
    email: row.email,
    status: row.status,
    rawStatus: row.status,
    subtotal: (row.subtotal_cents || 0) / 100,
    shipping: (row.shipping_cents || 0) / 100,
    total: (row.total_cents || 0) / 100,
    delivery: row.delivery || null,
    items,
    lines: items,
    quoteToken: row.delivery?.quote_token || null,
    date: row.created_at
      ? new Date(row.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : null,
  };
}

async function findByToken(sb, token) {
  const { data, error } = await sb
    .from("orders")
    .select(ORDER_SELECT)
    .filter("delivery->>quote_token", "eq", token)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * GET /api/order/quote?token=…
 * POST /api/order/quote  { token, action: 'confirm'|'decline'|'pay', payment_provider? }
 */
export async function GET(req) {
  try {
    const token = new URL(req.url).searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
    const sb = serviceClient();
    if (!sb) return NextResponse.json({ error: "Not configured" }, { status: 503 });
    const row = await findByToken(sb, token);
    if (!row) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    return NextResponse.json({ order: mapOrder(row) });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || "").trim();
    const action = String(body.action || "").toLowerCase();
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
    if (!["confirm", "decline", "pay"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const sb = serviceClient();
    if (!sb) return NextResponse.json({ error: "Not configured" }, { status: 503 });

    const row = await findByToken(sb, token);
    if (!row) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    if (action === "confirm") {
      if (!["quote_sent", "quote_accepted"].includes(row.status)) {
        return NextResponse.json({ error: "Quote is not ready to confirm" }, { status: 400 });
      }
      if (!(row.shipping_cents > 0)) {
        return NextResponse.json({ error: "Shipping quote missing" }, { status: 400 });
      }
      const { data, error } = await sb
        .from("orders")
        .update({ status: "quote_accepted" })
        .eq("id", row.id)
        .select(ORDER_SELECT)
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, order: mapOrder(data) });
    }

    if (action === "decline") {
      if (["paid", "shipped", "delivered", "cancelled", "refunded"].includes(row.status)) {
        return NextResponse.json({ error: "Order can no longer be declined" }, { status: 400 });
      }
      const { data, error } = await sb
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", row.id)
        .select(ORDER_SELECT)
        .single();
      if (error) throw error;
      const order = mapOrder(data);
      await sendEmailServer({
        to: order.email,
        template: "cancelled",
        variables: orderEmailVariables(order, "cancelled"),
      }).catch(() => {});
      return NextResponse.json({ ok: true, order });
    }

    // pay — customer completing checkout after accepting quote
    if (!["quote_accepted", "quote_sent", "pending"].includes(row.status)) {
      return NextResponse.json({ error: "Order is not ready for payment" }, { status: 400 });
    }
    if (!(row.shipping_cents > 0)) {
      return NextResponse.json({ error: "Shipping quote missing" }, { status: 400 });
    }
    const subtotal = (row.subtotal_cents || 0) / 100;
    const shipping = (row.shipping_cents || 0) / 100;
    const totalCents = Math.round((subtotal + shipping) * 100);
    const { data, error } = await sb
      .from("orders")
      .update({
        status: "pending",
        total_cents: totalCents,
        payment_provider: body.payment_provider || row.payment_provider || null,
      })
      .eq("id", row.id)
      .select(ORDER_SELECT)
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, order: mapOrder(data) });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
