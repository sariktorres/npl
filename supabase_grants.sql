-- ============================================================
--  GRANTS  —  run this once in Supabase SQL Editor
--  Gives PostgREST roles access to the tables (RLS still applies).
-- ============================================================
grant usage on schema public to anon, authenticated, service_role;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

grant select on all tables in schema public to anon, authenticated;
grant insert on public.registrations to anon, authenticated;
grant insert on public.bids to anon, authenticated;

-- make future tables work automatically too
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant select on tables to anon, authenticated;
