'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BadgeCheck, CalendarDays, MapPin, Shield, Trophy, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SiteFooter, SiteNav } from '@/components/site/chrome';
import { TeamBadge } from '@/components/site/primitives';
import { IMAGES, fmtDate, fmtTime, hexToHsl } from '@/lib/cms';
import { deriveTeamStats, teamLeaders } from '@/lib/teamStats';

export default function TeamDetailClient({ initial }) {
  const [view, setView] = useState('squad');
  const team = initial.team;
  const stats = deriveTeamStats(initial.teams, initial.matches).find((item) => item.id === team.id) || team;
  const { squad, topScorer, topWicketTaker } = teamLeaders(initial.players, team.id);
  const teamMatches = initial.matches.filter((match) => match.team_a === team.id || match.team_b === team.id).sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
  const completed = teamMatches.filter((match) => match.status === 'completed');
  const nextMatch = teamMatches.filter((match) => match.status === 'upcoming').sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0];
  const seasonColor = hexToHsl(initial.settings?.accent_color);
  const form = completed.slice(0, 5).reverse();

  return (
    <div className="home-page team-detail" style={{ '--season-primary': seasonColor, '--team-color': team.color || '#df503f' }}>
      <SiteNav settings={initial.settings} />
      <main>
        <section className="team-detail__hero">
          <img src={IMAGES.stadium[1]} alt="Cricket stadium during a night match" className="team-detail__hero-image" />
          <div className="team-detail__hero-shade" />
          <div className="container relative z-10 py-24 md:py-32">
            <Link href="/teams" className="mb-8 inline-flex items-center gap-2 text-sm text-white/75 transition-colors hover:text-white"><ArrowLeft className="h-4 w-4" /> All teams</Link>
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
              <div className="flex items-end gap-5 md:gap-7">
                <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-white p-2 shadow-2xl md:h-32 md:w-32">
                  {team.logo_url ? <img src={team.logo_url} alt={`${team.name} logo`} className="h-full w-full object-contain" /> : <TeamBadge team={team} size={104} />}
                </div>
                <div className="min-w-0 pb-1">
                  <Badge className="mb-3 border-white/25 bg-white/10 text-white hover:bg-white/10 uppercase tracking-[0.16em]">{initial.season?.name || initial.settings?.season || 'Current season'} · {team.short_name}</Badge>
                  <h1 className="max-w-4xl font-display text-5xl font-bold uppercase leading-[0.9] text-white sm:text-6xl md:text-8xl">{team.name}</h1>
                  <p className="mt-3 flex items-center gap-2 text-sm text-white/75 md:text-base"><MapPin className="h-4 w-4" />{[team.city || team.home_city, team.state].filter(Boolean).join(', ') || team.location || 'Location not set'}{team.stadium ? ` · ${team.stadium}` : ''}</p>
                </div>
              </div>
              {nextMatch && <div className="team-detail__next-match"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-primary"><CalendarDays className="h-4 w-4" /> Next fixture</div><div className="mt-2 font-display text-2xl uppercase">{team.short_name} <span className="text-muted-foreground">vs</span> {initial.teams.find((other) => other.id === (nextMatch.team_a === team.id ? nextMatch.team_b : nextMatch.team_a))?.short_name}</div><div className="mt-1 text-sm text-muted-foreground">{fmtDate(nextMatch.start_time)} · {fmtTime(nextMatch.start_time)} · {nextMatch.venue}</div></div>}
            </motion.div>
          </div>
        </section>

        <section className="container -mt-6 relative z-20">
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 shadow-lg md:grid-cols-5 md:gap-4 md:p-5">
            {[['Played', stats.played], ['Won', stats.won], ['Lost', stats.lost], ['Drawn', stats.tied], ['No result', stats.no_result], ['Points', stats.points]].map(([label, value], index) => <div key={label} className="px-2 py-2 text-center md:border-r md:border-border last:md:border-0"><div className={`font-num text-4xl leading-none ${index === 5 ? 'text-primary' : ''}`}>{value || 0}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</div></div>)}
          </div>
        </section>

        <section className="container py-12 md:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
                <div><p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary"><span className="h-px w-7 bg-primary" /> The roster</p><h2 className="font-display text-4xl font-bold uppercase">Meet the squad</h2></div>
                <div className="flex gap-1 rounded-md bg-muted p-1" role="tablist" aria-label="Team information">
                  <button role="tab" aria-selected={view === 'squad'} onClick={() => setView('squad')} className={`rounded px-3 py-2 text-sm font-semibold ${view === 'squad' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Squad</button>
                  <button role="tab" aria-selected={view === 'matches'} onClick={() => setView('matches')} className={`rounded px-3 py-2 text-sm font-semibold ${view === 'matches' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>Matches</button>
                </div>
              </div>

              {view === 'squad' ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {squad.map((player, index) => <motion.div key={player.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(index % 3, 2) * 0.06 }}><Link href={`/players/${player.id}`} aria-label={`View ${player.name}'s player profile`} className="block h-full"><Card className="team-detail__player-card h-full overflow-hidden transition-transform hover:-translate-y-1"><div className="team-detail__player-image" style={{ background: `linear-gradient(135deg, color-mix(in srgb, var(--team-color) 22%, transparent), hsl(var(--muted)))` }}>{player.photo_url ? <img src={player.photo_url} alt={player.name} className="h-full w-full object-cover" /> : <TeamBadge team={team} size={68} />}{player.is_national && <Badge className="absolute right-3 top-3 bg-white text-primary"><BadgeCheck className="mr-1 h-3 w-3" />National</Badge>}</div><div className="p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate font-display text-xl uppercase">{player.name}</h3><p className="text-sm text-muted-foreground">{player.role || 'Player'} · {player.country || 'India'}</p></div><span className="font-num text-xl text-primary">#{player.jersey_number || '—'}</span></div><div className="mt-4 grid grid-cols-3 border-t border-border pt-3 text-center"><div><div className="font-num text-2xl">{player.stats?.runs || 0}</div><div className="text-[10px] uppercase text-muted-foreground">Runs</div></div><div><div className="font-num text-2xl">{player.stats?.wickets || 0}</div><div className="text-[10px] uppercase text-muted-foreground">Wickets</div></div><div><div className="font-num text-2xl">{player.stats?.strike_rate || 0}</div><div className="text-[10px] uppercase text-muted-foreground">Strike rate</div></div></div></div></Card></Link></motion.div>)}
                  {!squad.length && <Card className="glass p-8 text-center text-muted-foreground sm:col-span-2 xl:col-span-3">The squad will be announced soon.</Card>}
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {teamMatches.map((match) => {
                    const hasScore = [match.team_a_runs, match.team_a_wickets, match.team_b_runs, match.team_b_wickets].some((value) => Number(value || 0) > 0);
                    const winnerName = initial.teams.find((other) => other.id === match.winner_team)?.name;
                    const opponentTeam = initial.teams.find((other) => other.id === (match.team_a === team.id ? match.team_b : match.team_a)) || null;
                    const summary = match.status === 'completed' && !hasScore ? match.result || (winnerName ? `${winnerName} won` : 'Completed') : match.status === 'completed' ? `${match.team_a_runs}/${match.team_a_wickets} · ${match.team_b_runs}/${match.team_b_wickets}` : match.status;
                    return <Card key={match.id} className="team-detail__match-row p-4"><div className="team-detail__match-layout">
                      <div className="team-detail__match-team"><TeamBadge team={team} size={42} /><div className="min-w-0"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{team.short_name}</div><div className="truncate font-display text-base uppercase">{team.name}</div></div></div>
                      <div className="team-detail__match-center">{match.status === 'upcoming' ? <div><div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Kickoff in</div><MatchCountdown target={match.start_time} /></div> : match.status === 'live' ? <LiveDot /> : <div className="font-num text-lg">{hasScore ? summary : winnerName || summary}</div>}<div className="mt-1 text-[11px] text-muted-foreground">{fmtDate(match.start_time)} · {fmtTime(match.start_time)}</div>{(match.stage || match.venue) && <div className="mt-1 max-w-52 truncate text-[10px] uppercase tracking-wide text-muted-foreground">{[match.stage, match.venue].filter(Boolean).join(' · ')}</div>}{match.status === 'completed' && match.result && <div className="mt-1 max-w-56 text-[10px] text-muted-foreground">{match.result}</div>}</div>
                      <div className="team-detail__match-team team-detail__match-team--opponent"><div className="min-w-0 text-right"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{opponentTeam?.short_name || 'TBD'}</div><div className="truncate font-display text-base uppercase">{opponentTeam?.name || 'Opponent'}</div></div><TeamBadge team={opponentTeam} size={42} /></div>
                    </div></Card>;
                  })}
                  {!teamMatches.length && <Card className="glass p-8 text-center text-muted-foreground">Fixtures will appear here once the schedule is published.</Card>}
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <Card className="team-detail__side-card p-5"><div className="flex items-center gap-2 font-display text-lg uppercase"><Trophy className="h-4 w-4 text-primary" /> Season leaders</div><Leader title="Top scorer" player={topScorer} value={`${topScorer?.stats?.runs || 0} runs`} /><Leader title="Top wicket taker" player={topWicketTaker} value={`${topWicketTaker?.stats?.wickets || 0} wickets`} /></Card>
              <Card className="team-detail__side-card p-5"><div className="flex items-center gap-2 font-display text-lg uppercase"><Shield className="h-4 w-4 text-primary" /> The franchise</div><dl className="mt-4 space-y-3 text-sm"><DetailField label="Owner" value={team.owner} /><DetailField label="Captain" value={team.captain} /><DetailField label="Head coach" value={team.coach} /><DetailField label="Home ground" value={team.stadium} /><DetailField label="Location" value={[team.location, team.city || team.home_city, team.state].filter(Boolean).join(', ')} /></dl></Card>
              <Card className="team-detail__about p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">The story</p><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{team.description || `${team.name} are ready to make their mark this season. Follow every fixture, player and result right here.`}</p><div className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"><Users className="h-4 w-4" />{squad.length} players in the squad</div></Card>
            </aside>
          </div>
        </section>
        <section className="team-detail__closing"><div className="container flex flex-col items-start justify-between gap-5 py-12 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">The season is still unfolding</p><h2 className="mt-2 font-display text-3xl font-bold uppercase text-white md:text-4xl">Stay with {team.short_name}</h2></div><Link href="/teams"><Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">Explore all teams <ArrowRight className="ml-2 h-4 w-4" /></Button></Link></div></section>
      </main>
      <SiteFooter settings={initial.settings} />
    </div>
  );
}

function Leader({ title, player, value }) {
  return <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3"><div className="min-w-0"><div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</div><div className="mt-1 truncate font-semibold">{player?.name || '—'}</div></div><span className="shrink-0 font-num text-xl text-primary">{value}</span></div>;
}

function DetailField({ label, value }) {
  return <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{value || '—'}</dd></div>;
}

function MatchCountdown({ target }) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);
  if (now === null) return <span className="font-num text-lg text-primary">--d --h</span>;
  const remaining = new Date(target).getTime() - now;
  if (remaining <= 0) return <span className="font-display text-sm uppercase text-primary">Starting now</span>;
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  return <span className="font-num text-xl text-primary">{days}d {hours}h</span>;
}
