// Claude's formula (updater/model.js) on a small made-up team.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODEL, claudeSide, impliedPoints, seasonState } from '../updater/model.js';

const line = (o) => ({ passAtt: 0, passYds: 0, rushAtt: 0, rushYds: 0, targets: 0, recYds: 0, td: 0, ...o });
const sum = (ps) => ps.reduce((t, p) => { for (const k of Object.keys(t)) t[k] += p[k]; return t; }, line({}));
// Team 1: QB "old" started game 1, QB "new" started games 2 and 3; two receivers, one running back.
function game(start, qbId, points, implied) {
  const players = new Map([
    [qbId, { name: qbId, stats: line({ passAtt: 30, passYds: 210 }) }],
    ['wr1', { name: 'wr1', stats: line({ targets: 8, recYds: 64 }) }],
    ['wr2', { name: 'wr2', stats: line({ targets: 6, recYds: 48, td: 1 }) }],
    ['rb', { name: 'rb', stats: line({ rushAtt: 20, rushYds: 84, targets: 2, recYds: 10, td: 1 }) }],
  ]);
  return { start, points, pointsAgainst: 20, implied, totals: sum([...players.values()].map((p) => p.stats)), players };
}
const teamGames = new Map([
  ['1', [game('2026-09-10', 'old', 24, 22), game('2026-09-17', 'new', 21, 22), game('2026-09-24', 'new', 27, 22)]],
  ['2', [game('2026-09-10', 'x', 17, 20), game('2026-09-17', 'x', 20, 20), game('2026-09-24', 'x', 23, 20)]],
]);
const state = seasonState(teamGames);
const positions = { old: 'QB', new: 'QB', wr1: 'WR', wr2: 'WR', rb: 'RB' };
const ctx = { home: true, neutral: false, implied: null, oppId: '2', roster: null, positions, prior: null, injuries: new Map() };
const player = (side, id) => side.players.find((p) => p.id === id);

test('only the expected starting QB (most passes in the last two games) gets passes', () => {
  const s = claudeSide(state, '1', ctx);
  assert.equal(player(s, 'new').passAtt, 30);
  assert.equal(player(s, 'old').passAtt, 0);
  assert.equal(player(s, 'old').passYds, 0);
});

test('a ruled-out player is removed, listed as out, and his targets go to the same position', () => {
  const s = claudeSide(state, '1', { ...ctx, injuries: new Map([['wr2', 'Out'], ['rb', 'Questionable']]) });
  assert.equal(player(s, 'wr2'), undefined);
  assert.deepEqual(s.out.map((o) => o.id), ['wr2']);
  // wr1 gets wr2's 6 targets (14), then the team is scaled toward its usual 16 targets (×16/16 = 1, rb keeps 2)
  assert.equal(player(s, 'wr1').targets, 14);
  assert.equal(player(s, 'rb').status, 'Questionable');
});

test("last season's opportunities count as extra games; his rate is pulled toward his last season", () => {
  const prior = { league: line({ passAtt: 1000, passYds: 7000, rushAtt: 1000, rushYds: 4000, targets: 1000, recYds: 7500, td: 40 }),
    players: { wr1: { gp: 10, t: line({ targets: 120, recYds: 1200, td: 8 }) } } };
  const defence = MODEL.receiving.defence;
  MODEL.receiving.defence = 0; // this test checks the steadying maths alone (its made-up games have no opponents)
  const s = claudeSide(state, '1', { ...ctx, prior });
  MODEL.receiving.defence = defence;
  // targets a game: (24 + 1 × 12) ÷ (3 + 1) = 9, then scaled with the team: 9 + 6 + 2 = 17 → ×16/17
  assert.ok(Math.abs(player(s, 'wr1').targets - 9 * 16 / 17) < 1e-9);
  // rate: last season (1200 + 20 × 7.5) ÷ (120 + 20) = 9.642…; this season (192 + 40 × 9.642…) ÷ (24 + 40)
  const priorRate = (1200 + 20 * 7.5) / 140;
  const rate = (192 + 40 * priorRate) / 64;
  assert.ok(Math.abs(player(s, 'wr1').recYds - player(s, 'wr1').targets * rate) < 1e-9);
});

test('team score: 90% betting market, 10% stats model; touchdowns nudged by expected points', () => {
  const plain = claudeSide(state, '1', ctx);
  const s = claudeSide(state, '1', { ...ctx, implied: 27.5 });
  assert.ok(Math.abs(s.score - (0.9 * 27.5 + 0.1 * s.model)) < 1e-9);
  assert.ok(Math.abs(player(s, 'rb').td - player(plain, 'rb').td * (27.5 / 22) ** MODEL.marketTdPower) < 1e-9);
});

test('expected points from a betting line: home (O/U − spread) ÷ 2, away (O/U + spread) ÷ 2', () => {
  const odds = { homeId: '9', spread: -3.5, overUnder: 47.5 };
  assert.equal(impliedPoints(odds, '9'), 25.5);
  assert.equal(impliedPoints(odds, '4'), 22);
  assert.equal(impliedPoints(null, '9'), null);
});

test("receiving yards follow how many the opponent's defence gives up (at the tested strength)", () => {
  assert.ok(MODEL.receiving.defence > 0);
  // Team 3's defence gave up twice the receiving yards (to team 2); team 4's gave up the usual (to team 1).
  const doubled = (g) => {
    const players = new Map([...g.players].map(([id, p]) => [id, { ...p, stats: { ...p.stats, recYds: p.stats.recYds * 2 } }]));
    return { ...g, oppId: '3', players, totals: { ...g.totals, recYds: g.totals.recYds * 2 } };
  };
  const tg = new Map([
    ['1', teamGames.get('1').map((g) => ({ ...g, oppId: '4' }))],
    ['2', teamGames.get('2').map(doubled)],
    ['3', teamGames.get('2').map((g) => ({ ...g, oppId: '2' }))],
    ['4', teamGames.get('2').map((g) => ({ ...g, oppId: '1' }))],
  ]);
  const st = seasonState(tg);
  const vsWeak = player(claudeSide(st, '1', { ...ctx, oppId: '3' }), 'wr1').recYds;
  const vsUsual = player(claudeSide(st, '1', { ...ctx, oppId: '4' }), 'wr1').recYds;
  assert.ok(vsWeak > vsUsual, `${vsWeak} vs ${vsUsual}`);
});
