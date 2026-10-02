export function deriveTeamStats(teams, matches) {
  const stats = new Map(teams.map((team) => [team.id, {
    played: 0,
    won: 0,
    lost: 0,
    tied: 0,
    no_result: 0,
    points: 0,
  }]));

  matches.filter((match) => match.status === 'completed').forEach((match) => {
    const teamA = stats.get(match.team_a);
    const teamB = stats.get(match.team_b);
    if (!teamA || !teamB) return;
    const result = (match.result || '').toLowerCase();
    teamA.played += 1;
    teamB.played += 1;

    if (/no result|abandon|cancel/.test(result)) {
      teamA.no_result += 1;
      teamB.no_result += 1;
      teamA.points += 1;
      teamB.points += 1;
      return;
    }

    if (match.winner_team === match.team_a || match.winner_team === match.team_b) {
      const winner = match.winner_team === match.team_a ? teamA : teamB;
      const loser = winner === teamA ? teamB : teamA;
      winner.won += 1;
      winner.points += 2;
      loser.lost += 1;
      return;
    }

    const runsA = Number(match.team_a_runs || 0);
    const runsB = Number(match.team_b_runs || 0);
    if (runsA === runsB || /\btied\b|\bdraw\b/.test(result)) {
      teamA.tied += 1;
      teamB.tied += 1;
      teamA.points += 1;
      teamB.points += 1;
      return;
    }

    if (runsA > runsB) {
      teamA.won += 1;
      teamB.lost += 1;
      teamA.points += 2;
    } else {
      teamB.won += 1;
      teamA.lost += 1;
      teamB.points += 2;
    }
  });

  return teams.map((team) => ({ ...team, ...stats.get(team.id) }));
}

export function teamLeaders(players, teamId) {
  const squad = players.filter((player) => player.team_id === teamId);
  const topScorer = [...squad].sort((a, b) => Number(b.stats?.runs || 0) - Number(a.stats?.runs || 0))[0] || null;
  const topWicketTaker = [...squad].sort((a, b) => Number(b.stats?.wickets || 0) - Number(a.stats?.wickets || 0))[0] || null;
  return { squad, topScorer, topWicketTaker };
}
