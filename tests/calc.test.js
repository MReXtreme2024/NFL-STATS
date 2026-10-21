// The worked examples from PLAN.md "Maths rules". Every case must pass before any screen is built.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DASH, MODES, cut, playerStat, projection, sharePct, show, teamAverage, working } from '../docs/calc.js';

test('team average: 1,500 passing yards over 6 games is 250', () => {
  assert.equal(teamAverage(1500, 6), 250);
});

test('average is cut, not rounded: 101 rushing attempts over 6 games is 16', () => {
  assert.equal(teamAverage(101, 6), 16); // 16.83
});

test("share, all team games: QB has 1,380 of the team's 1,500 passing yards is 92%", () => {
  assert.equal(sharePct(1380, 1500), 92);
});

test('projection, all team games: team average 250, share 92% is 230', () => {
  assert.equal(projection(250, 92), 230);
  const s = playerStat({ teamTotal: 1500, teamGP: 6, playerTotal: 1380, teamTotalInHisGames: 1500, playerGP: 6 });
  assert.deepEqual([s.avg, s.share, s.projection], [250, 92, 230]);
  assert.equal(working(1380, s), '100 ÷ 1500 × 1380 = 92% · 250 × 92% = 230');
});

test('games he played: 30 targets in his 4 games (team 140), team average 34 is 21%, projection 7', () => {
  // 204 team targets over 6 games -> average 34
  const s = playerStat(
    { teamTotal: 204, teamGP: 6, playerTotal: 30, teamTotalInHisGames: 140, playerGP: 4 },
    MODES.PLAYED,
  );
  assert.deepEqual([s.avg, s.share, s.projection], [34, 21, 7]);
  assert.equal(working(30, s), '100 ÷ 140 × 30 = 21% · 34 × 21% = 7');
});

test("negative yards: player -4 of the team's 600 rushing yards is 0%, projection 0 (never -0 or -1)", () => {
  const s = playerStat({ teamTotal: 600, teamGP: 6, playerTotal: -4, teamTotalInHisGames: 600, playerGP: 6 });
  assert.ok(Object.is(s.share, 0), `share is ${s.share}`);
  assert.ok(Object.is(s.projection, 0), `projection is ${s.projection}`);
  assert.equal(show(s.share, { suffix: '%' }), '0%');
  assert.ok(Object.is(cut(-7, 10), 0)); // -0.7 -> 0
});

test('touchdowns: team 16 TDs over 6 games, player has 4: average 2.6, share 25%, projection 0.6', () => {
  const s = playerStat(
    { teamTotal: 16, teamGP: 6, playerTotal: 4, teamTotalInHisGames: 16, playerGP: 6 },
    MODES.ALL,
    true,
  );
  assert.deepEqual([s.avg, s.share, s.projection], [26, 25, 6]); // tenths
  assert.equal(show(s.avg, { tenths: true }), '2.6');
  assert.equal(show(s.projection, { tenths: true }), '0.6');
  assert.equal(working(4, s), '100 ÷ 16 × 4 = 25% · 2.6 × 25% = 0.6');
});

test('no games yet: team GP 0 shows "—" with no divide-by-zero error', () => {
  assert.equal(teamAverage(0, 0), null);
  assert.equal(show(teamAverage(0, 0)), DASH);
  assert.equal(show(teamAverage(0, 0, true), { tenths: true }), DASH);
  for (const mode of [MODES.ALL, MODES.PLAYED]) {
    for (const tenths of [false, true]) {
      const s = playerStat({ teamTotal: 0, teamGP: 0, playerTotal: 0, teamTotalInHisGames: 0, playerGP: 0 }, mode, tenths);
      assert.equal(show(s.share, { suffix: '%' }), DASH);
      assert.equal(show(s.projection, { tenths }), DASH);
      assert.equal(working(0, s), DASH);
    }
  }
});

test('base total of 0 or less gives share 0% and projection 0', () => {
  for (const base of [0, -5]) {
    const s = playerStat({ teamTotal: base, teamGP: 2, playerTotal: 3, teamTotalInHisGames: base, playerGP: 2 });
    assert.deepEqual([s.share, s.projection], [0, 0]);
  }
});

test('games he played with player GP 0 shows "—"', () => {
  const input = { teamTotal: 1500, teamGP: 6, playerTotal: 0, teamTotalInHisGames: 0, playerGP: 0 };
  assert.equal(show(playerStat(input, MODES.PLAYED).share, { suffix: '%' }), DASH);
  assert.equal(playerStat(input, MODES.ALL).share, 0); // all-team-games mode still shows 0%
});

test('exact shares are not lost to floating-point error', () => {
  assert.equal(sharePct(1, 1), 100);
  assert.equal(sharePct(29, 100), 29); // 0.29 * 100 = 28.999... in floating point
  assert.equal(projection(100, 29), 29);
});
