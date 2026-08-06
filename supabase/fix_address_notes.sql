-- Ensure delivery notes persist on addresses + save_my_delivery RPC.
-- Run in Supabase SQL Editor if notes aren't saving after profile edit.

alter table public.addresses
  add column if not exists notes text;

create or replace function public.save_my_delivery(
  p_full_name text default null,
  p_phone text default null,
  p_street text default null,
  p_suburb text default null,
  p_city text default null,
  p_province text default null,
  p_postal text default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles (id, full_name, phone)
  values (auth.uid(), coalesce(p_full_name, ''), nullif(trim(coalesce(p_phone, '')), ''))
  on conflict (id) do update set
    full_name = coalesce(nullif(trim(coalesce(p_full_name, '')), ''), profiles.full_name),
    phone = coalesce(nullif(trim(coalesce(p_phone, '')), ''), profiles.phone),
    updated_at = now();

  if nullif(trim(coalesce(p_street, '')), '') is not null
     and nullif(trim(coalesce(p_city, '')), '') is not null
     and nullif(trim(coalesce(p_postal, '')), '') is not null then
    delete from public.addresses where user_id = auth.uid() and is_default = true;
    insert into public.addresses (
      user_id, street, suburb, city, province, postal_code, notes, is_default
    ) values (
      auth.uid(),
      trim(p_street),
      nullif(trim(coalesce(p_suburb, '')), ''),
      trim(p_city),
      coalesce(nullif(trim(coalesce(p_province, '')), ''), 'Gauteng'),
      trim(p_postal),
      nullif(trim(coalesce(p_notes, '')), ''),
      true
    );
  elsif exists (
    select 1 from public.addresses where user_id = auth.uid() and is_default = true
  ) and p_notes is not null then
    -- Allow notes-only updates when a default address already exists
    update public.addresses
    set notes = nullif(trim(coalesce(p_notes, '')), '')
    where user_id = auth.uid() and is_default = true;
  end if;
end;
$$;

grant execute on function public.save_my_delivery to authenticated;
