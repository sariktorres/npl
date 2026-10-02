'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, MapPin, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SiteFooter, SiteNav } from '@/components/site/chrome';
import { LiveDot, TeamBadge } from '@/components/site/primitives';
import { IMAGES, fmtDate, fmtTime, hexToHsl } from '@/lib/cms';

export default function MatchesClient({ initial }) {
  const [view, setView] = useState('fixtures');
  const [teamFilter, setTeamFilter] = useState('all');
  const teams = initial.teams || [];
  const matches = initial.matches || [];
  const teamById = (id) => teams.find((team) => team.id === id);
  const completed = view === 'results';
  const visibleMatches = matches
    .filter((match) => completed ? match.status === 'completed' : match.status === 'upcoming' || match.status === 'live')
    .filter((match) => teamFilter === 'all' || match.team_a === teamFilter || match.team_b === teamFilter)
    .sort((a, b) => completed ? new Date(b.start_time) - new Date(a.start_time) : new Date(a.start_time) - new Date(b.start_time));

  return (
    <div className="home-page" style={{ '--season-primary': hexToHsl(initial.settings?.accent_color) }}>
      <SiteNav settings={initial.settings} />
      <main>
        <section className="relative flex min-h-[330px] items-end overflow-hidden bg-[#17202a] md:min-h-[390px]">
          <img src={IMAGES.stadium[0]} alt="Cricket stadium under lights" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/25" />
          <div className="container relative z-10 py-14 md:py-16">
            <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-white/75 hover:text-white"><ArrowLeft className="h-4 w-4" /> Home</Link>
            <Badge className="mb-4 border-white/25 bg-white/10 text-white hover:bg-white/10 uppercase tracking-wider">{initial.season?.name || initial.settings?.season || 'Current season'}</Badge>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">The road to the trophy</p>
            <h1 className="mt-2 font-display text-5xl font-bold uppercase leading-none text-white sm:text-6xl md:text-7xl">Fixtures & Results</h1>
          </div>
        </section>

        <section className="container py-12 md:py-16">
          <div className="flex flex-col gap-5 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary"><span className="h-px w-7 bg-primary" /> Full schedule</p><h2 className="font-display text-3xl font-bold uppercase">{completed ? 'Results' : 'Upcoming fixtures'}</h2><p className="mt-1 text-sm text-muted-foreground">{visibleMatches.length} {completed ? 'completed matches' : 'scheduled matches'}</p></div>
            <div className="grid gap-3 sm:grid-cols-[auto_220px] sm:items-center">
              <div className="flex gap-1 rounded-md bg-muted p-1" role="tablist" aria-label="Match view">
                <button role="tab" aria-selected={!completed} onClick={() => setView('fixtures')} className={`rounded px-4 py-2 text-sm font-semibold ${!completed ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Fixtures</button>
                <button role="tab" aria-selected={completed} onClick={() => setView('results')} className={`rounded px-4 py-2 text-sm font-semibold ${completed ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Results</button>
              </div>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="glass border-border"><SelectValue placeholder="All teams" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All teams</SelectItem>{teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {visibleMatches.map((match, index) => {
              const teamA = teamById(match.team_a);
              const teamB = teamById(match.team_b);
              const hasScore = [match.team_a_runs, match.team_a_wickets, match.team_b_runs, match.team_b_wickets].some((value) => Number(value || 0) > 0);
              const winner = teamById(match.winner_team);
              const summary = match.result || (winner ? `${winner.name} won` : '');
              return <Card key={match.id} className="glass overflow-hidden"><div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(190px,0.7fr)_minmax(0,1fr)] sm:items-center sm:p-5">
                <div className="flex min-w-0 items-center gap-3"><TeamBadge team={teamA} size={42} /><div className="min-w-0"><div className="text-[10px] font-bold uppercase tracking-wider text-primary">{teamA?.short_name || 'Team 1'}</div><h3 className="truncate font-display text-lg uppercase">{teamA?.name || 'Team 1'}</h3></div></div>
                <div className="text-center"><div className="flex flex-wrap items-center justify-center gap-2">{match.status === 'live' ? <LiveDot /> : <Badge variant="outline" className="border-border uppercase">{completed ? 'Final' : `Match ${match.match_no || index + 1}`}</Badge>}{match.stage && <Badge className="bg-primary/10 text-primary">{match.stage}</Badge>}</div>{completed && hasScore && <p className="mt-2 font-num text-lg">{match.team_a_runs}/{match.team_a_wickets} <span className="text-muted-foreground">·</span> {match.team_b_runs}/{match.team_b_wickets}</p>}<p className="mt-2 text-xs text-muted-foreground"><CalendarDays className="mr-1 inline h-3.5 w-3.5" />{match.match_day ? `${match.match_day}, ` : ''}{fmtDate(match.start_time)} · {fmtTime(match.start_time)}</p>{summary && <p className="mt-1 text-xs font-medium text-primary">{summary}</p>}<p className="mt-1 truncate text-xs text-muted-foreground"><MapPin className="mr-1 inline h-3.5 w-3.5" />{match.venue || 'Venue to be announced'}</p></div>
                <div className="flex min-w-0 items-center justify-end gap-3 text-right"><div className="min-w-0"><div className="text-[10px] font-bold uppercase tracking-wider text-primary">{teamB?.short_name || 'Team 2'}</div><h3 className="truncate font-display text-lg uppercase">{teamB?.name || 'Team 2'}</h3></div><TeamBadge team={teamB} size={42} /></div>
              </div></Card>;
            })}
            {!visibleMatches.length && <Card className="glass p-10 text-center"><Trophy className="mx-auto mb-3 h-6 w-6 text-primary" /><p className="font-display text-lg uppercase">No matches found</p><p className="mt-1 text-sm text-muted-foreground">Try another team or switch between fixtures and results.</p></Card>}
          </div>
        </section>
      </main>
      <SiteFooter settings={initial.settings} />
    </div>
  );
}
