// The Smart formula: opportunities a game × steadied rate, worked exactly in whole numbers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DASH, smartStat, smartWorking } from '../docs/calc.js';

const strength = { pass: 100, rush: 25, rec: 40, td: 400 };
// League so far: 7.40 yds a target, 70% caught, 4% of carries + targets score, 4.20 yds a carry.
const league = { passAtt: 10000, passCmp: 6500, passYds: 70000, rushAtt: 5000, rushYds: 21000,
  targets: 10000, rec: 7000, recYds: 74000, td: 600 };
const player = { passAtt: 0, passCmp: 0, passYds: 0, rushAtt: 20, rushYds: 90,
  targets: 52, rec: 40, recYds: 400, td: 4 };
const input = { playerTotals: player, playerGP: 5, league, strength };

test('receiving yards: 52 targets in 5 games, 400 yds, steadied with 40 league-average targets', () => {
  // rate = (400 × 10000 + 40 × 74000) ÷ (92 × 10000) = 7.5652…; projection = 52 × 6,960,000 ÷ (5 × 920,000) = 78.678…
  const r = smartStat('recYds', input);
  assert.deepEqual([r.perGame, r.rate, r.exact, r.projection], [1040, 756, 7867, 78]);
  assert.equal(smartWorking('recYds', r, player, 5), '10.40 targets a game × 7.56 yds a target (steadied) = 78.67 → 78');
});

test('receptions: catch rate steadied toward 70%', () => {
  // rate = (40 × 10000 + 40 × 7000) ÷ 920,000 = 73.91%; projection = 10.4 × 0.7391… = 7.686…
  const r = smartStat('rec', input);
  assert.deepEqual([r.rate, r.exact, r.projection], [7391, 768, 7]);
  assert.equal(smartWorking('rec', r, player, 5), '10.40 targets a game × 73.91% caught (steadied) = 7.68 → 7');
});

test('touchdowns: carries + targets a game × steadied scoring rate, one decimal', () => {
  // touches 72; league 600 ÷ 15000 = 4%; rate = (4 × 15000 + 400 × 600) ÷ (472 × 15000) = 4.237%; 14.4 × 4.237% = 0.610…
  const r = smartStat('td', input, true);
  assert.deepEqual([r.perGame, r.rate, r.exact, r.projection], [1440, 423, 61, 6]);
  assert.equal(smartWorking('td', r, player, 5), '14.40 carries + targets a game × 4.23% score (steadied) = 0.61 → 0.6');
});

test('stats with no rate are his average in the games he played', () => {
  const r = smartStat('targets', input);
  assert.deepEqual([r.exact, r.projection], [1040, 10]);
  assert.equal(smartWorking('targets', r, player, 5), '52 targets ÷ 5 games = 10.40 → 10');
});

test('rush + rec yards is rushing plus receiving yards, added before the cut', () => {
  const rush = smartStat('rushYds', input).exact;
  const rec = smartStat('recYds', input).exact;
  const both = smartStat('rushRecYds', input);
  assert.ok(Math.abs(both.exact - (rush + rec)) <= 1);
  assert.equal(both.projection, Math.trunc(both.exact / 100));
  assert.deepEqual(both.parts, { rush: rush, rec: rec });
  assert.match(smartWorking('rushRecYds', both, player, 5), /^\d+\.\d\d rushing \+ 78\.67 receiving = \d+\.\d\d → \d+$/);
});

test('no steadying (K = 0) gives exactly his own average in his games', () => {
  const r = smartStat('recYds', { ...input, strength: { ...strength, rec: 0 } });
  assert.deepEqual([r.exact, r.projection], [8000, 80]); // 400 ÷ 5
});

test('a player with no games shows "—"', () => {
  const r = smartStat('recYds', { ...input, playerGP: 0 });
  assert.equal(r.projection, null);
  assert.equal(smartWorking('recYds', r, player, 0), DASH);
});

test('negative rushing yards cut toward zero, never -0', () => {
  const r = smartStat('rushYds', { ...input, playerTotals: { ...player, rushAtt: 3, rushYds: -9 }, strength: { ...strength, rush: 0 }, playerGP: 3 });
  assert.equal(r.projection, -3); // -9 ÷ 3
  const small = smartStat('rushYds', { ...input, playerTotals: { ...player, rushAtt: 1, rushYds: -1 }, strength: { ...strength, rush: 0 }, playerGP: 2 });
  assert.ok(Object.is(small.projection, 0)); // -0.5 -> 0
});
