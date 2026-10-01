import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';
import { IMAGES } from '@/lib/cms';

export const dynamic = 'force-dynamic';

const ALLOWED = ['site_settings','sections','pages','teams','players','matches','scorecards','auction_state','bids','registrations','sponsors','gallery','news','profiles'];

function json(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' },
  });
}

export async function OPTIONS() { return json({}); }

async function requireAdmin(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const admin = getAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  const user = data.user;
  if (user.email === process.env.ADMIN_EMAIL) return user;
  const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (prof?.role === 'admin') return user;
  return null;
}

export async function GET(request, { params }) {
  const path = (await params)?.path || [];
  try {
    if (path[0] === 'health') return json({ ok: true, ts: Date.now() });
    if (path[0] === 'export' && path[1] === 'registrations') {
      const user = await requireAdmin(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const admin = getAdminClient();
      const { data } = await admin.from('registrations').select('*').order('created_at', { ascending: false });
      const cols = ['full_name','email','phone','age','role','batting_style','bowling_style','city','experience','status','created_at'];
      const rows = [cols.join(',')];
      (data || []).forEach((r) => rows.push(cols.map((c) => JSON.stringify(r[c] ?? '')).join(',')));
      return new NextResponse(rows.join('\n'), { status: 200, headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=registrations.csv' } });
    }
    return json({ error: 'Not found' }, 404);
  } catch (e) { return json({ error: e.message }, 500); }
}

export async function POST(request, { params }) {
  const path = (await params)?.path || [];
  try {
    if (path[0] === 'seed') { const force = new URL(request.url).searchParams.get('force') === '1'; return json(await seed(force)); }
    if (path[0] === 'create-admin') return json(await ensureAdminUser());

    if (path[0] === 'admin') {
      const user = await requireAdmin(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      if (path[1] === 'upload') {
        const form = await request.formData();
        const file = form.get('file');
        if (!file) return json({ error: 'No file' }, 400);
        const admin = getAdminClient();
        try { await admin.storage.createBucket('media', { public: true }); } catch (e) {}
        const ext = (file.name || 'img').split('.').pop();
        const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const buf = Buffer.from(await file.arrayBuffer());
        const up = await admin.storage.from('media').upload(key, buf, { contentType: file.type || 'image/jpeg', upsert: true });
        if (up.error) return json({ error: up.error.message }, 400);
        const { data: pub } = admin.storage.from('media').getPublicUrl(key);
        return json({ url: pub.publicUrl });
      }
      const table = path[1];
      if (!ALLOWED.includes(table)) return json({ error: 'Invalid table' }, 400);
      const body = await request.json();
      const admin = getAdminClient();
      const payload = body?.data ?? body;
      if (payload?.id) {
        const { id, ...rest } = payload;
        const { data, error } = await admin.from(table).update(rest).eq('id', id).select().single();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }
      const { data, error } = await admin.from(table).insert(payload).select().single();
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }
    return json({ error: 'Not found' }, 404);
  } catch (e) { return json({ error: e.message }, 500); }
}

export async function PUT(request, { params }) { return POST(request, { params }); }

export async function DELETE(request, { params }) {
  const path = (await params)?.path || [];
  try {
    if (path[0] === 'admin') {
      const user = await requireAdmin(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const table = path[1];
      if (!ALLOWED.includes(table)) return json({ error: 'Invalid table' }, 400);
      const id = new URL(request.url).searchParams.get('id');
      if (!id) return json({ error: 'id required' }, 400);
      const admin = getAdminClient();
      const { error } = await admin.from(table).delete().eq('id', id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }
    return json({ error: 'Not found' }, 404);
  } catch (e) { return json({ error: e.message }, 500); }
}

// ---------------------------------------------------------------
//  ADMIN AUTH USER
// ---------------------------------------------------------------
async function ensureAdminUser() {
  const admin = getAdminClient();
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  let userId = null;
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email === email);
  if (existing) {
    userId = existing.id;
    await admin.auth.admin.updateUserById(userId, { password });
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'Administrator' } });
    if (error) return { error: error.message };
    userId = data.user.id;
  }
  await admin.from('profiles').upsert({ id: userId, email, full_name: 'Administrator', role: 'admin' });
  return { ok: true, email, userId };
}

// ---------------------------------------------------------------
//  SEED DEMO DATA
// ---------------------------------------------------------------
async function seed(force) {
  const admin = getAdminClient();
  try { await admin.storage.createBucket('media', { public: true }); } catch (e) {}
  const { count } = await admin.from('teams').select('id', { count: 'exact', head: true });
  if (count && count > 0 && !force) {
    await ensureAdminUser();
    return { ok: true, skipped: true, message: 'Already seeded. Use ?force=1 to reset.' };
  }
  if (force) {
    for (const t of ['bids','scorecards','matches','players','auction_state','registrations','sponsors','gallery','news','sections','teams']) {
      await admin.from(t).delete().neq('id', t === 'auction_state' ? 0 : '00000000-0000-0000-0000-000000000000');
    }
    await admin.from('auction_state').delete().eq('id', 1);
  }

  const now = Date.now();
  const iso = (ms) => new Date(ms).toISOString();

  // TEAMS
  const teamSeed = [
    { name: 'Mumbai Mavericks', short_name: 'MUM', color: '#00BCD4', home_city: 'Mumbai', captain: 'Rohan Shetty', coach: 'Mark Boucher', played: 6, won: 5, lost: 1, points: 10, nrr: 1.42, purse: 420 },
    { name: 'Chennai Chargers', short_name: 'CHE', color: '#FFC107', home_city: 'Chennai', captain: 'Dinesh Kannan', coach: 'Stephen Fleming', played: 6, won: 4, lost: 2, points: 8, nrr: 0.88, purse: 310 },
    { name: 'Bangalore Blazers', short_name: 'BLR', color: '#E53935', home_city: 'Bengaluru', captain: 'Virat Rana', coach: 'Andy Flower', played: 6, won: 3, lost: 3, points: 6, nrr: 0.21, purse: 150 },
    { name: 'Kolkata Knights', short_name: 'KOL', color: '#8E24AA', home_city: 'Kolkata', captain: 'Shreyas Ghosh', coach: 'Chandrakant Pandit', played: 6, won: 3, lost: 3, points: 6, nrr: -0.15, purse: 260 },
    { name: 'Delhi Dynamos', short_name: 'DEL', color: '#FF7043', home_city: 'Delhi', captain: 'Rishabh Malik', coach: 'Ricky Ponting', played: 6, won: 2, lost: 4, points: 4, nrr: -0.64, purse: 190 },
    { name: 'Rajasthan Raptors', short_name: 'RAJ', color: '#3949AB', home_city: 'Jaipur', captain: 'Sanju Rathore', coach: 'Kumar Sangakkara', played: 6, won: 1, lost: 5, points: 2, nrr: -1.08, purse: 95 },
  ].map((t, i) => ({ ...t, order_index: i }));
  const { data: teams } = await admin.from('teams').insert(teamSeed).select();
  const T = {}; teams.forEach((t) => (T[t.short_name] = t));

  // PLAYERS (squads)
  const roles = ['Batter','Batter','All-rounder','Wicket-keeper','Bowler','Bowler','All-rounder'];
  const firstNames = ['Arjun','Kabir','Rohan','Ishaan','Veer','Dhruv','Aryan','Reyansh','Vivaan','Shaurya','Advait','Yash','Karan','Nikhil','Rahul','Sameer','Tejas','Manav','Dev','Om','Aarav','Krish','Laksh','Parth'];
  let fnIdx = 0;
  const players = [];
  teams.forEach((team) => {
    roles.forEach((role, j) => {
      const name = `${firstNames[fnIdx % firstNames.length]} ${['Singh','Sharma','Patel','Reddy','Nair','Verma','Khan','Menon'][j % 8]}`; fnIdx++;
      const runs = role === 'Bowler' ? 40 + ((fnIdx * 17) % 180) : 180 + ((fnIdx * 53) % 520);
      const wickets = role === 'Batter' ? ((fnIdx * 3) % 5) : 4 + ((fnIdx * 7) % 20);
      const base = role === 'All-rounder' ? 150 : role === 'Wicket-keeper' ? 120 : 100;
      players.push({
        team_id: team.id, name, role,
        batting_style: fnIdx % 3 === 0 ? 'Left-hand bat' : 'Right-hand bat',
        bowling_style: role === 'Bowler' || role === 'All-rounder' ? (fnIdx % 2 ? 'Right-arm fast' : 'Right-arm offbreak') : 'Right-arm medium',
        country: fnIdx % 5 === 0 ? 'Overseas' : 'India', jersey_number: (fnIdx % 90) + 1,
        stats: { matches: 6, runs, wickets, average: +(runs / 5).toFixed(1), strike_rate: +(110 + ((fnIdx * 13) % 70)).toFixed(1), fifties: (fnIdx % 4), hundreds: (fnIdx % 7 === 0 ? 1 : 0) },
        base_price: base, sold_price: base + ((fnIdx * 20) % 300), sold_status: 'sold', is_marquee: j === 0, order_index: j,
      });
    });
  });
  await admin.from('players').insert(players);

  // AUCTION POOL players (unassigned)
  const poolNames = ['Jasprit Maxwell','Travis Boult','Kagiso Starc','Trent Rashid','Quinton Russell','Mitchell Warner','Faf Bravo','Nathan Southee','Wanindu Holder','Rashid Stokes'];
  const poolRoles = ['Bowler','All-rounder','Bowler','All-rounder','Wicket-keeper','Batter','Batter','Bowler','All-rounder','All-rounder'];
  const pool = poolNames.map((name, i) => ({
    team_id: null, name, role: poolRoles[i], country: 'Overseas',
    batting_style: i % 2 ? 'Left-hand bat' : 'Right-hand bat',
    bowling_style: i % 2 ? 'Left-arm fast' : 'Right-arm legbreak',
    stats: { matches: 120 + i * 7, runs: 1500 + i * 220, wickets: 60 + i * 11, average: +(28 + i).toFixed(1), strike_rate: +(135 + i).toFixed(1) },
    base_price: 100 + (i % 3) * 50, is_marquee: i < 3,
    sold_status: i === 0 ? 'current' : (i === 1 ? 'sold' : (i === 2 ? 'unsold' : 'available')),
    sold_price: i === 1 ? 340 : null,
    team_id_tmp: null, order_index: i,
  }));
  const { data: poolInserted } = await admin.from('players').insert(pool.map(({ team_id_tmp, ...p }) => p)).select();
  const currentLot = poolInserted.find((p) => p.sold_status === 'current');

  // MATCHES
  const order = ['MUM','CHE','BLR','KOL','DEL','RAJ'];
  const matches = [];
  // completed
  const completed = [['MUM','RAJ'],['CHE','DEL'],['BLR','KOL'],['MUM','CHE'],['KOL','DEL']];
  completed.forEach((m, i) => {
    const ra = 150 + ((i * 29) % 70), rb = 140 + ((i * 37) % 60);
    const aWin = ra > rb;
    matches.push({ team_a: T[m[0]].id, team_b: T[m[1]].id, venue: `${T[m[0]].home_city} Arena`, start_time: iso(now - (6 - i) * 86400000), status: 'completed', overs: 20,
      team_a_runs: ra, team_a_wickets: 4 + (i % 5), team_a_overs: 20, team_b_runs: rb, team_b_wickets: 6 + (i % 3), team_b_overs: 20,
      result: `${aWin ? T[m[0]].name : T[m[1]].name} won by ${Math.abs(ra - rb)} runs`, win_probability: aWin ? 72 : 28, match_no: i + 1 });
  });
  // LIVE match
  matches.push({ team_a: T['BLR'].id, team_b: T['MUM'].id, venue: 'Bengaluru Super Stadium', start_time: iso(now - 3600000), status: 'live', overs: 20,
    team_a_runs: 142, team_a_wickets: 4, team_a_overs: 15.2, team_b_runs: 0, team_b_wickets: 0, team_b_overs: 0, current_innings: 1,
    result: 'BLR batting — 15.2 overs', win_probability: 58, match_no: 6,
    commentary: [ { over: '15.2', text: 'SIX! Rana clears long-on with ease — the crowd erupts!' }, { over: '15.1', text: 'Tight single, good running between the wickets.' }, { over: '14.6', text: 'FOUR! Exquisite cover drive.' } ] });
  // upcoming
  const upcoming = [['CHE','KOL'],['DEL','RAJ'],['MUM','KOL'],['BLR','CHE']];
  upcoming.forEach((m, i) => matches.push({ team_a: T[m[0]].id, team_b: T[m[1]].id, venue: `${T[m[0]].home_city} Arena`, start_time: iso(now + (i === 0 ? 1 : i + 1) * 86400000 + 36000000), status: 'upcoming', overs: 20, win_probability: 50, match_no: 7 + i }));
  const { data: matchRows } = await admin.from('matches').insert(matches).select();
  const liveMatch = matchRows.find((m) => m.status === 'live');

  // SCORECARD for live match
  await admin.from('scorecards').insert({ match_id: liveMatch.id, innings: 1,
    batting: [ { name: 'Virat Rana', runs: 64, balls: 38, fours: 6, sixes: 3, sr: 168.4, how_out: 'not out' }, { name: 'Dev Patel', runs: 41, balls: 29, fours: 4, sixes: 1, sr: 141.3, how_out: 'c & b' }, { name: 'Arjun Singh', runs: 22, balls: 18, fours: 2, sixes: 0, sr: 122.2, how_out: 'b' }, { name: 'Kabir Sharma', runs: 8, balls: 6, fours: 1, sixes: 0, sr: 133.3, how_out: 'lbw' } ],
    bowling: [ { name: 'Jasprit Maxwell', overs: 4, maidens: 0, runs: 28, wickets: 2, econ: 7.0 }, { name: 'Trent Rashid', overs: 3.2, maidens: 0, runs: 34, wickets: 1, econ: 10.2 }, { name: 'Faf Bravo', overs: 4, maidens: 0, runs: 31, wickets: 1, econ: 7.8 } ],
    partnerships: [ { pair: 'Rana & Patel', runs: 88, balls: 52 }, { pair: 'Rana & Singh', runs: 34, balls: 21 } ] });

  // AUCTION STATE
  await admin.from('auction_state').upsert({ id: 1, status: 'live', current_player_id: currentLot?.id || null, current_bid: 180, current_bid_team: T['CHE'].id, increment: 20, timer_ends_at: iso(now + 45000) });
  if (currentLot) await admin.from('bids').insert([
    { player_id: currentLot.id, team_id: T['MUM'].id, amount: 100 },
    { player_id: currentLot.id, team_id: T['BLR'].id, amount: 140 },
    { player_id: currentLot.id, team_id: T['CHE'].id, amount: 180 },
  ]);

  // SPONSORS
  await admin.from('sponsors').insert([
    { name: 'VoltEdge Energy', tier: 'title', link: '#', order_index: 0 },
    { name: 'Nimbus Airways', tier: 'gold', link: '#', order_index: 1 },
    { name: 'Krux Sportswear', tier: 'gold', link: '#', order_index: 2 },
    { name: 'PixelPay', tier: 'silver', link: '#', order_index: 3 },
    { name: 'Orbit Telecom', tier: 'silver', link: '#', order_index: 4 },
    { name: 'Everest Tyres', tier: 'partner', link: '#', order_index: 5 },
    { name: 'Quench Drinks', tier: 'partner', link: '#', order_index: 6 },
  ]);

  // GALLERY
  await admin.from('gallery').insert([...IMAGES.gallery, ...IMAGES.stadium].map((url, i) => ({ image_url: url, caption: ['Match night magic','Champions lift the cup','A sea of fans','Full house under lights','Yorker on target','The decisive wicket','Floodlit battleground','Super over drama','Electric atmosphere'][i] || 'Tournament moment', category: i % 2 ? 'Match' : 'Fans', order_index: i })));

  // NEWS
  await admin.from('news').insert([
    { title: 'Mavericks storm to top of the table', slug: 'mavericks-top-table', excerpt: 'A clinical all-round display sees Mumbai Mavericks seal top spot heading into the business end.', body: 'Mumbai Mavericks produced a complete performance to go five wins from six and claim pole position...', cover_url: IMAGES.gallery[0], author: 'APL Media' },
    { title: 'Auction fireworks: overseas stars in demand', slug: 'auction-fireworks', excerpt: 'Franchises splurged big as marquee overseas all-rounders sparked bidding wars on day one.', body: 'The APL mega-auction delivered drama from the first lot...', cover_url: IMAGES.gallery[1], author: 'APL Media' },
    { title: 'Rana the run-machine: 64* and counting', slug: 'rana-run-machine', excerpt: 'Blazers skipper Virat Rana is in sublime touch under the Bengaluru lights.', body: 'Virat Rana continued his purple patch with a blistering unbeaten knock...', cover_url: IMAGES.gallery[4], author: 'APL Media' },
    { title: 'Raptors eye a late-season surge', slug: 'raptors-surge', excerpt: 'Bottom of the pile but far from done — Rajasthan plot an unlikely playoff run.', body: 'Despite a tough campaign, the Raptors remain optimistic...', cover_url: IMAGES.gallery[2], author: 'APL Media' },
  ]);

  // REGISTRATIONS (sample)
  await admin.from('registrations').insert([
    { full_name: 'Aditya Rao', email: 'aditya@example.com', phone: '9876543210', age: 24, role: 'Batter', batting_style: 'Right-hand bat', city: 'Pune', experience: 'District level', status: 'pending' },
    { full_name: 'Sahil Gupta', email: 'sahil@example.com', phone: '9812345678', age: 27, role: 'Bowler', bowling_style: 'Right-arm fast', city: 'Nagpur', experience: 'State level', status: 'pending' },
    { full_name: 'Imran Qureshi', email: 'imran@example.com', phone: '9900112233', age: 22, role: 'All-rounder', city: 'Hyderabad', experience: 'Club', status: 'approved' },
  ]);

  // SITE SETTINGS
  await admin.from('site_settings').upsert({ id: 1, tournament_name: 'Apex Premier League', tagline: 'Where Legends Are Forged', accent_color: '#39FF14', primary_color: '#060a16', season: '2025', start_date: iso(now + 86400000 + 36000000), end_date: iso(now + 30 * 86400000),
    nav: [ { label: 'Home', href: '/' }, { label: 'Live', href: '/live' }, { label: 'Auction', href: '/auction' } ],
    footer: { about: 'The most cinematic cricket tournament.' }, seo: { title: 'Apex Premier League', description: 'Live cricket tournament, auctions and realtime scores.' }, social: { instagram: '#', twitter: '#', youtube: '#' } });

  // SECTIONS (homepage builder)
  const sections = [
    { type: 'hero', title: 'APEX PREMIER LEAGUE', subtitle: 'Where Legends Are Forged', content: { cta_primary: 'Register Now', cta_secondary: 'Watch Live', badge: 'Season 2025 · 20 Matches · 6 Teams' }, order_index: 0 },
    { type: 'countdown', title: 'Next Match Starts In', subtitle: 'The countdown to glory has begun', content: {}, order_index: 1 },
    { type: 'live', title: 'Live & Latest', subtitle: 'Follow the action ball by ball', content: {}, order_index: 2 },
    { type: 'fixtures', title: 'Fixtures & Results', subtitle: 'Every clash of the season', content: {}, order_index: 3 },
    { type: 'points', title: 'Points Table', subtitle: 'The race to the playoffs', content: {}, order_index: 4 },
    { type: 'teams', title: 'The Franchises', subtitle: 'Six cities. One trophy.', content: {}, order_index: 5 },
    { type: 'players', title: 'Star Players', subtitle: 'The game-changers to watch', content: {}, order_index: 6 },
    { type: 'auction', title: 'The Auction', subtitle: 'Fortunes made in seconds', content: { cta: 'Enter Auction Room' }, order_index: 7 },
    { type: 'news', title: 'Latest News', subtitle: 'Headlines from the league', content: {}, order_index: 8 },
    { type: 'gallery', title: 'Gallery', subtitle: 'Moments that defined the night', content: {}, order_index: 9 },
    { type: 'sponsors', title: 'Our Partners', subtitle: 'Powering the Apex Premier League', content: {}, order_index: 10 },
    { type: 'register', title: 'Join The League', subtitle: 'Think you have what it takes? Register as a player.', content: {}, order_index: 11 },
  ].map((s) => ({ ...s, visible: true, published: true, animation: 'fade' }));
  await admin.from('sections').insert(sections);

  await ensureAdminUser();
  return { ok: true, seeded: true, teams: teams.length, players: players.length + pool.length, matches: matchRows.length };
}
