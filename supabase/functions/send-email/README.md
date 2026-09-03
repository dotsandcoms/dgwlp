# send-email

Supabase Edge Function that sends branded Doron Goldstein Photography order emails via Resend.

## Templates

`receipt` · `pending` · `paid` · `shipping` · `shipped` · `delivered` · `cancelled` · `refunded`

## Invoke

```js
await supabase.functions.invoke("send-email", {
  body: {
    to: "customer@example.com",
    template: "shipped",
    variables: {
      orderId: "DG-1042",
      date: "3 Sep 2026",
      items: [{ name: "Lion", summary: "Canvas — framed · 1500 × 1000 mm · Black", qty: 1, price: 7500 }],
      subtotal: 7500,
      shipping: 0,
      total: 7500,
      tracking: "CPX-123",
      delivery: { name: "…", line1: "…", city: "…", province: "Gauteng", postal: "…", country: "South Africa" },
    },
  },
});
```

App helpers: `src/lib/emails.js` → `sendEmail` / `sendEmailServer`.

## Secrets

```bash
supabase secrets set \
  RESEND_API_KEY=re_… \
  EMAIL_FROM="Doron Goldstein Photography <orders@dgwlp.co.za>" \
  ORDERS_BCC=orders@dgwlp.co.za \
  SITE_URL=https://your-domain
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically.
Order emails are BCC'd to `ORDERS_BCC` (default `orders@dgwlp.co.za`) so the shop inbox always gets a copy.

## Deploy

```bash
supabase functions deploy send-email --project-ref flbskxcwywqiqrhofrqx
```
