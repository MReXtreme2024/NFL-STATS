// The worked examples from PLAN.md "Maths rules", updated for Nate's decimals change:
// the formula keeps every decimal, averages and shares show 2 decimals (cut), the projection is cut
// to a whole number (touchdowns: one decimal).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DASH, MODES, cut, playerStat, projection, sharePct, show, teamAverage, working } from '../docs/calc.js';

const D = { decimals: true };

test('team average: 1,500 passing yards over 6 games is 250.00', () => {
  assert.equal(show(teamAverage(1500, 6), D), '250.00');
});

test('average keeps 2 decimals, cut not rounded: 101 rushing attempts over 6 games is 16.83', () => {
  assert.equal(show(teamAverage(101, 6), D), '16.83'); // 16.8333…
  assert.equal(show(teamAverage(20, 3), D), '6.66'); // 6.666… is not rounded up to 6.67
});

test("share, all team games: QB has 1,380 of the team's 1,500 passing yards is 92.00%", () => {
  assert.equal(show(sharePct(1380, 1500), D), '92.00');
});

test('projection, all team games: team average 250, share 92% is exactly 230', () => {
  assert.deepEqual(projection(1500, 6, 1380, 1500), { exact: 23000, value: 230 });
  const s = playerStat({ teamTotal: 1500, teamGP: 6, playerTotal: 1380, teamTotalInHisGames: 1500, playerGP: 6 });
  assert.equal(s.projection, 230);
  assert.equal(working(1380, s), '100 ÷ 1500 × 1380 = 92.00% · 250.00 × 92.00% = 230.00 → 230');
});

test('games he played: 30 targets in his 4 games (team 140), team average 34 is 21.42%, projection 7', () => {
  // 204 team targets over 6 games -> average 34.00
  const s = playerStat(
    { teamTotal: 204, teamGP: 6, playerTotal: 30, teamTotalInHisGames: 140, playerGP: 4 },
    MODES.PLAYED,
  );
  assert.equal(show(s.share, D), '21.42');
  assert.equal(s.projection, 7); // 7.28 is cut to 7
  assert.equal(working(30, s), '100 ÷ 140 × 30 = 21.42% · 34.00 × 21.42% = 7.28 → 7');
});

test('final projection is the whole number only: 20.56 shows as 20', () => {
  // team 257 over 5 games (51.40), player 100 of 250: 51.4 × 0.4 = 20.56
  assert.deepEqual(projection(257, 5, 100, 250), { exact: 2056, value: 20 });
});

test("negative yards: player -4 of the team's 600 rushing yards is -0.66%, projection 0 (never -0)", () => {
  const s = playerStat({ teamTotal: 600, teamGP: 6, playerTotal: -4, teamTotalInHisGames: 600, playerGP: 6 });
  assert.equal(show(s.share, { ...D, suffix: '%' }), '-0.66%');
  assert.ok(Object.is(s.projection, 0), `projection is ${s.projection}`); // -0.66 cuts toward zero
  assert.equal(working(-4, s), '100 ÷ 600 × -4 = -0.66% · 100.00 × -0.66% = -0.66 → 0');
  assert.ok(Object.is(cut(-7, 10), 0)); // -0.7 -> 0
  assert.ok(Object.is(sharePct(-1, 100000), 0)); // -0.001% -> 0.00%, not -0.00%
});

test('negative projection keeps its sign: player -40 of 600 rushing yards projects -6', () => {
  const s = playerStat({ teamTotal: 600, teamGP: 6, playerTotal: -40, teamTotalInHisGames: 600, playerGP: 6 });
  assert.equal(s.projection, -6); // 100 × -6.66% = -6.66 -> -6
});

test('touchdowns: team 16 TDs over 6 games, player has 4: average 2.66, share 25.00%, projection 0.6', () => {
  const s = playerStat(
    { teamTotal: 16, teamGP: 6, playerTotal: 4, teamTotalInHisGames: 16, playerGP: 6 },
    MODES.ALL,
    true,
  );
  assert.equal(show(s.avg, D), '2.66');
  assert.equal(show(s.share, D), '25.00');
  assert.equal(s.projection, 6); // tenths
  assert.equal(show(s.projection, { tenths: true }), '0.6');
  assert.equal(working(4, s), '100 ÷ 16 × 4 = 25.00% · 2.66 × 25.00% = 0.66 → 0.6');
});

test("touchdowns keep every decimal: 9 of the team's 20 TDs over 5 games projects exactly 1.8", () => {
  assert.deepEqual(projection(20, 5, 9, 20, true), { exact: 180, value: 18 });
});

test('no games yet: team GP 0 shows "—" with no divide-by-zero error', () => {
  assert.equal(teamAverage(0, 0), null);
  assert.equal(show(teamAverage(0, 0), D), DASH);
  for (const mode of [MODES.ALL, MODES.PLAYED]) {
    for (const tenths of [false, true]) {
      const s = playerStat({ teamTotal: 0, teamGP: 0, playerTotal: 0, teamTotalInHisGames: 0, playerGP: 0 }, mode, tenths);
      assert.equal(show(s.share, { ...D, suffix: '%' }), DASH);
      assert.equal(show(s.projection, { tenths }), DASH);
      assert.equal(working(0, s), DASH);
    }
  }
});

test('base total of 0 or less gives share 0.00% and projection 0', () => {
  for (const base of [0, -5]) {
    const s = playerStat({ teamTotal: base, teamGP: 2, playerTotal: 3, teamTotalInHisGames: base, playerGP: 2 });
    assert.deepEqual([s.share, s.projection], [0, 0]);
  }
});

test('games he played with player GP 0 shows "—"', () => {
  const input = { teamTotal: 1500, teamGP: 6, playerTotal: 0, teamTotalInHisGames: 0, playerGP: 0 };
  assert.equal(show(playerStat(input, MODES.PLAYED).share, D), DASH);
  assert.equal(playerStat(input, MODES.ALL).share, 0); // all-team-games mode still shows 0.00%
});

test('exact values are not lost to floating-point error', () => {
  assert.equal(sharePct(1, 1), 10000); // 100.00%
  assert.equal(sharePct(29, 100), 2900); // 0.29 * 100 = 28.999... in floating point
  assert.deepEqual(projection(100, 1, 29, 100), { exact: 2900, value: 29 });
  assert.deepEqual(projection(3, 3, 1, 1, true), { exact: 100, value: 10 }); // exactly 1.0 TD, never 0.9
});
