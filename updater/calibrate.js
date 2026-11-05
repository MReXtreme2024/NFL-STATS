// Learning from every result, for Claude's over/under lines. For each finished game, Claude's formula is
// replayed from only the games before it, and each projected player's projection and what he actually did
// are kept in data/calibration/<season>-results.json. Each run re-learns from all of them how results land
// around the projections, so a line's chance is "how often a result that far from the projection happened".
//   Yards and receptions: a lean, a spread (variance = k × projection) and the real shape of the misses.
//   Touchdowns: a lean and a Poisson count (the chance of 0, 1, 2… scores).

import fs from 'node:fs';
import path from 'node:path';
import { claudeSide, impliedPoints, seasonState } from './model.js';
import { lineToStats, recordedAny } from './build.js';

export const LINE_STATS = ['passYds', 'rushYds', 'recYds', 'rec', 'td'];
// Only real projections are learned from (not "3 rushing yards" for a receiver).
const MIN_PROJ = { passYds: 100, rushYds: 10, recYds: 10, rec: 1, td: 0.1 };

// Claude's self-correction (Nate approved 5 Nov 2026): rushing yards, receiving yards and TDs are multiplied by
// how results have compared with the raw projections so far (passing yards were already about right;
// correcting receptions made the weekly check worse).
// The records above always keep the raw projection, so the correction is re-learned, not compounded.
export const LEAN_STATS = ['rushYds', 'recYds', 'td'];
export function leanOf(calibration) {
  if (!LEAN_STATS.every((s) => calibration?.[s]?.bias > 0)) return null;
  return Object.fromEntries(LEAN_STATS.map((s) => [s, calibration[s].bias]));
}

// Model game lines (as build.js makes them) from finished games.
export function modelGamesOf(games) {
  const model = new Map();
  for (const g of [...games].sort((a, b) => a.start.localeCompare(b.start))) {
    for (const side of g.teams) {
      const opp = g.teams.find((t) => t !== side);
      const lines = side.players.map((p) => ({ p, stats: lineToStats(p.stats) })).filter(({ stats }) => recordedAny(stats));
      const totals = {};
      for (const { stats } of lines) for (const [k, v] of Object.entries(stats)) totals[k] = (totals[k] ?? 0) + v;
      if (!model.has(side.id)) model.set(side.id, []);
      model.get(side.id).push({ start: g.start, oppId: opp.id, points: side.score, pointsAgainst: opp.score, implied: impliedPoints(g.odds, side.id),
        totals, players: new Map(lines.map(({ p, stats }) => [p.id, { name: p.name, stats }])) });
    }
  }
  return model;
}

// One finished game's records [{ id, stat, mu, x }], from Claude's formula as it stood before the game.
// Players who had played for the team but didn't play in it count as ruled out (no injury reports kept then).
export function gameRecords(game, prev, { prior = null, positions = {} } = {}) {
  const model = modelGamesOf(prev);
  if (!game.teams.every((t) => model.has(t.id))) return null;
  const state = seasonState(model);
  const out = [];
  for (const side of game.teams) {
    const played = new Map(side.players.map((p) => [p.id, lineToStats(p.stats)]).filter(([, st]) => recordedAny(st)));
    const injuries = new Map();
    for (const tg of model.get(side.id)) for (const pid of tg.players.keys()) if (!played.has(pid)) injuries.set(pid, 'Out');
    const opp = game.teams.find((t) => t !== side);
    const proj = claudeSide(state, side.id, {
      home: side.homeAway === 'home', neutral: game.neutralSite, implied: impliedPoints(game.odds, side.id), oppId: opp.id,
      roster: null, positions, prior, injuries,
    });
    for (const p of proj.players) {
      const st = played.get(p.id);
      if (!st) continue;
      for (const s of LINE_STATS) if (p[s] >= MIN_PROJ[s]) out.push({ id: p.id, stat: s, mu: Math.round(p[s] * 1000) / 1000, x: st[s] });
    }
  }
  return out;
}

// Learn each stat's lean and spread (and, for yards and receptions, the shape of the misses).
export function learn(records) {
  const out = {};
  for (const s of LINE_STATS) {
    const rs = records.filter((r) => r.stat === s);
    if (rs.length < 30) { out[s] = null; continue; }
    const bias = rs.reduce((t, r) => t + r.x, 0) / rs.reduce((t, r) => t + r.mu, 0);
    if (s === 'td') { out[s] = { n: rs.length, bias: Math.round(bias * 10000) / 10000, poisson: true }; continue; }
    const k = rs.reduce((t, r) => t + (r.x - bias * r.mu) ** 2 / Math.max(r.mu, 1), 0) / rs.length;
    const z = rs.map((r) => (r.x - bias * r.mu) / Math.sqrt(k * Math.max(r.mu, 1))).sort((a, b) => a - b);
    const shape = Array.from({ length: 101 }, (_, i) => Math.round(z[Math.min(z.length - 1, Math.floor((i / 100) * (z.length - 1)))] * 1000) / 1000);
    out[s] = { n: rs.length, bias: Math.round(bias * 10000) / 10000, k: Math.round(k * 1000) / 1000, shape };
  }
  return out;
}

// Bring the record up to date (new finished games only) and re-learn. Returns { calibration, added }.
export function updateCalibration(dataDir, season, games, context = {}) {
  const file = path.join(dataDir, 'calibration', `${season}-results.json`);
  const store = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const sorted = [...games].sort((a, b) => a.start.localeCompare(b.start));
  let added = 0;
  for (const g of sorted) {
    if (store[g.id]) continue;
    const records = gameRecords(g, sorted.filter((x) => x.start < g.start), context);
    if (!records) continue;
    store[g.id] = { start: g.start, records };
    added++;
  }
  if (added) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(store) + '\n');
  }
  const all = Object.values(store);
  return { calibration: { ...learn(all.flatMap((e) => e.records)), games: all.length }, added };
}
