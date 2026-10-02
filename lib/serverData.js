import { getAdminClient } from '@/lib/supabaseAdmin';
import { deriveTeamStats } from '@/lib/teamStats';

async function getActiveSeason(admin) {
  const { data, error } = await admin.from('seasons').select('*').eq('is_active', true).maybeSingle();
  if (error) throw error;
  return data;
}

function settingsForSeason(settings, season) {
  if (!season) return settings;
  return {
    ...settings,
    tournament_name: season.tournament_name || settings?.tournament_name,
    tagline: season.tagline || settings?.tagline,
    logo_url: season.logo_url || settings?.logo_url,
    accent_color: season.accent_color || settings?.accent_color,
    season: season.name,
    active_season_id: season.id,
  };
}

export async function bootstrapData() {
  const a = getAdminClient();
  const season = await getActiveSeason(a);
  if (!season) throw new Error('No active season configured');
  const [settings, sections, teams, matches, players, news, sponsors, gallery, auction] = await Promise.all([
    a.from('site_settings').select('*').eq('id', 1).maybeSingle(),
    a.from('sections').select('*').eq('season_id', season.id).eq('visible', true).eq('published', true).order('order_index'),
    a.from('teams').select('*').eq('season_id', season.id),
    a.from('matches').select('*').eq('season_id', season.id).order('start_time'),
    a.from('players').select('*').eq('season_id', season.id).eq('review_status', 'approved'),
    a.from('news').select('*').eq('season_id', season.id).eq('published', true).order('created_at', { ascending: false }),
    a.from('sponsors').select('*').eq('season_id', season.id).order('order_index'),
    a.from('gallery').select('*').eq('season_id', season.id).order('order_index'),
    a.from('auction_state').select('*').eq('season_id', season.id).eq('id', 1).maybeSingle(),
  ]);
  const matchRows = matches.data || [];
  return { settings: settingsForSeason(settings.data, season), season, sections: sections.data || [], teams: deriveTeamStats(teams.data || [], matchRows), matches: matchRows, players: players.data || [], news: news.data || [], sponsors: sponsors.data || [], gallery: gallery.data || [], auction: auction.data };
}

export async function liveMatchData() {
  const a = getAdminClient();
  const season = await getActiveSeason(a);
  if (!season) throw new Error('No active season configured');
  const [settings, teams] = await Promise.all([
    a.from('site_settings').select('*').eq('id', 1).maybeSingle(),
    a.from('teams').select('*').eq('season_id', season.id),
  ]);
  let match = (await a.from('matches').select('*').eq('season_id', season.id).eq('status', 'live').order('start_time', { ascending: false }).limit(1).maybeSingle()).data;
  if (!match) match = (await a.from('matches').select('*').eq('season_id', season.id).order('start_time', { ascending: false }).limit(1).maybeSingle()).data;
  let scorecard = null;
  if (match) { const sc = await a.from('scorecards').select('*').eq('match_id', match.id).order('innings'); scorecard = (sc.data || [])[0] || null; }
  return { settings: settingsForSeason(settings.data, season), season, teams: teams.data || [], match, scorecard };
}

export async function auctionRoomData() {
  const a = getAdminClient();
  const season = await getActiveSeason(a);
  if (!season) throw new Error('No active season configured');
  const [settings, teams, players, auction] = await Promise.all([
    a.from('site_settings').select('*').eq('id', 1).maybeSingle(),
    a.from('teams').select('*').eq('season_id', season.id),
    a.from('players').select('*').eq('season_id', season.id).eq('review_status', 'approved').eq('is_overseas', false).is('team_id', null),
    a.from('auction_state').select('*').eq('season_id', season.id).eq('id', 1).maybeSingle(),
  ]);
  let bids = [];
  if (auction.data?.current_player_id) { const b = await a.from('bids').select('*').eq('season_id', season.id).eq('player_id', auction.data.current_player_id).order('amount', { ascending: false }); bids = b.data || []; }
  return { settings: settingsForSeason(settings.data, season), season, teams: teams.data || [], players: players.data || [], auction: auction.data, bids };
}
