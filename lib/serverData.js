import { getAdminClient } from '@/lib/supabaseAdmin';

export async function bootstrapData() {
  const a = getAdminClient();
  const [settings, sections, teams, matches, players, news, sponsors, gallery, auction] = await Promise.all([
    a.from('site_settings').select('*').eq('id', 1).maybeSingle(),
    a.from('sections').select('*').eq('visible', true).eq('published', true).order('order_index'),
    a.from('teams').select('*'),
    a.from('matches').select('*').order('start_time'),
    a.from('players').select('*'),
    a.from('news').select('*').eq('published', true).order('created_at', { ascending: false }),
    a.from('sponsors').select('*').order('order_index'),
    a.from('gallery').select('*').order('order_index'),
    a.from('auction_state').select('*').eq('id', 1).maybeSingle(),
  ]);
  return { settings: settings.data, sections: sections.data || [], teams: teams.data || [], matches: matches.data || [], players: players.data || [], news: news.data || [], sponsors: sponsors.data || [], gallery: gallery.data || [], auction: auction.data };
}

export async function liveMatchData() {
  const a = getAdminClient();
  const [settings, teams] = await Promise.all([
    a.from('site_settings').select('*').eq('id', 1).maybeSingle(),
    a.from('teams').select('*'),
  ]);
  let match = (await a.from('matches').select('*').eq('status', 'live').order('start_time', { ascending: false }).limit(1).maybeSingle()).data;
  if (!match) match = (await a.from('matches').select('*').order('start_time', { ascending: false }).limit(1).maybeSingle()).data;
  let scorecard = null;
  if (match) { const sc = await a.from('scorecards').select('*').eq('match_id', match.id).order('innings'); scorecard = (sc.data || [])[0] || null; }
  return { settings: settings.data, teams: teams.data || [], match, scorecard };
}

export async function auctionRoomData() {
  const a = getAdminClient();
  const [settings, teams, players, auction] = await Promise.all([
    a.from('site_settings').select('*').eq('id', 1).maybeSingle(),
    a.from('teams').select('*'),
    a.from('players').select('*').is('team_id', null),
    a.from('auction_state').select('*').eq('id', 1).maybeSingle(),
  ]);
  let bids = [];
  if (auction.data?.current_player_id) { const b = await a.from('bids').select('*').eq('player_id', auction.data.current_player_id).order('amount', { ascending: false }); bids = b.data || []; }
  return { settings: settings.data, teams: teams.data || [], players: players.data || [], auction: auction.data, bids };
}
