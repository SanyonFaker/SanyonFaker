-- ===========================================================================
--  LUMEN - Supabase schema
-- ===========================================================================
--  Run this once, in Supabase Dashboard -> SQL Editor -> New query.
--  It is idempotent: re-running it is always safe, and it will repair a
--  database that was created by an older or partially-applied version.
--
--  THIS FILE IS DELIBERATELY 100% ASCII.
--  Every CJK string is written as a Unicode escape such as U&'\98CE\666F'.
--  That is not stylistic: a SQL file containing raw multi-byte characters can
--  be silently re-encoded on its way through an editor or a clipboard, and a
--  mangled byte in a comment can swallow the line that follows it. Keeping the
--  file ASCII removes that entire class of failure.
--
--  Contents
--    1. Tables          collections, photos, admins
--    2. Column repair   converge a table created by an older version
--    3. Authorisation   is_admin() + updated_at trigger
--    4. Row Level Security   public may read, only admins may write
--    5. Storage         public `photos` bucket with admin-only writes
--    6. Seed data       the five starter collections
--    7. Final step      registering your own administrator account
-- ===========================================================================

create extension if not exists "pgcrypto";


-- ===========================================================================
--  1. Tables
-- ===========================================================================

-- Curated groupings of photographs, e.g. Landscapes or Events.
-- `slug` is the primary key because it is also the public URL segment.
create table if not exists public.collections (
  slug        text primary key,
  title       text not null,
  title_zh    text,
  description text,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One row per photograph.
--   storage_path  what the public site serves (a web-sized derivative)
--   original_path the untouched upload, kept for archival
create table if not exists public.photos (
  id              uuid primary key default gen_random_uuid(),
  storage_path    text not null,
  original_path   text,
  file_name       text,
  width           integer,
  height          integer,
  blur_data_url   text,
  dominant_color  text,
  title           text,
  caption         text,
  location        text,
  collection_slug text references public.collections (slug) on delete set null,
  tags            text[] not null default '{}',
  exif            jsonb  not null default '{}'::jsonb,
  featured        boolean not null default false,
  sort_order      integer not null default 0,
  taken_at        timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- The administrator allow-list. Row Level Security is enabled with no public
-- policy, so this table is unreadable from the client libraries.
create table if not exists public.admins (
  email      text primary key,
  created_at timestamptz not null default now()
);


-- ===========================================================================
--  2. Column repair
-- ===========================================================================
--  `create table if not exists` silently skips a table that already exists, so
--  a table created by an older or partially-applied version of this file keeps
--  its old shape and the application starts failing on a missing column.
--  These statements converge it. `add column if not exists` is a no-op when the
--  column is already present, so this block is safe on every run.

alter table public.photos add column if not exists original_path   text;
alter table public.photos add column if not exists file_name       text;
alter table public.photos add column if not exists width           integer;
alter table public.photos add column if not exists height          integer;
alter table public.photos add column if not exists blur_data_url   text;
alter table public.photos add column if not exists dominant_color  text;
alter table public.photos add column if not exists title           text;
alter table public.photos add column if not exists caption         text;
alter table public.photos add column if not exists location        text;
alter table public.photos add column if not exists collection_slug text;
alter table public.photos add column if not exists tags            text[] not null default '{}';
alter table public.photos add column if not exists exif            jsonb  not null default '{}'::jsonb;
alter table public.photos add column if not exists featured        boolean not null default false;
alter table public.photos add column if not exists sort_order      integer not null default 0;
alter table public.photos add column if not exists taken_at        timestamptz;

alter table public.collections add column if not exists title_zh    text;
alter table public.collections add column if not exists description text;
alter table public.collections add column if not exists sort_order  integer not null default 0;

create index if not exists photos_collection_idx on public.photos (collection_slug);
create index if not exists photos_sort_idx       on public.photos (sort_order, created_at desc);
create index if not exists photos_taken_at_idx   on public.photos (taken_at desc nulls last);
create index if not exists photos_featured_idx   on public.photos (featured) where featured;
create index if not exists photos_tags_idx       on public.photos using gin (tags);


-- ===========================================================================
--  3. Authorisation helpers
-- ===========================================================================

-- True when the caller's verified JWT e-mail is on the allow-list.
--
-- `security definer` lets the function read public.admins regardless of the
-- caller's own policies; `set search_path` prevents search-path injection.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists photos_touch_updated_at on public.photos;
create trigger photos_touch_updated_at
  before update on public.photos
  for each row execute function public.touch_updated_at();

drop trigger if exists collections_touch_updated_at on public.collections;
create trigger collections_touch_updated_at
  before update on public.collections
  for each row execute function public.touch_updated_at();


-- ===========================================================================
--  4. Row Level Security
-- ===========================================================================

alter table public.photos      enable row level security;
alter table public.collections enable row level security;
alter table public.admins      enable row level security;

-- ------------------------------- public read -------------------------------
-- Visitors, signed in or not, may read the catalogue.

drop policy if exists "photos are publicly readable" on public.photos;
create policy "photos are publicly readable"
  on public.photos for select
  using (true);

drop policy if exists "collections are publicly readable" on public.collections;
create policy "collections are publicly readable"
  on public.collections for select
  using (true);

-- ------------------------------- admin write -------------------------------
-- Only allow-listed accounts may mutate. This is enforced by the database, not
-- by the UI: the same policies protect the REST API from any client.

drop policy if exists "admins manage photos" on public.photos;
create policy "admins manage photos"
  on public.photos for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins manage collections" on public.collections;
create policy "admins manage collections"
  on public.collections for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- The allow-list itself is readable only by existing administrators. There is no
-- insert/update/delete policy at all, so the list can only be edited from the
-- SQL Editor or with the service-role key.
drop policy if exists "admins read the allow-list" on public.admins;
create policy "admins read the allow-list"
  on public.admins for select
  to authenticated
  using (public.is_admin());


-- ===========================================================================
--  5. Storage
-- ===========================================================================
--  A single public-read bucket holds both the served derivative and the
--  archival original. Reads are unrestricted (they are public photographs);
--  writes require an allow-listed account.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  true,
  52428800, -- 50 MB
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/tiff',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos bucket is publicly readable" on storage.objects;
create policy "photos bucket is publicly readable"
  on storage.objects for select
  using (bucket_id = 'photos');

drop policy if exists "admins upload to the photos bucket" on storage.objects;
create policy "admins upload to the photos bucket"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'photos' and public.is_admin());

drop policy if exists "admins update the photos bucket" on storage.objects;
create policy "admins update the photos bucket"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'photos' and public.is_admin());

drop policy if exists "admins delete from the photos bucket" on storage.objects;
create policy "admins delete from the photos bucket"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'photos' and public.is_admin());


-- ===========================================================================
--  6. Seed the starter collections
-- ===========================================================================
--  Titles are Unicode escapes so this file stays pure ASCII:
--    U&'\98CE\666F'            = Landscapes
--    U&'\6D3B\52A8\7EAA\5B9E'  = Events
--    U&'\4EBA\50CF'            = Portraits
--    U&'\8857\5934'            = Street
--    U&'\5EFA\7B51'            = Architecture

insert into public.collections (slug, title, title_zh, description, sort_order) values
  ('landscapes',   'Landscapes',   U&'\98CE\666F',
   'Long exposures and long walks. Work made in places that take days to reach and minutes to photograph.', 1),
  ('events',       'Events',       U&'\6D3B\52A8\7EAA\5B9E',
   'Documentary coverage of ceremonies, performances and the unrepeatable seconds in between.', 2),
  ('portrait',     'Portraits',    U&'\4EBA\50CF',
   'Available light, patient subjects, and the search for a single honest expression.', 3),
  ('street',       'Street',       U&'\8857\5934',
   'The city as it is, without arrangement. Mostly after rain, mostly at dusk.', 4),
  ('architecture', 'Architecture', U&'\5EFA\7B51',
   'Structure, repetition and the geometry that concrete takes on when light rakes it.', 5)
on conflict (slug) do update
  set title_zh    = excluded.title_zh,
      title       = excluded.title,
      description = excluded.description;


-- ===========================================================================
--  7. Final step - register your administrator
-- ===========================================================================
--  Two lists have to agree, and both are intentional:
--
--  a) Authentication -> Users -> "Add user" -> create your account
--     (tick "Auto Confirm User" so no confirmation e-mail is needed).
--
--  b) Uncomment the line below, put your address in it, and run it. This is the
--     list the Row Level Security policies check.
--
--  c) Set the same address in ADMIN_EMAILS in .env.local and on Vercel. This is
--     the list the application checks.
--
--  Requiring both means a mistake in either one fails closed.
--
--  insert into public.admins (email) values ('you@example.com')
--    on conflict (email) do nothing;
--
-- ===========================================================================
