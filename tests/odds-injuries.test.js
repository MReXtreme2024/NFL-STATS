// Betting odds kept with each game, and the injury report snapshot (both for the weekly formula check).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trimInjuries, trimOdds } from '../updater/espn.js';

const comp = { competitors: [{ homeAway: 'home', team: { id: '14' } }, { homeAway: 'away', team: { id: '2' } }] };

test('odds: the home line and over/under from the first full line ESPN shows', () => {
  const summary = { pickcenter: [{ provider: { name: 'DraftKings' }, details: 'LAR -3.5', spread: -3.5, overUnder: 55.5 }] };
  assert.deepEqual(trimOdds(summary, comp), { provider: 'DraftKings', homeId: '14', spread: -3.5, overUnder: 55.5 });
});

test('odds: none when ESPN has no line', () => {
  assert.equal(trimOdds({ pickcenter: [] }, comp), null);
  assert.equal(trimOdds({}, comp), null);
  assert.equal(trimOdds({ pickcenter: [{ spread: null, overUnder: 44 }] }, comp), null);
});

test('injuries: player id from his player link; Active players left out', () => {
  const data = { injuries: [{ id: '22', displayName: 'Arizona Cardinals', injuries: [
    { status: 'Out', date: '2026-10-25T18:48Z', athlete: { displayName: 'Max Melton', position: { abbreviation: 'CB' },
      team: { id: '22' }, links: [{ href: 'https://www.espn.com/nfl/player/_/id/4698113/max-melton' }] } },
    { status: 'Active', date: '2026-10-26T01:31Z', athlete: { displayName: 'Bam Knight', links: [] } },
    { status: 'Questionable', date: '2026-10-24T10:00Z', athlete: { displayName: 'No Link', links: [] } },
  ] }] };
  assert.deepEqual(trimInjuries(data), [
    { teamId: '22', playerId: '4698113', name: 'Max Melton', pos: 'CB', status: 'Out', date: '2026-10-25T18:48Z' },
    { teamId: '22', playerId: '', name: 'No Link', pos: '', status: 'Questionable', date: '2026-10-24T10:00Z' },
  ]);
});

test('touchdowns: a return TD ESPN also lists as defensive counts once; end-zone fumble recoveries come from the scoring plays', async () => {
  const { addFumbleRecoveryTDs, playerTouchdowns } = await import('../updater/checks.js');
  assert.equal(playerTouchdowns({ kickReturns: { kickReturnTouchdowns: '1' }, defensive: { defensiveTouchdowns: '1' } }), 1);
  assert.equal(playerTouchdowns({ defensive: { defensiveTouchdowns: '1' } }), 1);
  assert.equal(playerTouchdowns({ rushing: { rushingTouchdowns: '1' }, puntReturns: { puntReturnTouchdowns: '1' } }), 2);
  const game = {
    scoringPlays: [
      { teamId: '6', scoringType: 'TD', text: 'James Mitchell 0 Yd Fumble Recovery (Brandon Aubrey Kick)' },
      { teamId: '6', scoringType: 'TD', text: 'Dak Prescott 5 Yd Rush (Brandon Aubrey Kick)' },
    ],
    teams: [{ id: '6', players: [
      { name: 'James Mitchell', stats: { fumbles: { fumblesRecovered: '1' } } },
      { name: 'Dak Prescott', stats: { rushing: { rushingTouchdowns: '1' } } },
    ] }],
  };
  addFumbleRecoveryTDs(game);
  assert.equal(playerTouchdowns(game.teams[0].players[0].stats), 1);
  addFumbleRecoveryTDs(game); // already complete: nothing added twice
  assert.equal(playerTouchdowns(game.teams[0].players[0].stats), 1);
});
