import { browserClient, hasSupabase } from "./supabase";

const STATUS_LABEL = {
  pending: "Processing",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/**
 * Persist a checkout order + line items to Supabase.
 * Requires a signed-in session (RLS: auth.uid() = user_id).
 */
export async function placeOrder({ user, email, items, subtotal, shipping, total, delivery, pay, shipMethod }) {
  if (!hasSupabase) {
    return {
      ok: true,
      localOnly: true,
      order: {
        id: "DG-" + Math.floor(1000 + Math.random() * 9000),
        items,
        subtotal,
        shipping,
        total,
        delivery,
        pay,
        email,
        status: "Processing",
        date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      },
    };
  }

  const sb = browserClient();
  const { data: sess } = await sb.auth.getSession();
  const authUser = sess?.session?.user;
  if (!authUser) throw new Error("Please sign in to place an order.");

  const { data: orderRow, error: orderErr } = await sb
    .from("orders")
    .insert({
      user_id: authUser.id,
      email: email || authUser.email || user?.email || "",
      status: "pending",
      subtotal_cents: Math.round((subtotal || 0) * 100),
      shipping_cents: Math.round((shipping || 0) * 100),
      total_cents: Math.round((total || 0) * 100),
      shipping_method: shipMethod || "standard",
      delivery: delivery || null,
      payment_provider: pay || null,
    })
    .select("id,order_no,status,created_at,total_cents,shipping_cents,subtotal_cents,delivery,payment_provider,tracking_no")
    .single();

  if (orderErr) throw orderErr;

  const lines = (items || []).map((i) => ({
    order_id: orderRow.id,
    product_name: i.name || i.product?.name || "Print",
    size_id: i.size || null,
    material_id: i.material || null,
    frame_colour_id: i.frameCol || null,
    colour: i.printColour || i.product?.colour || null,
    unit_price_cents: Math.round((i.price || 0) * 100),
    qty: i.qty || 1,
  }));

  if (lines.length) {
    const { error: itemsErr } = await sb.from("order_items").insert(lines);
    if (itemsErr) throw itemsErr;
  }

  const display = mapDbOrder(orderRow, items);
  return { ok: true, localOnly: false, order: display, dbId: orderRow.id };
}

/** Load the signed-in user's orders from Supabase (newest first). */
export async function fetchMyOrders() {
  if (!hasSupabase) return [];
  const sb = browserClient();
  const { data: sess } = await sb.auth.getSession();
  const uid = sess?.session?.user?.id;
  if (!uid) return [];

  const { data, error } = await sb
    .from("orders")
    .select(`
      id,order_no,status,created_at,total_cents,shipping_cents,subtotal_cents,
      delivery,payment_provider,tracking_no,
      order_items(product_name,size_id,material_id,frame_colour_id,colour,unit_price_cents,qty)
    `)
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => mapDbOrder(row));
}

function mapDbOrder(row, cartItems) {
  const fromCart = Array.isArray(cartItems) ? cartItems : null;
  const dbLines = row.order_items || [];

  const lines = fromCart
    ? fromCart.map((i) => ({
        name: i.name || i.product?.name || "Print",
        summary: i.summary || "",
        qty: i.qty || 1,
        price: i.price || 0,
        colour: i.printColour || i.product?.colour || "bw",
        ratio: i.product?.ratio || "landscape",
        image: i.product?.image || null,
        grad: i.product?.grad || ["#333", "#9a9a97"],
        angle: i.product?.angle || 120,
      }))
    : dbLines.map((i) => ({
        name: i.product_name,
        summary: [i.material_id, i.size_id, i.frame_colour_id].filter(Boolean).join(" · "),
        qty: i.qty || 1,
        price: (i.unit_price_cents || 0) / 100,
        colour: i.colour || "bw",
        ratio: "landscape",
        image: null,
        grad: ["#333", "#9a9a97"],
        angle: 120,
      }));

  const pay =
    row.payment_provider === "paystack" ? "Paystack"
      : row.payment_provider === "payfast" ? "PayFast"
        : row.payment_provider || "Card";

  return {
    id: row.order_no || row.id,
    dbId: row.id,
    date: row.created_at
      ? new Date(row.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    itemsSummary: lines.map((l) => l.name).join(" · ") || "Your order",
    itemCount: lines.reduce((n, l) => n + (l.qty || 1), 0),
    subtotal: row.subtotal_cents != null ? row.subtotal_cents / 100 : lines.reduce((n, l) => n + l.price * l.qty, 0),
    shipping: row.shipping_cents != null ? row.shipping_cents / 100 : 0,
    total: row.total_cents != null ? row.total_cents / 100 : 0,
    status: STATUS_LABEL[row.status] || row.status || "Processing",
    pay,
    tracking: row.tracking_no || null,
    delivery: row.delivery || null,
    lines,
    // keep cart-shaped fields for success page / email
    items: fromCart || lines,
    email: undefined,
  };
}
