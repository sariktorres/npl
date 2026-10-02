-- Rename the existing tournament branding without changing season data.
-- Safe to run more than once in Supabase SQL Editor.

update public.site_settings
set tournament_name = 'Nepal Premier League',
    seo = case
      when seo->>'title' = 'Apex Premier League' then jsonb_set(seo, '{title}', '"Nepal Premier League"'::jsonb)
      else seo
    end,
    updated_at = now()
where tournament_name = 'Apex Premier League'
   or seo->>'title' = 'Apex Premier League';

update public.seasons
set tournament_name = 'Nepal Premier League'
where tournament_name = 'Apex Premier League';

update public.sections
set title = 'NEPAL PREMIER LEAGUE'
where upper(title) = 'APEX PREMIER LEAGUE';

update public.sections
set subtitle = replace(subtitle, 'Apex Premier League', 'Nepal Premier League')
where subtitle like '%Apex Premier League%';

update public.news
set author = 'NPL Media'
where author = 'APL Media';
