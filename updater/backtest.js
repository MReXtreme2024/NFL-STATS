// Formula check: how well each projection option would have predicted each finished week,
// using only the games before that week. Run after each weekly update:
//   node updater/backtest.js                      print the report
//   node updater/backtest.js --out data/formula-check.md   also save it
// Uses the site's own maths (docs/calc.js), scoring the projections as shown (cut).
// Only players who played that week and had played for the team before are scored, so a
// backup who doesn't get on the field is not counted against any option.
// Two ideas are tracked here only (not on the site) until they prove themselves, worked in
// ordinary decimals on top of Smart's exact value and then cut like a shown projection:
//   Smart+          his recent share of the team's opportunities (each game back counts 0.85 as much)
//                   × the team's opportunities a game × Smart's steadied rate × the opponent's steadied
//                   yards/catches/TDs allowed vs the league (as if it had 12 extra league-average games)
//   Smart + market  touchdowns × this game's expected team points (from the betting line) ÷ his team's usual;
//                   passing yards −1% and rushing yards +1% per point the team is expected to lead by more than usual

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODES, playerStat, smartStat } from '../docs/calc.js';
import { STATS, lineToStats, loadGames, recordedAny } from './build.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const strength = config.smartFormula;

const PROJ_STATS = ['passYds', 'rushYds', 'recYds', 'rec', 'td'];
const LABEL = { passYds: 'Pass yds', rushYds: 'Rush yds', recYds: 'Rec yds', rec: 'Rec', td: 'TD' };
const OPTIONS = {
  [MODES.ALL]: 'All team games', [MODES.PLAYED]: 'Games he played', [MODES.SMART]: 'Smart',
  plus: 'Smart+ (tracking)', market: 'Smart + market (tracking)',
};
const TRACKING = { plus: { track: 'plus' }, market: { track: 'market' } };
const OPPS = { passYds: ['passAtt'], rushYds: ['rushAtt'], recYds: ['targets'], rec: ['targets'], td: ['rushAtt', 'targets'] };
const RECENT_WEIGHT = 0.85;
const OPPONENT_GAMES = 12;
const SCRIPT = 0.01;
const GRID = { pass: [50, 100, 200, 400], rush: [10, 25, 50, 100], rec: [10, 20, 40, 80], td: [100, 200, 400, 1000] };
const MIN_HISTORY = 2; // a team needs this many earlier games before its players are scored
const WORTH_CHANGING = 0.005; // suggest new Smart settings only if they gain at least half a percentage point

const zero = () => Object.fromEntries(STATS.map((s) => [s, 0]));
const add = (a, b) => STATS.forEach((s) => (a[s] += b[s]));

// Weeks in play order, e.g. "REG-7", "WC-1", with each team's game lines.
function loadWeeks() {
  const games = loadGames(path.join(ROOT, 'data', 'games', String(config.season)))
    .sort((a, b) => a.start.localeCompare(b.start));
  const order = [];
  const teamGames = new Map(); // teamId -> [{ key, oppId, implied, margin, totals, players: Map(id -> stats) }]
  for (const g of games) {
    const key = `${g.type}-${g.week}`;
    if (!order.includes(key)) order.push(key);
    for (const side of g.teams) {
      // Expected points from the betting line: home (O/U − spread) ÷ 2, away (O/U + spread) ÷ 2.
      const o = g.odds;
      const home = o && side.id === o.homeId;
      const implied = o ? (home ? o.overUnder - o.spread : o.overUnder + o.spread) / 2 : null;
      const margin = o ? (home ? -o.spread : o.spread) : null;
      const oppId = g.teams.find((t) => t !== side).id;
      const players = new Map();
      const totals = zero();
      for (const p of side.players) {
        const st = lineToStats(p.stats);
        if (!recordedAny(st)) continue;
        players.set(p.id, st);
        add(totals, st);
      }
      if (!teamGames.has(side.id)) teamGames.set(side.id, []);
      teamGames.get(side.id).push({ key, oppId, implied, margin, totals, players });
    }
  }
  return { order, teamGames };
}

// Average miss per player per stat for each option, over the given test weeks.
function score(weekKeys, { order, teamGames }, strengths) {
  const res = {}; // option -> stat -> { miss, n }
  for (const key of weekKeys) {
    const before = new Set(order.slice(0, order.indexOf(key)));
    const league = zero();
    for (const list of teamGames.values()) for (const tg of list) if (before.has(tg.key)) add(league, tg.totals);

    for (const list of teamGames.values()) {
      const now = list.find((tg) => tg.key === key);
      const hist = list.filter((tg) => before.has(tg.key));
      if (!now || hist.length < MIN_HISTORY) continue;
      const teamTotals = zero();
      hist.forEach((tg) => add(teamTotals, tg.totals));
      const ctx = { teamGames, before, league, hist, now };

      for (const [pid, actual] of now.players) {
        const his = hist.filter((tg) => tg.players.has(pid));
        if (!his.length) continue;
        const playerTotals = zero();
        const inHisGames = zero();
        his.forEach((tg) => { add(playerTotals, tg.players.get(pid)); add(inHisGames, tg.totals); });

        for (const s of PROJ_STATS) {
          if (playerTotals[s] === 0) continue; // only players with a history in this stat
          const tenths = s === 'td';
          for (const [option, strengthSet] of Object.entries(strengths)) {
            let shown;
            if (strengthSet?.track) {
              const smart = smartStat(s, { playerTotals, playerGP: his.length, league, strength }).exact / 100;
              const v = smart * trackingFactor(strengthSet.track, s, { ...ctx, pid, his, playerTotals });
              shown = tenths ? Math.trunc(v * 10) / 10 : Math.trunc(v);
            } else {
              const mode = strengthSet ? MODES.SMART : option;
              const r = mode === MODES.SMART
                ? smartStat(s, { playerTotals, playerGP: his.length, league, strength: strengthSet }, tenths)
                : playerStat({ teamTotal: teamTotals[s], teamGP: hist.length, playerTotal: playerTotals[s],
                  teamTotalInHisGames: inHisGames[s], playerGP: his.length }, mode, tenths);
              shown = tenths ? r.projection / 10 : r.projection;
            }
            res[option] ??= {};
            res[option][s] ??= { miss: 0, n: 0 };
            res[option][s].miss += Math.abs(shown - actual[s]);
            res[option][s].n++;
          }
        }
      }
    }
  }
  return res;
}

// How much a tracked idea scales Smart's projection for stat s (1 = no change).
function trackingFactor(track, s, { teamGames, before, league, hist, now, pid, his, playerTotals }) {
  const sumOpps = (stats) => OPPS[s].reduce((a, k) => a + stats[k], 0);
  if (track === 'market') {
    const withOdds = hist.filter((tg) => tg.implied !== null);
    if (now.implied === null || !withOdds.length) return 1;
    const usualPoints = withOdds.reduce((a, tg) => a + tg.implied, 0) / withOdds.length;
    const usualMargin = withOdds.reduce((a, tg) => a + tg.margin, 0) / withOdds.length;
    const lead = now.margin - usualMargin;
    if (s === 'td') return now.implied / usualPoints;
    if (s === 'passYds') return 1 - SCRIPT * lead;
    if (s === 'rushYds') return 1 + SCRIPT * lead;
    return 1;
  }
  // Smart+: recent share of team opportunities × team opportunities a game, instead of his own season average.
  const seasonOpps = sumOpps(playerTotals) / his.length;
  if (!seasonOpps) return 1;
  const w = his.map((_, i) => RECENT_WEIGHT ** (his.length - 1 - i));
  const wSum = w.reduce((a, b) => a + b, 0);
  const mine = his.reduce((a, tg, i) => a + w[i] * sumOpps(tg.players.get(pid)), 0) / wSum;
  const teamInHis = his.reduce((a, tg, i) => a + w[i] * sumOpps(tg.totals), 0) / wSum;
  const teamSeason = hist.reduce((a, tg) => a + sumOpps(tg.totals), 0) / hist.length;
  const opps = teamInHis ? (mine / teamInHis) * teamSeason : mine;
  // Opponent: what it allowed a game so far, steadied toward the league average.
  let allowed = 0;
  let games = 0;
  let leagueGames = 0;
  for (const list of teamGames.values()) {
    for (const tg of list) {
      if (!before.has(tg.key)) continue;
      leagueGames++;
      if (tg.oppId === now.oppId) { allowed += tg.totals[s]; games++; }
    }
  }
  const leaguePerGame = leagueGames ? league[s] / leagueGames : 0;
  const opponent = leaguePerGame
    ? (allowed + OPPONENT_GAMES * leaguePerGame) / (games + OPPONENT_GAMES) / leaguePerGame : 1;
  return (opps / seasonOpps) * opponent;
}

const avg = (r, s) => (r?.[s]?.n ? r[s].miss / r[s].n : null);
// Overall: the average, over the five stats, of each option's miss relative to All team games.
const overall = (res, option) =>
  PROJ_STATS.reduce((sum, s) => sum + avg(res[option], s) / avg(res[MODES.ALL], s), 0) / PROJ_STATS.length - 1;
const pct = (x) => `${x <= 0 ? '' : '+'}${(x * 100).toFixed(1)}%`;

function table(title, res) {
  const lines = [`### ${title}`, '', `| Option | ${PROJ_STATS.map((s) => LABEL[s]).join(' | ')} | Overall vs All team games |`,
    `|---|${PROJ_STATS.map(() => '---:').join('|')}|---:|`];
  for (const [option, label] of Object.entries(OPTIONS)) {
    lines.push(`| ${label} | ${PROJ_STATS.map((s) => avg(res[option], s)?.toFixed(2) ?? '—').join(' | ')} | ${pct(overall(res, option))} |`);
  }
  lines.push('', `Average miss per player per game (lower is better). Players scored: ${PROJ_STATS.map((s) => `${LABEL[s]} ${res[MODES.ALL]?.[s]?.n ?? 0}`).join(', ')}.`, '');
  return lines.join('\n');
}

export function report() {
  const weeks = loadWeeks();
  const testable = weeks.order.slice(MIN_HISTORY);
  if (!testable.length) return 'Not enough finished weeks to test yet.';
  const latest = testable.at(-1);
  const options = { [MODES.ALL]: null, [MODES.PLAYED]: null, [MODES.SMART]: strength, ...TRACKING };
  const out = [`## Formula check, ${config.season} — latest week tested: ${latest}`, '',
    `Smart steadying settings in config.json: pass ${strength.pass}, rush ${strength.rush}, rec ${strength.rec}, td ${strength.td}.`, '',
    table(`Latest week (${latest})`, score([latest], weeks, options)),
    table(`Season so far (${testable[0]} to ${latest})`, score(testable, weeks, options))];

  // Would different Smart settings have done better over the season so far? One setting at a time.
  const tuned = { ...strength };
  const gridLines = [];
  for (const [k, values] of Object.entries(GRID)) {
    const trial = Object.fromEntries(values.map((v) => [`${MODES.SMART}-${k}-${v}`, { ...strength, [k]: v }]));
    const res = score(testable, weeks, { [MODES.ALL]: null, ...trial });
    const ranked = values.map((v) => ({ v, o: overall(res, `${MODES.SMART}-${k}-${v}`) })).sort((a, b) => a.o - b.o);
    tuned[k] = ranked[0].v;
    gridLines.push(`- ${k}: ${values.map((v) => `${v} → ${pct(ranked.find((x) => x.v === v).o)}`).join(', ')}`);
  }
  const res = score(testable, weeks, { [MODES.ALL]: null, current: strength, tuned });
  const gain = overall(res, 'current') - overall(res, 'tuned');
  const changed = Object.keys(GRID).some((k) => tuned[k] !== strength[k]) && gain >= WORTH_CHANGING;
  out.push('### Smart settings check (season so far, overall vs All team games)', '', ...gridLines, '',
    changed
      ? `Best settings found: pass ${tuned.pass}, rush ${tuned.rush}, rec ${tuned.rec}, td ${tuned.td} → ${pct(overall(res, 'tuned'))} (current ${pct(overall(res, 'current'))}). Suggest only; change config.json only with Nate's OK.`
      : `Keep the current settings: nothing tried beats them by half a percentage point or more (current ${pct(overall(res, 'current'))}).`, '');
  return out.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const text = report();
  console.log(text);
  const i = process.argv.indexOf('--out');
  if (i !== -1) fs.writeFileSync(path.resolve(process.argv[i + 1]), `${text}\n`);
}
