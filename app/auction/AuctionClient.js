'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { money } from '@/lib/cms';
import { SiteNav, SiteFooter } from '@/components/site/chrome';
import { TeamBadge, LiveDot, Reveal } from '@/components/site/primitives';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gavel, ArrowLeft, TrendingUp, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function AuctionPage({ initial }) {
  const [settings, setSettings] = useState(initial?.settings || null);
  const [teams, setTeams] = useState(initial?.teams || []);
  const [players, setPlayers] = useState(initial?.players || []);
  const [auction, setAuction] = useState(initial?.auction || null);
  const [bids, setBids] = useState(initial?.bids || []);
  const [reveal, setReveal] = useState(null);

  const prevRef = useRef({});
  const load = async () => {
    try {
      const res = await fetch('/api/public/auction');
      const d = await res.json();
      setSettings(d.settings); setTeams(d.teams || []); setAuction(d.auction); setBids(d.bids || []);
      const pls = d.players || [];
      pls.forEach((p) => {
        const prev = prevRef.current[p.id];
        if (prev && prev !== p.sold_status && ['sold', 'unsold'].includes(p.sold_status)) {
          setReveal(p); setTimeout(() => setReveal(null), 4000);
        }
      });
      prevRef.current = Object.fromEntries(pls.map((p) => [p.id, p.sold_status]));
      setPlayers(pls);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, []);

  const teamById = (id) => teams.find((t) => t.id === id);
  const lot = players.find((p) => p.id === auction?.current_player_id);
  const topBid = bids[0];
  const currentBid = topBid ? topBid.amount : (lot?.base_price || 0);
  const increment = auction?.increment || 20;

  const placeBid = async (teamId) => {
    if (!lot) return;
    const amount = currentBid + increment;
    const res = await fetch('/api/public/bid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player_id: lot.id, team_id: teamId, amount }) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(out.error || 'Bid failed');
    toast.success(`${teamById(teamId)?.short_name} bids ${money(amount)}!`);
    load();
  };

  const soldPlayers = players.filter((p) => p.sold_status === 'sold');
  const upcomingLots = players.filter((p) => p.sold_status === 'available');

  return (
    <div className="min-h-screen">
      <SiteNav settings={settings} />
      <div className="pt-32 container">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6"><ArrowLeft className="h-4 w-4" /> Back home</Link>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
          <div><div className="inline-flex items-center gap-2 text-primary text-xs uppercase tracking-[0.3em] mb-2"><Gavel className="h-4 w-4" /> Auction Room</div><h1 className="font-display text-4xl md:text-5xl uppercase">The Bidding War</h1></div>
          {auction?.status === 'live' ? <LiveDot label="AUCTION LIVE" /> : <Badge className="bg-muted uppercase">{auction?.status || 'idle'}</Badge>}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {lot ? (
              <Reveal>
                <Card className="glass-strong relative overflow-hidden glow-soft">
                  <div className="p-8 md:p-10">
                    <div className="flex items-center justify-between mb-6"><Badge className="bg-primary/15 text-primary border-primary/30">Current Lot</Badge>{lot.is_marquee && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Marquee</Badge>}</div>
                    <div className="flex items-center gap-5">
                      <div className="h-24 w-24 rounded-2xl grid place-items-center bg-gradient-to-br from-primary/30 to-transparent ring-1 ring-primary/20"><Gavel className="h-10 w-10 text-primary" /></div>
                      <div><h2 className="font-display text-4xl md:text-5xl uppercase leading-none">{lot.name}</h2><p className="text-muted-foreground mt-2">{lot.role} · {lot.country} · Base {money(lot.base_price)}</p></div>
                    </div>
                    <div className="mt-8 grid grid-cols-2 gap-4">
                      <div className="glass rounded-xl p-5"><div className="text-xs uppercase text-muted-foreground">Current Bid</div><motion.div key={currentBid} initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="font-num text-5xl text-primary text-glow leading-none mt-1">{money(currentBid)}</motion.div></div>
                      <div className="glass rounded-xl p-5"><div className="text-xs uppercase text-muted-foreground">Top Bidder</div><div className="flex items-center gap-2 mt-2">{topBid ? <><TeamBadge team={teamById(topBid.team_id)} size={36} /><span className="font-display uppercase text-xl">{teamById(topBid.team_id)?.short_name}</span></> : <span className="text-muted-foreground">No bids yet</span>}</div></div>
                    </div>
                    <div className="mt-8"><div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Place a bid (+{money(increment)}) on behalf of</div>
                      <div className="flex flex-wrap gap-2">{teams.map((t) => <Button key={t.id} onClick={() => placeBid(t.id)} variant="outline" className="glass border-white/10 hover:border-primary hover:text-primary gap-2"><TeamBadge team={t} size={22} /> {t.short_name}</Button>)}</div>
                    </div>
                  </div>
                </Card>
              </Reveal>
            ) : <Card className="glass p-10 text-center text-muted-foreground">No lot is currently under the hammer.</Card>}

            <Card className="glass p-5 mt-6"><div className="flex items-center gap-2 font-display uppercase mb-4"><TrendingUp className="h-4 w-4 text-primary" /> Bid History</div>
              <div className="space-y-2"><AnimatePresence>{bids.map((b, i) => <motion.div key={b.id} initial={{ y: -8 }} animate={{ y: 0 }} className={`flex items-center justify-between rounded-lg px-3 py-2 ${i === 0 ? 'bg-primary/10' : 'bg-white/[0.02]'}`}><div className="flex items-center gap-2"><TeamBadge team={teamById(b.team_id)} size={26} /><span className="text-sm font-medium">{teamById(b.team_id)?.name}</span></div><span className="font-num text-lg text-primary">{money(b.amount)}</span></motion.div>)}</AnimatePresence>{!bids.length && <p className="text-muted-foreground text-sm text-center py-4">Bids will stream in here live.</p>}</div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="glass p-5"><div className="font-display uppercase mb-4">Team Purse</div><div className="space-y-3">{[...teams].sort((a,b)=>b.purse-a.purse).map((t) => <div key={t.id} className="flex items-center justify-between"><div className="flex items-center gap-2"><TeamBadge team={t} size={28} /><span className="text-sm">{t.short_name}</span></div><span className="font-num text-lg text-primary">{money(t.purse)}</span></div>)}</div></Card>
            <Card className="glass p-5"><div className="font-display uppercase mb-4">Sold ({soldPlayers.length})</div><div className="space-y-2">{soldPlayers.map((p) => <div key={p.id} className="flex items-center justify-between text-sm"><span>{p.name}</span><span className="font-num text-primary">{money(p.sold_price)}</span></div>)}{!soldPlayers.length && <p className="text-muted-foreground text-sm">None sold yet.</p>}</div></Card>
            <Card className="glass p-5"><div className="font-display uppercase mb-4">Upcoming Lots ({upcomingLots.length})</div><div className="space-y-2">{upcomingLots.map((p) => <div key={p.id} className="flex items-center justify-between text-sm"><span>{p.name}</span><span className="text-muted-foreground">{money(p.base_price)}</span></div>)}{!upcomingLots.length && <p className="text-muted-foreground text-sm">Queue is empty.</p>}</div></Card>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {reveal && (
          <motion.div initial={false} className="fixed inset-0 z-[60] grid place-items-center bg-background/80 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.8, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 12 }} className="text-center">
              <div className={`font-display text-7xl md:text-9xl uppercase ${reveal.sold_status === 'sold' ? 'text-primary text-glow' : 'text-destructive'}`}>{reveal.sold_status === 'sold' ? 'SOLD!' : 'UNSOLD'}</div>
              <div className="mt-4 text-2xl font-display uppercase">{reveal.name}</div>
              {reveal.sold_status === 'sold' && reveal.sold_price && <div className="mt-2 font-num text-4xl text-primary">{money(reveal.sold_price)}</div>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <SiteFooter settings={settings} />
    </div>
  );
}
