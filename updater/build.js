// Saved games -> docs/data/app-data.json. Every team figure is built from player lines
// (never ESPN's team totals), so player shares always add up to 100%.
//   node updater/build.js   rebuild from the saved games without fetching

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkGame, checkSeason, playerTouchdowns, softChecks, splitPair } from './checks.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Smart formula steadying strengths (extra league-average opportunities), used if config.json has none.
const SMART_DEFAULT = { pass: 100, rush: 25, rec: 40, td: 400 };

export const STATS = ['passAtt', 'passCmp', 'passYds', 'rushAtt', 'rushYds', 'rushRecYds', 'targets', 'rec', 'recYds', 'td'];

const zeroTotals = () => Object.fromEntries(STATS.map((s) => [s, 0]));

// Whole number, sign kept (rushing yards can be negative). Missing -> 0.
const int = (value, what) => {
  if (value === undefined) return 0;
  const n = Number(value);
  if (!Number.isInteger(n)) throw new Error(`Unexpected ${what} value "${value}"`);
  return n;
};

// One player's ESPN lines (by category) -> our ten stats.
export function lineToStats(stats) {
  const { passing = {}, rushing = {}, receiving = {} } = stats;
  const [passCmp, passAtt] = passing['completions/passingAttempts'] === undefined
    ? [0, 0]
    : splitPair(passing['completions/passingAttempts']).map((v) => int(v, 'C/ATT'));
  const rushYds = int(rushing.rushingYards, 'rushing YDS');
  const recYds = int(receiving.receivingYards, 'receiving YDS');
  return {
    passAtt,
    passCmp,
    passYds: int(passing.passingYards, 'passing YDS'),
    rushAtt: int(rushing.rushingAttempts, 'CAR'),
    rushYds,
    rushRecYds: rushYds + recYds,
    targets: int(receiving.receivingTargets, 'TGTS'),
    rec: int(receiving.receptions, 'REC'),
    recYds,
    td: int(playerTouchdowns(stats), 'TD'),
  };
}

// A player counts for a game only if he recorded any of the ten stats.
export const recordedAny = (s) => STATS.some((k) => s[k] !== 0);

const addInto = (target, add) => STATS.forEach((s) => (target[s] += add[s]));

// Black or white text, whichever has more contrast on the colour (WCAG luminance).
export function textColourFor(hex) {
  const channels = [0, 2, 4].map((i) => parseInt(hex.slice(1).slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (lum + 0.05) / 0.05 > 1.05 / (lum + 0.05) ? '#000000' : '#ffffff';
}

const normaliseHex = (c) => `#${String(c).replace(/^#/, '').toLowerCase()}`;

// Calendar date in a time zone, e.g. "2026-10-21".
const dateIn = (iso, timeZone) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(iso));

// ISO timestamp with the zone's offset, e.g. "2026-10-28T00:03:00+11:00".
export function isoIn(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'longOffset',
    }).formatToParts(date).map((p) => [p.type, p.value]),
  );
  const offset = parts.timeZoneName === 'GMT' ? '+00:00' : parts.timeZoneName.replace('GMT', '');
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}

// games: trimmed game objects; teams: ESPN's 32-team list; positions: { playerId: "QB" };
// now: the check time; upcoming: { label, games } not yet played; rosters: { teamId: [playerId] }.
export function buildAppData(games, teams, positions, config, now, { upcoming = null, rosters = {} } = {}) {
  const byId = new Map(
    teams.map((t) => {
      const colour = normaliseHex(config.colourOverrides?.[t.code] ?? t.color);
      return [t.id, {
        id: t.id, code: t.code, name: t.name, colour, textColour: textColourFor(colour),
        gp: 0, totals: zeroTotals(), games: [], playersById: new Map(), roster: rosters[t.id] ?? null,
      }];
    }),
  );

  const sorted = [...games].sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
  for (const game of sorted) {
    for (const side of game.teams) {
      const team = byId.get(side.id);
      if (!team) throw new Error(`Game ${game.id}: unknown team id ${side.id}`);
      const opp = game.teams.find((t) => t !== side);

      // This game's team line, summed from its players.
      const gameTotals = zeroTotals();
      const lines = side.players
        .map((p) => ({ p, stats: lineToStats(p.stats) }))
        .filter(({ stats }) => recordedAny(stats));
      lines.forEach(({ stats }) => addInto(gameTotals, stats));

      team.gp++;
      addInto(team.totals, gameTotals);
      team.games.push({
        id: game.id,
        week: game.week,
        type: game.type,
        date: dateIn(game.start, config.timeZone),
        opp: opp.code,
        home: side.homeAway === 'home',
        stats: gameTotals,
      });

      for (const { p, stats } of lines) {
        let player = team.playersById.get(p.id);
        if (!player) {
          player = { id: p.id, name: p.name, pos: '', gp: 0, totals: zeroTotals(), teamTotalsInHisGames: zeroTotals() };
          team.playersById.set(p.id, player);
        }
        player.name = p.name; // latest spelling wins
        player.gp++;
        addInto(player.totals, stats);
        addInto(player.teamTotalsInHisGames, gameTotals);
      }
    }
  }

  const out = [...byId.values()]
    .map(({ playersById, games: teamGames, ...team }) => ({
      ...team,
      games: teamGames.reverse(), // newest first
      players: [...playersById.values()]
        .map((p) => ({ ...p, pos: positions[p.id] ?? '' }))
        .sort((a, b) => b.totals.rushRecYds - a.totals.rushRecYds || b.gp - a.gp || a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const upcomingGames = (upcoming?.games ?? [])
    .filter((g) => byId.has(g.homeId) && byId.has(g.awayId))
    .sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));

  // Smart formula inputs: league-wide totals so far and the steadying strengths from config.json.
  const league = zeroTotals();
  out.forEach((t) => addInto(league, t.totals));

  return {
    season: config.season,
    checked: isoIn(now, config.timeZone),
    smart: { strength: config.smartFormula ?? SMART_DEFAULT, league },
    upcoming: { label: upcoming?.label ?? '', games: upcomingGames },
    teams: out,
  };
}

export function loadGames(gamesDir) {
  if (!fs.existsSync(gamesDir)) return [];
  return fs.readdirSync(gamesDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(gamesDir, f), 'utf8')));
}

const readJson = (file, fallback) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback);

// Rebuild app-data.json from everything saved. Hard checks throw before anything is written;
// soft-check problems are returned so the caller can report them after publishing.
export function build(now = new Date()) {
  const config = readJson(path.join(ROOT, 'config.json'));
  const teams = readJson(path.join(ROOT, 'data', 'teams.json'));
  const positions = readJson(path.join(ROOT, 'data', 'positions.json'), {});
  const games = loadGames(path.join(ROOT, 'data', 'games', String(config.season)));
  const file = path.join(ROOT, 'docs', 'data', 'app-data.json');

  games.forEach(checkGame);
  checkSeason(teams, games, readJson(file, null));
  const data = buildAppData(games, teams, positions, config, now, {
    upcoming: readJson(path.join(ROOT, 'data', 'upcoming.json'), null),
    rosters: readJson(path.join(ROOT, 'data', 'rosters.json'), {}),
  });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data) + '\n');
  return { data, problems: softChecks(games) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { data, problems } = build();
  console.log(`Built app-data.json: ${data.teams.length} teams, checked ${data.checked}`);
  problems.forEach((p) => console.log(`SOFT CHECK: ${p}`));
  if (problems.length) process.exitCode = 1;
}
