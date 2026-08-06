-- Save phone + delivery address at signup time (runs as security definer,
-- so it works even when email confirmation means there is no client session yet).
-- Address fields are passed in auth.users.raw_user_meta_data from signUp().

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_street text := nullif(trim(coalesce(new.raw_user_meta_data->>'street', '')), '');
  v_city   text := nullif(trim(coalesce(new.raw_user_meta_data->>'city', '')), '');
  v_postal text := nullif(trim(coalesce(new.raw_user_meta_data->>'postal', '')), '');
  v_phone  text := nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), '');
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''), ''),
    v_phone
  )
  on conflict (id) do update set
    full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
    phone = coalesce(excluded.phone, profiles.phone),
    updated_at = now();

  if v_street is not null and v_city is not null and v_postal is not null then
    insert into public.addresses (
      user_id, street, suburb, city, province, postal_code, notes, is_default
    ) values (
      new.id,
      v_street,
      nullif(trim(coalesce(new.raw_user_meta_data->>'suburb', '')), ''),
      v_city,
      coalesce(nullif(trim(coalesce(new.raw_user_meta_data->>'province', '')), ''), 'Gauteng'),
      v_postal,
      nullif(trim(coalesce(new.raw_user_meta_data->>'notes', '')), ''),
      true
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Client can still update their own profile after login
drop policy if exists "profiles_self_ins" on profiles;
create policy "profiles_self_ins" on profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_self_upd" on profiles;
create policy "profiles_self_upd" on profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- RPC fallback: save/refresh profile + address once the user has a session
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
    -- Replace default address (keep it simple for registration)
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
    update public.addresses
    set notes = nullif(trim(coalesce(p_notes, '')), '')
    where user_id = auth.uid() and is_default = true;
  end if;
end;
$$;

grant execute on function public.save_my_delivery to authenticated;
