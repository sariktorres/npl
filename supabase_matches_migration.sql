-- Add schedule labels for imported tournament fixtures.
-- Run once in Supabase SQL Editor after the seasons migration.

alter table public.matches add column if not exists match_day text;
alter table public.matches add column if not exists stage text;
alter table public.matches add column if not exists winner_team uuid references public.teams(id) on delete set null;

notify pgrst, 'reload schema';
