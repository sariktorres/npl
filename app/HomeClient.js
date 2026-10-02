'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { IMAGES, money, fmtOvers, fmtDate, fmtTime, hexToHsl } from '@/lib/cms';
import { Reveal, Stagger, StaggerItem, StatCounter, Countdown, SectionHeading, TeamBadge, LiveDot, WinProbBar } from '@/components/site/primitives';
import { SiteNav, SiteFooter } from '@/components/site/chrome';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Gavel, ArrowRight, MapPin, Flame, Radio, Star } from 'lucide-react';

export default function App({ initial }) {
  const [loading, setLoading] = useState(!initial);
  const [data, setData] = useState(initial || { settings: null, sections: [], teams: [], matches: [], players: [], news: [], sponsors: [], gallery: [], auction: null });

  const load = async () => {
    try {
      const res = await fetch('/api/public/bootstrap');
      const d = await res.json();
      setData({ settings: d.settings, sections: d.sections || [], teams: d.teams || [], matches: d.matches || [], players: d.players || [], news: d.news || [], sponsors: d.sponsors || [], gallery: d.gallery || [], auction: d.auction });
    } catch (e) { console.error('home load error', e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, []);

  const teamById = (id) => data.teams.find((t) => t.id === id);
  const live = data.matches.find((m) => m.status === 'live');
  const upcoming = data.matches.filter((m) => m.status === 'upcoming');
  const results = data.matches.filter((m) => m.status === 'completed');
  const nextMatch = upcoming[0];
  const sortedTeams = [...data.teams].sort((a, b) => b.points - a.points || b.nrr - a.nrr);
  const starPlayers = [...data.players].filter((p) => p.team_id).sort((a, b) => (b.stats?.runs || 0) - (a.stats?.runs || 0)).slice(0, 8);
  const currentLot = data.players.find((p) => p.id === data.auction?.current_player_id);

  if (loading) return <LoadingScreen />;

  const render = (s) => {
    switch (s.type) {
      case 'hero': return <Hero key={s.id} s={s} settings={data.settings} nextMatch={nextMatch} teamById={teamById} />;
      case 'countdown': return nextMatch ? <CountdownBand key={s.id} s={s} nextMatch={nextMatch} teamById={teamById} /> : null;
      case 'live': return <LiveSection key={s.id} s={s} live={live} teamById={teamById} />;
      case 'fixtures': return <FixturesSection key={s.id} s={s} upcoming={upcoming} results={results} teamById={teamById} />;
      case 'points': return <PointsSection key={s.id} s={s} teams={sortedTeams} />;
      case 'teams': return <TeamsSection key={s.id} s={s} teams={[...data.teams].sort((a,b)=>a.order_index-b.order_index)} players={data.players} />;
      case 'players': return <PlayersSection key={s.id} s={s} players={starPlayers} teamById={teamById} />;
      case 'auction': return <AuctionTeaser key={s.id} s={s} lot={currentLot} auction={data.auction} teamById={teamById} />;
      case 'news': return <NewsSection key={s.id} s={s} news={data.news} />;
      case 'gallery': return <GallerySection key={s.id} s={s} gallery={data.gallery} />;
      case 'sponsors': return <SponsorsSection key={s.id} s={s} sponsors={data.sponsors} />;
      case 'register': return <RegisterSection key={s.id} s={s} teams={data.teams} />;
      default: return null;
    }
  };

  return (
    <div className="home-page min-h-screen" style={{ '--season-primary': hexToHsl(data.settings?.accent_color) }}>
      <SiteNav settings={data.settings} />
      <main>{data.sections.map(render)}</main>
      <SiteFooter settings={data.settings} />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="home-page min-h-screen grid place-items-center stadium-grid">
      <div className="flex flex-col items-center gap-4">
        <div className="h-14 w-14 rounded-full border-2 border-primary border-t-transparent animate-spin glow-green" />
        <p className="font-display uppercase tracking-[0.3em] text-sm text-muted-foreground">Loading the Arena…</p>
      </div>
    </div>
  );
}

function Hero({ s, settings, nextMatch, teamById }) {
  const name = s.title || settings?.tournament_name || 'NEPAL PREMIER LEAGUE';
  const words = name.split(' ');
  const seasonLabel = settings?.season || '2025';
  const badge = (s.content?.badge || `Season ${seasonLabel}`).replace(/Season\s+\d{4}/i, `Season ${seasonLabel}`);
  return (
    <section className="home-hero stadium-grid relative overflow-hidden">
      <div className="container home-hero__layout relative z-10">
        <div className="home-hero__copy">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge className="mb-5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10 uppercase tracking-widest text-[11px] py-1.5 px-3">{badge}</Badge>
          </motion.div>
          <h1 className="home-hero__title font-display font-bold uppercase leading-[0.92]">
            {words.map((w, i) => (
              <motion.span key={i} initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.12 + i * 0.09 }} className={`block ${i === words.length - 1 ? 'text-primary' : ''}`}>{w}</motion.span>
            ))}
          </h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }} className="mt-6 max-w-xl text-lg text-muted-foreground">{s.subtitle || settings?.tagline}</motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-8 flex flex-wrap gap-3">
            <Link href="/#register"><Button size="lg" className="font-semibold text-base glow-green h-12 px-7">{s.content?.cta_primary || 'Register Now'} <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
            <Link href="/live"><Button size="lg" variant="outline" className="font-semibold text-base h-12 px-7 border-white/15 glass"><Radio className="mr-1 h-4 w-4 text-primary" /> {s.content?.cta_secondary || 'Watch Live'}</Button></Link>
          </motion.div>
          {nextMatch && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.76 }} className="mt-9">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Next match · {teamById(nextMatch.team_a)?.short_name} vs {teamById(nextMatch.team_b)?.short_name}</p>
              <Countdown target={nextMatch.start_time} />
            </motion.div>
          )}
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="home-hero__visual">
          <img src={IMAGES.hero[0]} alt="Cricket match under stadium lights" className="home-hero__photo" />
          <div className="home-hero__photo-shade" />
          <div className="home-hero__caption">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]"><Flame className="h-4 w-4 text-amber-300" /> Every ball has a story</span>
            <span className="mt-2 block font-display text-2xl uppercase">The season starts here</span>
          </div>
          <motion.div className="home-hero__match-card glass-strong" animate={{ y: [0, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{nextMatch ? 'Coming up' : 'Play together'}</span>
            {nextMatch ? (
              <>
                <span className="mt-2 block font-display text-lg uppercase leading-tight">{teamById(nextMatch.team_a)?.short_name} <span className="text-muted-foreground">vs</span> {teamById(nextMatch.team_b)?.short_name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{fmtDate(nextMatch.start_time)} · {fmtTime(nextMatch.start_time)}</span>
              </>
            ) : (
              <span className="mt-2 block font-display text-lg uppercase leading-tight">Find your team. Feel the game.</span>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Band({ id, children, className = '' }) {
  return <section id={id} className={`container py-20 md:py-28 ${className}`}>{children}</section>;
}

function CountdownBand({ s, nextMatch, teamById }) {
  return (
    <Band>
      <Reveal className="glass-strong rounded-2xl p-8 md:p-12 text-center glow-soft">
        <p className="text-xs uppercase tracking-[0.3em] text-primary mb-2">{s.title}</p>
        <h3 className="font-display text-3xl md:text-4xl uppercase mb-6">{teamById(nextMatch.team_a)?.name} <span className="text-muted-foreground">vs</span> {teamById(nextMatch.team_b)?.name}</h3>
        <div className="flex justify-center"><Countdown target={nextMatch.start_time} /></div>
      </Reveal>
    </Band>
  );
}

function LiveSection({ s, live, teamById }) {
  return (
    <Band id="live">
      <Reveal><SectionHeading eyebrow="Live Centre" title={s.title} subtitle={s.subtitle} /></Reveal>
      <div className="mt-10">
        {live ? (
          <Reveal>
            <Card className="glass-strong overflow-hidden relative glow-soft">
              <div className="absolute top-4 right-4"><LiveDot /></div>
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-5"><MapPin className="h-3.5 w-3.5" /> {live.venue}</div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <TeamScore team={teamById(live.team_a)} runs={live.team_a_runs} wkts={live.team_a_wickets} overs={live.team_a_overs} batting />
                  <div className="text-center font-display text-2xl text-muted-foreground">VS</div>
                  <TeamScore team={teamById(live.team_b)} runs={live.team_b_runs} wkts={live.team_b_wickets} overs={live.team_b_overs} right />
                </div>
                <div className="mt-7 max-w-md mx-auto"><WinProbBar a={teamById(live.team_a)?.short_name} b={teamById(live.team_b)?.short_name} probA={live.win_probability} /></div>
                <div className="mt-6 text-center"><Link href="/live"><Button className="font-semibold glow-green">Open Live Match <ArrowRight className="ml-1 h-4 w-4" /></Button></Link></div>
              </div>
            </Card>
          </Reveal>
        ) : (
          <Reveal><Card className="glass p-10 text-center text-muted-foreground">No live match right now — check the fixtures below.</Card></Reveal>
        )}
      </div>
    </Band>
  );
}

function TeamScore({ team, runs, wkts, overs, batting, right }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${right ? 'md:items-end' : 'md:items-start'}`}>
      <TeamBadge team={team} size={56} />
      <div className="font-display uppercase text-sm text-center">{team?.name}</div>
      <div className="font-num text-4xl leading-none">{runs}<span className="text-xl text-muted-foreground">/{wkts}</span></div>
      <div className="text-xs text-muted-foreground">{fmtOvers(overs)} ov {batting && <span className="text-primary">• batting</span>}</div>
    </div>
  );
}

function FixturesSection({ s, upcoming, results, teamById }) {
  const Row = ({ m }) => {
    const hasScore = [m.team_a_runs, m.team_a_wickets, m.team_b_runs, m.team_b_wickets].some((value) => Number(value || 0) > 0);
    const winnerName = teamById(m.winner_team)?.name;
    return (
    <StaggerItem>
      <Card className="glass p-4 flex items-center justify-between gap-4 hover:border-primary/30 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <TeamBadge team={teamById(m.team_a)} size={38} />
          <span className="font-display uppercase text-sm hidden sm:block">{teamById(m.team_a)?.short_name}</span>
        </div>
        <div className="text-center shrink-0">
          {(m.stage || m.match_day) && <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary">{[m.stage, m.match_day].filter(Boolean).join(' · ')}</div>}
          {m.status === 'completed' ? (
            <div className="text-xs">{hasScore && <div className="font-num text-lg">{m.team_a_runs}/{m.team_a_wickets} · {m.team_b_runs}/{m.team_b_wickets}</div>}<div className="text-primary max-w-[180px] truncate">{m.result || (winnerName ? `${winnerName} won` : 'Completed')}</div></div>
          ) : (
            <div className="text-xs text-muted-foreground"><div className="font-display text-sm text-foreground">{fmtDate(m.start_time)}</div><div>{fmtTime(m.start_time)}</div></div>
          )}
        </div>
        <div className="flex items-center gap-3 min-w-0 justify-end">
          <span className="font-display uppercase text-sm hidden sm:block">{teamById(m.team_b)?.short_name}</span>
          <TeamBadge team={teamById(m.team_b)} size={38} />
        </div>
      </Card>
    </StaggerItem>
    );
  };
  return (
    <Band id="fixtures">
      <Reveal><SectionHeading eyebrow="Schedule" title={s.title} subtitle={s.subtitle} /></Reveal>
      <Tabs defaultValue="upcoming" className="mt-8">
        <TabsList className="glass"><TabsTrigger value="upcoming">Upcoming</TabsTrigger><TabsTrigger value="results">Results</TabsTrigger></TabsList>
        <TabsContent value="upcoming"><Stagger className="grid gap-3 mt-5">{upcoming.map((m) => <Row key={m.id} m={m} />)}</Stagger></TabsContent>
        <TabsContent value="results"><Stagger className="grid gap-3 mt-5">{results.map((m) => <Row key={m.id} m={m} />)}</Stagger></TabsContent>
      </Tabs>
    </Band>
  );
}

function PointsSection({ s, teams }) {
  return (
    <Band id="points">
      <Reveal><SectionHeading eyebrow="Standings" title={s.title} subtitle={s.subtitle} /></Reveal>
      <Reveal className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-white/10">
            <th className="py-3 pl-3">#</th><th>Team</th><th className="text-center">P</th><th className="text-center">W</th><th className="text-center">L</th><th className="text-center">NRR</th><th className="text-center">Pts</th>
          </tr></thead>
          <tbody>
            {teams.map((t, i) => (
              <motion.tr key={t.id} initial={{ x: -20 }} whileInView={{ x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className={`border-b border-white/5 ${i < 4 ? 'bg-primary/5' : ''}`}>
                <td className="py-3 pl-3 font-num text-lg">{i + 1}</td>
                <td><div className="flex items-center gap-3"><TeamBadge team={t} size={34} /><span className="font-display uppercase">{t.name}</span>{i < 4 && <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">Q</Badge>}</div></td>
                <td className="text-center">{t.played}</td><td className="text-center text-primary">{t.won}</td><td className="text-center">{t.lost}</td>
                <td className="text-center font-num text-base">{t.nrr > 0 ? '+' : ''}{t.nrr}</td>
                <td className="text-center font-num text-xl text-primary">{t.points}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </Reveal>
    </Band>
  );
}

function TeamsSection({ s, teams, players }) {
  return (
    <Band id="teams">
      <Reveal><div className="flex flex-wrap items-end justify-between gap-4"><SectionHeading eyebrow="Franchises" title={s.title} subtitle={s.subtitle} /><Link href="/teams"><Button variant="outline" className="glass border-white/15">Explore every team <ArrowRight className="ml-2 h-4 w-4" /></Button></Link></div></Reveal>
      <Stagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => {
          const count = players.filter((p) => p.team_id === t.id).length;
          return (
            <StaggerItem key={t.id}>
              <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Link href={`/teams/${t.id}`} className="block"><Card className="glass relative overflow-hidden group" style={{ borderColor: (t.color || '#df503f') + '30' }}>
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl opacity-30" style={{ background: t.color }} />
                  <div className="p-6">
                    <div className="flex items-center gap-4"><TeamBadge team={t} size={64} /><div><h3 className="font-display text-2xl uppercase leading-none">{t.name}</h3><p className="text-xs text-muted-foreground mt-1">{t.home_city}</p></div></div>
                    <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                      <div className="glass rounded-lg py-2"><div className="font-num text-2xl text-primary">{t.won}</div><div className="text-[10px] uppercase text-muted-foreground">Won</div></div>
                      <div className="glass rounded-lg py-2"><div className="font-num text-2xl">{t.points}</div><div className="text-[10px] uppercase text-muted-foreground">Points</div></div>
                      <div className="glass rounded-lg py-2"><div className="font-num text-2xl">{count}</div><div className="text-[10px] uppercase text-muted-foreground">Squad</div></div>
                    </div>
                    <div className="mt-4 text-xs text-muted-foreground">Captain · <span className="text-foreground">{t.captain}</span></div>
                  </div>
                </Card></Link>
              </motion.div>
            </StaggerItem>
          );
        })}
      </Stagger>
    </Band>
  );
}

function PlayersSection({ s, players, teamById }) {
  return (
    <Band id="players">
      <Reveal><SectionHeading eyebrow="Superstars" title={s.title} subtitle={s.subtitle} /></Reveal>
      <Stagger className="mt-10 grid gap-4 grid-cols-2 md:grid-cols-4">
        {players.map((p) => {
          const team = teamById(p.team_id);
          return (
            <StaggerItem key={p.id}>
              <motion.div whileHover={{ y: -5 }}>
                <Link href={`/players/${p.id}`} aria-label={`View ${p.name}'s player profile`} className="block">
                <Card className="glass overflow-hidden group">
                  <div className="relative h-40 grid place-items-center" style={{ background: `radial-gradient(circle at 50% 30%, ${team?.color ? `${team.color}33` : 'hsl(var(--primary) / 0.2)'}, transparent 70%)` }}>
                    <TeamBadge team={team} size={72} />
                    {p.is_marquee && <Badge className="absolute top-2 right-2 bg-primary/90 text-primary-foreground text-[10px]"><Star className="h-3 w-3 mr-1" />Marquee</Badge>}
                  </div>
                  <div className="p-4">
                    <h4 className="font-display uppercase text-lg leading-none truncate">{p.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{p.role} · {team?.short_name}</p>
                    <div className="mt-3 flex justify-between text-center">
                      <div><div className="font-num text-xl text-primary">{p.stats?.runs || 0}</div><div className="text-[10px] uppercase text-muted-foreground">Runs</div></div>
                      <div><div className="font-num text-xl">{p.stats?.wickets || 0}</div><div className="text-[10px] uppercase text-muted-foreground">Wkts</div></div>
                      <div><div className="font-num text-xl">{p.stats?.strike_rate || 0}</div><div className="text-[10px] uppercase text-muted-foreground">SR</div></div>
                    </div>
                  </div>
                </Card>
                </Link>
              </motion.div>
            </StaggerItem>
          );
        })}
      </Stagger>
    </Band>
  );
}

function AuctionTeaser({ s, lot, auction, teamById }) {
  return (
    <Band id="auction">
      <Reveal>
        <Card className="glass-strong overflow-hidden relative glow-soft">
          <div className="absolute inset-0 opacity-20"><img src={IMAGES.stadium[0]} className="h-full w-full object-cover" alt="" /></div>
          <div className="relative p-8 md:p-12 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-primary text-xs uppercase tracking-[0.3em] mb-3"><Gavel className="h-4 w-4" /> {s.subtitle}</div>
              <h2 className="font-display text-4xl md:text-5xl uppercase">{s.title}</h2>
              <p className="mt-4 text-muted-foreground max-w-md">Live bidding, pulse-pounding reveals and record-breaking deals. Step into the auction room and watch fortunes change in seconds.</p>
              <Link href="/auction"><Button size="lg" className="mt-6 font-semibold glow-green">{s.content?.cta || 'Enter Auction Room'} <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
            </div>
            {lot && (
              <Card className="glass p-6 border-primary/20">
                <div className="flex items-center justify-between mb-4"><Badge className="bg-primary/15 text-primary border-primary/30">Current Lot</Badge><LiveDot label={auction?.status === 'live' ? 'LIVE' : 'PAUSED'} /></div>
                <h3 className="font-display text-3xl uppercase">{lot.name}</h3>
                <p className="text-sm text-muted-foreground">{lot.role} · {lot.country}</p>
                <div className="mt-5 flex items-end justify-between">
                  <div><div className="text-xs uppercase text-muted-foreground">Current Bid</div><div className="font-num text-4xl text-primary text-glow">{money(auction?.current_bid)}</div></div>
                  <div className="text-right"><div className="text-xs uppercase text-muted-foreground">Top Bidder</div><div className="font-display uppercase">{teamById(auction?.current_bid_team)?.short_name || '—'}</div></div>
                </div>
              </Card>
            )}
          </div>
        </Card>
      </Reveal>
    </Band>
  );
}

function NewsSection({ s, news }) {
  return (
    <Band id="news">
      <Reveal><SectionHeading eyebrow="Newsroom" title={s.title} subtitle={s.subtitle} /></Reveal>
      <Stagger className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {news.map((n) => (
          <StaggerItem key={n.id}>
            <motion.div whileHover={{ y: -5 }}>
              <Card className="glass overflow-hidden h-full group">
                <div className="h-40 overflow-hidden"><img src={n.cover_url} alt={n.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>
                <div className="p-5"><div className="text-[11px] uppercase tracking-wider text-primary mb-2">{fmtDate(n.created_at)}</div><h4 className="font-display uppercase text-lg leading-tight">{n.title}</h4><p className="mt-2 text-sm text-muted-foreground line-clamp-2">{n.excerpt}</p></div>
              </Card>
            </motion.div>
          </StaggerItem>
        ))}
      </Stagger>
    </Band>
  );
}

function GallerySection({ s, gallery }) {
  return (
    <Band id="gallery">
      <Reveal><SectionHeading eyebrow="Moments" title={s.title} subtitle={s.subtitle} /></Reveal>
      <Stagger className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-3">
        {gallery.map((g, i) => (
          <StaggerItem key={g.id} className={i % 5 === 0 ? 'md:row-span-2' : ''}>
            <motion.div whileHover={{ scale: 1.02 }} className="relative overflow-hidden rounded-xl group h-full min-h-[160px]">
              <img src={g.image_url} alt={g.caption} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4"><span className="text-sm font-display uppercase">{g.caption}</span></div>
            </motion.div>
          </StaggerItem>
        ))}
      </Stagger>
    </Band>
  );
}

function SponsorsSection({ s, sponsors }) {
  const tiers = ['title', 'gold', 'silver', 'partner'];
  return (
    <Band id="sponsors">
      <Reveal><SectionHeading center eyebrow="Partners" title={s.title} subtitle={s.subtitle} /></Reveal>
      <div className="mt-10 space-y-6">
        {tiers.map((tier) => {
          const list = sponsors.filter((x) => x.tier === tier);
          if (!list.length) return null;
          return (
            <Reveal key={tier}>
              <div className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">{tier} {tier === 'title' ? 'Sponsor' : 'Partners'}</div>
              <div className="flex flex-wrap justify-center gap-3">
                {list.map((sp) => (
                  <div key={sp.id} className={`glass rounded-xl grid place-items-center font-display uppercase tracking-wide ${tier === 'title' ? 'px-10 py-6 text-2xl text-primary glow-soft' : tier === 'gold' ? 'px-8 py-5 text-xl' : 'px-6 py-4 text-base text-muted-foreground'}`}>{sp.name}</div>
                ))}
              </div>
            </Reveal>
          );
        })}
      </div>
    </Band>
  );
}

function RegisterSection({ s, teams }) {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', age: '', role: '', batting_style: '', city: '', experience: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const submit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email) return toast.error('Name and email are required');
    setBusy(true);
    const res = await fetch('/api/public/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error(out.error || 'Failed to submit');
    toast.success('Registration submitted! We\'ll be in touch.');
    setForm({ full_name: '', email: '', phone: '', age: '', role: '', batting_style: '', city: '', experience: '' });
  };
  return (
    <Band id="register">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <Reveal>
          <SectionHeading eyebrow="Trials" title={s.title} subtitle={s.subtitle} />
          <div className="mt-6 flex items-center gap-6">
            <div><div className="font-num text-4xl text-primary"><StatCounter value={6} /></div><div className="text-xs uppercase text-muted-foreground">Franchises</div></div>
            <div><div className="font-num text-4xl text-primary"><StatCounter value={20} /></div><div className="text-xs uppercase text-muted-foreground">Matches</div></div>
            <div><div className="font-num text-4xl text-primary">₹<StatCounter value={5} />Cr</div><div className="text-xs uppercase text-muted-foreground">Prize Pool</div></div>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <Card className="glass-strong p-6 md:p-8">
            <form onSubmit={submit} className="grid gap-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input placeholder="Full name *" value={form.full_name} onChange={set('full_name')} className="glass border-white/10" />
                <Input placeholder="Email *" type="email" value={form.email} onChange={set('email')} className="glass border-white/10" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input placeholder="Phone" value={form.phone} onChange={set('phone')} className="glass border-white/10" />
                <Input placeholder="Age" type="number" value={form.age} onChange={set('age')} className="glass border-white/10" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Select value={form.role} onValueChange={set('role')}><SelectTrigger className="glass border-white/10"><SelectValue placeholder="Playing role" /></SelectTrigger><SelectContent>{['Batter','Bowler','All-rounder','Wicket-keeper'].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
                <Input placeholder="City" value={form.city} onChange={set('city')} className="glass border-white/10" />
              </div>
              <Input placeholder="Experience (e.g. State level)" value={form.experience} onChange={set('experience')} className="glass border-white/10" />
              <Button type="submit" disabled={busy} size="lg" className="font-semibold glow-green mt-1">{busy ? 'Submitting…' : 'Submit Registration'}</Button>
            </form>
          </Card>
        </Reveal>
      </div>
    </Band>
  );
}
