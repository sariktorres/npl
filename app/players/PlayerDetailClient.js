'use client';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BadgeCheck, MapPin, Shield, Trophy, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SiteFooter, SiteNav } from '@/components/site/chrome';
import { TeamBadge } from '@/components/site/primitives';
import { IMAGES, hexToHsl, initials } from '@/lib/cms';

export default function PlayerDetailClient({ initial }) {
  const player = initial.player;
  const team = initial.teams.find((item) => item.id === player.team_id) || null;
  const stats = player.stats || {};
  const prices = [
    ['Base price', player.base_price],
    ['Auction price', player.sold_price],
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');
  const seasonColor = hexToHsl(initial.settings?.accent_color);
  const teamColor = team?.color || initial.settings?.accent_color || '#df503f';
  const formatNpr = (lakhs) => `NPR ${Math.round(Number(lakhs || 0) * 100000).toLocaleString('en-IN')}`;

  return (
    <div className="home-page player-profile" style={{ '--season-primary': seasonColor, '--player-team-color': teamColor }}>
      <SiteNav settings={initial.settings} />
      <main>
        <section className="player-profile__hero">
          <img src={IMAGES.stadium[0]} alt="Cricket stadium under lights" className="player-profile__hero-texture" />
          <div className="player-profile__hero-shade" />
          <div className="container relative z-10 py-24 md:py-32">
            <Link href={team ? `/teams/${team.id}` : '/teams'} className="mb-8 inline-flex items-center gap-2 text-sm text-white/75 transition-colors hover:text-white"><ArrowLeft className="h-4 w-4" />{team ? `Back to ${team.short_name}` : 'All teams'}</Link>
            <div className="grid items-end gap-8 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
              <div className="flex min-w-0 items-end gap-5 md:gap-7">
                <div className="player-profile__portrait">
                  {player.photo_url ? <img src={player.photo_url} alt={player.name} className="h-full w-full object-cover" /> : <div className="player-profile__portrait-fallback">{initials(player.name)}</div>}
                </div>
                <div className="min-w-0 pb-1">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge className="border-white/25 bg-white/10 text-white hover:bg-white/10 uppercase tracking-wider">{initial.season?.name || initial.settings?.season || 'Current season'}</Badge>
                    {player.is_national && <Badge className="bg-white text-primary"><BadgeCheck className="mr-1 h-3 w-3" />National team</Badge>}
                  </div>
                  <h1 className="font-display text-5xl font-bold uppercase leading-[0.92] text-white sm:text-6xl md:text-7xl">{player.name}</h1>
                  <p className="mt-3 text-sm font-medium text-white/75 md:text-base">{player.role || 'Player'}{player.category ? ` · ${player.category}` : ''}{player.country ? ` · ${player.country}` : ''}</p>
                  {team && <Link href={`/teams/${team.id}`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-white transition-colors hover:text-white/75"><TeamBadge team={team} size={26} />{team.name}<ArrowRight className="h-4 w-4" /></Link>}
                </div>
              </div>
              {team && <div className="player-profile__team-mark"><TeamBadge team={team} size={112} /><span>{team.short_name || team.name}</span></div>}
            </div>
          </div>
        </section>

        <section className="container -mt-5 relative z-20">
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 shadow-lg sm:grid-cols-4 md:grid-cols-6 md:gap-4 md:p-5">
            {[
              ['Matches', stats.matches],
              ['Runs', stats.runs],
              ['Wickets', stats.wickets],
              ['Average', stats.average],
              ['Strike rate', stats.strike_rate],
              ['Jersey', player.jersey_number],
            ].map(([label, value], index) => <div key={label} className="px-2 py-2 text-center md:border-r md:border-border last:md:border-0"><div className={`font-num text-3xl leading-none ${index === 1 || index === 2 ? 'text-primary' : ''}`}>{value ?? '—'}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</div></div>)}
          </div>
        </section>

        <section className="container grid gap-8 py-12 md:grid-cols-[minmax(0,1fr)_320px] md:py-16">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary"><span className="h-px w-7 bg-primary" /> Player profile</p>
            <h2 className="font-display text-4xl font-bold uppercase">On the field</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{player.profile || `${player.name} represents ${team?.name || 'the tournament'} this season as a ${player.role || 'player'}.`}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <InfoItem icon={UserRound} label="Playing role" value={player.role} />
              <InfoItem icon={Shield} label="Category" value={player.category} />
              <InfoItem icon={MapPin} label="Nationality" value={player.country} />
              <InfoItem icon={Trophy} label="Batting style" value={player.batting_style} />
              <InfoItem icon={Trophy} label="Bowling style" value={player.bowling_style} />
              <InfoItem icon={BadgeCheck} label="National team" value={player.is_national ? 'Yes' : 'Not listed'} />
            </div>
          </div>
          <aside className="space-y-4">
            {team && <Card className="player-profile__side p-5"><div className="flex items-center gap-3"><TeamBadge team={team} size={52} /><div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current team</p><h2 className="mt-1 font-display text-xl uppercase">{team.name}</h2></div></div><p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{[team.city || team.home_city, team.state].filter(Boolean).join(', ') || team.location || 'Location not listed'}</p><Link href={`/teams/${team.id}`}><Button variant="outline" className="mt-4 w-full glass">View team <ArrowRight className="ml-2 h-4 w-4" /></Button></Link></Card>}
            {!!prices.length && <Card className="player-profile__side p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Auction values</p>{prices.map(([label, value]) => <div key={label} className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3"><span className="text-sm text-muted-foreground">{label}</span><span className="font-num text-xl text-primary">{formatNpr(value)}</span></div>)}</Card>}
          </aside>
        </section>
      </main>
      <SiteFooter settings={initial.settings} />
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return <div className="player-profile__info flex items-center gap-3 p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><div><div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-1 text-sm font-semibold">{value || '—'}</div></div></div>;
}
