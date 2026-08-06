import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSettings } from "@/lib/settings-server";

// PayFast ITN (Instant Transaction Notification).
// PayFast POSTs here after payment. Verify, then mark the order paid using
// the SERVICE ROLE key (bypasses RLS). See:
// https://developers.payfast.co.za/docs#step_4_confirm_payment
export async function POST(req) {
  try {
    const bodyText = await req.text();
    const params = Object.fromEntries(new URLSearchParams(bodyText));

    // Credentials from admin Settings (DB) with env fallback
    const { payfast } = await getServerSettings();
    // 1) TODO: validate signature with payfast.passphrase
    // 2) TODO: validate the data by POSTing back to PayFast /eng/query/validate
    // 3) TODO: confirm amount matches the order total
    void payfast;

    const orderNo = params.m_payment_id;
    const paymentRef = params.pf_payment_id;
    const status = params.payment_status; // 'COMPLETE'

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && serviceKey && status === "COMPLETE" && orderNo) {
      const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
      await sb.from("orders")
        .update({ status: "paid", payment_provider: "payfast", payment_ref: paymentRef, paid_at: new Date().toISOString() })
        .eq("order_no", orderNo);
    }
    return new NextResponse("OK", { status: 200 });
  } catch (e) {
    return new NextResponse("ERROR", { status: 500 });
  }
}
