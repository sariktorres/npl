-- Add player-specific roster category.
-- Run once in Supabase SQL Editor after the seasons migration.

alter table public.players add column if not exists category text;
alter table public.players add column if not exists retain_next_season boolean not null default true;
alter table public.players add column if not exists next_team_id uuid references public.teams(id) on delete set null;
alter table public.players add column if not exists review_status text not null default 'approved';
alter table public.players add column if not exists review_source_team text;
alter table public.players add column if not exists review_action text;
alter table public.players add column if not exists is_overseas boolean not null default false;

create index if not exists players_review_queue_idx on public.players(season_id, review_status);

notify pgrst, 'reload schema';
