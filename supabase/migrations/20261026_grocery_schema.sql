-- Family Grocery List — Supabase schema (migrated from Firestore, Oct 2026)
-- All tables are prefixed gl_ and live in public so Realtime + PostgREST work out of the box.
-- Data columns are jsonb mirrors of the old Firestore documents, so the app logic stays the same.

create extension if not exists pgcrypto;

-- ---------- users (mirrors Firestore `users/{uid}`) ----------
create table if not exists public.gl_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  data        jsonb not null default '{}'::jsonb,   -- displayName, favorites, mainListId, sharedListId, lastActive, createdAt
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists gl_users_email_idx on public.gl_users (lower(email));

-- ---------- lists (mirrors `groceryLists/{listId}`) ----------
create table if not exists public.gl_lists (
  id          text primary key,                      -- short code e.g. "A1B2C3"
  owner_id    uuid references auth.users(id) on delete set null,
  members     uuid[] not null default '{}',
  data        jsonb not null default '{"items":[],"history":[]}'::jsonb,  -- items, history, stores, ...
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists gl_lists_members_idx on public.gl_lists using gin (members);

-- ---------- family activities (mirrors `familyActivities`) ----------
create table if not exists public.gl_family_activities (
  id          uuid primary key default gen_random_uuid(),
  list_id     text not null references public.gl_lists(id) on delete cascade,
  user_id     uuid,
  data        jsonb not null,                        -- userName, type, itemName, timestamp
  created_at  timestamptz not null default now()
);
create index if not exists gl_family_activities_list_idx on public.gl_family_activities (list_id, created_at desc);

-- ---------- shopping trips + purchases (mirrors `groceryLists/{id}/trips|purchases`) ----------
create table if not exists public.gl_trips (
  id          uuid primary key default gen_random_uuid(),
  list_id     text not null references public.gl_lists(id) on delete cascade,
  data        jsonb not null,
  created_at  timestamptz not null default now()
);
create table if not exists public.gl_purchases (
  id          uuid primary key default gen_random_uuid(),
  list_id     text not null references public.gl_lists(id) on delete cascade,
  trip_id     uuid references public.gl_trips(id) on delete cascade,
  data        jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists gl_purchases_list_idx on public.gl_purchases (list_id, created_at desc);

-- ---------- comparison baskets (mirrors `baskets/{listId}_{basketId}`) ----------
create table if not exists public.gl_baskets (
  id          text primary key,                      -- `${listId}_${basketId}`
  list_id     text not null references public.gl_lists(id) on delete cascade,
  data        jsonb not null,
  deleted     boolean not null default false,
  updated_at  timestamptz not null default now()
);

-- ---------- smart suggestions cache (mirrors `suggestions/{listId}_{lang}`) ----------
create table if not exists public.gl_suggestions (
  list_id     text not null references public.gl_lists(id) on delete cascade,
  language    text not null,
  items       jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (list_id, language)
);

-- ---------- updated_at trigger ----------
create or replace function public.gl_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists gl_users_touch on public.gl_users;
create trigger gl_users_touch before update on public.gl_users for each row execute function public.gl_touch_updated_at();
drop trigger if exists gl_lists_touch on public.gl_lists;
create trigger gl_lists_touch before update on public.gl_lists for each row execute function public.gl_touch_updated_at();
drop trigger if exists gl_baskets_touch on public.gl_baskets;
create trigger gl_baskets_touch before update on public.gl_baskets for each row execute function public.gl_touch_updated_at();
drop trigger if exists gl_suggestions_touch on public.gl_suggestions;
create trigger gl_suggestions_touch before update on public.gl_suggestions for each row execute function public.gl_touch_updated_at();

-- ---------- auto-create gl_users row on sign-up ----------
create or replace function public.gl_handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.gl_users (id, email, data)
  values (new.id, coalesce(new.email, ''), jsonb_build_object(
    'displayName', '', 'favorites', '[]'::jsonb,
    'createdAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'lastActive', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists gl_on_auth_user_created on auth.users;
create trigger gl_on_auth_user_created
  after insert on auth.users for each row execute function public.gl_handle_new_user();

-- ---------- helpers ----------
create or replace function public.gl_is_member(p_list_id text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.gl_lists l
    where l.id = p_list_id
      and (l.owner_id = auth.uid() or auth.uid() = any(l.members))
  );
$$;

-- Look up another user by email (for "add family member") without exposing the users table.
create or replace function public.gl_find_user_by_email(p_email text)
returns table (id uuid, email text)
language sql stable security definer set search_path = public as $$
  select u.id, u.email from public.gl_users u
  where lower(u.email) = lower(trim(p_email)) and auth.uid() is not null
  limit 1;
$$;

-- Owner adds a member: updates list.members and member's sharedListId atomically.
create or replace function public.gl_add_family_member(p_list_id text, p_member_email text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_member_id uuid;
begin
  if not exists (select 1 from public.gl_lists where id = p_list_id and owner_id = auth.uid()) then
    raise exception 'PERMISSION_DENIED: Only the list owner can add family members';
  end if;
  select u.id into v_member_id from public.gl_users u where lower(u.email) = lower(trim(p_member_email));
  if v_member_id is null then
    return false;
  end if;
  update public.gl_lists
     set members = (select array_agg(distinct m) from unnest(array_append(members, v_member_id)) m)
   where id = p_list_id;
  update public.gl_users
     set data = data || jsonb_build_object('sharedListId', p_list_id)
   where id = v_member_id;
  return true;
end $$;

-- Member profiles for a list (id, email, displayName, lastActive) — readable by any member.
create or replace function public.gl_list_members(p_list_id text)
returns table (id uuid, email text, display_name text, last_active text, is_owner boolean)
language sql stable security definer set search_path = public as $$
  select u.id, u.email,
         coalesce(u.data->>'displayName', ''),
         coalesce(u.data->>'lastActive', ''),
         (l.owner_id = u.id)
  from public.gl_lists l
  join public.gl_users u on u.id = l.owner_id or u.id = any(l.members)
  where l.id = p_list_id and public.gl_is_member(p_list_id);
$$;

-- ---------- RLS ----------
alter table public.gl_users             enable row level security;
alter table public.gl_lists             enable row level security;
alter table public.gl_family_activities enable row level security;
alter table public.gl_trips             enable row level security;
alter table public.gl_purchases         enable row level security;
alter table public.gl_baskets           enable row level security;
alter table public.gl_suggestions       enable row level security;

drop policy if exists gl_users_self on public.gl_users;
create policy gl_users_self on public.gl_users
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists gl_lists_member_select on public.gl_lists;
create policy gl_lists_member_select on public.gl_lists
  for select to authenticated using (owner_id = auth.uid() or auth.uid() = any(members));
drop policy if exists gl_lists_owner_insert on public.gl_lists;
create policy gl_lists_owner_insert on public.gl_lists
  for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists gl_lists_member_update on public.gl_lists;
create policy gl_lists_member_update on public.gl_lists
  for update to authenticated using (owner_id = auth.uid() or auth.uid() = any(members));
drop policy if exists gl_lists_owner_delete on public.gl_lists;
create policy gl_lists_owner_delete on public.gl_lists
  for delete to authenticated using (owner_id = auth.uid());

-- child tables: any list member can read/write
drop policy if exists gl_activities_member on public.gl_family_activities;
create policy gl_activities_member on public.gl_family_activities
  for all to authenticated using (public.gl_is_member(list_id)) with check (public.gl_is_member(list_id));
drop policy if exists gl_trips_member on public.gl_trips;
create policy gl_trips_member on public.gl_trips
  for all to authenticated using (public.gl_is_member(list_id)) with check (public.gl_is_member(list_id));
drop policy if exists gl_purchases_member on public.gl_purchases;
create policy gl_purchases_member on public.gl_purchases
  for all to authenticated using (public.gl_is_member(list_id)) with check (public.gl_is_member(list_id));
drop policy if exists gl_baskets_member on public.gl_baskets;
create policy gl_baskets_member on public.gl_baskets
  for all to authenticated using (public.gl_is_member(list_id)) with check (public.gl_is_member(list_id));
drop policy if exists gl_suggestions_member on public.gl_suggestions;
create policy gl_suggestions_member on public.gl_suggestions
  for all to authenticated using (public.gl_is_member(list_id)) with check (public.gl_is_member(list_id));

-- ---------- Realtime ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'gl_lists'
  ) then
    alter publication supabase_realtime add table public.gl_lists;
  end if;
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'gl_suggestions'
  ) then
    alter publication supabase_realtime add table public.gl_suggestions;
  end if;
end $$;
alter table public.gl_lists replica identity full;
