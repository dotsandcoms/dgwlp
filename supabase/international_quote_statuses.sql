-- =============================================================================
-- Doron Goldstein Photography — international shipping quote statuses
-- Run this in Supabase → SQL Editor → New query → Run
-- =============================================================================
-- App statuses used for international quotes:
--   awaiting_quote | quote_sent | quote_accepted
-- Existing: pending | paid | shipped | delivered | cancelled | refunded
--
-- quote_token is stored on orders.delivery JSON (no new column required).
-- =============================================================================

do $$
declare
  status_udt text;
  status_typtype char;
begin
  select c.udt_name
    into status_udt
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'orders'
    and c.column_name = 'status'
  limit 1;

  if status_udt is null then
    raise notice 'orders.status column not found — skipped enum updates.';
    return;
  end if;

  select t.typtype
    into status_typtype
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
    and t.typname = status_udt
  limit 1;

  -- Text / varchar / citext: nothing to migrate
  if status_typtype is distinct from 'e' then
    raise notice 'orders.status is type % (not an enum) — no migration needed.', status_udt;
    return;
  end if;

  -- Enum: add new values if missing
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = status_udt and e.enumlabel = 'awaiting_quote'
  ) then
    execute format('alter type public.%I add value %L', status_udt, 'awaiting_quote');
    raise notice 'Added enum value awaiting_quote';
  end if;

  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = status_udt and e.enumlabel = 'quote_sent'
  ) then
    execute format('alter type public.%I add value %L', status_udt, 'quote_sent');
    raise notice 'Added enum value quote_sent';
  end if;

  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = status_udt and e.enumlabel = 'quote_accepted'
  ) then
    execute format('alter type public.%I add value %L', status_udt, 'quote_accepted');
    raise notice 'Added enum value quote_accepted';
  end if;

  raise notice 'orders.status enum (%) is ready for international quotes.', status_udt;
end $$;

-- Sanity check: list current status values (enum labels, or null if text)
select
  t.typname as status_type,
  e.enumlabel as allowed_value
from pg_type t
join pg_namespace n on n.oid = t.typnamespace
left join pg_enum e on e.enumtypid = t.oid
where n.nspname = 'public'
  and t.typname = (
    select c.udt_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'orders'
      and c.column_name = 'status'
    limit 1
  )
order by e.enumsortorder nulls last;
