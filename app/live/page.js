'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { fmtOvers } from '@/lib/cms';
import { SiteNav, SiteFooter } from '@/components/site/chrome';
import { TeamBadge, LiveDot, WinProbBar, Reveal } from '@/components/site/primitives';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MapPin, MessageSquare, ArrowLeft } from 'lucide-react';

export default function LivePage() {
  const [settings, setSettings] = useState(null);
  const [match, setMatch] = useState(null);
  const [teams, setTeams] = useState([]);
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [st, tms, live] = await Promise.all([
      supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('teams').select('*'),
      supabase.from('matches').select('*').eq('status', 'live').order('start_time', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setSettings(st.data); setTeams(tms.data || []);
    let m = live.data;
    if (!m) { const last = await supabase.from('matches').select('*').order('start_time', { ascending: false }).limit(1).maybeSingle(); m = last.data; }
    setMatch(m);
    if (m) { const sc = await supabase.from('scorecards').select('*').eq('match_id', m.id).order('innings'); setCard((sc.data || [])[0] || null); }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel('live-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scorecards' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const teamById = (id) => teams.find((t) => t.id === id);

  return (
    <div className="min-h-screen">
      <SiteNav settings={settings} />
      <div className="pt-32 container">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6"><ArrowLeft className="h-4 w-4" /> Back home</Link>
        {loading ? <Card className="glass p-10 text-center text-muted-foreground">Loading live centre…</Card> : !match ? (
          <Card className="glass p-10 text-center text-muted-foreground">No match data available yet.</Card>
        ) : (
          <>
            <Reveal>
              <Card className="glass-strong relative overflow-hidden glow-soft">
                <div className="absolute top-4 right-4">{match.status === 'live' ? <LiveDot /> : <Badge className="bg-muted">{match.status}</Badge>}</div>
                <div className="p-6 md:p-10">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6"><MapPin className="h-3.5 w-3.5" /> {match.venue} · {match.overs} overs</div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <ScoreBox team={teamById(match.team_a)} runs={match.team_a_runs} wkts={match.team_a_wickets} overs={match.team_a_overs} batting={match.current_innings === 1} />
                    <div className="text-center"><div className="font-display text-3xl text-muted-foreground">VS</div></div>
                    <ScoreBox team={teamById(match.team_b)} runs={match.team_b_runs} wkts={match.team_b_wickets} overs={match.team_b_overs} right batting={match.current_innings === 2} />
                  </div>
                  {match.result && <div className="mt-6 text-center font-display uppercase text-primary tracking-wide">{match.result}</div>}
                  <div className="mt-8 max-w-lg mx-auto"><div className="text-xs uppercase tracking-widest text-muted-foreground text-center mb-2">Win Probability</div><WinProbBar a={teamById(match.team_a)?.short_name} b={teamById(match.team_b)?.short_name} probA={match.win_probability} /></div>
                </div>
              </Card>
            </Reveal>

            <div className="grid lg:grid-cols-3 gap-6 mt-6">
              <div className="lg:col-span-2">
                <Tabs defaultValue="batting">
                  <TabsList className="glass"><TabsTrigger value="batting">Batting</TabsTrigger><TabsTrigger value="bowling">Bowling</TabsTrigger><TabsTrigger value="partnerships">Partnerships</TabsTrigger></TabsList>
                  <TabsContent value="batting"><Card className="glass p-4 mt-4 overflow-x-auto">
                    <table className="w-full text-sm min-w-[480px]"><thead><tr className="text-left text-xs uppercase text-muted-foreground border-b border-white/10"><th className="py-2">Batter</th><th className="text-center">R</th><th className="text-center">B</th><th className="text-center">4s</th><th className="text-center">6s</th><th className="text-center">SR</th></tr></thead>
                      <tbody>{(card?.batting || []).map((b, i) => <tr key={i} className="border-b border-white/5"><td className="py-2.5"><div className="font-medium">{b.name}</div><div className="text-[11px] text-muted-foreground">{b.how_out}</div></td><td className="text-center font-num text-lg">{b.runs}</td><td className="text-center">{b.balls}</td><td className="text-center">{b.fours}</td><td className="text-center">{b.sixes}</td><td className="text-center">{b.sr}</td></tr>)}</tbody>
                    </table>{!card?.batting?.length && <p className="text-muted-foreground text-center py-6">No batting data yet.</p>}</Card></TabsContent>
                  <TabsContent value="bowling"><Card className="glass p-4 mt-4 overflow-x-auto">
                    <table className="w-full text-sm min-w-[480px]"><thead><tr className="text-left text-xs uppercase text-muted-foreground border-b border-white/10"><th className="py-2">Bowler</th><th className="text-center">O</th><th className="text-center">M</th><th className="text-center">R</th><th className="text-center">W</th><th className="text-center">Econ</th></tr></thead>
                      <tbody>{(card?.bowling || []).map((b, i) => <tr key={i} className="border-b border-white/5"><td className="py-2.5 font-medium">{b.name}</td><td className="text-center">{b.overs}</td><td className="text-center">{b.maidens}</td><td className="text-center">{b.runs}</td><td className="text-center font-num text-lg text-primary">{b.wickets}</td><td className="text-center">{b.econ}</td></tr>)}</tbody>
                    </table>{!card?.bowling?.length && <p className="text-muted-foreground text-center py-6">No bowling data yet.</p>}</Card></TabsContent>
                  <TabsContent value="partnerships"><Card className="glass p-5 mt-4 space-y-4">{(card?.partnerships || []).map((p, i) => <div key={i}><div className="flex justify-between text-sm mb-1"><span className="font-medium">{p.pair}</span><span className="font-num text-lg text-primary">{p.runs} ({p.balls})</span></div><div className="h-2 rounded-full bg-muted overflow-hidden"><motion.div initial={{ width: 0 }} whileInView={{ width: Math.min(100, p.runs) + '%' }} className="h-full bg-primary rounded-full" /></div></div>)}{!card?.partnerships?.length && <p className="text-muted-foreground text-center py-6">No partnership data yet.</p>}</Card></TabsContent>
                </Tabs>
              </div>
              <div>
                <Card className="glass p-5"><div className="flex items-center gap-2 font-display uppercase mb-4"><MessageSquare className="h-4 w-4 text-primary" /> Commentary</div>
                  <div className="space-y-3"><AnimatePresence>{(match.commentary || []).map((c, i) => <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3 text-sm"><span className="font-num text-primary shrink-0">{c.over}</span><span className="text-foreground/90">{c.text}</span></motion.div>)}</AnimatePresence>{!match.commentary?.length && <p className="text-muted-foreground text-sm">Commentary will appear here.</p>}</div>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
      <SiteFooter settings={settings} />
    </div>
  );
}

function ScoreBox({ team, runs, wkts, overs, batting, right }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${right ? 'md:items-end' : 'md:items-start'}`}>
      <TeamBadge team={team} size={64} />
      <div className="font-display uppercase text-center">{team?.name}</div>
      <div className="font-num text-5xl leading-none">{runs}<span className="text-2xl text-muted-foreground">/{wkts}</span></div>
      <div className="text-xs text-muted-foreground">{fmtOvers(overs)} ov {batting && <span className="text-primary">• batting</span>}</div>
    </div>
  );
}
