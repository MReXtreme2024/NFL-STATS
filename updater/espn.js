// ESPN calls, retries and parsing. ESPN is the only data source (see CLAUDE.md).

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const PAUSE_MS = 500;
const RETRIES = 3;

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const TEAMS_URL = `${BASE}/teams`;
const SCOREBOARD_URL = `${BASE}/scoreboard`;
const SUMMARY_URL = `${BASE}/summary`;
const INJURIES_URL = `${BASE}/injuries`;

const REGULAR = 2;
const POSTSEASON = 3;
const POSTSEASON_TYPES = { 1: 'WC', 2: 'DIV', 3: 'CONF', 4: 'SB' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fetch JSON politely: pause before every call, retry up to 3 times with growing waits.
export async function fetchJson(url) {
  let lastError;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    await sleep(attempt === 0 ? PAUSE_MS : PAUSE_MS * 4 ** attempt);
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.json();
    } catch (err) {
      lastError = err;
      console.warn(`  attempt ${attempt + 1} failed: ${err.message}`);
    }
  }
  throw lastError;
}

export async function getTeams() {
  const data = await fetchJson(TEAMS_URL);
  return data.sports[0].leagues[0].teams
    .map(({ team: t }) => ({
      id: t.id,
      code: t.abbreviation,
      name: t.displayName,
      color: t.color,
      alternateColor: t.alternateColor,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// One team's current roster: { positions: { playerId: position }, ids: [playerId] },
// e.g. positions { "3918298": "QB" }.
export async function getRoster(teamId) {
  const data = await fetchJson(`${TEAMS_URL}/${teamId}/roster`);
  const positions = {};
  const ids = [];
  for (const group of data.athletes ?? []) {
    for (const a of group.items ?? []) {
      ids.push(a.id);
      if (a.position?.abbreviation) positions[a.id] = a.position.abbreviation;
    }
  }
  return { positions, ids };
}

// The default scoreboard carries the season calendar. Returns the season year and
// every regular-season and postseason week as { seasonType, week, start, end }.
export async function getCalendar() {
  const data = await fetchJson(SCOREBOARD_URL);
  const league = data.leagues[0];
  const weeks = [];
  for (const block of league.calendar) {
    const seasonType = Number(block.value);
    if (seasonType !== REGULAR && seasonType !== POSTSEASON) continue;
    for (const e of block.entries ?? []) weeks.push({ seasonType, week: Number(e.value), start: e.startDate, end: e.endDate });
  }
  return { year: league.season.year, weeks };
}

export async function getWeekEvents(year, seasonType, week) {
  const data = await fetchJson(`${SCOREBOARD_URL}?dates=${year}&seasontype=${seasonType}&week=${week}`);
  return data.events ?? [];
}

export async function getSummary(eventId) {
  return fetchJson(`${SUMMARY_URL}?event=${eventId}`);
}

// REG for the regular season; WC, DIV, CONF or SB for the playoffs.
export function gameType(seasonType, week) {
  if (seasonType === REGULAR) return 'REG';
  const type = POSTSEASON_TYPES[week];
  if (!type) throw new Error(`Unknown postseason week ${week}`);
  return type;
}

// Keep finished regular-season and postseason games of this season between two of the 32 teams.
export function isCountedGame(event, season, teamIds) {
  const competitors = event.competitions?.[0]?.competitors ?? [];
  return (
    event.season?.year === season &&
    (event.season?.type === REGULAR || event.season?.type === POSTSEASON) &&
    event.status?.type?.completed === true &&
    competitors.length === 2 &&
    competitors.every((c) => teamIds.has(c.team.id))
  );
}

// A regular-season or postseason game of this season between two of the 32 teams that hasn't started yet.
export function isUpcomingGame(event, season, teamIds) {
  const competitors = event.competitions?.[0]?.competitors ?? [];
  return (
    event.season?.year === season &&
    (event.season?.type === REGULAR || event.season?.type === POSTSEASON) &&
    event.status?.type?.state === 'pre' &&
    competitors.length === 2 &&
    competitors.every((c) => teamIds.has(c.team.id))
  );
}

// An upcoming game as we keep it: when, and who is home and away.
export function trimUpcoming(event) {
  const comp = event.competitions[0];
  const side = (homeAway) => comp.competitors.find((c) => c.homeAway === homeAway).team.id;
  return {
    id: event.id,
    start: event.date,
    homeId: side('home'),
    awayId: side('away'),
    neutral: comp.neutralSite === true,
    odds: upcomingOdds(comp, side('home')),
  };
}

// The betting line on the scoreboard for a game not yet played (Claude's formula); null when there's none.
function upcomingOdds(comp, homeId) {
  const line = (comp.odds ?? []).find((o) => o.spread != null && o.overUnder != null);
  return line ? { provider: line.provider?.name ?? '', homeId, spread: line.spread, overUnder: line.overUnder } : null;
}

// Map one category's stats by ESPN's `keys` (never by position).
function mapStats(keys, values) {
  const stats = {};
  keys.forEach((k, i) => (stats[k] = values[i]));
  return stats;
}

// Team-level figures kept only for the soft checks.
const TEAM_STAT_NAMES = ['netPassingYards', 'sacksYardsLost', 'completionAttempts', 'rushingYards', 'rushingAttempts'];

// Trim an ESPN summary to what we keep: week, season type, date, teams, home/away,
// final score, scoring plays and every player's full box-score lines.
export function trimGame(summary) {
  const header = summary.header;
  const comp = header.competitions[0];
  const seasonType = header.season.type;
  const week = header.week;

  const teams = comp.competitors.map((c) => {
    const box = summary.boxscore.players.find((p) => p.team.id === c.team.id);
    if (!box) throw new Error(`Game ${header.id}: no box score for team ${c.team.id}`);

    // One entry per player, with each category he appears in.
    const players = new Map();
    for (const cat of box.statistics) {
      for (const a of cat.athletes) {
        const id = a.athlete.id;
        if (!players.has(id)) players.set(id, { id, name: a.athlete.displayName, stats: {} });
        players.get(id).stats[cat.name] = mapStats(cat.keys, a.stats);
      }
    }

    const teamBox = summary.boxscore.teams.find((t) => t.team.id === c.team.id);
    const teamStats = {};
    for (const s of teamBox?.statistics ?? []) {
      if (TEAM_STAT_NAMES.includes(s.name)) teamStats[s.name] = s.displayValue;
    }

    return {
      id: c.team.id,
      code: c.team.abbreviation,
      name: c.team.displayName,
      homeAway: c.homeAway,
      score: Number(c.score),
      teamStats,
      players: [...players.values()],
    };
  });

  const scoringPlays = (summary.scoringPlays ?? []).map((s) => ({
    teamId: s.team?.id,
    type: s.type?.abbreviation,
    scoringType: s.scoringType?.abbreviation,
    text: s.text,
  }));

  return {
    id: header.id,
    season: header.season.year,
    seasonType,
    week,
    type: gameType(seasonType, week),
    start: comp.date,
    neutralSite: comp.neutralSite === true,
    teams,
    scoringPlays,
    odds: trimOdds(summary, comp),
  };
}

// The betting line ESPN shows for the game (kept for the weekly formula check, not shown on the site).
// spread is the home team's line (-3.5 = home favoured by 3.5); null when ESPN has none.
export function trimOdds(summary, comp = summary.header.competitions[0]) {
  const line = (summary.pickcenter ?? []).find((p) => p.spread != null && p.overUnder != null);
  if (!line) return null;
  const home = comp.competitors.find((c) => c.homeAway === 'home');
  return { provider: line.provider?.name ?? '', homeId: home.team.id, spread: line.spread, overUnder: line.overUnder };
}

// ESPN's league injury report: every listed player who isn't Active, as
// { teamId, playerId, name, pos, status, date }.
export async function getInjuries() {
  return trimInjuries(await fetchJson(INJURIES_URL));
}

// ESPN gives the player id only inside his player link (".../player/_/id/4698113/max-melton").
export function trimInjuries(data) {
  const out = [];
  for (const team of data.injuries ?? []) {
    for (const i of team.injuries ?? []) {
      if (i.status === 'Active') continue;
      const link = (i.athlete?.links ?? []).map((l) => l.href).find((h) => /\/id\/\d+/.test(h ?? ''));
      out.push({
        teamId: i.athlete?.team?.id ?? team.id,
        playerId: link ? link.match(/\/id\/(\d+)/)[1] : '',
        name: i.athlete?.displayName ?? '',
        pos: i.athlete?.position?.abbreviation ?? '',
        status: i.status,
        date: i.date,
      });
    }
  }
  return out;
}
