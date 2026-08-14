-- Allow public read of currency settings (OR'd with existing shipping/tax policies).
drop policy if exists site_settings_public_read_currency on public.site_settings;

create policy site_settings_public_read_currency
  on public.site_settings
  for select
  to anon, authenticated
  using (key = 'currency');

insert into site_settings (key, value, updated_at)
values (
  'currency',
  '{"showUsd":false,"zarPerUsd":18.5}'::jsonb,
  now()
)
on conflict (key) do nothing;
