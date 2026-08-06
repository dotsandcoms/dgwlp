-- Site settings (shipping, tax, payment credentials).
-- Run in the Supabase SQL editor if not already applied.

create table if not exists site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table site_settings enable row level security;

drop policy if exists "settings_read" on site_settings;
create policy "settings_read" on site_settings for select using (
  key in ('shipping', 'tax') or public.is_admin()
);

drop policy if exists "settings_admin_insert" on site_settings;
create policy "settings_admin_insert" on site_settings for insert
  with check (public.is_admin());

drop policy if exists "settings_admin_update" on site_settings;
create policy "settings_admin_update" on site_settings for update
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings_admin_delete" on site_settings;
create policy "settings_admin_delete" on site_settings for delete
  using (public.is_admin());

-- Seed defaults (safe to re-run)
insert into site_settings (key, value) values
  ('shipping', '{"standardPrice":150,"expressPrice":300,"freeOver":2500,"allFree":false}'::jsonb),
  ('tax', '{"enabled":false,"ratePct":15,"label":"VAT"}'::jsonb),
  ('payfast', '{"merchantId":"","merchantKey":"","passphrase":"","sandbox":true}'::jsonb)
on conflict (key) do nothing;
