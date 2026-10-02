-- Add player-specific roster category.
-- Run once in Supabase SQL Editor after the seasons migration.

alter table public.players add column if not exists category text;
alter table public.players add column if not exists retain_next_season boolean not null default true;
alter table public.players add column if not exists next_team_id uuid references public.teams(id) on delete set null;

notify pgrst, 'reload schema';
