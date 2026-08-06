# Setup — push to GitHub, connect Supabase, deploy

## 1. Push to GitHub  (repo: dotsandcoms/dgwlp)

From inside the unzipped `doron/` folder:

```bash
git init
git add .
git commit -m "Doron Goldstein Photography — storefront + admin"
git branch -M main
git remote add origin https://github.com/dotsandcoms/dgwlp.git
git push -u origin main
```

If Git asks for credentials, use a GitHub **Personal Access Token** as the password
(GitHub → Settings → Developer settings → Personal access tokens), or `gh auth login`
if you have the GitHub CLI. `.env.local` is git-ignored, so **no secrets are pushed**.

## 2. Set up the Supabase database  (project: flbskxcwywqiqrhofrqx)

1. Open https://supabase.com/dashboard/project/flbskxcwywqiqrhofrqx
2. **SQL Editor → New query** → paste the entire contents of **`supabase/schema.sql`** → **Run**.
   (Idempotent — safe to re-run. It builds every table, the full price list, RLS,
   and the `prints` storage bucket. There's a sample product near the bottom you can delete.)
3. **Project Settings → API** → copy your keys into **`.env.local`**:
   - `NEXT_PUBLIC_SUPABASE_URL` is already set to your project.
   - Paste **anon/public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Paste **service_role** (keep secret) → `SUPABASE_SERVICE_ROLE_KEY`
4. Restart `npm run dev`.

The site keeps showing the demo catalogue until you've added **3+ published products**,
then it automatically switches to your real Supabase data (see `src/lib/data.js`).

### Make yourself an admin
Register once on the site (or in Supabase → Authentication), then in SQL Editor:
```sql
insert into admins (user_id)
select id from auth.users where email = 'you@dotsandcoms.co.za';
```

### Load a print (example)
Upload the image to the `prints` storage bucket, then:
```sql
insert into products (name,slug,sku,category_id,ratio_id,colour,description,hero_image,is_published)
values ('Lion','lion','lion',(select id from categories where slug='big-cats'),
        'landscape','bw','A full-maned male at first light.','lion.jpg',true);
select generate_variants((select id from products where slug='lion'));  -- prices every size × finish
```

## 2b. Storage buckets — `images` (website) and `prints` (products)

You've created both buckets. Two quick steps:

1. In **SQL Editor**, run **`supabase/site_images_bucket.sql`** once (makes the
   `images` bucket public + admin-writable). The `prints` bucket is already set up
   by `schema.sql`.
2. Upload the **website images** to the **`images`** bucket (find them in the repo at
   `public/images/`): `hero.jpg`, `elephant-plains.jpg`, `wildebeest-herd.jpg`,
   `elephant-herd.jpg`.
3. In `.env.local` set `NEXT_PUBLIC_STORAGE_SITE_IMAGES=true` and restart. The hero and
   scroller now load from Supabase Storage instead of the bundled files.

Product photographs go in the **`prints`** bucket. A product's `hero_image` column stores
just the filename (e.g. `lion.jpg`) — the app builds the public URL automatically.



1. https://vercel.com → **New Project** → import `dotsandcoms/dgwlp`.
2. Add the same environment variables (from `.env.local`) in Vercel’s settings.
3. Deploy, then point `photography.dotsandcoms.co.za` at the Vercel project.
4. In Supabase → Authentication → URL config, add your production URL.
5. Set PayFast/Paystack notify URLs to `https://your-domain/api/payfast/notify`
   and `/api/paystack/webhook`.
