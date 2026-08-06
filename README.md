# Doron Goldstein Photography — E‑commerce site

A production-ready **Next.js 14 (App Router) + Tailwind + Supabase** store for
signed, limited-edition wildlife prints. Minimalist black-and-white brand with the
olive-green accent, a dynamic "see it on your wall" configurator, parallax + full-screen
showcase, slide-out cart, registration + multi-step checkout, and a custom admin panel.

**It runs out of the box on demo data** — you only add keys when you're ready for real
products, logins, payments and email.

---

## 1. Run it locally

Requires **Node 18.17+**.

```bash
npm install
cp .env.local.example .env.local   # optional for now
npm run dev
```

Open http://localhost:3000. The whole site works immediately on sample data:
storefront, product configurator, cart, checkout, account, and `/admin`.

Build for production any time with `npm run build && npm start`.

---

## 2. Connect Supabase (real products, logins, orders)

1. Create a project at https://supabase.com.
2. In **SQL Editor**, paste and run **`supabase/schema.sql`** (builds every table,
   the full price list, RLS, and the `prints` storage bucket).
3. Copy your keys from **Project Settings → API** into `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...   # server-only, used by payment webhooks
   ```
4. Restart `npm run dev`. The storefront now reads published products from Supabase
   (and falls back to demo data if none exist yet).
5. Make yourself an admin — after registering once, run in SQL Editor:
   ```sql
   insert into admins (user_id)
   select id from auth.users where email = 'you@dotsandcoms.co.za';
   ```

### Loading your prints
Upload each photograph to the **`prints`** storage bucket, then insert a product row and
call `select generate_variants('<product-id>');` to price every size × finish from the
price list. (A full admin "create product" write path is scaffolded in `src/components/admin.jsx`
— wire the Save button to Supabase inserts when you're ready.)

---

## 3. Payments

Server webhooks are scaffolded and mark orders **paid** using the service-role key:

- **PayFast** → `src/app/api/payfast/notify/route.js` (ITN). Add signature + amount validation.
- **Paystack** → `src/app/api/paystack/webhook/route.js` (HMAC verified).

Set your keys in `.env.local`. Point each provider's notify/webhook URL at
`https://your-domain/api/payfast/notify` and `/api/paystack/webhook`.
Use sandbox credentials while testing.

---

## 4. Email (Resend)

`src/app/api/email/route.js` sends order receipts via Resend. Add `RESEND_API_KEY` and
`EMAIL_FROM` (a verified domain). It no-ops safely if unset. Wire the shipping-confirmation
email from the admin "mark as shipped" action.

---

## 5. Deploy

Recommended: **Vercel** (zero-config for Next.js).
1. Push this folder to a Git repo.
2. Import it on Vercel, add the same env vars.
3. Point `photography.dotsandcoms.co.za` at the Vercel deployment.

Any Node host works too (`npm run build` then `npm start`).

---

## Project map

```
src/
  app/                 routes (home, shop, product/[slug], about, contact,
                       checkout, account, auth, order/success, admin, api/*)
  components/          UI: chrome (header/footer/cart/toasts), home, shop,
                       product, checkout, account, admin, primitives, forms
  context/providers    cart + toast + auth (localStorage in demo, Supabase when configured)
  lib/                 pricing model, mock data, Supabase client, data access
supabase/schema.sql    the full database migration
```

## Notes
- **100% responsive**: hamburger nav, single-column grids, full-width cart drawer,
  horizontally scrolling admin tables — tested down to small phones.
- **Images**: the demo uses on-brand placeholder plates; real photos from Supabase
  Storage drop into the exact same components (`<Plate>` renders an image when present).
- Cart, wishlist and demo auth persist in `localStorage` until Supabase auth is wired in.
