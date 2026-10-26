// Claude's formula: projections for an upcoming game, designed by Claude at Nate's request (26 Oct 2026).
// Separate from Nate's formula (docs/calc.js) and its whole-number rules: this model works in ordinary
// decimals and its figures are shown cut (yards to whole numbers, touchdowns to one decimal).
//
// Team scores: points scored and allowed so far (pulled toward the league average while there are few
// games, plus a small home edge), blended with the betting market's expected score when ESPN has a line.
// Players: expected opportunities × steadied efficiency, the best-testing formula on 2024-26 games:
//   - opportunities a game: this season's average, with last season's average counted as a few extra games;
//     the expected starting quarterback (most passes in the team's last two games, not injured) gets the
//     team's passes; players ruled out are removed and their carries and targets shared among teammates at
//     the same position; then carries and targets are scaled to the team's usual totals (within ±20%).
//   - efficiency: this season's rate pulled toward his own last-season rate (itself pulled toward the
//     league rate), or straight toward the league rate if he has no last season.
//   - touchdowns: carries + targets × steadied scoring rate, nudged by the betting market's expected points.

export const MODEL = {
  // Last season's opportunities a game count as this many extra games.
  memoryGames: { passAtt: 1, rushAtt: 0.5, targets: 1 },
  // Efficiency steadying: league (K) and own-last-season (Kp) weight, in opportunities.
  rates: {
    passYds: { opp: 'passAtt', K: 200, Kp: 100 },
    rushYds: { opp: 'rushAtt', K: 25, Kp: 25 },
    recYds: { opp: 'targets', K: 20, Kp: 40 },
    rec: { opp: 'targets', K: 20, Kp: 20 }, // not shown on the site; scored in the weekly formula check
    td: { opp: 'touches', K: 800, Kp: 3200 },
  },
  marketTdPower: 0.5, // touchdowns × (expected points ÷ usual expected points) ^ this
  shrinkGames: 4, // team points: the league average counts as this many games
  homeEdge: 0.75, // points added to the home team and taken from the away team (not at neutral sites)
  marketWeight: 0.9, // share of the betting market's expected score in the final team score
  scaleRange: [0.8, 1.2], // limits on scaling carries and targets to the team's usual totals
  starterGames: 2, // the expected starting QB has the most passes over this many recent team games
  listMinOpps: 1, // players expected to get fewer opportunities than this aren't listed as "out"
};
export const OUT_STATUSES = new Set(['Out', 'Doubtful', 'Injured Reserve', 'Suspension', 'Physically Unable to Perform']);
const OPP_TYPES = ['passAtt', 'rushAtt', 'targets'];
const MADE = ['passYds', 'rushYds', 'recYds', 'rec', 'td'];
const GROUP = { QB: 'QB', RB: 'RB', FB: 'RB', HB: 'RB', WR: 'WR', TE: 'TE' };

const clamp = (x, [lo, hi]) => Math.min(hi, Math.max(lo, x));
const opps = (t, type) => (type === 'touches' ? t.rushAtt + t.targets : t[type]);

// Everything the model needs from this season's saved games (already turned into per-team game lines):
// teamGames: Map(teamId -> [{ start, points, pointsAgainst, implied, totals, players: Map(id -> { name, stats }) }]).
export function seasonState(teamGames) {
  const league = Object.fromEntries([...OPP_TYPES, ...MADE].map((s) => [s, 0]));
  let leaguePoints = 0;
  let leagueGames = 0;
  for (const list of teamGames.values()) {
    for (const g of list) {
      leaguePoints += g.points;
      leagueGames++;
      for (const s of Object.keys(league)) league[s] += g.totals[s];
    }
  }
  return { teamGames, league, leaguePpg: leagueGames ? leaguePoints / leagueGames : 0 };
}

// Steadied rate: this season pulled toward his last season (itself pulled toward last season's league),
// or toward this season's league rate when he has no last season.
function rate(stat, mine, prior, state) {
  const { opp, K, Kp } = MODEL.rates[stat];
  const lOpps = opps(state.league, opp);
  const leagueRate = lOpps ? state.league[stat] / lOpps : 0;
  const p = prior?.player;
  if (p && opps(p.t, opp) > 0) {
    const pl = prior.league;
    const priorRate = (p.t[stat] + K * (pl[stat] / opps(pl, opp))) / (opps(p.t, opp) + K);
    return (mine[stat] + Kp * priorRate) / (opps(mine, opp) + Kp);
  }
  return (mine[stat] + K * leagueRate) / (opps(mine, opp) + K);
}

// One team's side of an upcoming game.
// ctx: { home, neutral, implied (betting market's expected points or null), oppId, roster (ids or null),
//        positions: { id: pos }, prior: { league, players }, injuries: Map(id -> status) }
export function claudeSide(state, teamId, ctx) {
  const list = state.teamGames.get(teamId) ?? [];
  const n = list.length;
  const zero = () => Object.fromEntries([...OPP_TYPES, ...MADE].map((s) => [s, 0]));

  // Team points: own scoring and the opponent's defence, each pulled toward the league average.
  const L = state.leaguePpg;
  const shrink = (total, games) => (total + MODEL.shrinkGames * L) / (games + MODEL.shrinkGames);
  const oppList = state.teamGames.get(ctx.oppId) ?? [];
  const offence = shrink(list.reduce((a, g) => a + g.points, 0), n);
  const defence = shrink(oppList.reduce((a, g) => a + g.pointsAgainst, 0), oppList.length);
  const edge = ctx.neutral ? 0 : ctx.home ? MODEL.homeEdge : -MODEL.homeEdge;
  const model = offence + defence - L + edge;
  const market = ctx.implied ?? null;
  const score = market === null ? model : MODEL.marketWeight * market + (1 - MODEL.marketWeight) * model;

  // This season's lines for each player who has played for this team (and is still on its roster).
  const players = new Map();
  for (const g of list) {
    for (const [id, p] of g.players) {
      if (ctx.roster?.length && !ctx.roster.includes(id)) continue;
      if (!players.has(id)) players.set(id, { id, name: p.name, gp: 0, t: zero() });
      const e = players.get(id);
      e.name = p.name;
      e.gp++;
      for (const s of Object.keys(e.t)) e.t[s] += p.stats[s];
    }
  }

  // Expected opportunities a game, with last season counted as extra games.
  const rows = [...players.values()].map((p) => {
    const prior = ctx.prior?.players?.[p.id];
    const exp = {};
    for (const type of OPP_TYPES) {
      const G = prior ? MODEL.memoryGames[type] : 0;
      exp[type] = (p.t[type] + G * (prior ? prior.t[type] / prior.gp : 0)) / (p.gp + G);
    }
    const status = ctx.injuries?.get(p.id) ?? '';
    return { ...p, pos: ctx.positions?.[p.id] ?? '', group: GROUP[ctx.positions?.[p.id]] ?? 'other', status,
      out: OUT_STATUSES.has(status), exp, prior: prior ? { player: prior, league: ctx.prior.league } : null };
  });
  const active = rows.filter((r) => !r.out);

  // Passing: only the expected starter (most passes in the last two games, not ruled out) throws, at his own
  // expected passes a game (this season blended with last season).
  const teamAvg = (type) => (n ? list.reduce((a, g) => a + g.totals[type], 0) / n : 0);
  const recent = list.slice(-MODEL.starterGames);
  const recentPasses = (id) => recent.reduce((a, g) => a + (g.players.get(id)?.stats.passAtt ?? 0), 0);
  const qbs = active.filter((r) => r.t.passAtt > 0)
    .sort((a, b) => recentPasses(b.id) - recentPasses(a.id) || b.t.passAtt - a.t.passAtt);
  for (const r of active) if (r !== qbs[0]) r.exp.passAtt = 0;

  // Carries and targets: share out what ruled-out players would have had, at the same position first,
  // then scale to the team's usual totals.
  for (const type of ['rushAtt', 'targets']) {
    for (const o of rows.filter((r) => r.out && r.exp[type] > 0)) {
      const same = active.filter((r) => r.group === o.group && r.exp[type] > 0);
      const pool = same.length ? same : active.filter((r) => r.exp[type] > 0);
      const total = pool.reduce((a, r) => a + r.exp[type], 0);
      for (const r of pool) r.exp[type] += total ? (o.exp[type] * r.exp[type]) / total : 0;
    }
    const sum = active.reduce((a, r) => a + r.exp[type], 0);
    const factor = sum ? clamp(teamAvg(type) / sum, MODEL.scaleRange) : 1;
    for (const r of active) r.exp[type] *= factor;
  }

  // Touchdowns follow the betting market's expected points against the team's usual.
  const withLine = list.filter((g) => g.implied !== null);
  const usual = withLine.length ? withLine.reduce((a, g) => a + g.implied, 0) / withLine.length : null;
  const tdFactor = market !== null && usual ? (market / usual) ** MODEL.marketTdPower : 1;

  const projected = active.map((r) => ({
    id: r.id, name: r.name, pos: r.pos, status: r.status,
    passAtt: r.exp.passAtt, rushAtt: r.exp.rushAtt, targets: r.exp.targets,
    passYds: r.exp.passAtt * rate('passYds', r.t, r.prior, state),
    rushYds: r.exp.rushAtt * rate('rushYds', r.t, r.prior, state),
    recYds: r.exp.targets * rate('recYds', r.t, r.prior, state),
    rec: r.exp.targets * rate('rec', r.t, r.prior, state),
    td: (r.exp.rushAtt + r.exp.targets) * rate('td', r.t, r.prior, state) * tdFactor,
  }));
  const sumOf = (s) => projected.reduce((a, p) => a + p[s], 0);
  // Listed as out: ruled-out players who would have had a real role (or who have thrown passes this season).
  const out = rows.filter((r) => r.out && (OPP_TYPES.some((t) => r.exp[t] >= MODEL.listMinOpps) || r.t.passAtt > 0))
    .map((r) => ({ id: r.id, name: r.name, pos: r.pos, status: r.status }));

  return {
    score, model, market,
    passYds: sumOf('passYds'), rushYds: sumOf('rushYds'), td: sumOf('td'),
    players: projected, out,
  };
}

// Expected points from a betting line: home (O/U − spread) ÷ 2, away (O/U + spread) ÷ 2 (spread is the home line).
export function impliedPoints(odds, teamId) {
  if (!odds) return null;
  return teamId === odds.homeId ? (odds.overUnder - odds.spread) / 2 : (odds.overUnder + odds.spread) / 2;
}
