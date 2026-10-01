'use client';
import { useEffect, useState } from 'react';
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
import { LayoutDashboard, Layers, Users, Shield, CalendarDays, Radio, Gavel, UserCheck, Image as ImageIcon, Newspaper, Handshake, Settings as SettingsIcon, LogOut, Plus, Pencil, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Download, Upload, Zap, ExternalLink } from 'lucide-react';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
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
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Request failed');
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

export default function AdminPage() {
  const [session, setSession] = useState(undefined);
  const [tab, setTab] = useState('dashboard');
  const [teams, setTeams] = useState([]);

  useEffect(() => { setSession(token() ? { token: token() } : null); }, []);
  useEffect(() => { if (session) apiList('teams').then(setTeams).catch(() => {}); }, [session, tab]);

  if (session === undefined) return <div className="min-h-screen grid place-items-center"><div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (!session) return <Login />;

  return (
    <div className="min-h-screen flex">
      <aside className="w-16 md:w-60 shrink-0 border-r border-white/5 glass-strong flex flex-col">
        <div className="h-16 flex items-center gap-2 px-4 border-b border-white/5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Zap className="h-4 w-4" fill="currentColor" /></span><span className="font-display uppercase font-bold hidden md:block">Admin</span></div>
        <nav className="flex-1 py-3 overflow-y-auto">
          {TABS.map((t) => { const Icon = t.icon; return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${tab === t.key ? 'bg-primary/15 text-primary border-r-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}><Icon className="h-4 w-4 shrink-0" /><span className="hidden md:block">{t.label}</span></button>
          ); })}
        </nav>
        <div className="p-3 border-t border-white/5 space-y-1">
          <a href="/" target="_blank" className="w-full flex items-center gap-3 px-2 py-2 text-sm text-muted-foreground hover:text-foreground"><ExternalLink className="h-4 w-4" /><span className="hidden md:block">View site</span></a>
          <button onClick={() => { localStorage.removeItem('apl_token'); setSession(null); }} className="w-full flex items-center gap-3 px-2 py-2 text-sm text-muted-foreground hover:text-destructive"><LogOut className="h-4 w-4" /><span className="hidden md:block">Sign out</span></button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto h-screen">
        <div className="p-5 md:p-8 max-w-6xl">
          {tab === 'dashboard' && <Dashboard teams={teams} setTab={setTab} />}
          {tab === 'sections' && <Sections />}
          {tab === 'teams' && <Resource table="teams" title="Teams" teams={teams} columns={[['name','Name'],['short_name','Code'],['points','Pts'],['won','Won']]} fields={TEAM_FIELDS} />}
          {tab === 'players' && <Resource table="players" title="Players" teams={teams} columns={[['name','Name'],['role','Role'],['sold_status','Status']]} fields={PLAYER_FIELDS(teams)} />}
          {tab === 'matches' && <Resource table="matches" title="Matches" teams={teams} columns={[['match_no','#'],['venue','Venue'],['status','Status']]} fields={MATCH_FIELDS(teams)} teamNames />}
          {tab === 'scoring' && <Scoring teams={teams} />}
          {tab === 'auction' && <Auction teams={teams} />}
          {tab === 'registrations' && <Registrations />}
          {tab === 'sponsors' && <Resource table="sponsors" title="Sponsors" columns={[['name','Name'],['tier','Tier']]} fields={SPONSOR_FIELDS} />}
          {tab === 'gallery' && <Resource table="gallery" title="Gallery" columns={[['caption','Caption'],['category','Category']]} fields={GALLERY_FIELDS} />}
          {tab === 'news' && <Resource table="news" title="News" columns={[['title','Title'],['published','Published']]} fields={NEWS_FIELDS} />}
          {tab === 'settings' && <SettingsPanel />}
        </div>
      </main>
    </div>
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

// ---------- GENERIC RESOURCE MANAGER ----------
const TEAM_FIELDS = [['name','Name','text'],['short_name','Code','text'],['home_city','City','text'],['color','Color (hex)','text'],['captain','Captain','text'],['coach','Coach','text'],['logo_url','Logo','image'],['played','Played','number'],['won','Won','number'],['lost','Lost','number'],['points','Points','number'],['nrr','NRR','number'],['purse','Purse (L)','number'],['order_index','Order','number']];
const PLAYER_FIELDS = (teams) => [['name','Name','text'],['role','Role','select',['Batter','Bowler','All-rounder','Wicket-keeper']],['team_id','Team','team',teams],['country','Country','text'],['batting_style','Batting','text'],['bowling_style','Bowling','text'],['photo_url','Photo','image'],['base_price','Base Price (L)','number'],['sold_price','Sold Price (L)','number'],['sold_status','Status','select',['available','current','sold','unsold']],['is_marquee','Marquee','bool'],['order_index','Order','number']];
const MATCH_FIELDS = (teams) => [['team_a','Team A','team',teams],['team_b','Team B','team',teams],['venue','Venue','text'],['start_time','Start Time','datetime'],['status','Status','select',['upcoming','live','completed']],['overs','Overs','number'],['team_a_runs','A Runs','number'],['team_a_wickets','A Wkts','number'],['team_a_overs','A Overs','number'],['team_b_runs','B Runs','number'],['team_b_wickets','B Wkts','number'],['team_b_overs','B Overs','number'],['current_innings','Innings','number'],['win_probability','Win Prob A %','number'],['result','Result','text'],['match_no','Match No','number']];
const SPONSOR_FIELDS = [['name','Name','text'],['tier','Tier','select',['title','gold','silver','partner']],['link','Link','text'],['logo_url','Logo','image'],['order_index','Order','number']];
const GALLERY_FIELDS = [['image_url','Image','image'],['caption','Caption','text'],['category','Category','text'],['order_index','Order','number']];
const NEWS_FIELDS = [['title','Title','text'],['excerpt','Excerpt','text'],['body','Body','textarea'],['cover_url','Cover','image'],['author','Author','text'],['published','Published','bool']];

function Resource({ table, title, columns, fields, teams = [], teamNames }) {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const load = () => apiList(table).then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, [table]);
  const teamName = (id) => teams.find((t) => t.id === id)?.short_name || '—';
  const save = async (payload) => { try { await api('POST', `admin/${table}`, payload); toast.success('Saved'); setOpen(false); setEditing(null); load(); } catch (e) { toast.error(e.message); } };
  const del = async (id) => { if (!confirm('Delete this item?')) return; try { await api('DELETE', `admin/${table}?id=${id}`); toast.success('Deleted'); load(); } catch (e) { toast.error(e.message); } };
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
    fields.forEach(([k, , type]) => { if (type === 'number' && payload[k] !== undefined && payload[k] !== '') payload[k] = Number(payload[k]); if (type === 'datetime' && payload[k]) payload[k] = new Date(payload[k]).toISOString(); });
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
function SettingsPanel() {
  const [s, setS] = useState(null);
  useEffect(() => { apiList('site_settings').then((rows) => setS(rows[0] || { id: 1 })).catch(() => setS({ id: 1 })); }, []);
  const save = async () => { try { await api('POST', 'admin/site_settings', { ...s, id: 1 }); toast.success('Settings saved'); } catch (e) { toast.error(e.message); } };
  if (!s) return null;
  const field = (k, label) => <div><Label className="text-xs uppercase text-muted-foreground">{label}</Label><Input value={s[k] ?? ''} onChange={(e) => setS({ ...s, [k]: e.target.value })} className="glass border-white/10 mt-1" /></div>;
  return (
    <div>
      <h1 className="font-display text-3xl uppercase mb-1">Site Settings</h1>
      <p className="text-muted-foreground mb-6">Tournament identity and theme.</p>
      <Card className="glass p-6 grid gap-4 max-w-xl">
        {field('tournament_name', 'Tournament Name')}{field('tagline', 'Tagline')}{field('season', 'Season')}{field('accent_color', 'Accent Color (hex)')}
        <div className="flex items-center gap-3"><span className="text-xs uppercase text-muted-foreground">Preview</span><span className="h-8 w-8 rounded-lg" style={{ background: s.accent_color || '#39FF14' }} /></div>
        <Button onClick={save} className="font-semibold glow-green w-fit">Save Settings</Button>
      </Card>
    </div>
  );
}
