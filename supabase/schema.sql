-- =====================================================================
--  DORON GOLDSTEIN PHOTOGRAPHY — Supabase / Postgres schema
--  Run this whole file in: Supabase Dashboard → SQL Editor → New query.
--  Safe to re-run (idempotent). Money is stored in integer CENTS.
--  R1 500,00  ==  150000 cents.
-- =====================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- 0.  Helpers: admin check + updated_at trigger
-- ---------------------------------------------------------------------
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins a where a.user_id = auth.uid());
$$;

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ---------------------------------------------------------------------
-- 1.  Reference tables (ratios, sizes, materials, frame colours, rooms)
-- ---------------------------------------------------------------------
create table if not exists ratios (
  id text primary key,             -- landscape | portrait | pano | pan2
  label text not null,
  aspect_w int not null,
  aspect_h int not null,
  sort int default 0
);

create table if not exists sizes (
  id text primary key,             -- '1200x800'
  ratio_id text not null references ratios(id),
  width_mm int not null,
  height_mm int not null,
  sort int default 0
);

create table if not exists materials (
  id text primary key,             -- paper | paper_framed | canvas_rolled | canvas_framed | canvas_mounted
  label text not null,
  is_framed boolean default false,
  sort int default 0
);

create table if not exists frame_colours (
  id text primary key,             -- black | white | oak
  label text not null,
  hex text not null,
  sort int default 0
);

create table if not exists rooms (
  id text primary key,             -- lounge | bedroom | study | gallery
  label text not null,
  template_image text,             -- optional storage path to a real room photo
  sort int default 0
);

-- Default price grid from Price_List_Final.xlsx (size × material, in cents)
create table if not exists price_list (
  size_id text not null references sizes(id),
  material_id text not null references materials(id),
  price_cents int not null,
  primary key (size_id, material_id)
);

-- ---------------------------------------------------------------------
-- 2.  Catalogue: categories, products, variants, images, rooms
-- ---------------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  sort int default 0
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  sku text,
  category_id uuid references categories(id) on delete set null,
  ratio_id text not null references ratios(id),
  colour text not null default 'bw' check (colour in ('bw','colour','both')),
  description text,
  hero_image text,                              -- storage path (bucket: prints)
  is_published boolean default false,
  is_limited_edition boolean default true,
  edition_size int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Actual sellable combinations. Price can differ per product; defaults
-- are copied from price_list via generate_variants() below.
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  size_id text not null references sizes(id),
  material_id text not null references materials(id),
  price_cents int not null,
  stock int default 999,                        -- made-to-order default
  is_active boolean default true,
  unique (product_id, size_id, material_id)
);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  storage_path text not null,
  kind text default 'gallery' check (kind in ('hero','gallery','room_mockup')),
  room_id text references rooms(id),
  sort int default 0
);

create table if not exists product_rooms (           -- which room previews to show
  product_id uuid references products(id) on delete cascade,
  room_id text references rooms(id),
  primary key (product_id, room_id)
);

-- ---------------------------------------------------------------------
-- 3.  Customers: profiles + delivery addresses + wishlist
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  street text not null,
  suburb text,
  city text not null,
  province text not null,
  postal_code text not null,
  notes text,
  is_default boolean default false,
  created_at timestamptz default now()
);

create table if not exists wishlists (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, product_id)
);

-- Auto-create a profile row whenever a user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- 4.  Orders
-- ---------------------------------------------------------------------
create sequence if not exists dg_order_seq start 1043;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  status text not null default 'pending'
    check (status in ('pending','paid','shipped','delivered','cancelled','refunded')),
  subtotal_cents int not null default 0,
  shipping_cents int not null default 0,
  total_cents int not null default 0,
  shipping_method text,                          -- standard | express
  delivery jsonb,                                -- snapshot of the address at purchase
  payment_provider text,                         -- payfast | paystack
  payment_ref text,                              -- provider transaction id
  tracking_no text,
  created_at timestamptz default now(),
  paid_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete set null,
  product_name text not null,                    -- snapshot (survives product edits)
  size_id text,
  material_id text,
  frame_colour_id text,
  colour text,
  unit_price_cents int not null,
  qty int not null default 1
);

-- Assign DG-#### order number on insert
create or replace function set_order_no()
returns trigger language plpgsql as $$
begin
  if new.order_no is null then
    new.order_no := 'DG-' || lpad(nextval('dg_order_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_order_no on orders;
create trigger trg_order_no before insert on orders
  for each row execute function set_order_no();

-- Optional: log of transactional emails sent via Resend
create table if not exists email_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  type text,                                     -- receipt | shipping
  to_email text,
  sent_at timestamptz default now()
);

-- updated_at triggers
drop trigger if exists trg_products_upd on products;
create trigger trg_products_upd before update on products for each row execute function set_updated_at();
drop trigger if exists trg_profiles_upd on profiles;
create trigger trg_profiles_upd before update on profiles for each row execute function set_updated_at();
drop trigger if exists trg_orders_upd on orders;
create trigger trg_orders_upd before update on orders for each row execute function set_updated_at();

-- Indexes
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_published on products(is_published);
create index if not exists idx_variants_product on product_variants(product_id);
create index if not exists idx_orders_user on orders(user_id);
create index if not exists idx_orderitems_order on order_items(order_id);
create index if not exists idx_addresses_user on addresses(user_id);

-- ---------------------------------------------------------------------
-- 5.  Helper: create all variants for a product from the price list
--     usage: select generate_variants('<product-uuid>');
--            select generate_variants('<product-uuid>', array['paper','paper_framed']);
-- ---------------------------------------------------------------------
create or replace function generate_variants(p_product uuid, p_materials text[] default null)
returns void language plpgsql as $$
declare r record;
begin
  for r in
    select s.id as size_id, pl.material_id, pl.price_cents
    from products p
    join sizes s      on s.ratio_id = p.ratio_id
    join price_list pl on pl.size_id = s.id
    where p.id = p_product
      and (p_materials is null or pl.material_id = any(p_materials))
  loop
    insert into product_variants (product_id, size_id, material_id, price_cents)
    values (p_product, r.size_id, r.material_id, r.price_cents)
    on conflict (product_id, size_id, material_id)
      do update set price_cents = excluded.price_cents;
  end loop;
end;
$$;

-- Convenience view: min/max price per product (drives "R1 500 – R7 500")
create or replace view product_price_range as
select p.id as product_id,
       min(v.price_cents) as min_cents,
       max(v.price_cents) as max_cents
from products p
join product_variants v on v.product_id = p.id and v.is_active
group by p.id;

-- =====================================================================
-- 6.  SEED — reference data
-- =====================================================================
insert into ratios (id,label,aspect_w,aspect_h,sort) values
  ('landscape','Landscape 3:2',3,2,1),
  ('portrait','Portrait 4:3',3,4,2),
  ('pano','Panoramic 3:1',3,1,3),
  ('pan2','Wide Pan 2:1',2,1,4)
on conflict (id) do nothing;

insert into sizes (id,ratio_id,width_mm,height_mm,sort) values
  ('600x400','landscape',600,400,1),('900x600','landscape',900,600,2),
  ('1200x800','landscape',1200,800,3),('1500x1000','landscape',1500,1000,4),
  ('400x300','portrait',400,300,1),('800x600','portrait',800,600,2),
  ('1200x900','portrait',1200,900,3),('1600x1200','portrait',1600,1200,4),
  ('1200x400','pano',1200,400,1),('1800x600','pano',1800,600,2),('2400x800','pano',2400,800,3),
  ('800x400','pan2',800,400,1),('1000x500','pan2',1000,500,2),
  ('1200x600','pan2',1200,600,3),('2000x1000','pan2',2000,1000,4)
on conflict (id) do nothing;

insert into materials (id,label,is_framed,sort) values
  ('paper','Paper — unframed',false,1),
  ('paper_framed','Paper — framed',true,2),
  ('canvas_rolled','Canvas — rolled',false,3),
  ('canvas_framed','Canvas — framed',true,4),
  ('canvas_mounted','Canvas — mounted',false,5)
on conflict (id) do nothing;

insert into frame_colours (id,label,hex,sort) values
  ('black','Black','#141414',1),('white','White','#fdfdfd',2),('oak','Natural oak','#b7955c',3)
on conflict (id) do nothing;

insert into rooms (id,label,sort) values
  ('lounge','Lounge',1),('bedroom','Bedroom',2),('study','Study',3),('gallery','Gallery',4)
on conflict (id) do nothing;

insert into categories (name,slug,sort) values
  ('Big Cats','big-cats',1),('Elephants','elephants',2),('Rhino','rhino',3),
  ('Plains Game','plains-game',4),('Birds','birds',5),
  ('Landscapes','landscapes',6),('Black & White','black-and-white',7)
on conflict (slug) do nothing;

-- Price grid (cents). Columns order matches materials:
-- paper, paper_framed, canvas_rolled, canvas_framed, canvas_mounted
insert into price_list (size_id,material_id,price_cents) values
  -- Landscape 3:2
  ('600x400','paper',150000),('600x400','paper_framed',230000),('600x400','canvas_rolled',150000),('600x400','canvas_framed',230000),('600x400','canvas_mounted',190000),
  ('900x600','paper',200000),('900x600','paper_framed',320000),('900x600','canvas_rolled',200000),('900x600','canvas_framed',320000),('900x600','canvas_mounted',270000),
  ('1200x800','paper',280000),('1200x800','paper_framed',530000),('1200x800','canvas_rolled',280000),('1200x800','canvas_framed',530000),('1200x800','canvas_mounted',390000),
  ('1500x1000','paper',370000),('1500x1000','paper_framed',750000),('1500x1000','canvas_rolled',370000),('1500x1000','canvas_framed',750000),('1500x1000','canvas_mounted',490000),
  -- Panoramic 3:1
  ('1200x400','paper',250000),('1200x400','paper_framed',530000),('1200x400','canvas_rolled',250000),('1200x400','canvas_framed',530000),('1200x400','canvas_mounted',410000),
  ('1800x600','paper',370000),('1800x600','paper_framed',760000),('1800x600','canvas_rolled',370000),('1800x600','canvas_framed',760000),('1800x600','canvas_mounted',530000),
  ('2400x800','paper',590000),('2400x800','paper_framed',980000),('2400x800','canvas_rolled',590000),('2400x800','canvas_framed',980000),('2400x800','canvas_mounted',760000),
  -- 2:1 (V & H)
  ('800x400','paper',160000),('800x400','paper_framed',290000),('800x400','canvas_rolled',160000),('800x400','canvas_framed',290000),('800x400','canvas_mounted',210000),
  ('1000x500','paper',210000),('1000x500','paper_framed',340000),('1000x500','canvas_rolled',210000),('1000x500','canvas_framed',340000),('1000x500','canvas_mounted',270000),
  ('1200x600','paper',280000),('1200x600','paper_framed',530000),('1200x600','canvas_rolled',280000),('1200x600','canvas_framed',530000),('1200x600','canvas_mounted',390000),
  ('2000x1000','paper',400000),('2000x1000','paper_framed',790000),('2000x1000','canvas_rolled',400000),('2000x1000','canvas_framed',790000),('2000x1000','canvas_mounted',630000),
  -- Portrait 4:3
  ('400x300','paper',150000),('400x300','paper_framed',230000),('400x300','canvas_rolled',150000),('400x300','canvas_framed',230000),('400x300','canvas_mounted',190000),
  ('800x600','paper',200000),('800x600','paper_framed',320000),('800x600','canvas_rolled',200000),('800x600','canvas_framed',320000),('800x600','canvas_mounted',270000),
  ('1200x900','paper',280000),('1200x900','paper_framed',530000),('1200x900','canvas_rolled',280000),('1200x900','canvas_framed',530000),('1200x900','canvas_mounted',390000),
  ('1600x1200','paper',370000),('1600x1200','paper_framed',750000),('1600x1200','canvas_rolled',370000),('1600x1200','canvas_framed',750000),('1600x1200','canvas_mounted',490000)
on conflict (size_id,material_id) do update set price_cents = excluded.price_cents;

-- =====================================================================
-- 7.  EXAMPLE PRODUCT (optional — delete this block once you load real data)
-- =====================================================================
do $$
declare v_cat uuid; v_prod uuid;
begin
  select id into v_cat from categories where slug = 'big-cats';
  insert into products (name,slug,sku,category_id,ratio_id,colour,description,is_published)
  values ('Leopard — Colour','leopard-colour','leopard-c',v_cat,'landscape','colour',
    'The Leopard (Panthera pardus) is a sleek and powerful big cat known for its golden coat with black rosettes.',
    true)
  on conflict (slug) do nothing
  returning id into v_prod;

  if v_prod is not null then
    perform generate_variants(v_prod);                    -- price every size × finish
    insert into product_rooms(product_id,room_id) values
      (v_prod,'lounge'),(v_prod,'bedroom'),(v_prod,'gallery')
    on conflict do nothing;
  end if;
end $$;

-- =====================================================================
-- 8.  STORAGE — bucket for print images
-- =====================================================================
insert into storage.buckets (id,name,public)
values ('prints','prints',true)
on conflict (id) do nothing;

-- Public can view; only admins can upload / change / delete
drop policy if exists "prints_public_read" on storage.objects;
create policy "prints_public_read" on storage.objects
  for select using (bucket_id = 'prints');

drop policy if exists "prints_admin_write" on storage.objects;
create policy "prints_admin_write" on storage.objects
  for all using (bucket_id = 'prints' and is_admin())
  with check (bucket_id = 'prints' and is_admin());

-- =====================================================================
-- 9.  ROW LEVEL SECURITY
-- =====================================================================
alter table ratios          enable row level security;
alter table sizes           enable row level security;
alter table materials       enable row level security;
alter table frame_colours   enable row level security;
alter table rooms           enable row level security;
alter table price_list      enable row level security;
alter table categories      enable row level security;
alter table products        enable row level security;
alter table product_variants enable row level security;
alter table product_images  enable row level security;
alter table product_rooms   enable row level security;
alter table profiles        enable row level security;
alter table addresses       enable row level security;
alter table wishlists       enable row level security;
alter table orders          enable row level security;
alter table order_items     enable row level security;
alter table admins          enable row level security;

-- Reference + catalogue: public may READ, admins may WRITE ------------
do $$
declare t text;
begin
  foreach t in array array['ratios','sizes','materials','frame_colours','rooms','price_list','categories','product_images','product_rooms'] loop
    execute format('drop policy if exists "%s_read" on %I', t, t);
    execute format('create policy "%s_read" on %I for select using (true)', t, t);
    execute format('drop policy if exists "%s_admin" on %I', t, t);
    execute format('create policy "%s_admin" on %I for all using (is_admin()) with check (is_admin())', t, t);
  end loop;
end $$;

-- Products: public sees only published; admins see/manage all
drop policy if exists "products_read" on products;
create policy "products_read" on products for select using (is_published or is_admin());
drop policy if exists "products_admin" on products;
create policy "products_admin" on products for all using (is_admin()) with check (is_admin());

-- Variants: public sees active; admins manage all
drop policy if exists "variants_read" on product_variants;
create policy "variants_read" on product_variants for select using (is_active or is_admin());
drop policy if exists "variants_admin" on product_variants;
create policy "variants_admin" on product_variants for all using (is_admin()) with check (is_admin());

-- Profiles: each user manages their own
drop policy if exists "profiles_self" on profiles;
create policy "profiles_self" on profiles for select using (auth.uid() = id or is_admin());
drop policy if exists "profiles_self_upd" on profiles;
create policy "profiles_self_upd" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Addresses: each user manages their own
drop policy if exists "addr_self" on addresses;
create policy "addr_self" on addresses for all
  using (auth.uid() = user_id or is_admin())
  with check (auth.uid() = user_id);

-- Wishlists: each user manages their own
drop policy if exists "wish_self" on wishlists;
create policy "wish_self" on wishlists for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Orders: user reads/creates own; admins read all.
-- NOTE: status/payment updates are done by the payment webhook using the
-- SERVICE ROLE key (which bypasses RLS) — so there is deliberately no
-- client UPDATE policy on orders.
drop policy if exists "orders_read" on orders;
create policy "orders_read" on orders for select using (auth.uid() = user_id or is_admin());
drop policy if exists "orders_insert" on orders;
create policy "orders_insert" on orders for insert with check (auth.uid() = user_id);
drop policy if exists "orders_admin" on orders;
create policy "orders_admin" on orders for update using (is_admin()) with check (is_admin());

drop policy if exists "items_read" on order_items;
create policy "items_read" on order_items for select
  using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
drop policy if exists "items_insert" on order_items;
create policy "items_insert" on order_items for insert
  with check (exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));

-- Admins table: readable by admins only
drop policy if exists "admins_read" on admins;
create policy "admins_read" on admins for select using (is_admin());

-- =====================================================================
-- 10.  MAKE YOURSELF AN ADMIN
--      After you create your login (via the app or Auth dashboard), run:
--
--      insert into admins (user_id)
--      select id from auth.users where email = 'you@dotsandcoms.co.za';
-- =====================================================================

-- Done. ✅
