-- Allow authenticated users to insert/update their own profile row
-- (needed after email confirmation when saving phone / name).

drop policy if exists "profiles_self_ins" on profiles;
create policy "profiles_self_ins" on profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_self_upd" on profiles;
create policy "profiles_self_upd" on profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
