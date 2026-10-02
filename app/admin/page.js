'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { LayoutDashboard, Layers, Users, Shield, CalendarDays, CalendarRange, Radio, Gavel, UserCheck, Image as ImageIcon, Newspaper, Handshake, Settings as SettingsIcon, LogOut, Plus, Pencil, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Download, Upload, Zap, ExternalLink, MapPin, Trophy, BadgeCheck, FileUp, FileSpreadsheet, X, Copy } from 'lucide-react';
import { TeamBadge } from '@/components/site/primitives';
import { deriveTeamStats, teamLeaders } from '@/lib/teamStats';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'seasons', label: 'Seasons', icon: CalendarRange },
  { key: 'sections', label: 'Homepage', icon: Layers },
  { key: 'teams', label: 'Teams', icon: Shield },
  { key: 'players', label: 'Players', icon: Users },
  { key: 'matches', label: 'Matches', icon: CalendarDays },
  { key: 'scoring', label: 'Live Scoring', icon: Radio },
  { key: 'auction', label: 'Auction', icon: Gavel },
  { key: 'registrations', label: 'Registrations', icon: UserCheck },
  { key: 'sponsors', label: 'Sponsors', icon: Handshake },
  { key: 'gallery', label: 'Gallery', icon: ImageIcon },
  { key: 'news', label: 'News', icon: Newspaper },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
];

function token() { return typeof window !== 'undefined' ? localStorage.getItem('apl_token') : null; }
async function api(method, path, body) {
  const t = token();
  const res = await fetch(`/api/${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: body ? JSON.stringify(body) : undefined });
  const responseText = await res.text();
  let json = {};
  if (responseText) {
    try { json = JSON.parse(responseText); }
    catch { json.error = responseText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400); }
  }
  if (!res.ok) throw new Error(`${json.error || 'Request failed'} (HTTP ${res.status})`);
  return json;
}
async function apiList(table, order) {
  const t = token();
  const res = await fetch(`/api/admin/list/${table}${order ? `?order=${order}` : ''}`, { headers: { Authorization: `Bearer ${t}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed');
  return json.data || [];
}
async function uploadFile(file) {
  const t = token();
  const fd = new FormData(); fd.append('file', file);
  const res = await fetch('/api/admin/upload', { method: 'POST', headers: { Authorization: `Bearer ${t}` }, body: fd });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Upload failed');
  return json.url;
}

export default function AdminPage({ initialTab = 'dashboard' }) {
  const [session, setSession] = useState(undefined);
  const [tab, setTab] = useState(initialTab);
  const [teams, setTeams] = useState([]);
  const [seasonRefresh, setSeasonRefresh] = useState(0);

  useEffect(() => { setSession(token() ? { token: token() } : null); }, []);
  useEffect(() => { if (session) apiList('teams').then(setTeams).catch(() => {}); }, [session, tab, seasonRefresh]);

  if (session === undefined) return <div className="min-h-screen grid place-items-center"><div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (!session) return <Login />;

  return (
    <div className="min-h-screen flex">
      <aside className="w-16 md:w-60 shrink-0 border-r border-white/5 glass-strong flex flex-col">
        <div className="h-16 flex items-center gap-2 px-4 border-b border-white/5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Zap className="h-4 w-4" fill="currentColor" /></span><span className="font-display uppercase font-bold hidden md:block">Admin</span></div>
        <nav className="flex-1 py-3 overflow-y-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const className = `w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${tab === t.key ? 'bg-primary/15 text-primary border-r-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`;
            return t.key === 'teams'
              ? <Link key={t.key} href="/admin/teams" className={className}><Icon className="h-4 w-4 shrink-0" /><span className="hidden md:block">{t.label}</span></Link>
              : <button key={t.key} onClick={() => setTab(t.key)} className={className}><Icon className="h-4 w-4 shrink-0" /><span className="hidden md:block">{t.label}</span></button>;
          })}
        </nav>
        <div className="p-3 border-t border-white/5 space-y-1">
          <a href="/" target="_blank" className="w-full flex items-center gap-3 px-2 py-2 text-sm text-muted-foreground hover:text-foreground"><ExternalLink className="h-4 w-4" /><span className="hidden md:block">View site</span></a>
          <button onClick={() => { localStorage.removeItem('apl_token'); setSession(null); }} className="w-full flex items-center gap-3 px-2 py-2 text-sm text-muted-foreground hover:text-destructive"><LogOut className="h-4 w-4" /><span className="hidden md:block">Sign out</span></button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto h-screen">
        <div key={seasonRefresh} className="p-5 md:p-8 max-w-6xl">
          {tab === 'dashboard' && <Dashboard teams={teams} setTab={setTab} />}
          {tab === 'seasons' && <SeasonManager onActivated={() => setSeasonRefresh((v) => v + 1)} />}
          {tab === 'sections' && <Sections />}
          {tab === 'teams' && <TeamsWorkspace teams={teams} onChanged={() => apiList('teams').then(setTeams).catch(() => {})} />}
          {tab === 'players' && <PlayersWorkspace teams={teams} />}
          {tab === 'matches' && <MatchesWorkspace teams={teams} />}
          {tab === 'scoring' && <Scoring teams={teams} />}
          {tab === 'auction' && <Auction teams={teams} />}
          {tab === 'registrations' && <Registrations />}
          {tab === 'sponsors' && <Resource table="sponsors" title="Sponsors" columns={[['name','Name'],['tier','Tier']]} fields={SPONSOR_FIELDS} />}
          {tab === 'gallery' && <Resource table="gallery" title="Gallery" columns={[['caption','Caption'],['category','Category']]} fields={GALLERY_FIELDS} />}
          {tab === 'news' && <Resource table="news" title="News" columns={[['title','Title'],['published','Published']]} fields={NEWS_FIELDS} />}
          {tab === 'settings' && <SettingsPanel setTab={setTab} />}
        </div>
      </main>
    </div>
  );
}

function SeasonManager({ onActivated }) {
  const [seasons, setSeasons] = useState([]);
  const [name, setName] = useState('');
  const [tournamentName, setTournamentName] = useState('');
  const [tagline, setTagline] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [accentColor, setAccentColor] = useState('#e34c3e');
  const [sourceSeasonId, setSourceSeasonId] = useState('');
  const [copyRoster, setCopyRoster] = useState(true);
  const [busy, setBusy] = useState(false);
  const activeSeason = seasons.find((season) => season.is_active);
  const load = () => apiList('seasons').then((rows) => {
    setSeasons(rows);
    setSourceSeasonId((current) => current || rows.find((season) => season.is_active)?.id || '');
  }).catch((e) => toast.error(e.message));

  useEffect(() => { load(); }, []);

  const createSeason = async (event) => {
    event.preventDefault();
    const seasonName = name.trim();
    if (!seasonName) return toast.error('Season name is required');
    if (seasons.some((season) => season.name.trim().toLowerCase() === seasonName.toLowerCase())) {
      return toast.error(`Season "${seasonName}" already exists. Activate it from the season list or choose a new label.`);
    }
    setBusy(true);
    try {
      await api('POST', 'admin/seasons', {
        name: seasonName,
        tournament_name: tournamentName.trim() || null,
        tagline: tagline.trim() || null,
        logo_url: logoUrl.trim() || null,
        accent_color: accentColor,
        source_season_id: sourceSeasonId || activeSeason?.id || null,
        copy_roster: copyRoster,
      });
      toast.success('Season created');
      setName('');
      setTournamentName('');
      setTagline('');
      setLogoUrl('');
      await load();
    } catch (e) { toast.error(e.message); }
    setBusy(false);
  };

  const activate = async (season) => {
    try {
      await api('POST', 'admin/seasons', { id: season.id, is_active: true });
      toast.success(`${season.name} is now live`);
      await load();
      onActivated();
    } catch (e) { toast.error(e.message); }
  };

  const updateSeason = async (season, patch) => {
    try {
      await api('POST', 'admin/seasons', { id: season.id, ...patch });
      toast.success('Season settings saved');
      await load();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div>
      <h1 className="font-display text-3xl uppercase mb-1">Seasons</h1>
      <p className="text-muted-foreground mb-6">Choose which tournament season the public site and admin workspace use.</p>
      <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] gap-5 items-start">
        <Card className="glass p-5 md:p-6">
          <h2 className="font-display text-xl uppercase mb-4">Create season</h2>
          <form onSubmit={createSeason} className="grid gap-3">
            <div><Label className="text-xs uppercase text-muted-foreground">Season label</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="2026" className="glass border-white/10 mt-1" required /></div>
            <div><Label className="text-xs uppercase text-muted-foreground">Tournament name</Label><Input value={tournamentName} onChange={(e) => setTournamentName(e.target.value)} placeholder="Nepal Premier League" className="glass border-white/10 mt-1" /></div>
            <div><Label className="text-xs uppercase text-muted-foreground">Tagline</Label><Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Where legends are forged" className="glass border-white/10 mt-1" /></div>
            <div><Label className="text-xs uppercase text-muted-foreground">Tournament logo URL</Label><Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className="glass border-white/10 mt-1" /></div>
            <div className="grid grid-cols-[1fr_auto] items-end gap-3">
              <div><Label className="text-xs uppercase text-muted-foreground">Accent color</Label><Input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="glass border-white/10 mt-1 h-10 w-full p-1" /></div>
              <div className="flex items-center gap-2 pb-2"><Switch checked={copyRoster} onCheckedChange={setCopyRoster} id="copy-roster" /><Label htmlFor="copy-roster" className="text-xs">Copy teams & players</Label></div>
            </div>
            <div><Label className="text-xs uppercase text-muted-foreground">Copy from season</Label><Select value={sourceSeasonId || 'none'} onValueChange={(value) => setSourceSeasonId(value === 'none' ? '' : value)}><SelectTrigger className="glass border-white/10 mt-1"><SelectValue placeholder="Choose source" /></SelectTrigger><SelectContent><SelectItem value="none">Start without a source</SelectItem>{seasons.map((season) => <SelectItem key={season.id} value={season.id}>{season.name}</SelectItem>)}</SelectContent></Select></div>
            <p className="text-xs text-muted-foreground">Homepage layout is copied from the selected season. Team and player records are copied only when enabled; fixtures start empty.</p>
            <Button type="submit" disabled={busy} className="font-semibold glow-green w-fit"><Plus className="h-4 w-4 mr-1" />{busy ? 'Creating…' : 'Create season'}</Button>
          </form>
        </Card>
        <div className="space-y-3">
          {seasons.map((season) => (
            <SeasonCard key={season.id} season={season} active={season.is_active} onActivate={() => activate(season)} onSave={(patch) => updateSeason(season, patch)} />
          ))}
          {!seasons.length && <Card className="glass p-6 text-sm text-muted-foreground">No seasons yet. Run the seasons migration to get started.</Card>}
        </div>
      </div>
    </div>
  );
}

function SeasonCard({ season, active, onActivate, onSave }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(season);
  useEffect(() => setForm(season), [season]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <Card className="glass p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><h2 className="font-display text-xl uppercase truncate">{season.name}</h2>{active && <Badge className="bg-primary/15 text-primary border-primary/30">Active</Badge>}</div>
          <p className="mt-1 text-sm text-muted-foreground">{season.tournament_name || 'Tournament name not set'}</p>
        </div>
        <div className="flex shrink-0 gap-1"><Button size="icon" variant="ghost" title="Edit season" onClick={() => setEditing((value) => !value)}><Pencil className="h-4 w-4" /></Button>{!active && <Button size="sm" onClick={onActivate} className="font-semibold">Activate</Button>}</div>
      </div>
      {editing && <div className="mt-4 grid gap-3 border-t border-white/10 pt-4">
        <div><Label className="text-xs uppercase text-muted-foreground">Season label</Label><Input value={form.name || ''} onChange={(e) => set('name', e.target.value)} className="glass border-white/10 mt-1" /></div>
        <div><Label className="text-xs uppercase text-muted-foreground">Tournament name</Label><Input value={form.tournament_name || ''} onChange={(e) => set('tournament_name', e.target.value)} className="glass border-white/10 mt-1" /></div>
        <div><Label className="text-xs uppercase text-muted-foreground">Tagline</Label><Input value={form.tagline || ''} onChange={(e) => set('tagline', e.target.value)} className="glass border-white/10 mt-1" /></div>
        <div><Label className="text-xs uppercase text-muted-foreground">Tournament logo URL</Label><Input value={form.logo_url || ''} onChange={(e) => set('logo_url', e.target.value)} className="glass border-white/10 mt-1" /></div>
        <div><Label className="text-xs uppercase text-muted-foreground">Accent color</Label><Input type="color" value={form.accent_color || '#e34c3e'} onChange={(e) => set('accent_color', e.target.value)} className="glass border-white/10 mt-1 h-10 w-full p-1" /></div>
        <Button size="sm" onClick={() => onSave({ name: form.name, tournament_name: form.tournament_name, tagline: form.tagline, logo_url: form.logo_url, accent_color: form.accent_color })} className="w-fit">Save season settings</Button>
      </div>}
    </Card>
  );
}

function Login() {
  const [email, setEmail] = useState('admin@cricket.com');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'Login failed');
      localStorage.setItem('apl_token', out.access_token);
      toast.success('Welcome back, admin');
      window.location.reload();
    } catch (e2) { toast.error(e2.message); }
    setBusy(false);
  };
  return (
    <div className="min-h-screen grid place-items-center stadium-grid p-6">
      <Card className="glass-strong p-8 w-full max-w-sm glow-soft">
        <div className="flex items-center gap-2 mb-6"><span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Zap className="h-5 w-5" fill="currentColor" /></span><span className="font-display text-xl uppercase font-bold">Admin Login</span></div>
        <form onSubmit={submit} className="space-y-4">
          <div><Label className="text-xs uppercase text-muted-foreground">Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} className="glass border-white/10 mt-1" /></div>
          <div><Label className="text-xs uppercase text-muted-foreground">Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="glass border-white/10 mt-1" /></div>
          <Button type="submit" disabled={busy} className="w-full font-semibold glow-green">{busy ? 'Signing in…' : 'Sign In'}</Button>
        </form>
        <p className="text-xs text-muted-foreground mt-4 text-center">Default: admin@cricket.com / Admin@12345</p>
      </Card>
    </div>
  );
}

function Dashboard({ teams, setTab }) {
  const [counts, setCounts] = useState({});
  useEffect(() => { (async () => {
    const tbls = ['players','matches','registrations','news','sponsors','gallery'];
    const out = { teams: teams.length };
    for (const t of tbls) { try { const rows = await apiList(t); out[t] = rows.length; } catch { out[t] = 0; } }
    setCounts(out);
  })(); }, [teams]);
  const cards = [['teams','Teams',Shield],['players','Players',Users],['matches','Matches',CalendarDays],['registrations','Registrations',UserCheck],['news','News',Newspaper],['sponsors','Sponsors',Handshake]];
  return (
    <div>
      <h1 className="font-display text-3xl uppercase mb-1">Dashboard</h1>
      <p className="text-muted-foreground mb-6">Control every pixel of your tournament.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map(([k, label, Icon]) => (
          <Card key={k} className="glass p-5 cursor-pointer hover:border-primary/30" onClick={() => setTab(k === 'registrations' ? 'registrations' : k)}>
            <Icon className="h-5 w-5 text-primary mb-3" /><div className="font-num text-4xl">{counts[k] ?? '—'}</div><div className="text-sm text-muted-foreground uppercase tracking-wide">{label}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

const TEAM_FIELDS = [
  ['name','Team Name','text'],['short_name','Short Code','text'],['logo_url','Team Logo','image'],
  ['owner','Owner','text'],['captain','Captain','text'],['coach','Coach','text'],
  ['location','Location','text'],['city','City','text'],['state','State','text'],
  ['description','Short Description','textarea'],['stadium','Home Stadium','text'],
  ['color','Team Color (hex)','text'],['purse','Auction Purse (L)','number'],['order_index','Display Order','number'],
];
const TEAM_CSV_COLUMNS = ['name','short_name','logo_url','color','owner','captain','coach','location','city','state','description','stadium','purse','order_index'];
const TEAM_CSV_TEMPLATE = `${TEAM_CSV_COLUMNS.join(',')}\n`;

function parseTeamCsv(file) {
  return new Promise((resolve) => Papa.parse(file, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s-]+/g, '_'),
    complete: (result) => {
      const errors = result.errors.map((error) => `CSV row ${error.row + 2}: ${error.message}`);
      const allowed = new Set([...TEAM_CSV_COLUMNS, 'team_name']);
      const rows = [];
      const codes = new Set();
      result.data.forEach((source, index) => {
        const rowNumber = index + 2;
        const unknownColumns = Object.keys(source).filter((key) => key && !allowed.has(key));
        if (unknownColumns.length) errors.push(`CSV row ${rowNumber}: Unknown columns: ${unknownColumns.join(', ')}`);
        const name = String(source.name || source.team_name || '').trim();
        if (!name) {
          errors.push(`CSV row ${rowNumber}: Team name is required`);
          return;
        }
        const row = { name };
        TEAM_CSV_COLUMNS.slice(1).forEach((column) => {
          const value = String(source[column] ?? '').trim();
          if (value) row[column] = value;
        });
        ['purse','order_index'].forEach((column) => {
          if (row[column] !== undefined && !Number.isFinite(Number(row[column]))) errors.push(`CSV row ${rowNumber}: ${column} must be a number`);
        });
        if (row.short_name) {
          const code = row.short_name.toLowerCase();
          if (codes.has(code)) errors.push(`CSV row ${rowNumber}: Duplicate team code ${row.short_name}`);
          codes.add(code);
        }
        rows.push(row);
      });
      if (rows.length > 500) errors.push('Import is limited to 500 teams per file');
      resolve({ rows, errors });
    },
    error: (error) => resolve({ rows: [], errors: [error.message] }),
  }));
}

function downloadTeamCsvTemplate() {
  const url = URL.createObjectURL(new Blob([TEAM_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'teams-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

const PLAYER_FIELDS = (teams) => [['name','Name','text'],['team_id','Team','team',teams],['category','Category','text'],['role','Role','select',['Batter','Bowler','All-rounder','Wicket-keeper']],['country','Nationality','text'],['batting_style','Batting','text'],['bowling_style','Bowling','text'],['jersey_number','Jersey number','number'],['photo_url','Photo','image'],['stats','Season statistics (JSON)','json'],['base_price','Base Price (L)','number'],['sold_price','Sold Price (L)','number'],['sold_status','Status','select',['available','current','sold','unsold']],['is_marquee','Marquee','bool'],['is_national','National team player','bool'],['order_index','Order','number']];
const PLAYER_CSV_COLUMNS = ['player_name','team','category','base_price_npr','sold_price_npr','role','nationality'];

function normalizePlayerTeam(value) { return String(value || '').trim().toLowerCase(); }

function parsePlayersCsv(file, teams) {
  return new Promise((resolve) => Papa.parse(file, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim().toLowerCase().replace(/[\s-]+/g, '_'),
    complete: (result) => {
      const errors = result.errors.map((error) => `CSV row ${error.row + 2}: ${error.message}`);
      const teamByName = new Map();
      teams.forEach((team) => [team.name, team.short_name].filter(Boolean).forEach((name) => teamByName.set(normalizePlayerTeam(name), team)));
      const rows = [];
      const keys = new Set();
      result.data.forEach((source, index) => {
        const rowNumber = index + 2;
        const name = String(source.player_name || source.name || '').trim();
        const teamLabel = String(source.team || source.team_name || '').trim();
        const team = teamByName.get(normalizePlayerTeam(teamLabel));
        const baseNpr = String(source.base_price_npr ?? '').trim() === '' ? null : Number(source.base_price_npr);
        const soldNpr = String(source.sold_price_npr ?? '').trim() === '' ? null : Number(source.sold_price_npr);
        if (!name) errors.push(`CSV row ${rowNumber}: player_name is required`);
        if (!team) errors.push(`CSV row ${rowNumber}: team "${teamLabel || '(blank)'}" does not match a team in the active season`);
        if (baseNpr !== null && (!Number.isFinite(baseNpr) || baseNpr < 0)) errors.push(`CSV row ${rowNumber}: base_price_npr must be a non-negative number or blank`);
        if (soldNpr !== null && (!Number.isFinite(soldNpr) || soldNpr < 0)) errors.push(`CSV row ${rowNumber}: sold_price_npr must be a non-negative number`);
        if (!name || !team || (baseNpr !== null && (!Number.isFinite(baseNpr) || baseNpr < 0)) || (soldNpr !== null && (!Number.isFinite(soldNpr) || soldNpr < 0))) return;
        const key = `${team.id}:${name.toLowerCase()}`;
        if (keys.has(key)) errors.push(`CSV row ${rowNumber}: duplicate player "${name}" for ${team.name}`);
        keys.add(key);
        rows.push({
          name,
          team_id: team.id,
          team_name: team.name,
          category: String(source.category || '').trim() || null,
          base_price_npr: baseNpr,
          sold_price_npr: soldNpr,
          role: String(source.role || '').trim() || null,
          country: String(source.nationality || '').trim() || null,
        });
      });
      if (rows.length > 500) errors.push('Import is limited to 500 players per file');
      resolve({ rows, errors });
    },
    error: (error) => resolve({ rows: [], errors: [error.message] }),
  }));
}

function downloadPlayerCsvTemplate() {
  const url = URL.createObjectURL(new Blob([`${PLAYER_CSV_COLUMNS.join(',')}\n`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'players-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function PlayersWorkspace({ teams }) {
  const [reloadKey, setReloadKey] = useState(0);
  const [seasons, setSeasons] = useState([]);
  const [sourceSeasonId, setSourceSeasonId] = useState('');
  const [copyBusy, setCopyBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    apiList('seasons').then((rows) => {
      setSeasons(rows);
      setSourceSeasonId((current) => current || rows.find((season) => !season.is_active)?.id || '');
    }).catch((error) => toast.error(error.message));
  }, []);
  const sourceSeasons = seasons.filter((season) => !season.is_active);

  const chooseFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFileName(file.name);
    setBusy(true);
    try {
      const activeTeams = teams.length ? teams : await apiList('teams');
      if (!activeTeams.length) throw new Error('No teams found in the active season. Add teams before importing players.');
      const parsed = await parsePlayersCsv(file, activeTeams);
      setRows(parsed.rows);
      setErrors(parsed.errors);
    } catch (error) {
      setRows([]);
      setErrors([error.message]);
    }
    setBusy(false);
  };

  const importPlayers = async () => {
    if (!rows.length || errors.length) return;
    if (replaceExisting && !confirm(`Replace all players in the active season with these ${rows.length} players? Existing players and auction bids will be deleted.`)) return;
    setBusy(true);
    try {
      const result = await api('POST', 'admin/players/import', { rows, replace_existing: replaceExisting });
      toast.success(`${result.imported} players imported${replaceExisting ? `, ${result.removed} previous players removed` : ''}`);
      setFileName('');
      setRows([]);
      setErrors([]);
      setReloadKey((current) => current + 1);
    } catch (error) { toast.error(error.message); }
    setBusy(false);
  };

  const copyPreviousPlayers = async () => {
    const sourceSeason = sourceSeasons.find((season) => season.id === sourceSeasonId);
    if (!sourceSeason) return toast.error('Choose a previous season first');
    if (!confirm(`Copy every player from ${sourceSeason.name} into this season? Player stats and auction sale prices will reset. Ensure teams from that season have already been copied.`)) return;
    setCopyBusy(true);
    try {
      const result = await api('POST', 'admin/players/copy-from-season', { source_season_id: sourceSeason.id });
      toast.success(`${result.imported} players copied from ${sourceSeason.name}`);
      setReloadKey((current) => current + 1);
    } catch (error) { toast.error(error.message); }
    setCopyBusy(false);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-display text-3xl uppercase mb-1">Player Roster</h1><p className="text-muted-foreground">Import players into their active-season teams, then complete their photos and stats.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={downloadPlayerCsvTemplate} className="glass border-white/10"><Download className="mr-1 h-4 w-4" />CSV template</Button><label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-white/10 glass px-3 text-sm font-medium"><FileUp className="h-4 w-4" />Choose players CSV<input type="file" accept=".csv,text/csv" className="sr-only" onChange={chooseFile} /></label></div></div>
      <Card className="glass mb-5 flex flex-wrap items-center justify-between gap-3 p-4"><div><h2 className="font-display text-lg uppercase">Copy roster from a previous season</h2><p className="mt-1 text-xs text-muted-foreground">Copies all players into matching active-season teams. Stats and sale prices reset; team profiles must already be copied.</p></div><div className="flex flex-wrap gap-2"><Select value={sourceSeasonId || 'none'} onValueChange={(value) => setSourceSeasonId(value === 'none' ? '' : value)}><SelectTrigger className="glass border-white/10 min-w-48"><SelectValue placeholder="Choose source season" /></SelectTrigger><SelectContent><SelectItem value="none">Choose source season</SelectItem>{sourceSeasons.map((season) => <SelectItem key={season.id} value={season.id}>{season.name}</SelectItem>)}</SelectContent></Select><Button disabled={copyBusy || !sourceSeasonId} onClick={copyPreviousPlayers} variant="outline" className="glass border-white/10"><Copy className="mr-1 h-4 w-4" />{copyBusy ? 'Copying…' : 'Copy full roster'}</Button></div></Card>
      <Card className="glass mb-5 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-lg uppercase">Roster import</h2><p className="mt-1 text-xs text-muted-foreground">Team accepts its name or short code. NPR amounts are converted to lakhs for the auction system.</p></div><div className="flex items-center gap-2"><Switch id="replace-player-roster" checked={replaceExisting} onCheckedChange={setReplaceExisting} /><Label htmlFor="replace-player-roster" className="text-sm">Replace current season roster</Label></div></div>
        {fileName && <div className="mt-4 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div className="min-w-0"><h3 className="truncate font-semibold">{fileName}</h3><p className="mt-1 text-sm text-muted-foreground">{busy ? 'Reading and validating CSV…' : `${rows.length} player rows ready`}</p></div></div><div className="flex gap-2"><Button disabled={busy || !rows.length || !!errors.length} onClick={importPlayers} className="font-semibold"><Upload className="mr-1 h-4 w-4" />{busy ? 'Please wait…' : `Import ${rows.length} players`}</Button><Button size="icon" variant="ghost" aria-label="Clear CSV selection" onClick={() => { setFileName(''); setRows([]); setErrors([]); }}><X className="h-4 w-4" /></Button></div></div>
          {!!errors.length && <div className="mt-4 rounded-md border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"><div className="font-semibold">Fix these CSV issues before importing</div><ul className="mt-2 list-inside list-disc space-y-1">{errors.slice(0, 8).map((error, index) => <li key={index}>{error}</li>)}</ul>{errors.length > 8 && <p className="mt-2">And {errors.length - 8} more…</p>}</div>}
          {!!rows.length && <div className="mt-4 overflow-x-auto rounded-md border border-white/10"><table className="w-full min-w-[640px] text-left text-sm"><thead className="text-xs uppercase text-muted-foreground"><tr>{['Player','Team','Category','Role','Nationality','Base NPR','Sold NPR'].map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr></thead><tbody>{rows.slice(0, 5).map((row, index) => <tr key={`${row.team_id}-${row.name}-${index}`} className="border-t border-white/10"><td className="px-3 py-2 font-medium">{row.name}</td><td className="px-3 py-2">{row.team_name}</td><td className="px-3 py-2">{row.category || '—'}</td><td className="px-3 py-2">{row.role || '—'}</td><td className="px-3 py-2">{row.country || '—'}</td><td className="px-3 py-2">{row.base_price_npr === null ? 'Default (20L)' : row.base_price_npr.toLocaleString()}</td><td className="px-3 py-2">{row.sold_price_npr === null ? '—' : row.sold_price_npr.toLocaleString()}</td></tr>)}</tbody></table>{rows.length > 5 && <p className="border-t border-white/10 px-3 py-2 text-xs text-muted-foreground">Showing 5 of {rows.length} rows</p>}</div>}
        </div>}
      </Card>
      <PlayerRetentionPlanner teams={teams} refreshKey={reloadKey} />
      <Resource key={reloadKey} table="players" title="Players" teams={teams} columns={[["name","Name"],["role","Role"],["sold_status","Status"]]} fields={PLAYER_FIELDS(teams)} onChanged={() => setReloadKey((current) => current + 1)} />
    </div>
  );
}

function PlayerRetentionPlanner({ teams, refreshKey }) {
  const [players, setPlayers] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const load = () => apiList('players').then(setPlayers).catch((error) => toast.error(error.message));
  useEffect(() => { load(); }, [refreshKey]);

  const updatePlan = async (player, destination) => {
    setBusyId(player.id);
    const patch = destination === 'release'
      ? { retain_next_season: false, next_team_id: null }
      : { retain_next_season: true, next_team_id: destination === player.team_id ? null : destination };
    try {
      await api('POST', 'admin/players', { id: player.id, ...patch });
      setPlayers((current) => current.map((row) => row.id === player.id ? { ...row, ...patch } : row));
      const targetTeam = teams.find((team) => team.id === destination);
      toast.success(destination === 'release' ? `${player.name} will be released next season` : destination === player.team_id ? `${player.name} retained with ${targetTeam?.name || 'current team'}` : `${player.name} will move to ${targetTeam?.name || 'the selected team'}`);
    } catch (error) { toast.error(error.message); }
    setBusyId(null);
  };

  const groups = [
    ...teams.map((team) => ({ team, players: players.filter((player) => player.team_id === team.id) })).filter((group) => group.players.length),
    { team: null, players: players.filter((player) => !player.team_id) },
  ].filter((group) => group.players.length);
  const retainedCount = players.filter((player) => player.retain_next_season !== false).length;
  const releasedCount = players.length - retainedCount;

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-display text-2xl uppercase">Next-season roster plan</h2><p className="mt-1 text-sm text-muted-foreground">Players stay with their current team by default. Release or move them before creating the next season.</p></div><div className="flex gap-3 text-xs uppercase text-muted-foreground"><span>{retainedCount} retained</span><span>{releasedCount} released</span></div></div>
      {!players.length ? <Card className="glass p-6 text-sm text-muted-foreground">No players in the active season yet.</Card> : <div className="space-y-3">
        {groups.map(({ team, players: groupPlayers }) => (
          <Card key={team?.id || 'unassigned'} className="glass overflow-hidden">
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">{team && <TeamBadge team={team} size={34} />}<div><h3 className="font-display text-lg uppercase">{team?.name || 'Unassigned / Auction pool'}</h3><p className="text-xs text-muted-foreground">{groupPlayers.length} {groupPlayers.length === 1 ? 'player' : 'players'}</p></div></div>
            <div className="divide-y divide-white/10">
              {groupPlayers.map((player) => {
                const plannedTeamId = player.retain_next_season === false ? 'release' : player.next_team_id || player.team_id || 'release';
                return <div key={player.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)] sm:items-center">
                  <div className="flex min-w-0 items-center gap-3">{player.photo_url ? <img src={player.photo_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 font-display font-bold text-primary">{player.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>}<div className="min-w-0"><Link href={`/players/${player.id}`} className="block truncate font-medium hover:text-primary">{player.name}</Link><p className="truncate text-xs text-muted-foreground">{player.category || player.role || 'Player'}{player.country ? ` · ${player.country}` : ''}</p></div></div>
                  <Select value={plannedTeamId} onValueChange={(value) => updatePlan(player, value)} disabled={busyId === player.id}><SelectTrigger className="glass border-white/10"><SelectValue placeholder="Choose next-season action" /></SelectTrigger><SelectContent><SelectItem value="release">Release for next season</SelectItem>{teams.map((option) => <SelectItem key={option.id} value={option.id}>{option.id === player.team_id ? `Retain · ${option.name}` : `Move to · ${option.name}`}</SelectItem>)}</SelectContent></Select>
                </div>;
              })}
            </div>
          </Card>
        ))}
      </div>}
    </section>
  );
}

function TeamsWorkspace({ teams, onChanged }) {
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [sourceSeasonId, setSourceSeasonId] = useState('');
  const [copyBusy, setCopyBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvRows, setCsvRows] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [csvBusy, setCsvBusy] = useState(false);
  const loadSeasonData = async () => {
    try {
      const [matchRows, playerRows] = await Promise.all([apiList('matches'), apiList('players')]);
      setMatches(matchRows);
      setPlayers(playerRows);
    } catch (error) { toast.error(error.message); }
  };
  useEffect(() => { loadSeasonData(); }, []);
  useEffect(() => {
    apiList('seasons').then((rows) => {
      setSeasons(rows);
      setSourceSeasonId((current) => current || rows.find((season) => !season.is_active)?.id || '');
    }).catch((error) => toast.error(error.message));
  }, []);
  const activeSeason = seasons.find((season) => season.is_active);
  const sourceSeasons = seasons.filter((season) => !season.is_active);

  const save = async (payload) => {
    try {
      await api('POST', 'admin/teams', payload);
      toast.success('Team saved');
      setOpen(false);
      setEditing(null);
      onChanged();
    } catch (error) { toast.error(error.message); }
  };
  const remove = async (team) => {
    if (!confirm(`Delete ${team.name}?`)) return;
    try {
      await api('DELETE', `admin/teams?id=${team.id}`);
      toast.success('Team deleted');
      onChanged();
    } catch (error) { toast.error(error.message); }
  };
  const copyTeams = async () => {
    const sourceSeason = sourceSeasons.find((season) => season.id === sourceSeasonId);
    if (!sourceSeason) return toast.error('Choose a previous season first');
    if (!confirm(`Copy teams from ${sourceSeason.name} into ${activeSeason?.name || 'the active season'}? Season standings and purses will reset. Players will not be copied.`)) return;
    setCopyBusy(true);
    try {
      const result = await api('POST', 'admin/teams/copy-from-season', { source_season_id: sourceSeason.id });
      toast.success(`${result.imported} teams copied from ${sourceSeason.name}`);
      onChanged();
    } catch (error) { toast.error(error.message); }
    setCopyBusy(false);
  };
  const selectCsv = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setCsvFileName(file.name);
    setCsvBusy(true);
    const parsed = await parseTeamCsv(file);
    setCsvRows(parsed.rows);
    setCsvErrors(parsed.errors);
    setCsvBusy(false);
  };
  const importCsv = async () => {
    if (!csvRows.length || csvErrors.length) return;
    setCsvBusy(true);
    try {
      const result = await api('POST', 'admin/teams/import', { rows: csvRows });
      toast.success(`${result.imported} teams imported`);
      setCsvFileName('');
      setCsvRows([]);
      setCsvErrors([]);
      onChanged();
    } catch (error) { toast.error(error.message); }
    setCsvBusy(false);
  };

  const records = deriveTeamStats(teams, matches);
  const recordById = new Map(records.map((team) => [team.id, team]));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div><h1 className="font-display text-3xl uppercase mb-1">Team Management</h1><p className="text-muted-foreground">Build each franchise profile. Match records and player leaders update from this season’s data.</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/teams" target="_blank" className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 glass px-3 text-sm"><ExternalLink className="h-4 w-4" />Public teams</Link><Button variant="outline" onClick={downloadTeamCsvTemplate} className="glass border-white/10"><Download className="mr-1 h-4 w-4" />CSV template</Button><label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-white/10 glass px-3 text-sm font-medium"><FileUp className="h-4 w-4" />Choose CSV<input type="file" accept=".csv,text/csv" className="sr-only" onChange={selectCsv} /></label><Button onClick={() => { setEditing({}); setOpen(true); }} className="font-semibold glow-green"><Plus className="h-4 w-4 mr-1" />Add team</Button></div>
      </div>
      <Card className="glass mb-5 flex flex-wrap items-center justify-between gap-3 p-4"><div><h2 className="font-display text-lg uppercase">Bring teams into {activeSeason?.name || 'this season'}</h2><p className="mt-1 text-xs text-muted-foreground">Copy team profiles from a previous season. Existing teams are never overwritten; players are not copied.</p></div><div className="flex flex-wrap gap-2"><Select value={sourceSeasonId || 'none'} onValueChange={(value) => setSourceSeasonId(value === 'none' ? '' : value)}><SelectTrigger className="glass border-white/10 min-w-48"><SelectValue placeholder="Choose previous season" /></SelectTrigger><SelectContent><SelectItem value="none">Choose previous season</SelectItem>{sourceSeasons.map((season) => <SelectItem key={season.id} value={season.id}>{season.name}</SelectItem>)}</SelectContent></Select><Button disabled={copyBusy || !sourceSeasonId} onClick={copyTeams} variant="outline" className="glass border-white/10"><Copy className="mr-1 h-4 w-4" />{copyBusy ? 'Copying…' : 'Copy teams'}</Button></div></Card>
      <p className="-mt-3 mb-5 text-xs text-muted-foreground">Use the template header as-is. Team name is required; logos must be public URLs. Imports add teams to the active season and never overwrite existing teams.</p>
      {csvFileName && <Card className="glass mb-5 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3"><FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div className="min-w-0"><h2 className="truncate font-semibold">{csvFileName}</h2><p className="mt-1 text-sm text-muted-foreground">{csvBusy ? 'Reading and validating CSV…' : `${csvRows.length} team rows ready for the active season`}</p></div></div>
          <div className="flex gap-2"><Button disabled={csvBusy || !csvRows.length || !!csvErrors.length} onClick={importCsv} className="font-semibold"><Upload className="mr-1 h-4 w-4" />{csvBusy ? 'Please wait…' : `Import ${csvRows.length} teams`}</Button><Button size="icon" variant="ghost" aria-label="Clear CSV selection" onClick={() => { setCsvFileName(''); setCsvRows([]); setCsvErrors([]); }}><X className="h-4 w-4" /></Button></div>
        </div>
        {!!csvErrors.length && <div className="mt-4 rounded-md border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"><div className="font-semibold">Fix these CSV issues before importing</div><ul className="mt-2 list-inside list-disc space-y-1">{csvErrors.slice(0, 8).map((error, index) => <li key={index}>{error}</li>)}</ul>{csvErrors.length > 8 && <p className="mt-2">And {csvErrors.length - 8} more…</p>}</div>}
        {!!csvRows.length && <div className="mt-4 overflow-x-auto rounded-md border border-white/10"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-xs uppercase text-muted-foreground"><tr>{['Team','Code','City','Owner','Stadium'].map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr></thead><tbody>{csvRows.slice(0, 5).map((row, index) => <tr key={`${row.name}-${index}`} className="border-t border-white/10"><td className="px-3 py-2 font-medium">{row.name}</td><td className="px-3 py-2">{row.short_name || '—'}</td><td className="px-3 py-2">{row.city || '—'}</td><td className="px-3 py-2">{row.owner || '—'}</td><td className="px-3 py-2">{row.stadium || '—'}</td></tr>)}</tbody></table>{csvRows.length > 5 && <p className="border-t border-white/10 px-3 py-2 text-xs text-muted-foreground">Showing 5 of {csvRows.length} rows</p>}</div>}
      </Card>}
      <div className="grid gap-4 xl:grid-cols-2">
        {teams.map((team) => {
          const record = recordById.get(team.id) || team;
          const { squad, topScorer, topWicketTaker } = teamLeaders(players, team.id);
          const internationalPlayers = squad.filter((player) => player.is_national).length;
          return (
            <Card key={team.id} className="glass overflow-hidden" style={{ borderColor: `${team.color || '#39FF14'}55` }}>
              <div className="p-5 md:p-6">
                <div className="flex items-start gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl" style={{ background: `${team.color || '#39FF14'}22` }}>
                    {team.logo_url ? <img src={team.logo_url} alt={`${team.name} logo`} className="h-full w-full object-contain" /> : <TeamBadge team={team} size={56} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-2xl uppercase leading-none">{team.name}</h2><Badge variant="outline" className="border-white/15">{team.short_name || 'TEAM'}</Badge></div>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" />{[team.city || team.home_city, team.state].filter(Boolean).join(', ') || team.location || 'Location not set'}</p>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{team.description || 'Add a short team introduction.'}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon" variant="ghost" aria-label={`Edit ${team.name}`} onClick={() => { setEditing(team); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label={`Delete ${team.name}`} onClick={() => remove(team)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-5 gap-2 text-center">
                  {[['P',record.played],['W',record.won],['L',record.lost],['D',record.tied],['NR',record.no_result]].map(([label, value]) => <div key={label} className="rounded-md bg-white/[0.04] py-2"><div className="font-num text-2xl text-primary">{value || 0}</div><div className="text-[10px] uppercase text-muted-foreground">{label}</div></div>)}
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <LeaderLine icon={Trophy} label="Top scorer" player={topScorer} stat={`${topScorer?.stats?.runs || 0} runs`} />
                  <LeaderLine icon={Radio} label="Top wicket taker" player={topWicketTaker} stat={`${topWicketTaker?.stats?.wickets || 0} wickets`} />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-muted-foreground">
                  <span>{team.owner ? `Owner · ${team.owner}` : 'Owner not set'}{team.captain ? `  /  Captain · ${team.captain}` : ''}</span>
                  <span className="inline-flex items-center gap-1.5">{internationalPlayers > 0 && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}{internationalPlayers} national team {internationalPlayers === 1 ? 'player' : 'players'} · {squad.length} squad</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {!teams.length && <Card className="glass p-10 text-center text-muted-foreground">No teams in this season yet. Add the first team to get started.</Card>}
      <RecordDialog open={open} onOpenChange={setOpen} title="Team" fields={TEAM_FIELDS} editing={editing} onSave={save} />
    </div>
  );
}

function LeaderLine({ icon: Icon, label, player, stat }) {
  return <div className="flex min-w-0 items-center gap-2 rounded-md bg-white/[0.04] px-3 py-2"><Icon className="h-4 w-4 shrink-0 text-primary" /><div className="min-w-0 flex-1"><div className="text-[10px] uppercase text-muted-foreground">{label}</div><div className="truncate text-sm font-medium">{player?.name || 'Not available'}</div></div><span className="shrink-0 font-num text-base text-primary">{stat}</span></div>;
}

// ---------- GENERIC RESOURCE MANAGER ----------
const MATCH_FIELDS = (teams) => [['team_a','Team A','team',teams],['team_b','Team B','team',teams],['winner_team','Winner','team',teams],['match_no','Match number','number'],['match_day','Day','text'],['start_time','Start Time','datetime'],['venue','Venue','text'],['stage','Stage','text'],['status','Status','select',['upcoming','live','completed']],['overs','Overs','number'],['team_a_runs','A Runs','number'],['team_a_wickets','A Wkts','number'],['team_a_overs','A Overs','number'],['team_b_runs','B Runs','number'],['team_b_wickets','B Wkts','number'],['team_b_overs','B Overs','number'],['current_innings','Innings','number'],['win_probability','Win Prob A %','number'],['result','Result','text']];

const MATCH_CSV_COLUMNS = ['match_number','date','day','time','team_1','team_2','venue','stage','winner','result_summary'];

function parseMatchStart(dateValue, timeValue) {
  const dateText = String(dateValue || '').trim();
  const timeText = String(timeValue || '').trim();
  let year;
  let month;
  let day;
  let dateParts = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(dateText);
  if (dateParts) {
    year = Number(dateParts[1]);
    month = Number(dateParts[2]);
    day = Number(dateParts[3]);
  } else {
    dateParts = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(dateText);
    if (dateParts) {
      const first = Number(dateParts[1]);
      const second = Number(dateParts[2]);
      year = Number(dateParts[3]);
      if (first > 12) { day = first; month = second; }
      else if (second > 12) { month = first; day = second; }
      else { day = first; month = second; }
    } else {
      const fallbackDate = new Date(dateText);
      if (Number.isNaN(fallbackDate.getTime())) return null;
      year = fallbackDate.getUTCFullYear();
      month = fallbackDate.getUTCMonth() + 1;
      day = fallbackDate.getUTCDate();
    }
  }

  const timeParts = /^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(AM|PM)?$/i.exec(timeText);
  if (!timeParts) return null;
  let hour = Number(timeParts[1]);
  const minute = Number(timeParts[2] || 0);
  const meridiem = timeParts[3]?.toUpperCase();
  if (minute > 59) return null;
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    if (meridiem === 'PM' && hour !== 12) hour += 12;
  }
  if (hour > 23) return null;
  const timestamp = Date.UTC(year, month - 1, day, hour, minute);
  const parsed = new Date(timestamp);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return parsed.toISOString();
}

function parseMatchesCsv(file, teams) {
  return new Promise((resolve) => Papa.parse(file, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => {
      const normalized = header.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[.]/g, '').replace(/[\s-]+/g, '_');
      return normalized === 'match_no' ? 'match_number' : normalized;
    },
    complete: (result) => {
      const errors = result.errors.map((error) => `CSV row ${error.row + 2}: ${error.message}`);
      const teamByLabel = new Map();
      teams.forEach((team) => [team.name, team.short_name].filter(Boolean).forEach((label) => teamByLabel.set(String(label).trim().toLowerCase(), team)));
      const rows = [];
      const matchNumbers = new Set();
      result.data.forEach((source, index) => {
        const rowNumber = index + 2;
        const matchNumber = Number(source.match_number);
        const team1Label = String(source.team_1 || '').trim();
        const team2Label = String(source.team_2 || '').trim();
        const team1 = teamByLabel.get(team1Label.toLowerCase());
        const team2 = teamByLabel.get(team2Label.toLowerCase());
        const winnerLabel = String(source.winner || '').trim();
        const winner = teamByLabel.get(winnerLabel.toLowerCase());
        const resultSummary = String(source.result_summary || source.result || '').trim();
        const noWinnerResult = /^(no result|draw|tie|tied|abandoned|cancelled|canceled|[-—])$/i.test(winnerLabel);
        const startTime = parseMatchStart(source.date, source.time);
        if (!Number.isInteger(matchNumber) || matchNumber < 1) errors.push(`CSV row ${rowNumber}: match_number must be a positive whole number`);
        if (!team1) errors.push(`CSV row ${rowNumber}: team_1 "${team1Label || '(blank)'}" does not match an active-season team`);
        if (!team2) errors.push(`CSV row ${rowNumber}: team_2 "${team2Label || '(blank)'}" does not match an active-season team`);
        if (team1 && team2 && team1.id === team2.id) errors.push(`CSV row ${rowNumber}: team_1 and team_2 must be different`);
        if (winnerLabel && !winner && !noWinnerResult) errors.push(`CSV row ${rowNumber}: winner "${winnerLabel}" does not match either active-season team`);
        if (winner && team1 && team2 && winner.id !== team1.id && winner.id !== team2.id) errors.push(`CSV row ${rowNumber}: winner must be team_1 or team_2`);
        if (!startTime) errors.push(`CSV row ${rowNumber}: date/time is invalid`);
        const venue = String(source.venue || '').trim();
        if (!venue) errors.push(`CSV row ${rowNumber}: venue is required`);
        if (!Number.isInteger(matchNumber) || matchNumber < 1 || !team1 || !team2 || team1.id === team2.id || (winnerLabel && !winner && !noWinnerResult) || (winner && winner.id !== team1.id && winner.id !== team2.id) || !startTime || !venue) return;
        if (matchNumbers.has(matchNumber)) errors.push(`CSV row ${rowNumber}: duplicate match_number ${matchNumber}`);
        matchNumbers.add(matchNumber);
        const matchDay = String(source.day || '').trim() || new Intl.DateTimeFormat('en', { weekday: 'long', timeZone: 'UTC' }).format(new Date(startTime));
        rows.push({ match_no: matchNumber, start_time: startTime, match_day: matchDay, team_a: team1.id, team_b: team2.id, team_a_name: team1.name, team_b_name: team2.name, winner_team: winner?.id || null, venue, stage: String(source.stage || '').trim() || null, result: resultSummary || (noWinnerResult ? winnerLabel : null), status: winnerLabel || resultSummary ? 'completed' : 'upcoming', overs: 20, win_probability: 50 });
      });
      if (rows.length > 500) errors.push('Import is limited to 500 matches per file');
      resolve({ rows, errors });
    },
    error: (error) => resolve({ rows: [], errors: [error.message] }),
  }));
}

function downloadMatchCsvTemplate() {
  const url = URL.createObjectURL(new Blob([`${MATCH_CSV_COLUMNS.join(',')}\n`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'matches-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function MatchesWorkspace({ teams }) {
  const [reloadKey, setReloadKey] = useState(0);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [replaceSchedule, setReplaceSchedule] = useState(false);
  const [busy, setBusy] = useState(false);

  const chooseFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFileName(file.name);
    setBusy(true);
    try {
      const activeTeams = teams.length ? teams : await apiList('teams');
      const parsed = await parseMatchesCsv(file, activeTeams);
      setRows(parsed.rows);
      setErrors(parsed.errors);
    } catch (error) {
      setRows([]);
      setErrors([error.message]);
    }
    setBusy(false);
  };

  const importMatches = async () => {
    if (!rows.length || errors.length) return;
    if (replaceSchedule && !confirm(`Replace all matches in the active season with these ${rows.length} fixtures? Existing scorecards will also be deleted.`)) return;
    setBusy(true);
    try {
      const result = await api('POST', 'admin/matches/import', { rows, replace_existing: replaceSchedule });
      toast.success(`${result.imported} matches imported${replaceSchedule ? `, ${result.removed} previous matches removed` : ''}`);
      setFileName('');
      setRows([]);
      setErrors([]);
      setReloadKey((current) => current + 1);
    } catch (error) { toast.error(error.message); }
    setBusy(false);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-display text-3xl uppercase mb-1">Tournament Fixtures</h1><p className="text-muted-foreground">Import schedule rows into the active season. Team names or short codes are accepted.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={downloadMatchCsvTemplate} className="glass border-white/10"><Download className="mr-1 h-4 w-4" />CSV template</Button><label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-white/10 glass px-3 text-sm font-medium"><FileUp className="h-4 w-4" />Choose matches CSV<input type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" className="sr-only" onChange={chooseFile} /></label></div></div>
      <Card className="glass mb-5 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-lg uppercase">Schedule import</h2><p className="mt-1 text-xs text-muted-foreground">Accepts comma- or tab-delimited files. Blank day is derived from the date.</p></div><div className="flex items-center gap-2"><Switch id="replace-match-schedule" checked={replaceSchedule} onCheckedChange={setReplaceSchedule} /><Label htmlFor="replace-match-schedule" className="text-sm">Replace current season schedule</Label></div></div>
        {fileName && <div className="mt-4 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div className="min-w-0"><h3 className="truncate font-semibold">{fileName}</h3><p className="mt-1 text-sm text-muted-foreground">{busy ? 'Reading and validating schedule…' : `${rows.length} matches ready`}</p></div></div><div className="flex gap-2"><Button disabled={busy || !rows.length || !!errors.length} onClick={importMatches} className="font-semibold"><Upload className="mr-1 h-4 w-4" />{busy ? 'Please wait…' : `Import ${rows.length} matches`}</Button><Button size="icon" variant="ghost" aria-label="Clear CSV selection" onClick={() => { setFileName(''); setRows([]); setErrors([]); }}><X className="h-4 w-4" /></Button></div></div>
          {!!errors.length && <div className="mt-4 rounded-md border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"><div className="font-semibold">Fix these schedule issues before importing</div><ul className="mt-2 list-inside list-disc space-y-1">{errors.slice(0, 8).map((error, index) => <li key={index}>{error}</li>)}</ul>{errors.length > 8 && <p className="mt-2">And {errors.length - 8} more…</p>}</div>}
          {!!rows.length && <div className="mt-4 overflow-x-auto rounded-md border border-white/10"><table className="w-full min-w-[700px] text-left text-sm"><thead className="text-xs uppercase text-muted-foreground"><tr>{['#','Date','Day','Time','Team 1','Team 2','Venue','Stage'].map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr></thead><tbody>{rows.slice(0, 5).map((row) => <tr key={row.match_no} className="border-t border-white/10"><td className="px-3 py-2">{row.match_no}</td><td className="px-3 py-2">{row.start_time.slice(0, 10)}</td><td className="px-3 py-2">{row.match_day}</td><td className="px-3 py-2">{row.start_time.slice(11, 16)}</td><td className="px-3 py-2">{row.team_a_name}</td><td className="px-3 py-2">{row.team_b_name}</td><td className="px-3 py-2">{row.venue}</td><td className="px-3 py-2">{row.stage || '—'}</td></tr>)}</tbody></table>{rows.length > 5 && <p className="border-t border-white/10 px-3 py-2 text-xs text-muted-foreground">Showing 5 of {rows.length} matches</p>}</div>}
        </div>}
      </Card>
      <Resource key={reloadKey} table="matches" title="Matches" teams={teams} columns={[["match_no","#"],["venue","Venue"],["stage","Stage"],["status","Status"]]} fields={MATCH_FIELDS(teams)} teamNames />
    </div>
  );
}
const SPONSOR_FIELDS = [['name','Name','text'],['tier','Tier','select',['title','gold','silver','partner']],['link','Link','text'],['logo_url','Logo','image'],['order_index','Order','number']];
const GALLERY_FIELDS = [['image_url','Image','image'],['caption','Caption','text'],['category','Category','text'],['order_index','Order','number']];
const NEWS_FIELDS = [['title','Title','text'],['excerpt','Excerpt','text'],['body','Body','textarea'],['cover_url','Cover','image'],['author','Author','text'],['published','Published','bool']];

function Resource({ table, title, columns, fields, teams = [], teamNames, onChanged }) {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const load = () => apiList(table).then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, [table]);
  const teamName = (id) => teams.find((t) => t.id === id)?.short_name || '—';
  const save = async (payload) => { try { await api('POST', `admin/${table}`, payload); toast.success('Saved'); setOpen(false); setEditing(null); load(); onChanged?.(); } catch (e) { toast.error(e.message); } };
  const del = async (id) => { if (!confirm('Delete this item?')) return; try { await api('DELETE', `admin/${table}?id=${id}`); toast.success('Deleted'); load(); onChanged?.(); } catch (e) { toast.error(e.message); } };
  return (
    <div>
      <div className="flex items-center justify-between mb-6"><h1 className="font-display text-3xl uppercase">{title}</h1><Button onClick={() => { setEditing({}); setOpen(true); }} className="font-semibold glow-green"><Plus className="h-4 w-4 mr-1" />Add</Button></div>
      <Card className="glass overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]"><thead><tr className="text-left text-xs uppercase text-muted-foreground border-b border-white/10">{teamNames && <th className="py-3 px-4">Teams</th>}{columns.map(([k, l]) => <th key={k} className="py-3 px-4">{l}</th>)}<th className="px-4">Actions</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
              {teamNames && <td className="py-3 px-4 font-display uppercase">{teamName(r.team_a)} v {teamName(r.team_b)}</td>}
              {columns.map(([k]) => <td key={k} className="py-3 px-4">{typeof r[k] === 'boolean' ? (r[k] ? <Badge className="bg-primary/15 text-primary border-primary/30">Yes</Badge> : 'No') : String(r[k] ?? '—')}</td>)}
              <td className="px-4"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></td>
            </tr>
          ))}</tbody>
        </table>
        {!rows.length && <p className="text-muted-foreground text-center py-10">No records yet.</p>}
      </Card>
      <RecordDialog open={open} onOpenChange={setOpen} title={title} fields={fields} editing={editing} onSave={save} />
    </div>
  );
}

function RecordDialog({ open, onOpenChange, title, fields, editing, onSave }) {
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState('');
  useEffect(() => { setForm(editing || {}); }, [editing, open]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const onUpload = async (k, file) => { if (!file) return; setUploading(k); try { const url = await uploadFile(file); set(k, url); toast.success('Uploaded'); } catch (e) { toast.error(e.message); } setUploading(''); };
  const submit = () => {
    const payload = { ...form };
    for (const [key, label, type] of fields) {
      if (type === 'number' && payload[key] !== undefined && payload[key] !== '') payload[key] = Number(payload[key]);
      if (type === 'datetime' && payload[key]) payload[key] = new Date(payload[key]).toISOString();
      if (type === 'json' && typeof payload[key] === 'string') {
        try { payload[key] = JSON.parse(payload[key]); }
        catch { toast.error(`${label} must be valid JSON`); return; }
      }
    }
    onSave(payload);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display uppercase">{form?.id ? 'Edit' : 'New'} {title.replace(/s$/, '')}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          {fields.map(([k, label, type, opts]) => (
            <div key={k}>
              <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
              {type === 'textarea' ? <Textarea value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)} className="glass border-white/10 mt-1" rows={4} />
                : type === 'json' ? <Textarea value={typeof form[k] === 'string' ? form[k] : JSON.stringify(form[k] || {}, null, 2)} onChange={(e) => set(k, e.target.value)} className="glass border-white/10 mt-1 font-mono text-xs" rows={6} />
                : type === 'bool' ? <div className="mt-2"><Switch checked={!!form[k]} onCheckedChange={(v) => set(k, v)} /></div>
                : type === 'select' ? <Select value={form[k] ?? ''} onValueChange={(v) => set(k, v)}><SelectTrigger className="glass border-white/10 mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                : type === 'team' ? <Select value={form[k] ?? 'none'} onValueChange={(v) => set(k, v === 'none' ? null : v)}><SelectTrigger className="glass border-white/10 mt-1"><SelectValue placeholder="Select team" /></SelectTrigger><SelectContent><SelectItem value="none">— None —</SelectItem>{(opts || []).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
                : type === 'image' ? <div className="mt-1 space-y-2"><div className="flex gap-2"><Input value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)} placeholder="Paste URL or upload" className="glass border-white/10" /><label className="shrink-0"><input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(k, e.target.files?.[0])} /><span className="inline-flex items-center gap-1 h-10 px-3 rounded-md border border-white/10 glass cursor-pointer text-sm">{uploading === k ? '…' : <><Upload className="h-4 w-4" /></>}</span></label></div>{form[k] && <img src={form[k]} alt="" className="h-20 rounded-lg object-cover" />}</div>
                : type === 'datetime' ? <Input type="datetime-local" value={form[k] ? toLocal(form[k]) : ''} onChange={(e) => set(k, e.target.value)} className="glass border-white/10 mt-1" />
                : <Input type={type === 'number' ? 'number' : 'text'} value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)} className="glass border-white/10 mt-1" />}
            </div>
          ))}
        </div>
        <DialogFooter><Button onClick={submit} className="font-semibold glow-green">Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function toLocal(iso) { const d = new Date(iso); const off = d.getTimezoneOffset() * 60000; return new Date(d - off).toISOString().slice(0, 16); }

// ---------- SECTIONS BUILDER ----------
function Sections() {
  const [rows, setRows] = useState([]);
  const [edit, setEdit] = useState(null);
  const load = () => apiList('sections', 'order_index').then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, []);
  const update = async (row, patch) => { try { await api('POST', 'admin/sections', { id: row.id, ...patch }); load(); } catch (e) { toast.error(e.message); } };
  const move = async (i, dir) => { const j = i + dir; if (j < 0 || j >= rows.length) return; const a = rows[i], b = rows[j]; await update(a, { order_index: b.order_index }); await update(b, { order_index: a.order_index }); };
  const saveEdit = async () => { try { await api('POST', 'admin/sections', { id: edit.id, title: edit.title, subtitle: edit.subtitle, content: edit.content }); toast.success('Section updated'); setEdit(null); load(); } catch (e) { toast.error(e.message); } };
  return (
    <div>
      <h1 className="font-display text-3xl uppercase mb-1">Homepage Builder</h1>
      <p className="text-muted-foreground mb-6">Reorder, show/hide and edit every section. Changes are live.</p>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <Card key={r.id} className="glass p-4 flex items-center gap-4">
            <div className="flex flex-col"><button onClick={() => move(i, -1)} className="text-muted-foreground hover:text-primary"><ArrowUp className="h-4 w-4" /></button><button onClick={() => move(i, 1)} className="text-muted-foreground hover:text-primary"><ArrowDown className="h-4 w-4" /></button></div>
            <div className="flex-1 min-w-0"><div className="font-display uppercase">{r.title || r.type}</div><div className="text-xs text-muted-foreground">{r.type} · {r.subtitle}</div></div>
            <Badge variant="outline" className="border-white/10 uppercase text-[10px]">{r.type}</Badge>
            <button onClick={() => update(r, { visible: !r.visible })} title="Toggle visibility">{r.visible ? <Eye className="h-5 w-5 text-primary" /> : <EyeOff className="h-5 w-5 text-muted-foreground" />}</button>
            <Button size="sm" variant="ghost" onClick={() => setEdit(r)}><Pencil className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="glass-strong">
          <DialogHeader><DialogTitle className="font-display uppercase">Edit Section · {edit?.type}</DialogTitle></DialogHeader>
          {edit && <div className="grid gap-3">
            <div><Label className="text-xs uppercase text-muted-foreground">Title</Label><Input value={edit.title ?? ''} onChange={(e) => setEdit({ ...edit, title: e.target.value })} className="glass border-white/10 mt-1" /></div>
            <div><Label className="text-xs uppercase text-muted-foreground">Subtitle</Label><Input value={edit.subtitle ?? ''} onChange={(e) => setEdit({ ...edit, subtitle: e.target.value })} className="glass border-white/10 mt-1" /></div>
            <div><Label className="text-xs uppercase text-muted-foreground">Content (JSON — e.g. CTA text)</Label><Textarea rows={4} value={JSON.stringify(edit.content || {}, null, 2)} onChange={(e) => { try { setEdit({ ...edit, content: JSON.parse(e.target.value) }); } catch {} }} className="glass border-white/10 mt-1 font-mono text-xs" /></div>
          </div>}
          <DialogFooter><Button onClick={saveEdit} className="font-semibold glow-green">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- LIVE SCORING ----------
function Scoring({ teams }) {
  const [matches, setMatches] = useState([]);
  const [sel, setSel] = useState(null);
  const [m, setM] = useState(null);
  const [commentary, setCommentary] = useState('');
  const load = () => apiList('matches', 'start_time').then(setMatches).catch(() => setMatches([]));
  useEffect(() => { load(); }, []);
  useEffect(() => { if (sel) { const found = matches.find((x) => x.id === sel); setM(found ? { ...found } : null); } }, [sel, matches]);
  const tn = (id) => teams.find((t) => t.id === id)?.short_name || '?';
  const save = async (extra = {}) => { try { await api('POST', 'admin/matches', { id: m.id, ...fieldsOnly(m), ...extra }); toast.success('Score updated — live!'); load(); } catch (e) { toast.error(e.message); } };
  const addComment = async () => { if (!commentary) return; const list = [{ over: m.current_innings === 1 ? m.team_a_overs : m.team_b_overs, text: commentary }, ...(m.commentary || [])].slice(0, 20); setM({ ...m, commentary: list }); setCommentary(''); await api('POST', 'admin/matches', { id: m.id, commentary: list }); load(); };
  const num = (k, label) => <div><Label className="text-[10px] uppercase text-muted-foreground">{label}</Label><Input type="number" value={m[k] ?? 0} onChange={(e) => setM({ ...m, [k]: Number(e.target.value) })} className="glass border-white/10 mt-1" /></div>;
  return (
    <div>
      <h1 className="font-display text-3xl uppercase mb-1">Live Scoring</h1>
      <p className="text-muted-foreground mb-6">Update the scoreboard and the public site reacts in realtime.</p>
      <Select value={sel ?? ''} onValueChange={setSel}><SelectTrigger className="glass border-white/10 max-w-md"><SelectValue placeholder="Choose a match" /></SelectTrigger><SelectContent>{matches.map((x) => <SelectItem key={x.id} value={x.id}>{tn(x.team_a)} v {tn(x.team_b)} · {x.status}</SelectItem>)}</SelectContent></Select>
      {m && (
        <Card className="glass p-6 mt-6 space-y-6">
          <div className="flex items-center gap-3"><Label className="text-xs uppercase text-muted-foreground">Status</Label><Select value={m.status} onValueChange={(v) => setM({ ...m, status: v })}><SelectTrigger className="glass border-white/10 w-40"><SelectValue /></SelectTrigger><SelectContent>{['upcoming','live','completed'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><Select value={String(m.current_innings)} onValueChange={(v) => setM({ ...m, current_innings: Number(v) })}><SelectTrigger className="glass border-white/10 w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Innings 1</SelectItem><SelectItem value="2">Innings 2</SelectItem></SelectContent></Select></div>
          <div><div className="font-display uppercase mb-2">{tn(m.team_a)}</div><div className="grid grid-cols-3 gap-3">{num('team_a_runs','Runs')}{num('team_a_wickets','Wkts')}{num('team_a_overs','Overs')}</div></div>
          <div><div className="font-display uppercase mb-2">{tn(m.team_b)}</div><div className="grid grid-cols-3 gap-3">{num('team_b_runs','Runs')}{num('team_b_wickets','Wkts')}{num('team_b_overs','Overs')}</div></div>
          <div className="grid grid-cols-2 gap-3">{num('win_probability','Win Prob A %')}<div><Label className="text-[10px] uppercase text-muted-foreground">Result / Status text</Label><Input value={m.result ?? ''} onChange={(e) => setM({ ...m, result: e.target.value })} className="glass border-white/10 mt-1" /></div></div>
          <div className="flex gap-2"><Input value={commentary} onChange={(e) => setCommentary(e.target.value)} placeholder="Add commentary line…" className="glass border-white/10" /><Button onClick={addComment} variant="outline" className="glass border-white/10">Add</Button></div>
          <Button onClick={() => save()} className="font-semibold glow-green">Push Update Live</Button>
        </Card>
      )}
    </div>
  );
}
function fieldsOnly(m) { const { id, created_at, commentary, ...rest } = m; return rest; }

// ---------- AUCTION CONTROL ----------
function Auction({ teams }) {
  const [state, setState] = useState(null);
  const [players, setPlayers] = useState([]);
  const load = async () => {
    try {
      const [states, pls] = await Promise.all([apiList('auction_state'), apiList('players')]);
      setState(states[0] || { id: 1, status: 'idle', increment: 20 });
      setPlayers((pls || []).filter((p) => !p.team_id));
    } catch (e) { setState({ id: 1, status: 'idle', increment: 20 }); }
  };
  useEffect(() => { load(); }, []);
  const saveState = async (patch) => { const next = { ...state, ...patch, id: 1 }; setState(next); try { await api('POST', 'admin/auction_state', next); toast.success('Auction updated'); } catch (e) { toast.error(e.message); } };
  const sellCurrent = async (status) => {
    const lot = players.find((p) => p.id === state.current_player_id); if (!lot) return toast.error('No current lot');
    let patch = { id: lot.id, sold_status: status };
    if (status === 'sold') { const price = Number(prompt('Sold price (in Lakhs)?', '200')); const teamId = prompt('Team ID or short code?', teams[0]?.short_name); const team = teams.find((t) => t.short_name === teamId || t.id === teamId); patch = { ...patch, sold_price: price, team_id: team?.id || null }; }
    try { await api('POST', 'admin/players', patch); toast.success(`Marked ${status}`); load(); } catch (e) { toast.error(e.message); }
  };
  if (!state) return null;
  const lot = players.find((p) => p.id === state.current_player_id);
  return (
    <div>
      <h1 className="font-display text-3xl uppercase mb-1">Auction Control</h1>
      <p className="text-muted-foreground mb-6">Run the live auction. The public room updates instantly.</p>
      <Card className="glass p-6 space-y-5 max-w-xl">
        <div className="flex items-center gap-3"><Label className="text-xs uppercase text-muted-foreground w-24">Status</Label><Select value={state.status} onValueChange={(v) => saveState({ status: v })}><SelectTrigger className="glass border-white/10 w-48"><SelectValue /></SelectTrigger><SelectContent>{['idle','live','paused'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div className="flex items-center gap-3"><Label className="text-xs uppercase text-muted-foreground w-24">Current Lot</Label><Select value={state.current_player_id ?? 'none'} onValueChange={(v) => saveState({ current_player_id: v === 'none' ? null : v, current_bid: 0, current_bid_team: null })}><SelectTrigger className="glass border-white/10 flex-1"><SelectValue placeholder="Pick player" /></SelectTrigger><SelectContent><SelectItem value="none">— None —</SelectItem>{players.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sold_status})</SelectItem>)}</SelectContent></Select></div>
        <div className="flex items-center gap-3"><Label className="text-xs uppercase text-muted-foreground w-24">Increment (L)</Label><Input type="number" value={state.increment ?? 20} onChange={(e) => setState({ ...state, increment: Number(e.target.value) })} onBlur={() => saveState({ increment: state.increment })} className="glass border-white/10 w-32" /></div>
        {lot && <div className="glass rounded-xl p-4"><div className="font-display text-xl uppercase">{lot.name}</div><div className="text-sm text-muted-foreground">{lot.role} · base {lot.base_price}L · {lot.sold_status}</div><div className="flex gap-2 mt-3"><Button onClick={() => sellCurrent('sold')} className="font-semibold glow-green">Mark SOLD</Button><Button onClick={() => sellCurrent('unsold')} variant="outline" className="glass border-white/10">Mark UNSOLD</Button></div></div>}
      </Card>
    </div>
  );
}

// ---------- REGISTRATIONS ----------
function Registrations() {
  const [rows, setRows] = useState([]);
  const load = () => apiList('registrations').then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, []);
  const setStatus = async (r, status) => { try { await api('POST', 'admin/registrations', { id: r.id, status }); load(); } catch (e) { toast.error(e.message); } };
  const exportCsv = async () => { const t = token(); const res = await fetch('/api/export/registrations', { headers: { Authorization: `Bearer ${t}` } }); const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'registrations.csv'; a.click(); };
  return (
    <div>
      <div className="flex items-center justify-between mb-6"><h1 className="font-display text-3xl uppercase">Registrations</h1><Button onClick={exportCsv} variant="outline" className="glass border-white/10"><Download className="h-4 w-4 mr-1" />Export CSV</Button></div>
      <Card className="glass overflow-x-auto"><table className="w-full text-sm min-w-[640px]"><thead><tr className="text-left text-xs uppercase text-muted-foreground border-b border-white/10"><th className="py-3 px-4">Name</th><th className="px-4">Email</th><th className="px-4">Role</th><th className="px-4">City</th><th className="px-4">Status</th><th className="px-4">Actions</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} className="border-b border-white/5"><td className="py-3 px-4 font-medium">{r.full_name}</td><td className="px-4 text-muted-foreground">{r.email}</td><td className="px-4">{r.role}</td><td className="px-4">{r.city}</td><td className="px-4"><Badge className={r.status === 'approved' ? 'bg-primary/15 text-primary border-primary/30' : r.status === 'rejected' ? 'bg-destructive/15 text-destructive border-destructive/30' : 'bg-muted'}>{r.status}</Badge></td><td className="px-4"><div className="flex gap-1"><Button size="sm" variant="ghost" className="text-primary" onClick={() => setStatus(r, 'approved')}>Approve</Button><Button size="sm" variant="ghost" className="text-destructive" onClick={() => setStatus(r, 'rejected')}>Reject</Button></div></td></tr>)}</tbody>
      </table>{!rows.length && <p className="text-muted-foreground text-center py-10">No registrations.</p>}</Card>
    </div>
  );
}

// ---------- SETTINGS ----------
function SettingsPanel({ setTab }) {
  return (
    <div>
      <h1 className="font-display text-3xl uppercase mb-1">Site Settings</h1>
      <p className="text-muted-foreground mb-6">Tournament name, logo, and colors are managed per season.</p>
      <Card className="glass p-6 max-w-xl">
        <p className="text-sm text-muted-foreground mb-4">Activate a season to change the public website, or edit its branding and roster from the Seasons workspace.</p>
        <Button onClick={() => setTab('seasons')} className="font-semibold glow-green">Manage seasons</Button>
      </Card>
    </div>
  );
}
