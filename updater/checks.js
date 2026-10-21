// Hard checks: any failure throws, which stops the run before anything is saved
// or published, so the live site keeps the last good data.

const TEAM_COUNT = 32;
const MAX_REGULAR_GP = 17;

const num = (v) => Number(v ?? 0);

// "24/34" -> [24, 34]
export const splitPair = (text) => String(text ?? '0/0').split('/').map(Number);

// Per team per game, player receptions must equal player completions.
export function checkGame(game) {
  if (game.teams.length !== 2) throw new Error(`Game ${game.id}: expected 2 teams, got ${game.teams.length}`);
  for (const team of game.teams) {
    let rec = 0;
    let cmp = 0;
    for (const p of team.players) {
      rec += num(p.stats.receiving?.receptions);
      cmp += splitPair(p.stats.passing?.['completions/passingAttempts'])[0];
    }
    if (rec !== cmp) {
      throw new Error(`Game ${game.id}: ${team.code} players have ${rec} receptions but ${cmp} completions`);
    }
  }
}

// Checks across all saved games: 32 teams, no team above 17 regular-season games,
// and no team's games played went down since the last published data (if any).
export function checkSeason(teams, games, previous) {
  if (teams.length !== TEAM_COUNT) throw new Error(`Expected ${TEAM_COUNT} teams, got ${teams.length}`);

  const gp = new Map(teams.map((t) => [t.id, 0]));
  const regularGp = new Map(teams.map((t) => [t.id, 0]));
  for (const g of games) {
    for (const t of g.teams) {
      if (!gp.has(t.id)) throw new Error(`Game ${g.id}: team ${t.code} is not one of the 32 teams`);
      gp.set(t.id, gp.get(t.id) + 1);
      if (g.type === 'REG') regularGp.set(t.id, regularGp.get(t.id) + 1);
    }
  }

  const before = new Map((previous?.teams ?? []).map((t) => [t.id, t.gp]));
  for (const t of teams) {
    if (regularGp.get(t.id) > MAX_REGULAR_GP) {
      throw new Error(`${t.name} has ${regularGp.get(t.id)} regular-season games, more than ${MAX_REGULAR_GP}`);
    }
    if (before.has(t.id) && gp.get(t.id) < before.get(t.id)) {
      throw new Error(`${t.name} games played went down from ${before.get(t.id)} to ${gp.get(t.id)}`);
    }
  }
  return gp;
}
