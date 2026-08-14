import { browserClient, hasSupabase, imageUrl } from "./supabase";

const STATUS_LABEL = {
  pending: "Processing",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/** Deterministic placeholder gradient when a product image is missing. */
function gradFor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return { grad: ["#2f2f2d", "#a9a49b"], angle: (h % 90) + 90 };
}

/**
 * Attach product hero images (and ratio) to order lines by matching product_name.
 * Order items historically only stored the name — without this, Plate shows placeholders.
 */
export async function enrichOrdersWithImages(sb, orders) {
  const names = [
    ...new Set(
      orders.flatMap((o) => (o.lines || []).map((l) => l.name).filter(Boolean))
    ),
  ];
  if (!names.length) return orders;

  const { data: products, error } = await sb
    .from("products")
    .select("name,ratio_id,colour,hero_image")
    .in("name", names);

  if (error || !products?.length) return orders;

  const byName = new Map(
    products.map((p) => [String(p.name || "").trim().toLowerCase(), p])
  );

  return orders.map((order) => ({
    ...order,
    lines: (order.lines || []).map((line) => {
      if (line.image) return line;
      const p = byName.get(String(line.name || "").trim().toLowerCase());
      if (!p) return line;
      const g = gradFor(line.name);
      return {
        ...line,
        image: imageUrl(p.hero_image),
        ratio: p.ratio_id || line.ratio || "landscape",
        // keep the ordered print colour; fall back to catalogue colour
        colour: line.colour || p.colour || "bw",
        grad: line.grad || g.grad,
        angle: line.angle || g.angle,
      };
    }),
  }));
}

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
  const mapped = (data || []).map((row) => mapDbOrder(row));
  return enrichOrdersWithImages(sb, mapped);
}

function mapDbOrder(row, cartItems) {
  const fromCart = Array.isArray(cartItems) ? cartItems : null;
  const dbLines = row.order_items || [];

  const lines = fromCart
    ? fromCart.map((i) => {
        const g = gradFor(i.name || i.product?.name);
        return {
          name: i.name || i.product?.name || "Print",
          summary: i.summary || "",
          qty: i.qty || 1,
          price: i.price || 0,
          colour: i.printColour || i.product?.colour || "bw",
          ratio: i.product?.ratio || "landscape",
          image: i.product?.image || i.image || null,
          grad: i.product?.grad || g.grad,
          angle: i.product?.angle || g.angle,
        };
      })
    : dbLines.map((i) => {
        const g = gradFor(i.product_name);
        return {
          name: i.product_name,
          summary: [i.material_id, i.size_id, i.frame_colour_id].filter(Boolean).join(" · "),
          qty: i.qty || 1,
          price: (i.unit_price_cents || 0) / 100,
          colour: i.colour || "bw",
          ratio: "landscape",
          image: null,
          grad: g.grad,
          angle: g.angle,
        };
      });

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
    email: row.email || undefined,
    shippingMethod: row.shipping_method || null,
  };
}
