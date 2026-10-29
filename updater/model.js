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
import { allocateSide } from '../docs/claude.js';

export const OUT_STATUSES = new Set(['Out', 'Doubtful', 'Injured Reserve', 'Suspension', 'Physically Unable to Perform']);
const OPP_TYPES = ['passAtt', 'rushAtt', 'targets'];
const MADE = ['passYds', 'rushYds', 'recYds', 'rec', 'td'];
const GROUP = { QB: 'QB', RB: 'RB', FB: 'RB', HB: 'RB', WR: 'WR', TE: 'TE' };

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

// One team's inputs for the shared step (docs/claude.js): its expected score, and each player who has
// played for it with his expected opportunities a game and steadied rates.
// ctx: { home, neutral, implied (betting market's expected points or null), oppId, roster (ids or null),
//        positions: { id: pos }, prior: { league, players }, injuries: Map(id -> status) }
export function prepareSide(state, teamId, ctx) {
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

  // The expected starting QB is the one with the most passes in the team's last two games.
  const recent = list.slice(-MODEL.starterGames);
  const recentPasses = (id) => recent.reduce((a, g) => a + (g.players.get(id)?.stats.passAtt ?? 0), 0);
  const teamAvg = (type) => (n ? list.reduce((a, g) => a + g.totals[type], 0) / n : 0);

  // Expected opportunities a game, with last season counted as extra games, and steadied rates.
  const rows = [...players.values()].map((p) => {
    const prior = ctx.prior?.players?.[p.id];
    const exp = {};
    for (const type of OPP_TYPES) {
      const G = prior ? MODEL.memoryGames[type] : 0;
      exp[type] = (p.t[type] + G * (prior ? prior.t[type] / prior.gp : 0)) / (p.gp + G);
    }
    const status = ctx.injuries?.get(p.id) ?? '';
    const pr = prior ? { player: prior, league: ctx.prior.league } : null;
    return {
      id: p.id, name: p.name, pos: ctx.positions?.[p.id] ?? '', group: GROUP[ctx.positions?.[p.id]] ?? 'other', status,
      out: OUT_STATUSES.has(status), seasonPassAtt: p.t.passAtt, recentPasses: recentPasses(p.id), exp,
      rate100: Object.fromEntries(MADE.map((s) => [s, 100 * rate(s, p.t, pr, state)])),
    };
  });

  // Touchdowns follow the betting market's expected points against the team's usual.
  const withLine = list.filter((g) => g.implied !== null);
  const usual = withLine.length ? withLine.reduce((a, g) => a + g.implied, 0) / withLine.length : null;
  const tdFactor = market !== null && usual ? (market / usual) ** MODEL.marketTdPower : 1;

  return {
    score, model, market, teamAvg: { passAtt: teamAvg('passAtt'), rushAtt: teamAvg('rushAtt'), targets: teamAvg('targets') }, tdFactor,
    scaleRange: MODEL.scaleRange, listMinOpps: MODEL.listMinOpps, rows,
  };
}

// One team's side of an upcoming game: its inputs, then the shared step.
export function claudeSide(state, teamId, ctx) {
  return allocateSide(prepareSide(state, teamId, ctx));
}

// Expected points from a betting line: home (O/U − spread) ÷ 2, away (O/U + spread) ÷ 2 (spread is the home line).
export function impliedPoints(odds, teamId) {
  if (!odds) return null;
  return teamId === odds.homeId ? (odds.overUnder - odds.spread) / 2 : (odds.overUnder + odds.spread) / 2;
}
