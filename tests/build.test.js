import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildAppData, isoIn, textColourFor } from '../updater/build.js';
import { checkGame, softChecks } from '../updater/checks.js';

// Week 1: Falcons 13 @ Steelers 20, with T.J. Watt's pick-six, a fake-punt pass and Rodgers' -3 rushing yards.
const game = JSON.parse(fs.readFileSync(new URL('./fixtures/game-401872658.json', import.meta.url)));
const teams = [
  { id: '1', code: 'ATL', name: 'Atlanta Falcons', color: 'a71930' },
  { id: '23', code: 'PIT', name: 'Pittsburgh Steelers', color: '000000' },
  { id: '12', code: 'KC', name: 'Kansas City Chiefs', color: 'e31837' },
];
const positions = { '8439': 'QB' };
const config = { season: 2026, timeZone: 'Australia/Melbourne', colourOverrides: {} };
const now = new Date('2026-10-27T13:03:00Z');
const data = buildAppData([game], teams, positions, config, now);
const team = (code) => data.teams.find((t) => t.code === code);
const player = (code, name) => team(code).players.find((p) => p.name === name);

// Expected values from ESPN's own totals rows for this game. Passing yards are the passers'
// gross yards (221), not ESPN's team net (206, after 15 sack yards).
test('team totals match ESPN box score', () => {
  assert.deepEqual(team('PIT').totals, {
    passAtt: 41, passCmp: 24, passYds: 221, rushAtt: 21, rushYds: 58,
    rushRecYds: 279, targets: 37, rec: 24, recYds: 221, td: 2,
  });
  assert.deepEqual(team('ATL').totals, {
    passAtt: 22, passCmp: 12, passYds: 143, rushAtt: 31, rushYds: 120,
    rushRecYds: 263, targets: 21, rec: 12, recYds: 143, td: 1,
  });
});

test('pick-six counts once, for the defender', () => {
  const watt = player('PIT', 'T.J. Watt');
  assert.equal(watt.totals.td, 1);
  assert.equal(watt.gp, 1);
});

test('negative rushing yards keep their sign', () => {
  assert.equal(player('PIT', 'Aaron Rodgers').totals.rushYds, -3);
});

test('a punter with a fake-punt pass is listed; blockers and tacklers without a TD are not', () => {
  assert.equal(player('PIT', 'Cameron Johnston').totals.passAtt, 1);
  assert.equal(player('PIT', 'Chris Boswell'), undefined);
  for (const p of team('PIT').players) assert.equal(p.gp, 1);
});

test('player totals add up to team totals', () => {
  for (const t of [team('PIT'), team('ATL')]) {
    for (const s of Object.keys(t.totals)) {
      assert.equal(t.players.reduce((sum, p) => sum + p.totals[s], 0), t.totals[s], `${t.code} ${s}`);
    }
  }
});

test('game row shows week, type, opponent, home/away and Melbourne date', () => {
  const [row] = team('ATL').games;
  assert.equal(row.week, 1);
  assert.equal(row.type, 'REG');
  assert.equal(row.opp, 'PIT');
  assert.equal(row.home, false);
  assert.equal(team('PIT').games[0].home, true);
  assert.equal(row.date, '2026-09-14'); // Sunday 13 Sep in Pittsburgh = Monday 14 Sep in Melbourne
  assert.deepEqual(row.stats, team('ATL').totals);
});

test('positions come from the roster when ESPN provides them', () => {
  assert.equal(player('ATL', 'Cooper Rush').pos, '');
  assert.equal(player('PIT', 'Aaron Rodgers').pos, 'QB');
});

test('players sorted by rush + rec yards, teams A-Z, all teams present even with 0 GP', () => {
  const rr = team('PIT').players.map((p) => p.totals.rushRecYds);
  assert.deepEqual(rr, [...rr].sort((a, b) => b - a));
  assert.deepEqual(data.teams.map((t) => t.code), ['ATL', 'KC', 'PIT']);
  assert.equal(team('KC').gp, 0);
});

test('hard and soft checks pass on this game', () => {
  assert.doesNotThrow(() => checkGame(game));
  assert.deepEqual(softChecks([game]), []);
});

test('a wrong TD count is caught by the soft check', () => {
  const broken = structuredClone(game);
  broken.scoringPlays = broken.scoringPlays.filter((s) => !/Interception Return/.test(s.text));
  assert.equal(softChecks([broken]).length, 1);
});

test('colour override and readable text colour', () => {
  const d = buildAppData([], teams, {}, { ...config, colourOverrides: { ATL: 'FFFF00' } }, now);
  assert.equal(d.teams[0].colour, '#ffff00');
  assert.equal(d.teams[0].textColour, '#000000');
  assert.equal(textColourFor('#000000'), '#ffffff');
});

test('check time is Melbourne time with daylight saving offset', () => {
  assert.equal(data.checked, '2026-10-28T00:03:00+11:00');
  assert.equal(isoIn(new Date('2027-06-01T14:00:00Z'), 'Australia/Melbourne'), '2027-06-02T00:00:00+10:00');
});
