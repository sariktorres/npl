-- Add team profile details and international-player markers.
-- Run once in Supabase SQL Editor after the seasons migration.

alter table public.teams add column if not exists owner text;
alter table public.teams add column if not exists location text;
alter table public.teams add column if not exists city text;
alter table public.teams add column if not exists state text;
alter table public.teams add column if not exists description text;
alter table public.teams add column if not exists stadium text;
alter table public.players add column if not exists is_national boolean not null default false;

update public.teams
set city = coalesce(city, home_city),
    location = coalesce(location, home_city)
where city is null or location is null;
