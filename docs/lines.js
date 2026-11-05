// Claude's over/under lines: the chance a player goes over a line, and the line he goes over a given share
// of the time (the 80/20 line = over 80% of the time). The chances come from the nightly calibration
// (updater/calibrate.js): how far real results have landed from Claude's projections.
//   Yards and receptions: cal = { bias, k, shape (101 sorted standardised misses) }.
//   Touchdowns: cal = { bias, poisson: true }: a count with average bias × projection.

export const LINE_STATS = ['passYds', 'rushYds', 'recYds', 'rec', 'td'];
export const LEAN_STATS = ['rushYds', 'recYds', 'td']; // corrected by the learned lean (updater/calibrate.js)
export const LEVELS = [0.95, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05];

// Chance of going over the line (22.5 → 23 or more). null if not learned yet.
export function chanceOver(mu, line, cal) {
  if (!cal) return null;
  const need = Math.floor(line) + 1; // the smallest whole result that's over
  if (cal.poisson) {
    const lambda = Math.max(0, cal.bias * mu);
    let p = Math.exp(-lambda); let below = 0;
    for (let n = 0; n < need; n++) { below += p; p *= lambda / (n + 1); }
    return Math.max(0, 1 - below);
  }
  if (!cal.shape?.length) return null;
  const z = (need - 0.5 - cal.bias * mu) / Math.sqrt(cal.k * Math.max(mu, 1));
  const q = cal.shape;
  if (z <= q[0]) return 1;
  if (z >= q[q.length - 1]) return 0;
  let i = 0;
  while (q[i + 1] < z) i++;
  const frac = q[i + 1] > q[i] ? (z - q[i]) / (q[i + 1] - q[i]) : 0;
  return 1 - (i + frac) / (q.length - 1);
}

// The .5 line whose chance is nearest the share; null if none comes within 5% of it (e.g. no touchdown
// line is 90% likely: even "anytime scorer" rarely is).
export function lineAt(mu, cal, share) {
  if (!cal) return null;
  let best = null;
  const top = Math.ceil(Math.max(mu, 1) * 4) + 10;
  for (let line = 0.5; line <= top; line++) {
    const c = chanceOver(mu, line, cal);
    if (c === null) return null;
    const gap = Math.abs(c - share);
    if (!best || gap < best.gap - 1e-12) best = { line, gap };
  }
  return best.gap <= 0.05 ? best.line : null;
}
