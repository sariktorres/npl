-- Add independent, switchable tournament seasons.
-- Run once in Supabase SQL Editor after supabase_migration.sql.

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  tournament_name text,
  tagline text,
  logo_url text,
  accent_color text,
  start_date date,
  end_date date,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.seasons (name, tournament_name, tagline, logo_url, accent_color)
select coalesce(nullif(btrim(s.season), ''), '2025'), s.tournament_name, s.tagline, s.logo_url, s.accent_color
from public.site_settings s
where s.id = 1
on conflict (name) do nothing;

insert into public.seasons (name, tournament_name, tagline, accent_color)
select '2025', 'Nepal Premier League', 'Where Legends Are Forged', '#39FF14'
where not exists (select 1 from public.seasons);

do $$
begin
  if not exists (select 1 from public.seasons where is_active) then
    update public.seasons
    set is_active = true
    where id = (select id from public.seasons order by created_at, name limit 1);
  end if;
end $$;

alter table public.teams add column if not exists season_id uuid references public.seasons(id) on delete cascade;
alter table public.players add column if not exists season_id uuid references public.seasons(id) on delete cascade;
alter table public.matches add column if not exists season_id uuid references public.seasons(id) on delete cascade;
alter table public.sections add column if not exists season_id uuid references public.seasons(id) on delete cascade;
alter table public.sponsors add column if not exists season_id uuid references public.seasons(id) on delete cascade;
alter table public.gallery add column if not exists season_id uuid references public.seasons(id) on delete cascade;
alter table public.news add column if not exists season_id uuid references public.seasons(id) on delete cascade;
alter table public.registrations add column if not exists season_id uuid references public.seasons(id) on delete cascade;
alter table public.bids add column if not exists season_id uuid references public.seasons(id) on delete cascade;
alter table public.auction_state add column if not exists season_id uuid references public.seasons(id) on delete cascade;

do $$
declare
  table_name text;
  active_season uuid;
begin
  select id into active_season from public.seasons where is_active order by created_at limit 1;
  foreach table_name in array array['teams','players','matches','sections','sponsors','gallery','news','registrations','bids','auction_state'] loop
    execute format('update public.%I set season_id = $1 where season_id is null', table_name) using active_season;
    execute format('alter table public.%I alter column season_id set not null', table_name);
  end loop;
end $$;

alter table public.auction_state drop constraint if exists single_auction_row;
alter table public.auction_state drop constraint if exists auction_state_pkey;
alter table public.auction_state add constraint auction_state_pkey primary key (season_id, id);

create index if not exists teams_season_id_idx on public.teams(season_id);
create index if not exists players_season_id_idx on public.players(season_id);
create index if not exists matches_season_start_idx on public.matches(season_id, start_time);
create index if not exists sections_season_order_idx on public.sections(season_id, order_index);
create index if not exists sponsors_season_order_idx on public.sponsors(season_id, order_index);
create index if not exists gallery_season_order_idx on public.gallery(season_id, order_index);
create index if not exists news_season_created_idx on public.news(season_id, created_at desc);
create index if not exists registrations_season_created_idx on public.registrations(season_id, created_at desc);
create index if not exists bids_season_player_idx on public.bids(season_id, player_id);
create unique index if not exists seasons_single_active_idx on public.seasons(is_active) where is_active;

alter table public.seasons enable row level security;
drop policy if exists "public_read_seasons" on public.seasons;
create policy "public_read_seasons" on public.seasons for select using (true);
grant select on public.seasons to anon, authenticated;
grant all privileges on public.seasons to service_role;

create or replace function public.activate_season(target_season_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.seasons where id = target_season_id) then
    raise exception 'Season not found';
  end if;
  update public.seasons set is_active = false where is_active;
  update public.seasons set is_active = true where id = target_season_id;
end;
$$;

grant execute on function public.activate_season(uuid) to service_role;
