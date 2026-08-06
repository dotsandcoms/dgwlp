-- Allow products.colour = 'both' (customer chooses B&W or Colour at order time).
-- Run in Supabase SQL Editor if not applied automatically.

alter table products drop constraint if exists products_colour_check;
alter table products add constraint products_colour_check
  check (colour in ('bw', 'colour', 'both'));
