// Formula check: how well each projection option would have predicted each finished week,
// using only the games before that week. Run after each weekly update:
//   node updater/backtest.js                      print the report
//   node updater/backtest.js --out data/formula-check.md   also save it
// Uses the site's own maths (docs/calc.js), scoring the projections as shown (cut).
// Only players who played that week and had played for the team before are scored, so a
// backup who doesn't get on the field is not counted against any option.

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
const OPTIONS = { [MODES.ALL]: 'All team games', [MODES.PLAYED]: 'Games he played', [MODES.SMART]: 'Smart' };
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
  const teamGames = new Map(); // teamId -> [{ key, totals, players: Map(id -> stats) }]
  for (const g of games) {
    const key = `${g.type}-${g.week}`;
    if (!order.includes(key)) order.push(key);
    for (const side of g.teams) {
      const players = new Map();
      const totals = zero();
      for (const p of side.players) {
        const st = lineToStats(p.stats);
        if (!recordedAny(st)) continue;
        players.set(p.id, st);
        add(totals, st);
      }
      if (!teamGames.has(side.id)) teamGames.set(side.id, []);
      teamGames.get(side.id).push({ key, totals, players });
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
            const mode = strengthSet ? MODES.SMART : option;
            const r = mode === MODES.SMART
              ? smartStat(s, { playerTotals, playerGP: his.length, league, strength: strengthSet }, tenths)
              : playerStat({ teamTotal: teamTotals[s], teamGP: hist.length, playerTotal: playerTotals[s],
                teamTotalInHisGames: inHisGames[s], playerGP: his.length }, mode, tenths);
            const shown = tenths ? r.projection / 10 : r.projection;
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
  const options = { [MODES.ALL]: null, [MODES.PLAYED]: null, [MODES.SMART]: strength };
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
