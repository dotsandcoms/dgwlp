import { NextResponse } from "next/server";
import { requireAdminFromRequest, serviceClient } from "@/lib/admin-auth-server";
import { signupMeta } from "@/lib/auth-profile";
import { toDbAddress } from "@/lib/address";

/** Admin: create a collector account with profile + default address. */
export async function POST(req) {
  try {
    const auth = await requireAdminFromRequest(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json().catch(() => ({}));
    const name = String(body.full_name || body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");
    const address = body.address || {};

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const sb = serviceClient();
    if (!sb) {
      return NextResponse.json({ error: "Server not configured for account creation" }, { status: 503 });
    }

    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: signupMeta({ name, phone, address }),
    });
    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 400 });
    }

    const userId = created.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Account was not created" }, { status: 500 });
    }

    await sb.from("profiles").upsert(
      {
        id: userId,
        full_name: name,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    const dbAddr = toDbAddress(address, userId);
    if (dbAddr?.street && dbAddr.city && dbAddr.postal_code) {
      await sb.from("addresses").delete().eq("user_id", userId).eq("is_default", true);
      await sb.from("addresses").insert(dbAddr);
    }

    const { data: detail, error: detailErr } = await auth.client.rpc("admin_get_customer", { p_id: userId });
    if (!detailErr && detail) {
      return NextResponse.json({ customer: detail });
    }

    return NextResponse.json({
      customer: {
        id: userId,
        full_name: name,
        email,
        phone,
        created_at: created.user.created_at,
        address: dbAddr
          ? {
              street: dbAddr.street,
              suburb: dbAddr.suburb,
              city: dbAddr.city,
              province: dbAddr.province,
              postal: dbAddr.postal_code,
              notes: dbAddr.notes,
            }
          : null,
        orders: [],
        order_count: 0,
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
