-- ============================================================
--  CRICKET TOURNAMENT CMS  —  SUPABASE SCHEMA + RLS + REALTIME
--  Paste this whole file into Supabase Dashboard -> SQL Editor -> RUN
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- PROFILES (auth roles) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text default 'viewer',
  created_at timestamptz default now()
);

-- ---------- SITE SETTINGS (singleton row id=1) ----------
create table if not exists public.site_settings (
  id int primary key default 1,
  tournament_name text default 'Nepal Premier League',
  tagline text default 'Where Legends Are Forged',
  logo_url text,
  accent_color text default '#39FF14',
  primary_color text default '#060a16',
  season text default '2025',
  start_date timestamptz,
  end_date timestamptz,
  nav jsonb default '[]',
  footer jsonb default '{}',
  seo jsonb default '{}',
  social jsonb default '{}',
  updated_at timestamptz default now(),
  constraint single_settings_row check (id = 1)
);

-- ---------- SECTIONS (homepage builder) ----------
create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text,
  subtitle text,
  content jsonb default '{}',
  order_index int default 0,
  visible boolean default true,
  published boolean default true,
  animation text default 'fade',
  created_at timestamptz default now()
);

-- ---------- PAGES (custom block pages) ----------
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text,
  blocks jsonb default '[]',
  seo jsonb default '{}',
  published boolean default false,
  created_at timestamptz default now()
);

-- ---------- TEAMS ----------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,
  logo_url text,
  color text default '#39FF14',
  home_city text,
  captain text,
  coach text,
  played int default 0,
  won int default 0,
  lost int default 0,
  tied int default 0,
  no_result int default 0,
  points int default 0,
  nrr numeric default 0,
  purse numeric default 1000,
  order_index int default 0,
  created_at timestamptz default now()
);

-- ---------- PLAYERS ----------
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete set null,
  name text not null,
  role text,
  batting_style text,
  bowling_style text,
  photo_url text,
  country text,
  jersey_number int,
  stats jsonb default '{}',
  base_price numeric default 20,
  sold_price numeric,
  sold_status text default 'available',
  is_marquee boolean default false,
  order_index int default 0,
  created_at timestamptz default now()
);

-- ---------- MATCHES ----------
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  team_a uuid references public.teams(id) on delete set null,
  team_b uuid references public.teams(id) on delete set null,
  venue text,
  start_time timestamptz,
  status text default 'upcoming',
  overs int default 20,
  toss_winner uuid,
  toss_decision text,
  team_a_runs int default 0,
  team_a_wickets int default 0,
  team_a_overs numeric default 0,
  team_b_runs int default 0,
  team_b_wickets int default 0,
  team_b_overs numeric default 0,
  current_innings int default 1,
  result text,
  win_probability int default 50,
  commentary jsonb default '[]',
  match_no int,
  created_at timestamptz default now()
);

-- ---------- SCORECARDS ----------
create table if not exists public.scorecards (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade,
  innings int default 1,
  batting jsonb default '[]',
  bowling jsonb default '[]',
  partnerships jsonb default '[]',
  created_at timestamptz default now()
);

-- ---------- AUCTION STATE (singleton row id=1) ----------
create table if not exists public.auction_state (
  id int primary key default 1,
  status text default 'idle',
  current_player_id uuid references public.players(id) on delete set null,
  current_bid numeric default 0,
  current_bid_team uuid references public.teams(id) on delete set null,
  increment numeric default 10,
  timer_ends_at timestamptz,
  updated_at timestamptz default now(),
  constraint single_auction_row check (id = 1)
);

-- ---------- BIDS ----------
create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  amount numeric not null,
  created_at timestamptz default now()
);

-- ---------- REGISTRATIONS ----------
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  age int,
  role text,
  batting_style text,
  bowling_style text,
  city text,
  experience text,
  status text default 'pending',
  created_at timestamptz default now()
);

-- ---------- SPONSORS ----------
create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  tier text default 'partner',
  link text,
  order_index int default 0,
  created_at timestamptz default now()
);

-- ---------- GALLERY ----------
create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text,
  category text,
  order_index int default 0,
  created_at timestamptz default now()
);

-- ---------- NEWS ----------
create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text,
  excerpt text,
  body text,
  cover_url text,
  author text default 'NPL Media',
  published boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
--  ROW LEVEL SECURITY
--  Public (anon) can READ everything. Public can INSERT
--  registrations + bids. All other writes go through the
--  Next.js server using the service_role key (bypasses RLS).
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','site_settings','sections','pages','teams','players',
    'matches','scorecards','auction_state','bids','registrations',
    'sponsors','gallery','news'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "public_read_%s" on public.%I;', t, t);
    execute format('create policy "public_read_%s" on public.%I for select using (true);', t, t);
  end loop;

  -- public can submit registrations
  execute 'drop policy if exists "public_insert_registrations" on public.registrations;';
  execute 'create policy "public_insert_registrations" on public.registrations for insert with check (true);';

  -- public can place bids (live auction interactivity)
  execute 'drop policy if exists "public_insert_bids" on public.bids;';
  execute 'create policy "public_insert_bids" on public.bids for insert with check (true);';
end $$;

-- ============================================================
--  REALTIME  — stream live scores + auction to the browser
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['matches','bids','auction_state','players','scorecards'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I;', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- DONE ✅  — return to the app and I'll seed demo data automatically.
