-- ===========================================================================
--  ENPEI - migration: editable site content
-- ===========================================================================
--  Run once in Supabase Dashboard -> SQL Editor -> New query.
--  Idempotent and pure ASCII, so re-running it is always safe.
--
--  Adds a single-row settings table that the studio can edit:
--    hero_photo_id       the homepage hero image
--    statement_photo_id  the image beside the About / Statement text
--    equipment           the equipment list on the About page
--
--  Both photo columns are nullable with ON DELETE SET NULL, so deleting a
--  photograph can never leave the settings pointing at a missing row.
-- ===========================================================================

create table if not exists public.site_settings (
  id                 integer primary key default 1,
  hero_photo_id      uuid references public.photos (id) on delete set null,
  statement_photo_id uuid references public.photos (id) on delete set null,
  equipment          text[] not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

-- Column repair, in case an earlier attempt created a partial table.
alter table public.site_settings add column if not exists hero_photo_id      uuid;
alter table public.site_settings add column if not exists statement_photo_id uuid;
alter table public.site_settings add column if not exists equipment          text[] not null default '{}';

-- The singleton row. The primary key plus the check constraint above make a
-- second row impossible, so this insert is all the seeding the table needs.
insert into public.site_settings (id) values (1)
  on conflict (id) do nothing;

alter table public.site_settings enable row level security;

-- ------------------------------- public read -------------------------------
-- The About page and the homepage hero are public surfaces.

drop policy if exists "site settings are publicly readable" on public.site_settings;
create policy "site settings are publicly readable"
  on public.site_settings for select
  using (true);

-- ------------------------------- admin write -------------------------------
drop policy if exists "admins manage site settings" on public.site_settings;
create policy "admins manage site settings"
  on public.site_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists site_settings_touch_updated_at on public.site_settings;
create trigger site_settings_touch_updated_at
  before update on public.site_settings
  for each row execute function public.touch_updated_at();


-- ===========================================================================
--  VERIFY - expect one row
-- ===========================================================================
select
  id,
  hero_photo_id,
  statement_photo_id,
  coalesce(array_length(equipment, 1), 0) as equipment_items
from public.site_settings;
