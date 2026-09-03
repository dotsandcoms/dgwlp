import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { sendOrderStatusEmailByOrderNo } from "@/lib/order-email";

// Paystack webhook. Verify the x-paystack-signature HMAC, then mark paid.
// https://paystack.com/docs/payments/webhooks/
export async function POST(req) {
  try {
    const raw = await req.text();
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const signature = req.headers.get("x-paystack-signature");

    if (secret) {
      const hash = crypto.createHmac("sha512", secret).update(raw).digest("hex");
      if (hash !== signature) return new NextResponse("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(raw);
    if (event?.event === "charge.success") {
      const orderNo = event.data?.metadata?.order_no || event.data?.reference;
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (url && serviceKey && orderNo) {
        const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
        const { data: existing } = await sb
          .from("orders")
          .select("id,status")
          .eq("order_no", orderNo)
          .maybeSingle();

        if (existing) {
          const alreadyPaid = existing.status === "paid";
          await sb
            .from("orders")
            .update({
              status: "paid",
              payment_provider: "paystack",
              payment_ref: event.data.reference,
              paid_at: new Date().toISOString(),
            })
            .eq("order_no", orderNo);

          // Notify once when status first becomes paid (no-ops without RESEND_API_KEY).
          if (!alreadyPaid) {
            await sendOrderStatusEmailByOrderNo(sb, orderNo, "paid").catch(() => {});
          }
        }
      }
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    return new NextResponse("ERROR", { status: 500 });
  }
}
