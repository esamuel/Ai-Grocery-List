-- Market prices from the Israeli Price Transparency law (חוק שקיפות מחירים)
-- Filled by collector/ (runs on a machine in Israel). Read-only for the app.
-- Tables are prefixed mp_ (market prices).

create extension if not exists pg_trgm;

-- ---------- helpers ----------
-- "תל אביב - יפו" / "תל-אביב" / "תל אביב יפו" -> "תל אביב יפו"
create or replace function public.mp_norm_city(c text) returns text
language sql immutable as $$
  select nullif(
    regexp_replace(
      regexp_replace(
        trim(regexp_replace(lower(coalesce(c, '')), '[\s\-–_/,.()"'']+', ' ', 'g')),
        '^(תל אביב יפו|תל אביב יפו .*|ת א|תא)$', 'תל אביב'),
      '^ירושלים .*$', 'ירושלים'),
    '')
$$;

-- A stored city matches a query when they are equal or one is a word-prefix of the other
-- ("תל אביב" ↔ "תל אביב יפו", "ראשון לציון" ↔ "ראשון").
create or replace function public.mp_city_match(stored text, q text) returns boolean
language sql immutable as $$
  select stored is not null and q is not null
     and (stored = q or stored like q || ' %' or q like stored || ' %')
$$;


-- ---------- chains ----------
create table if not exists public.mp_chains (
  chain_id    text primary key,          -- e.g. 7290027600007
  name        text not null,
  updated_at  timestamptz not null default now()
);

-- ---------- stores (branches) ----------
create table if not exists public.mp_stores (
  chain_id      text not null references public.mp_chains(chain_id) on delete cascade,
  store_id      text not null,            -- branch number inside the chain
  subchain_id   text,
  subchain_name text,
  name          text not null,
  address       text,
  city          text,
  city_norm     text generated always as (public.mp_norm_city(city)) stored,
  updated_at    timestamptz not null default now(),
  primary key (chain_id, store_id)
);

-- ---------- products (barcode-keyed, chain-independent) ----------
create table if not exists public.mp_products (
  barcode       text primary key,
  name          text not null,
  name_norm     text generated always as (lower(regexp_replace(name, '[^\w\s]', ' ', 'g'))) stored,
  manufacturer  text,
  quantity      numeric,
  unit          text,                     -- UnitQty, e.g. ליטר / גרם / יחידה
  updated_at    timestamptz not null default now()
);

-- ---------- prices ----------
create table if not exists public.mp_prices (
  chain_id    text not null,
  store_id    text not null,
  barcode     text not null references public.mp_products(barcode) on delete cascade,
  price       numeric(10,2) not null,
  unit_price  numeric(10,2),
  updated_at  timestamptz not null default now(),   -- PriceUpdateDate from the file
  primary key (chain_id, store_id, barcode),
  foreign key (chain_id, store_id) references public.mp_stores(chain_id, store_id) on delete cascade
);

create index if not exists mp_products_name_trgm on public.mp_products using gin (name_norm gin_trgm_ops);
create index if not exists mp_stores_city_idx     on public.mp_stores (city_norm);
create index if not exists mp_prices_barcode_idx  on public.mp_prices (barcode);

-- ---------- RLS: everyone can read, only the service role (collector) writes ----------
alter table public.mp_chains   enable row level security;
alter table public.mp_stores   enable row level security;
alter table public.mp_products enable row level security;
alter table public.mp_prices   enable row level security;

drop policy if exists mp_chains_read   on public.mp_chains;
drop policy if exists mp_stores_read   on public.mp_stores;
drop policy if exists mp_products_read on public.mp_products;
drop policy if exists mp_prices_read   on public.mp_prices;
create policy mp_chains_read   on public.mp_chains   for select using (true);
create policy mp_stores_read   on public.mp_stores   for select using (true);
create policy mp_products_read on public.mp_products for select using (true);
create policy mp_prices_read   on public.mp_prices   for select using (true);

-- Cities that have stores, with counts (for the city picker)
create or replace function public.mp_cities()
returns table (city text, stores bigint)
language sql stable as $$
  select city_norm as city, count(*) as stores
  from public.mp_stores
  where city_norm is not null
  group by city_norm
  order by stores desc, city_norm
$$;

-- Fuzzy product search, limited to products sold in the given city.
-- Returns min/max price and how many stores carry it.
create or replace function public.mp_search_products(q text, p_city text, p_limit int default 15)
returns table (
  barcode text, name text, manufacturer text, quantity numeric, unit text,
  min_price numeric, max_price numeric, stores bigint, similarity real
)
language sql stable as $$
  with city_stores as (
    select chain_id, store_id from public.mp_stores
    where public.mp_city_match(city_norm, public.mp_norm_city(p_city))
  ),
  qn as (select lower(regexp_replace(q, '[^\w\s]', ' ', 'g')) as q)
  select p.barcode, p.name, p.manufacturer, p.quantity, p.unit,
         min(pr.price), max(pr.price), count(*) as stores,
         greatest(similarity(p.name_norm, qn.q), case when p.name_norm like '%' || qn.q || '%' then 0.6 else 0 end)::real as similarity
  from public.mp_products p
  cross join qn
  join public.mp_prices pr on pr.barcode = p.barcode
  join city_stores cs on cs.chain_id = pr.chain_id and cs.store_id = pr.store_id
  where p.name_norm % qn.q or p.name_norm like '%' || qn.q || '%'
  group by p.barcode, p.name, p.manufacturer, p.quantity, p.unit, qn.q
  order by similarity desc, stores desc
  limit p_limit
$$;

-- Price a basket at every store in a city.
-- p_items: [{"barcode":"729...","qty":2}, ...]
-- Returns one row per store with the total, how many items it carries, and per-item detail.
create or replace function public.mp_compare_basket(p_city text, p_items jsonb)
returns table (
  chain_id text, chain_name text, store_id text, store_name text, address text,
  items_found int, items_total int, total numeric, prices_updated_at timestamptz, lines jsonb
)
language sql stable as $$
  with wanted as (
    select (i->>'barcode') as barcode, coalesce((i->>'qty')::numeric, 1) as qty
    from jsonb_array_elements(p_items) i
  ),
  city_stores as (
    select s.chain_id, s.store_id, s.name, s.address, c.name as chain_name
    from public.mp_stores s join public.mp_chains c using (chain_id)
    where public.mp_city_match(s.city_norm, public.mp_norm_city(p_city))
  ),
  lines as (
    select cs.chain_id, cs.store_id, w.barcode, w.qty, pr.price, pr.updated_at,
           pr.price * w.qty as line_total
    from city_stores cs
    cross join wanted w
    left join public.mp_prices pr
      on pr.chain_id = cs.chain_id and pr.store_id = cs.store_id and pr.barcode = w.barcode
  )
  select cs.chain_id, cs.chain_name, cs.store_id, cs.name, cs.address,
         count(l.price)::int as items_found,
         (select count(*) from wanted)::int as items_total,
         coalesce(sum(l.line_total), 0)::numeric(10,2) as total,
         max(l.updated_at) as prices_updated_at,
         jsonb_agg(jsonb_build_object('barcode', l.barcode, 'qty', l.qty, 'price', l.price, 'line_total', l.line_total)
                   order by l.barcode) as lines
  from city_stores cs
  join lines l on l.chain_id = cs.chain_id and l.store_id = cs.store_id
  group by cs.chain_id, cs.chain_name, cs.store_id, cs.name, cs.address
  having count(l.price) > 0
  order by items_found desc, total asc
$$;

grant execute on function public.mp_norm_city(text) to anon, authenticated;
grant execute on function public.mp_city_match(text, text) to anon, authenticated;
grant execute on function public.mp_cities() to anon, authenticated;
grant execute on function public.mp_search_products(text, text, int) to anon, authenticated;
grant execute on function public.mp_compare_basket(text, jsonb) to anon, authenticated;
