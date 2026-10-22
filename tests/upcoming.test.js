import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isUpcomingGame, trimUpcoming } from '../updater/espn.js';
import { buildAppData } from '../updater/build.js';

const teamIds = new Set(['17', '3', '23', '18']);
const event = (over = {}) => ({
  id: '401872900', date: '2026-10-23T00:15Z',
  season: { year: 2026, type: 2 }, status: { type: { state: 'pre', completed: false } },
  competitions: [{ neutralSite: false, competitors: [
    { homeAway: 'home', team: { id: '3' } }, { homeAway: 'away', team: { id: '17' } },
  ] }],
  ...over,
});

test('a game that has not started is upcoming; live, preseason and non-NFL games are not', () => {
  assert.equal(isUpcomingGame(event(), 2026, teamIds), true);
  assert.equal(isUpcomingGame(event({ season: { year: 2026, type: 3 } }), 2026, teamIds), true); // playoffs
  assert.equal(isUpcomingGame(event({ status: { type: { state: 'in' } } }), 2026, teamIds), false);
  assert.equal(isUpcomingGame(event({ season: { year: 2026, type: 1 } }), 2026, teamIds), false);
  assert.equal(isUpcomingGame(event(), 2026, new Set(['3'])), false); // e.g. Pro Bowl teams
});

test('upcoming game keeps start time, home/away teams and neutral site', () => {
  assert.deepEqual(trimUpcoming(event()), { id: '401872900', start: '2026-10-23T00:15Z', homeId: '3', awayId: '17', neutral: false });
  const london = event({ competitions: [{ ...event().competitions[0], neutralSite: true }] });
  assert.equal(trimUpcoming(london).neutral, true);
});

test('upcoming games are kept in start order with their week; unknown teams are dropped; rosters attach', () => {
  const teams = [
    { id: '17', code: 'NE', name: 'New England Patriots', color: '002244' },
    { id: '3', code: 'CHI', name: 'Chicago Bears', color: '0b162a' },
  ];
  const upcoming = { label: 'Week 7', games: [
    { id: 'b', start: '2026-10-25T17:00Z', homeId: '3', awayId: '17', neutral: false },
    { id: 'a', start: '2026-10-23T00:15Z', homeId: '17', awayId: '3', neutral: false },
    { id: 'x', start: '2026-10-23T00:15Z', homeId: '99', awayId: '3', neutral: false },
  ] };
  const config = { season: 2026, timeZone: 'Australia/Melbourne', colourOverrides: {} };
  const d = buildAppData([], teams, {}, config, new Date('2026-10-27T13:03:00Z'), { upcoming, rosters: { 17: ['1'] } });
  assert.equal(d.upcoming.label, 'Week 7');
  assert.deepEqual(d.upcoming.games.map((g) => g.id), ['a', 'b']);
  assert.deepEqual(d.teams.find((t) => t.code === 'NE').roster, ['1']);
  assert.equal(d.teams.find((t) => t.code === 'CHI').roster, null);
  const none = buildAppData([], teams, {}, config, new Date());
  assert.deepEqual(none.upcoming, { label: '', games: [] });
});
