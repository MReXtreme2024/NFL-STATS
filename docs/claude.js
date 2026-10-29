// Claude's formula, the part shared by the weekly update and the app: sharing out a team's passes,
// carries and targets among its players and turning them into yards, receptions and touchdowns.
// The weekly update (updater/model.js, prepareSide) works out each team's inputs; the app re-runs this
// step on the phone when Nate confirms who is inactive. Ordinary decimals (exempt from calc.js's rules).

const clamp = (x, [lo, hi]) => Math.min(hi, Math.max(lo, x));

// One team's side of an upcoming game.
//   input: { score, model, market, teamAvg: { rushAtt, targets }, tdFactor, scaleRange, listMinOpps, rows },
//     each row a player who has played for the team: { id, name, pos, group, status, out (from the injury
//     report), seasonPassAtt, recentPasses, exp: { passAtt, rushAtt, targets } (a game), rate100: { passYds,
//     rushYds, recYds, rec, td } (per 100 passes, carries, targets or carries + targets) }.
//   inactive (optional, confirmed by Nate before kick-off): [playerId]; it replaces the injury report.
export function allocateSide(input, inactive = null) {
  const rows = input.rows.map((r) => ({
    ...r, exp: { ...r.exp }, out: inactive ? inactive.includes(r.id) : r.out,
    status: inactive ? '' : r.status,
  }));
  const active = rows.filter((r) => !r.out);

  // Passing: only the expected starter (most passes in the last two games, not ruled out) throws.
  const qbs = active.filter((r) => r.seasonPassAtt > 0)
    .sort((a, b) => b.recentPasses - a.recentPasses || b.seasonPassAtt - a.seasonPassAtt);
  for (const r of active) if (r !== qbs[0]) r.exp.passAtt = 0;

  // Carries and targets: share out what ruled-out players would have had, at the same position first,
  // then scale to the team's usual totals.
  for (const type of ['rushAtt', 'targets']) {
    for (const o of rows.filter((r) => r.out && r.exp[type] > 0)) {
      const same = active.filter((r) => r.group === o.group && r.exp[type] > 0);
      const pool = same.length ? same : active.filter((r) => r.exp[type] > 0);
      const total = pool.reduce((a, r) => a + r.exp[type], 0);
      for (const r of pool) r.exp[type] += total ? (o.exp[type] * r.exp[type]) / total : 0;
    }
    const sum = active.reduce((a, r) => a + r.exp[type], 0);
    const factor = sum ? clamp(input.teamAvg[type] / sum, input.scaleRange) : 1;
    for (const r of active) r.exp[type] *= factor;
  }

  const projected = active.map((r) => ({
    id: r.id, name: r.name, pos: r.pos, status: r.status,
    passAtt: r.exp.passAtt, rushAtt: r.exp.rushAtt, targets: r.exp.targets,
    passYds: (r.exp.passAtt * r.rate100.passYds) / 100,
    rushYds: (r.exp.rushAtt * r.rate100.rushYds) / 100,
    recYds: (r.exp.targets * r.rate100.recYds) / 100,
    rec: (r.exp.targets * r.rate100.rec) / 100,
    td: ((r.exp.rushAtt + r.exp.targets) * r.rate100.td * input.tdFactor) / 100,
  }));
  const sumOf = (s) => projected.reduce((a, p) => a + p[s], 0);
  // Listed as out: ruled-out players who would have had a real role (or who have thrown passes this season).
  const out = rows.filter((r) => r.out && (['passAtt', 'rushAtt', 'targets'].some((t) => r.exp[t] >= input.listMinOpps) || r.seasonPassAtt > 0))
    .map((r) => ({ id: r.id, name: r.name, pos: r.pos, status: inactive ? 'Inactive' : r.status }));

  return {
    score: input.score, model: input.model, market: input.market,
    passYds: sumOf('passYds'), rushYds: sumOf('rushYds'), td: sumOf('td'),
    players: projected, out,
  };
}
