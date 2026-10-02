import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';
import { IMAGES } from '@/lib/cms';
import { bootstrapData, liveMatchData, auctionRoomData } from '@/lib/serverData';

export const dynamic = 'force-dynamic';

const ALLOWED = ['site_settings','seasons','sections','pages','teams','players','matches','scorecards','auction_state','bids','registrations','sponsors','gallery','news','profiles'];
const SEASON_SCOPED_TABLES = new Set(['sections','teams','players','matches','auction_state','bids','registrations','sponsors','gallery','news']);
const TEAM_IMPORT_FIELDS = ['short_name','logo_url','color','owner','captain','coach','location','city','state','description','stadium','purse','order_index'];

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

async function getActiveSeason(admin) {
  const { data, error } = await admin.from('seasons').select('*').eq('is_active', true).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No active season configured');
  return data;
}

function withoutSeasonIdentity(row) {
  const { id, created_at, season_id, ...copy } = row;
  return copy;
}

async function validateSeasonReferences(admin, table, payload, seasonId) {
  const references = table === 'players'
    ? [['teams', payload.team_id], ['teams', payload.next_team_id]]
    : table === 'matches'
      ? [['teams', payload.team_a], ['teams', payload.team_b], ['teams', payload.toss_winner], ['teams', payload.winner_team]]
      : table === 'auction_state'
        ? [['players', payload.current_player_id], ['teams', payload.current_bid_team]]
        : table === 'bids'
          ? [['players', payload.player_id], ['teams', payload.team_id]]
          : [];
  for (const [referenceTable, id] of references) {
    if (!id) continue;
    const { data, error } = await admin.from(referenceTable).select('id').eq('id', id).eq('season_id', seasonId).maybeSingle();
    if (error) return error;
    if (!data) return new Error(`${referenceTable} record is not part of the active season`);
  }
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
    if (path[0] === 'public' && path[1] === 'bootstrap') return json(await bootstrapData());
    if (path[0] === 'public' && path[1] === 'live') return json(await liveMatchData());
    if (path[0] === 'public' && path[1] === 'auction') return json(await auctionRoomData());
    if (path[0] === 'admin' && path[1] === 'list') {
      const user = await requireAdmin(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const table = path[2];
      if (!ALLOWED.includes(table)) return json({ error: 'Invalid table' }, 400);
      const admin = getAdminClient();
      const orderParam = new URL(request.url).searchParams.get('order');
      let q = admin.from(table).select('*');
      if (SEASON_SCOPED_TABLES.has(table)) {
        const season = await getActiveSeason(admin);
        q = q.eq('season_id', season.id);
      }
      if (orderParam) { const [col, dir] = orderParam.split('.'); q = q.order(col, { ascending: dir !== 'desc' }); }
      else q = q.order('created_at', { ascending: false });
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 400);
      return json({ data: data || [] });
    }
    return json({ error: 'Not found' }, 404);
  } catch (e) { return json({ error: e.message }, 500); }
}

export async function POST(request, { params }) {
  const path = (await params)?.path || [];
  try {
    if (path[0] === 'seed') { const force = new URL(request.url).searchParams.get('force') === '1'; return json(await seed(force)); }
    if (path[0] === 'create-admin') return json(await ensureAdminUser());

    if (path[0] === 'auth' && path[1] === 'login') {
      const { email, password } = await request.json();
      const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const tok = await r.json();
      if (!r.ok) return json({ error: tok.error_description || tok.msg || 'Invalid credentials' }, 401);
      const admin = getAdminClient();
      let role = 'viewer';
      if (tok.user?.email === process.env.ADMIN_EMAIL) role = 'admin';
      else { const { data: prof } = await admin.from('profiles').select('role').eq('id', tok.user?.id).single(); role = prof?.role || 'viewer'; }
      if (role !== 'admin') return json({ error: 'Not an admin account' }, 403);
      return json({ access_token: tok.access_token, refresh_token: tok.refresh_token, user: { id: tok.user?.id, email: tok.user?.email }, role });
    }

    if (path[0] === 'public' && path[1] === 'register') {
      const body = await request.json();
      const admin = getAdminClient();
      const allowed = ['full_name','email','phone','age','role','batting_style','bowling_style','city','experience'];
      const row = {}; allowed.forEach((k) => { if (body[k] !== undefined && body[k] !== '') row[k] = body[k]; });
      if (!row.full_name) return json({ error: 'Name required' }, 400);
      if (row.age) row.age = Number(row.age);
      row.status = 'pending';
      const season = await getActiveSeason(admin);
      row.season_id = season.id;
      const { error } = await admin.from('registrations').insert(row);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (path[0] === 'public' && path[1] === 'bid') {
      const { player_id, team_id, amount } = await request.json();
      if (!player_id || !team_id || !amount) return json({ error: 'Missing fields' }, 400);
      const admin = getAdminClient();
      const season = await getActiveSeason(admin);
      const [player, team] = await Promise.all([
        admin.from('players').select('id').eq('id', player_id).eq('season_id', season.id).maybeSingle(),
        admin.from('teams').select('id').eq('id', team_id).eq('season_id', season.id).maybeSingle(),
      ]);
      if (!player.data || !team.data) return json({ error: 'Player or team is not part of the active season' }, 400);
      const { data, error } = await admin.from('bids').insert({ player_id, team_id, amount: Number(amount), season_id: season.id }).select().single();
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    if (path[0] === 'admin') {
      const user = await requireAdmin(request);
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const admin = getAdminClient();
      if (path[1] === 'upload') {
        const form = await request.formData();
        const file = form.get('file');
        if (!file) return json({ error: 'No file' }, 400);
        try { await admin.storage.createBucket('media', { public: true }); } catch (e) {}
        const ext = (file.name || 'img').split('.').pop();
        const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const buf = Buffer.from(await file.arrayBuffer());
        const up = await admin.storage.from('media').upload(key, buf, { contentType: file.type || 'image/jpeg', upsert: true });
        if (up.error) return json({ error: up.error.message }, 400);
        const { data: pub } = admin.storage.from('media').getPublicUrl(key);
        return json({ url: pub.publicUrl });
      }
      if (path[1] === 'teams' && path[2] === 'copy-from-season') {
        const body = await request.json();
        if (!body.source_season_id) return json({ error: 'Choose a source season' }, 400);
        const targetSeason = await getActiveSeason(admin);
        if (body.source_season_id === targetSeason.id) return json({ error: 'Choose a different, previous season' }, 400);
        const [sourceResult, targetTeamsResult] = await Promise.all([
          admin.from('seasons').select('id,name').eq('id', body.source_season_id).maybeSingle(),
          admin.from('teams').select('name,short_name').eq('season_id', targetSeason.id),
        ]);
        if (sourceResult.error) return json({ error: sourceResult.error.message }, 400);
        if (!sourceResult.data) return json({ error: 'The selected source season was not found' }, 404);
        if (targetTeamsResult.error) return json({ error: targetTeamsResult.error.message }, 400);
        const { data: sourceTeams, error: sourceTeamsError } = await admin.from('teams').select('*').eq('season_id', sourceResult.data.id).order('order_index');
        if (sourceTeamsError) return json({ error: sourceTeamsError.message }, 400);
        if (!sourceTeams?.length) return json({ error: `${sourceResult.data.name} has no teams to copy` }, 400);

        const sourceCodes = sourceTeams.map((team) => team.short_name?.trim().toLowerCase()).filter(Boolean);
        const duplicateSourceCodes = sourceCodes.filter((code, index) => sourceCodes.indexOf(code) !== index);
        if (duplicateSourceCodes.length) return json({ error: `Source season has duplicate team codes: ${[...new Set(duplicateSourceCodes)].join(', ')}` }, 409);
        const existingCodes = new Set((targetTeamsResult.data || []).map((team) => team.short_name?.trim().toLowerCase()).filter(Boolean));
        const existingNames = new Set((targetTeamsResult.data || []).map((team) => team.name?.trim().toLowerCase()).filter(Boolean));
        const conflicts = sourceTeams.filter((team) => (team.short_name && existingCodes.has(team.short_name.trim().toLowerCase())) || existingNames.has(team.name.trim().toLowerCase()));
        if (conflicts.length) return json({ error: `Teams already exist in the active season: ${conflicts.map((team) => team.short_name || team.name).join(', ')}` }, 409);

        const teamCopies = sourceTeams.map((team) => {
          const copy = withoutSeasonIdentity(team);
          return { ...copy, played: 0, won: 0, lost: 0, tied: 0, no_result: 0, points: 0, nrr: 0, purse: 1000, season_id: targetSeason.id };
        });
        const { data: copiedTeams, error: copyError } = await admin.from('teams').insert(teamCopies).select('id');
        if (copyError) return json({ error: copyError.message }, 400);
        return json({ imported: copiedTeams?.length || 0, source_season: sourceResult.data.name });
      }
      if (path[1] === 'teams' && path[2] === 'import') {
        const body = await request.json();
        if (!Array.isArray(body.rows) || body.rows.length === 0) return json({ error: 'Upload a CSV with at least one team row' }, 400);
        if (body.rows.length > 500) return json({ error: 'Import is limited to 500 teams per file' }, 400);

        const rows = [];
        const errors = [];
        body.rows.forEach((input, index) => {
          const row = Object.fromEntries(Object.entries(input || {}).map(([key, value]) => [key.trim().toLowerCase().replace(/[\s-]+/g, '_'), value]));
          const name = String(row.name || row.team_name || '').trim();
          if (!name) {
            errors.push(`Row ${index + 2}: Team Name is required`);
            return;
          }
          const team = { name };
          TEAM_IMPORT_FIELDS.forEach((field) => {
            if (row[field] === undefined || row[field] === '') return;
            if (field === 'purse' || field === 'order_index') {
              const value = Number(row[field]);
              if (!Number.isFinite(value)) errors.push(`Row ${index + 2}: ${field} must be a number`);
              else team[field] = value;
            } else team[field] = String(row[field]).trim();
          });
          rows.push(team);
        });
        if (errors.length) return json({ error: errors.slice(0, 20).join('\n'), errors }, 400);

        const season = await getActiveSeason(admin);
        const codes = rows.map((row) => row.short_name?.toLowerCase()).filter(Boolean);
        const repeatedCodes = codes.filter((code, index) => codes.indexOf(code) !== index);
        if (repeatedCodes.length) return json({ error: `Duplicate team codes in CSV: ${[...new Set(repeatedCodes)].join(', ')}` }, 400);
        if (codes.length) {
          const { data: existing, error } = await admin.from('teams').select('short_name').eq('season_id', season.id).in('short_name', rows.map((row) => row.short_name).filter(Boolean));
          if (error) return json({ error: error.message }, 400);
          const conflicts = (existing || []).map((row) => row.short_name).filter(Boolean);
          if (conflicts.length) return json({ error: `Team codes already exist in this season: ${[...new Set(conflicts)].join(', ')}` }, 409);
        }

        const { data, error } = await admin.from('teams').insert(rows.map((row) => ({ ...row, season_id: season.id }))).select();
        if (error) return json({ error: error.message }, 400);
        return json({ data: data || [], imported: data?.length || 0 });
      }
      if (path[1] === 'players' && path[2] === 'import') {
        const body = await request.json();
        if (!Array.isArray(body.rows) || body.rows.length === 0) return json({ error: 'Upload a CSV with at least one player row' }, 400);
        if (body.rows.length > 500) return json({ error: 'Import is limited to 500 players per file' }, 400);
        const season = await getActiveSeason(admin);
        const { data: teams, error: teamsError } = await admin.from('teams').select('id,name,short_name').eq('season_id', season.id);
        if (teamsError) return json({ error: teamsError.message }, 400);
        const teamByLabel = new Map();
        (teams || []).forEach((team) => [team.name, team.short_name, team.id].filter(Boolean).forEach((label) => teamByLabel.set(String(label).trim().toLowerCase(), team)));

        const rows = [];
        const errors = [];
        const duplicateKeys = new Set();
        body.rows.forEach((input, index) => {
          const row = Object.fromEntries(Object.entries(input || {}).map(([key, value]) => [key.trim().toLowerCase().replace(/[\s-]+/g, '_'), value]));
          const name = String(row.player_name || row.name || '').trim();
          const teamLabel = String(row.team || row.team_name || row.team_id || '').trim();
          const team = teamByLabel.get(teamLabel.toLowerCase());
          const baseNpr = row.base_price_npr === undefined || row.base_price_npr === null || String(row.base_price_npr).trim() === '' ? null : Number(row.base_price_npr);
          const soldNpr = row.sold_price_npr === undefined || row.sold_price_npr === '' ? null : Number(row.sold_price_npr);
          if (!name) errors.push(`Row ${index + 2}: player_name is required`);
          if (!team) errors.push(`Row ${index + 2}: team "${teamLabel || '(blank)'}" is not in the active season`);
          if (baseNpr !== null && (!Number.isFinite(baseNpr) || baseNpr < 0)) errors.push(`Row ${index + 2}: base_price_npr must be a non-negative number or blank`);
          if (soldNpr !== null && (!Number.isFinite(soldNpr) || soldNpr < 0)) errors.push(`Row ${index + 2}: sold_price_npr must be a non-negative number`);
          if (!name || !team || (baseNpr !== null && (!Number.isFinite(baseNpr) || baseNpr < 0)) || (soldNpr !== null && (!Number.isFinite(soldNpr) || soldNpr < 0))) return;

          const key = `${team.id}:${name.toLowerCase()}`;
          if (duplicateKeys.has(key)) errors.push(`Row ${index + 2}: duplicate player "${name}" for ${team.name}`);
          duplicateKeys.add(key);
          const player = {
            name,
            team_id: team.id,
            category: String(row.category || '').trim() || null,
            role: String(row.role || '').trim() || null,
            country: String(row.nationality || row.country || '').trim() || null,
            sold_price: soldNpr === null ? null : soldNpr / 100000,
            sold_status: soldNpr ? 'sold' : 'available',
            stats: {},
            season_id: season.id,
          };
          if (baseNpr !== null) player.base_price = baseNpr / 100000;
          rows.push(player);
        });
        if (errors.length) return json({ error: errors.slice(0, 20).join('\n'), errors }, 400);

        const existingRows = body.replace_existing
          ? await admin.from('players').select('id').eq('season_id', season.id)
          : { data: [], error: null };
        if (existingRows.error) return json({ error: existingRows.error.message }, 400);
        const { data: inserted, error: insertError } = await admin.from('players').insert(rows).select('id');
        if (insertError) return json({ error: insertError.message }, 400);

        const oldIds = (existingRows.data || []).map((player) => player.id);
        if (oldIds.length) {
          const { error: deleteError } = await admin.from('players').delete().eq('season_id', season.id).in('id', oldIds);
          if (deleteError) {
            await admin.from('players').delete().eq('season_id', season.id).in('id', (inserted || []).map((player) => player.id));
            return json({ error: `New players were not kept because the previous roster could not be replaced: ${deleteError.message}` }, 400);
          }
        }
        return json({ imported: inserted?.length || 0, removed: oldIds.length });
      }
      if (path[1] === 'players' && path[2] === 'copy-from-season') {
        const body = await request.json();
        if (!body.source_season_id) return json({ error: 'Choose a source season' }, 400);
        const targetSeason = await getActiveSeason(admin);
        if (body.source_season_id === targetSeason.id) return json({ error: 'Choose a different, previous season' }, 400);
        const { data: sourceSeason, error: sourceSeasonError } = await admin.from('seasons').select('id,name').eq('id', body.source_season_id).maybeSingle();
        if (sourceSeasonError) return json({ error: sourceSeasonError.message }, 400);
        if (!sourceSeason) return json({ error: 'The selected source season was not found' }, 404);

        const [sourceTeamsResult, targetTeamsResult, sourcePlayersResult, targetPlayersResult] = await Promise.all([
          admin.from('teams').select('id,name,short_name').eq('season_id', sourceSeason.id),
          admin.from('teams').select('id,name,short_name').eq('season_id', targetSeason.id),
          admin.from('players').select('*').eq('season_id', sourceSeason.id).order('order_index'),
          admin.from('players').select('name,team_id').eq('season_id', targetSeason.id),
        ]);
        for (const result of [sourceTeamsResult, targetTeamsResult, sourcePlayersResult, targetPlayersResult]) {
          if (result.error) return json({ error: result.error.message }, 400);
        }
        const sourceTeamById = new Map((sourceTeamsResult.data || []).map((team) => [team.id, team]));
        const targetTeamByLabel = new Map();
        (targetTeamsResult.data || []).forEach((team) => [team.short_name, team.name].filter(Boolean).forEach((label) => targetTeamByLabel.set(String(label).trim().toLowerCase(), team)));
        const errors = [];
        const copies = [];
        const duplicateKeys = new Set();
        const existingKeys = new Set((targetPlayersResult.data || []).map((player) => `${player.team_id || 'unassigned'}:${player.name.trim().toLowerCase()}`));

        (sourcePlayersResult.data || []).forEach((player) => {
          const sourceTeam = player.team_id ? sourceTeamById.get(player.team_id) : null;
          const targetTeam = sourceTeam
            ? targetTeamByLabel.get(String(sourceTeam.short_name || '').trim().toLowerCase()) || targetTeamByLabel.get(String(sourceTeam.name || '').trim().toLowerCase())
            : null;
          if (sourceTeam && !targetTeam) {
            errors.push(`No active-season team matches ${sourceTeam.short_name || sourceTeam.name}; copy that team first.`);
            return;
          }
          const nameKey = `${targetTeam?.id || 'unassigned'}:${player.name.trim().toLowerCase()}`;
          if (existingKeys.has(nameKey) || duplicateKeys.has(nameKey)) {
            errors.push(`${player.name} already exists for ${targetTeam?.name || 'the auction pool'} in the active season.`);
            return;
          }
          duplicateKeys.add(nameKey);
          const copy = withoutSeasonIdentity(player);
          copies.push({
            ...copy,
            team_id: targetTeam?.id || null,
            stats: {},
            sold_status: targetTeam ? 'sold' : 'available',
            sold_price: null,
            retain_next_season: true,
            next_team_id: null,
            season_id: targetSeason.id,
          });
        });
        if (errors.length) return json({ error: errors.slice(0, 20).join('\n'), errors }, 409);
        if (!copies.length) return json({ error: `${sourceSeason.name} has no players to copy` }, 400);

        const { data: inserted, error: insertError } = await admin.from('players').insert(copies).select('id');
        if (insertError) return json({ error: insertError.message }, 400);
        return json({ imported: inserted?.length || 0, source_season: sourceSeason.name });
      }
      if (path[1] === 'matches' && path[2] === 'import') {
        const body = await request.json();
        if (!Array.isArray(body.rows) || body.rows.length === 0) return json({ error: 'Upload a CSV with at least one match row' }, 400);
        if (body.rows.length > 500) return json({ error: 'Import is limited to 500 matches per file' }, 400);
        const season = await getActiveSeason(admin);
        const { data: teams, error: teamsError } = await admin.from('teams').select('id').eq('season_id', season.id);
        if (teamsError) return json({ error: teamsError.message }, 400);
        const activeTeamIds = new Set((teams || []).map((team) => team.id));
        const rows = [];
        const errors = [];
        const matchNumbers = new Set();

        body.rows.forEach((input, index) => {
          const row = input || {};
          const matchNo = Number(row.match_no);
          const teamA = String(row.team_a || '').trim();
          const teamB = String(row.team_b || '').trim();
          const winnerTeam = String(row.winner_team || '').trim();
          const startTime = new Date(row.start_time);
          const venue = String(row.venue || '').trim();
          if (!Number.isInteger(matchNo) || matchNo < 1) errors.push(`Row ${index + 2}: match_number must be a positive whole number`);
          if (!activeTeamIds.has(teamA)) errors.push(`Row ${index + 2}: team_1 is not in the active season`);
          if (!activeTeamIds.has(teamB)) errors.push(`Row ${index + 2}: team_2 is not in the active season`);
          if (teamA && teamB && teamA === teamB) errors.push(`Row ${index + 2}: teams must be different`);
          if (winnerTeam && (!activeTeamIds.has(winnerTeam) || (winnerTeam !== teamA && winnerTeam !== teamB))) errors.push(`Row ${index + 2}: winner must be one of the active fixture teams`);
          if (Number.isNaN(startTime.getTime())) errors.push(`Row ${index + 2}: start date/time is invalid`);
          if (!venue) errors.push(`Row ${index + 2}: venue is required`);
          if (!Number.isInteger(matchNo) || matchNo < 1 || !activeTeamIds.has(teamA) || !activeTeamIds.has(teamB) || teamA === teamB || (winnerTeam && (!activeTeamIds.has(winnerTeam) || (winnerTeam !== teamA && winnerTeam !== teamB))) || Number.isNaN(startTime.getTime()) || !venue) return;
          if (matchNumbers.has(matchNo)) errors.push(`Row ${index + 2}: duplicate match_number ${matchNo}`);
          matchNumbers.add(matchNo);
          rows.push({
            match_no: matchNo,
            team_a: teamA,
            team_b: teamB,
            winner_team: winnerTeam || null,
            start_time: startTime.toISOString(),
            match_day: String(row.match_day || '').trim() || null,
            venue,
            stage: String(row.stage || '').trim() || null,
            status: 'upcoming',
            overs: 20,
            win_probability: 50,
            season_id: season.id,
          });
        });
        if (errors.length) return json({ error: errors.slice(0, 20).join('\n'), errors }, 400);

        const existingRows = body.replace_existing
          ? await admin.from('matches').select('id').eq('season_id', season.id)
          : await admin.from('matches').select('match_no').eq('season_id', season.id).in('match_no', rows.map((row) => row.match_no));
        if (existingRows.error) return json({ error: existingRows.error.message }, 400);
        if (!body.replace_existing && existingRows.data?.length) {
          return json({ error: `Match numbers already exist in this season: ${[...new Set(existingRows.data.map((row) => row.match_no))].join(', ')}` }, 409);
        }

        const { data: inserted, error: insertError } = await admin.from('matches').insert(rows).select('id');
        if (insertError) return json({ error: insertError.message }, 400);
        const oldIds = body.replace_existing ? (existingRows.data || []).map((match) => match.id) : [];
        if (oldIds.length) {
          const { error: deleteError } = await admin.from('matches').delete().eq('season_id', season.id).in('id', oldIds);
          if (deleteError) {
            await admin.from('matches').delete().eq('season_id', season.id).in('id', (inserted || []).map((match) => match.id));
            return json({ error: `New schedule was not kept because the previous schedule could not be replaced: ${deleteError.message}` }, 400);
          }
        }
        return json({ imported: inserted?.length || 0, removed: oldIds.length });
      }
      const table = path[1];
      if (!ALLOWED.includes(table)) return json({ error: 'Invalid table' }, 400);
      const body = await request.json();
      const payload = body?.data ?? body;

      if (table === 'seasons') {
        if (payload?.id) {
          const { id, is_active, ...updates } = payload;
          if (updates.name) {
            const seasonName = String(updates.name).trim();
            const { data: duplicate, error: duplicateError } = await admin.from('seasons').select('id').eq('name', seasonName).neq('id', id).maybeSingle();
            if (duplicateError) return json({ error: duplicateError.message }, 400);
            if (duplicate) return json({ error: `Season "${seasonName}" already exists. Choose a different label.` }, 409);
            updates.name = seasonName;
          }
          if (is_active) {
            const { error } = await admin.rpc('activate_season', { target_season_id: id });
            if (error) return json({ error: error.message }, 400);
          }
          if (Object.keys(updates).length) {
            const { error } = await admin.from('seasons').update(updates).eq('id', id);
            if (error) return json({ error: error.message }, 400);
          }
          const { data, error } = await admin.from('seasons').select('*').eq('id', id).single();
          if (error) return json({ error: error.message }, 400);
          return json({ data });
        }

        const seasonName = String(payload?.name || '').trim();
        if (!seasonName) return json({ error: 'Season name is required' }, 400);
        const { data: duplicateSeason, error: duplicateError } = await admin.from('seasons').select('id').eq('name', seasonName).maybeSingle();
        if (duplicateError) return json({ error: duplicateError.message }, 400);
        if (duplicateSeason) return json({ error: `Season "${seasonName}" already exists. Choose a different label or activate the existing season.` }, 409);
        const { source_season_id, copy_roster, ...seasonFields } = payload || {};
        seasonFields.name = seasonName;
        const sourceResult = source_season_id
          ? await admin.from('seasons').select('*').eq('id', source_season_id).maybeSingle()
          : { data: null, error: null };
        if (sourceResult.error) return json({ error: sourceResult.error.message }, 400);
        const source = sourceResult.data;
        const newSeason = {
          ...seasonFields,
          tournament_name: seasonFields.tournament_name || source?.tournament_name || null,
          tagline: seasonFields.tagline || source?.tagline || null,
          logo_url: seasonFields.logo_url || source?.logo_url || null,
          accent_color: seasonFields.accent_color || source?.accent_color || null,
          is_active: false,
        };
        const { data: createdSeason, error: createError } = await admin.from('seasons').insert(newSeason).select().single();
        if (createError) {
          if (createError.code === '23505') return json({ error: `Season "${seasonName}" already exists. Choose a different label or activate the existing season.` }, 409);
          return json({ error: createError.message }, 400);
        }

        const abortCreate = async (error) => {
          await admin.from('seasons').delete().eq('id', createdSeason.id);
          return json({ error: error.message }, 400);
        };
        if (source) {
          const { data: sectionRows, error: sectionError } = await admin.from('sections').select('*').eq('season_id', source.id);
          if (sectionError) return abortCreate(sectionError);
          if (sectionRows?.length) {
            const { error } = await admin.from('sections').insert(sectionRows.map((row) => ({ ...withoutSeasonIdentity(row), season_id: createdSeason.id })));
            if (error) return abortCreate(error);
          }
        }

        if (source && copy_roster) {
          const { data: sourceTeams, error: teamsError } = await admin.from('teams').select('*').eq('season_id', source.id).order('order_index');
          if (teamsError) return abortCreate(teamsError);
          const teamIds = new Map();
          for (const team of sourceTeams || []) {
            const copy = withoutSeasonIdentity(team);
            Object.assign(copy, { played: 0, won: 0, lost: 0, tied: 0, no_result: 0, points: 0, nrr: 0, purse: 1000 });
            const { data, error } = await admin.from('teams').insert({ ...copy, season_id: createdSeason.id }).select('id').single();
            if (error) return abortCreate(error);
            teamIds.set(team.id, data.id);
          }
          const { data: sourcePlayers, error: playersError } = await admin.from('players').select('*').eq('season_id', source.id).order('order_index');
          if (playersError) return abortCreate(playersError);
          const retainedPlayers = (sourcePlayers || []).filter((player) => player.retain_next_season !== false);
          if (retainedPlayers.length) {
            const playerCopies = retainedPlayers.map((player) => {
              const copy = withoutSeasonIdentity(player);
              const sourceTeamId = player.next_team_id || player.team_id;
              const targetTeamId = sourceTeamId ? teamIds.get(sourceTeamId) || null : null;
              return {
                ...copy,
                team_id: targetTeamId,
                next_team_id: null,
                retain_next_season: true,
                stats: {},
                sold_status: targetTeamId ? 'sold' : 'available',
                sold_price: null,
                season_id: createdSeason.id,
              };
            });
            const { error } = await admin.from('players').insert(playerCopies);
            if (error) return abortCreate(error);
          }
        }
        return json({ data: createdSeason });
      }

      const season = SEASON_SCOPED_TABLES.has(table) ? await getActiveSeason(admin) : null;
      if (season) {
        const referenceError = await validateSeasonReferences(admin, table, payload, season.id);
        if (referenceError) return json({ error: referenceError.message }, 400);
      }
      if (payload?.id) {
        const { id, ...rest } = payload;
        if (season) rest.season_id = season.id;
        if (table === 'auction_state') {
          const { data: existing, error: lookupError } = await admin.from(table).select('id').eq('id', id).eq('season_id', season.id).maybeSingle();
          if (lookupError) return json({ error: lookupError.message }, 400);
          if (!existing) {
            const { data, error } = await admin.from(table).insert({ ...rest, id, season_id: season.id }).select().single();
            if (error) return json({ error: error.message }, 400);
            return json({ data });
          }
        }
        let q = admin.from(table).update(rest).eq('id', id);
        if (season) q = q.eq('season_id', season.id);
        const { data, error } = await q.select().single();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }
      const row = season ? { ...payload, season_id: season.id } : payload;
      const { data, error } = await admin.from(table).insert(row).select().single();
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
      let q = admin.from(table).delete().eq('id', id);
      if (SEASON_SCOPED_TABLES.has(table)) {
        const season = await getActiveSeason(admin);
        q = q.eq('season_id', season.id);
      }
      const { error } = await q;
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }
    return json({ error: 'Not found' }, 404);
  } catch (e) { return json({ error: e.message }, 500); }
}

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
  const { data: activeSeason, error: seasonError } = await admin.from('seasons').select('id').eq('is_active', true).maybeSingle();
  if (seasonError) return { error: seasonError.message };
  if (!activeSeason) return { error: 'No active season configured' };
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
  const { data: teams } = await admin.from('teams').insert(teamSeed.map((team) => ({ ...team, season_id: activeSeason.id }))).select();
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
  await admin.from('players').insert(players.map((player) => ({ ...player, season_id: activeSeason.id })));

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
  const { data: poolInserted } = await admin.from('players').insert(pool.map(({ team_id_tmp, ...player }) => ({ ...player, season_id: activeSeason.id }))).select();
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
  const { data: matchRows } = await admin.from('matches').insert(matches.map((match) => ({ ...match, season_id: activeSeason.id }))).select();
  const liveMatch = matchRows.find((m) => m.status === 'live');

  // SCORECARD for live match
  await admin.from('scorecards').insert({ match_id: liveMatch.id, innings: 1,
    batting: [ { name: 'Virat Rana', runs: 64, balls: 38, fours: 6, sixes: 3, sr: 168.4, how_out: 'not out' }, { name: 'Dev Patel', runs: 41, balls: 29, fours: 4, sixes: 1, sr: 141.3, how_out: 'c & b' }, { name: 'Arjun Singh', runs: 22, balls: 18, fours: 2, sixes: 0, sr: 122.2, how_out: 'b' }, { name: 'Kabir Sharma', runs: 8, balls: 6, fours: 1, sixes: 0, sr: 133.3, how_out: 'lbw' } ],
    bowling: [ { name: 'Jasprit Maxwell', overs: 4, maidens: 0, runs: 28, wickets: 2, econ: 7.0 }, { name: 'Trent Rashid', overs: 3.2, maidens: 0, runs: 34, wickets: 1, econ: 10.2 }, { name: 'Faf Bravo', overs: 4, maidens: 0, runs: 31, wickets: 1, econ: 7.8 } ],
    partnerships: [ { pair: 'Rana & Patel', runs: 88, balls: 52 }, { pair: 'Rana & Singh', runs: 34, balls: 21 } ] });

  // AUCTION STATE
  await admin.from('auction_state').upsert({ id: 1, season_id: activeSeason.id, status: 'live', current_player_id: currentLot?.id || null, current_bid: 180, current_bid_team: T['CHE'].id, increment: 20, timer_ends_at: iso(now + 45000) });
  if (currentLot) await admin.from('bids').insert([
    { player_id: currentLot.id, team_id: T['MUM'].id, amount: 100, season_id: activeSeason.id },
    { player_id: currentLot.id, team_id: T['BLR'].id, amount: 140, season_id: activeSeason.id },
    { player_id: currentLot.id, team_id: T['CHE'].id, amount: 180, season_id: activeSeason.id },
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
  ].map((sponsor) => ({ ...sponsor, season_id: activeSeason.id })));

  // GALLERY
  await admin.from('gallery').insert([...IMAGES.gallery, ...IMAGES.stadium].map((url, i) => ({ image_url: url, caption: ['Match night magic','Champions lift the cup','A sea of fans','Full house under lights','Yorker on target','The decisive wicket','Floodlit battleground','Super over drama','Electric atmosphere'][i] || 'Tournament moment', category: i % 2 ? 'Match' : 'Fans', order_index: i, season_id: activeSeason.id })));

  // NEWS
  await admin.from('news').insert([
    { title: 'Mavericks storm to top of the table', slug: 'mavericks-top-table', excerpt: 'A clinical all-round display sees Mumbai Mavericks seal top spot heading into the business end.', body: 'Mumbai Mavericks produced a complete performance to go five wins from six and claim pole position...', cover_url: IMAGES.gallery[0], author: 'NPL Media' },
    { title: 'Auction fireworks: overseas stars in demand', slug: 'auction-fireworks', excerpt: 'Franchises splurged big as marquee overseas all-rounders sparked bidding wars on day one.', body: 'The NPL mega-auction delivered drama from the first lot...', cover_url: IMAGES.gallery[1], author: 'NPL Media' },
    { title: 'Rana the run-machine: 64* and counting', slug: 'rana-run-machine', excerpt: 'Blazers skipper Virat Rana is in sublime touch under the Bengaluru lights.', body: 'Virat Rana continued his purple patch with a blistering unbeaten knock...', cover_url: IMAGES.gallery[4], author: 'NPL Media' },
    { title: 'Raptors eye a late-season surge', slug: 'raptors-surge', excerpt: 'Bottom of the pile but far from done — Rajasthan plot an unlikely playoff run.', body: 'Despite a tough campaign, the Raptors remain optimistic...', cover_url: IMAGES.gallery[2], author: 'NPL Media' },
  ].map((article) => ({ ...article, season_id: activeSeason.id })));

  // REGISTRATIONS (sample)
  await admin.from('registrations').insert([
    { full_name: 'Aditya Rao', email: 'aditya@example.com', phone: '9876543210', age: 24, role: 'Batter', batting_style: 'Right-hand bat', city: 'Pune', experience: 'District level', status: 'pending' },
    { full_name: 'Sahil Gupta', email: 'sahil@example.com', phone: '9812345678', age: 27, role: 'Bowler', bowling_style: 'Right-arm fast', city: 'Nagpur', experience: 'State level', status: 'pending' },
    { full_name: 'Imran Qureshi', email: 'imran@example.com', phone: '9900112233', age: 22, role: 'All-rounder', city: 'Hyderabad', experience: 'Club', status: 'approved' },
  ].map((registration) => ({ ...registration, season_id: activeSeason.id })));

  // SITE SETTINGS
  await admin.from('site_settings').upsert({ id: 1, tournament_name: 'Nepal Premier League', tagline: 'Where Legends Are Forged', accent_color: '#39FF14', primary_color: '#060a16', season: '2025', start_date: iso(now + 86400000 + 36000000), end_date: iso(now + 30 * 86400000),
    nav: [ { label: 'Home', href: '/' }, { label: 'Live', href: '/live' }, { label: 'Auction', href: '/auction' } ],
    footer: { about: 'The most cinematic cricket tournament.' }, seo: { title: 'Nepal Premier League', description: 'Live cricket tournament, auctions and realtime scores.' }, social: { instagram: '#', twitter: '#', youtube: '#' } });

  // SECTIONS (homepage builder)
  const sections = [
    { type: 'hero', title: 'NEPAL PREMIER LEAGUE', subtitle: 'Where Legends Are Forged', content: { cta_primary: 'Register Now', cta_secondary: 'Watch Live', badge: 'Season 2025 · 20 Matches · 6 Teams' }, order_index: 0 },
    { type: 'countdown', title: 'Next Match Starts In', subtitle: 'The countdown to glory has begun', content: {}, order_index: 1 },
    { type: 'live', title: 'Live & Latest', subtitle: 'Follow the action ball by ball', content: {}, order_index: 2 },
    { type: 'fixtures', title: 'Fixtures & Results', subtitle: 'Every clash of the season', content: {}, order_index: 3 },
    { type: 'points', title: 'Points Table', subtitle: 'The race to the playoffs', content: {}, order_index: 4 },
    { type: 'teams', title: 'The Franchises', subtitle: 'Six cities. One trophy.', content: {}, order_index: 5 },
    { type: 'players', title: 'Star Players', subtitle: 'The game-changers to watch', content: {}, order_index: 6 },
    { type: 'auction', title: 'The Auction', subtitle: 'Fortunes made in seconds', content: { cta: 'Enter Auction Room' }, order_index: 7 },
    { type: 'news', title: 'Latest News', subtitle: 'Headlines from the league', content: {}, order_index: 8 },
    { type: 'gallery', title: 'Gallery', subtitle: 'Moments that defined the night', content: {}, order_index: 9 },
    { type: 'sponsors', title: 'Our Partners', subtitle: 'Powering the Nepal Premier League', content: {}, order_index: 10 },
    { type: 'register', title: 'Join The League', subtitle: 'Think you have what it takes? Register as a player.', content: {}, order_index: 11 },
  ].map((s) => ({ ...s, visible: true, published: true, animation: 'fade' }));
  await admin.from('sections').insert(sections.map((section) => ({ ...section, season_id: activeSeason.id })));

  await ensureAdminUser();
  return { ok: true, seeded: true, teams: teams.length, players: players.length + pool.length, matches: matchRows.length };
}
