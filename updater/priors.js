// Last season's totals for every player, for Claude's formula ("career memory").
//   node updater/priors.js 2025                 build data/prior/2025.json from ESPN (regular season, ~272 calls)
//   node updater/priors.js 2025 --dir <folder>  build it from saved game files instead
// Run once a season, before the new season starts (when config.json moves to the next season).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTeams, getWeekEvents, getSummary, isCountedGame, trimGame } from './espn.js';
import { lineToStats, recordedAny } from './build.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PRIOR_STATS = ['passAtt', 'passYds', 'rushAtt', 'rushYds', 'targets', 'rec', 'recYds', 'td'];

// Saved or fetched regular-season games -> { season, league: totals, players: { id: { gp, t: totals } } }.
export function priorFromGames(season, games) {
  const zero = () => Object.fromEntries(PRIOR_STATS.map((s) => [s, 0]));
  const players = {};
  const league = zero();
  for (const g of games.filter((x) => x.type === 'REG')) {
    for (const side of g.teams) {
      for (const p of side.players) {
        const st = lineToStats(p.stats);
        if (!recordedAny(st)) continue;
        players[p.id] ??= { gp: 0, t: zero() };
        players[p.id].gp++;
        for (const s of PRIOR_STATS) { players[p.id].t[s] += st[s]; league[s] += st[s]; }
      }
    }
  }
  return { season, league, players };
}

async function fetchSeason(season) {
  const ids = new Set((await getTeams()).map((t) => t.id));
  const games = [];
  for (let w = 1; w <= 18; w++) {
    for (const e of (await getWeekEvents(season, 2, w)).filter((x) => isCountedGame(x, season, ids))) {
      games.push(trimGame(await getSummary(e.id)));
    }
    console.log(`  week ${w}: ${games.length} games so far`);
  }
  return games;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const season = Number(process.argv[2]);
  if (!season) throw new Error('Use: node updater/priors.js 2025 [--dir folder]');
  const i = process.argv.indexOf('--dir');
  const games = i === -1
    ? await fetchSeason(season)
    : fs.readdirSync(process.argv[i + 1]).filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(fs.readFileSync(path.join(process.argv[i + 1], f), 'utf8')));
  const prior = priorFromGames(season, games);
  const file = path.join(ROOT, 'data', 'prior', `${season}.json`);
  fs.writeFileSync(file, JSON.stringify(prior) + '\n');
  console.log(`Saved ${path.relative(ROOT, file)}: ${Object.keys(prior.players).length} players from ${games.filter((g) => g.type === 'REG').length} games`);
}
