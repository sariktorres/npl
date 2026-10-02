'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowDownWideNarrow, ArrowRight, Search, Trophy, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SiteFooter, SiteNav } from '@/components/site/chrome';
import { TeamBadge } from '@/components/site/primitives';
import { IMAGES, hexToHsl } from '@/lib/cms';
import { deriveTeamStats } from '@/lib/teamStats';

export default function TeamsClient({ initial }) {
  const [query, setQuery] = useState('');
  const teams = deriveTeamStats(initial.teams || [], initial.matches || []);
  const rankedTeams = [...teams].sort((a, b) => b.points - a.points || b.nrr - a.nrr);
  const rankById = new Map(rankedTeams.map((team, index) => [team.id, index + 1]));
  const filtered = rankedTeams.filter((team) => `${team.name} ${team.short_name} ${team.city || team.home_city} ${team.state}`.toLowerCase().includes(query.trim().toLowerCase()));
  const seasonColor = hexToHsl(initial.settings?.accent_color);
  const totalMatches = (initial.matches || []).filter((match) => match.status === 'completed').length;

  return (
    <div className="home-page teams-directory" style={{ '--season-primary': seasonColor }}>
      <SiteNav settings={initial.settings} />
      <main>
        <section className="teams-directory__hero">
          <img src={IMAGES.stadium[0]} alt="Cricket ground lit for a night match" className="teams-directory__hero-image" />
          <div className="teams-directory__hero-shade" />
          <div className="container relative z-10 py-24 md:py-32">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
              <Badge className="mb-5 border-white/25 bg-white/10 text-white hover:bg-white/10 uppercase tracking-[0.18em]">{initial.season?.name || initial.settings?.season || 'Current season'}</Badge>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/75">Six colors. One cup.</p>
              <h1 className="mt-3 max-w-4xl font-display text-6xl font-bold uppercase leading-[0.9] text-white sm:text-7xl md:text-8xl">Choose your side</h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80 md:text-lg">Meet the franchises chasing the season’s biggest moments. Find your city, follow the form, and back your team.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#all-teams" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Explore teams <ArrowRight className="h-4 w-4" /></a>
                <div className="flex items-center gap-2 rounded-md border border-white/25 bg-black/20 px-4 text-sm text-white"><Trophy className="h-4 w-4 text-amber-300" />{totalMatches} matches decided</div>
              </div>
            </motion.div>
          </div>
          <div className="teams-directory__vertical-label hidden lg:block">NEPAL PREMIER LEAGUE · {initial.season?.name || initial.settings?.season}</div>
        </section>

        <section id="all-teams" className="container py-16 md:py-20">
          <div className="flex flex-col gap-6 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
            <div><p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary"><span className="h-px w-7 bg-primary" /> The line-up</p><h2 className="font-display text-4xl font-bold uppercase md:text-5xl">Franchises</h2><p className="mt-2 text-muted-foreground">{teams.length} teams · ranked by this season’s results</p></div>
            <label className="relative block w-full md:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search team or city" className="pl-9" /></label>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 xl:grid-cols-4">
            {filtered.map((team, index) => {
              const rank = rankById.get(team.id);
              return (
                <motion.div key={team.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.4, delay: Math.min(index % 5, 4) * 0.05 }}>
                  <Link href={`/teams/${team.id}`} aria-label={`${team.name}, rank ${rank}. Open team profile.`} className="teams-directory__logo-link group block">
                    <Card className="teams-directory__card relative aspect-square overflow-hidden" style={{ '--team-color': team.color || '#df503f' }}>
                      {team.logo_url ? <img src={team.logo_url} alt={`${team.name} logo`} className="teams-directory__logo" /> : <TeamBadge team={team} size={148} className="teams-directory__fallback-logo" />}
                      <div className="teams-directory__team-overlay">
                        <span className="teams-directory__rank">TABLE RANK <strong>#{rank}</strong></span>
                        <h3 className="teams-directory__team-name">{team.name}</h3>
                        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider">Team profile <ArrowRight className="h-3.5 w-3.5" /></span>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
          {!filtered.length && <div className="py-16 text-center text-muted-foreground"><ArrowDownWideNarrow className="mx-auto mb-3 h-6 w-6" />No teams match that search.</div>}
          <div className="mt-10 text-center text-sm text-muted-foreground"><Zap className="mr-1 inline h-4 w-4 text-primary" />Pick a side and follow the season.</div>
        </section>
      </main>
      <SiteFooter settings={initial.settings} />
    </div>
  );
}
