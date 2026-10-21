// All app maths. Whole numbers only; decimals are cut (toward zero) at every step.
// Touchdowns are the one exception: they keep one decimal, worked as whole tenths (2.6 is 26).
// Never multiply decimals: floating-point error can turn an exact 1 into 0.9999, which cuts to 0.
// null means "no figure yet" and is shown as "—".

export const DASH = '—';

// Whole-number division toward zero; "+ 0" turns -0 into 0. a and b are whole numbers.
export const cut = (a, b) => Math.trunc(a / b) + 0;

// Stats whose averages and projections keep one decimal.
export const TENTHS_STATS = new Set(['td']);

// cut(team total ÷ team GP); null when the team hasn't played.
// With tenths, the result is in tenths: 16 TDs over 6 games -> 26 (shown 2.6).
export function teamAverage(teamTotal, teamGP, tenths = false) {
  return teamGP > 0 ? cut((tenths ? 10 : 1) * teamTotal, teamGP) : null;
}

// cut(100 ÷ base × player total), done as cut(100 × player total, base). A base of 0 or less gives 0%.
export function sharePct(playerTotal, base) {
  return base > 0 ? cut(100 * playerTotal, base) : 0;
}

// cut(team average × share %), done as cut(team average × share, 100). Same units as the average.
export function projection(teamAvg, share) {
  return cut(teamAvg * share, 100);
}

export const MODES = { ALL: 'all', PLAYED: 'played' };

// One stat on the Player page.
//   mode ALL:    base = team total over all team games (Nate's formula, the default)
//   mode PLAYED: base = team total over only the games he played
// Both modes project with the full-season team average. With tenths, avg and projection are in tenths.
export function playerStat(
  { teamTotal, teamGP, playerTotal, teamTotalInHisGames, playerGP },
  mode = MODES.ALL,
  tenths = false,
) {
  const avg = teamAverage(teamTotal, teamGP, tenths);
  const base = mode === MODES.PLAYED ? teamTotalInHisGames : teamTotal;
  if (avg === null || (mode === MODES.PLAYED && playerGP === 0)) {
    return { base, avg, share: null, projection: null, tenths };
  }
  const share = sharePct(playerTotal, base);
  return { base, avg, share, projection: projection(avg, share), tenths };
}

// Tenths as text with one decimal: 26 -> "2.6", 6 -> "0.6", -6 -> "-0.6".
export function tenthsText(n) {
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  return `${sign}${cut(a, 10)}.${a % 10}`;
}

// A figure as text: "—" for null, one decimal for tenths, otherwise the whole number.
export const show = (value, { tenths = false, suffix = '' } = {}) =>
  value === null ? DASH : `${tenths ? tenthsText(value) : value}${suffix}`;

// The working shown beneath each stat, e.g. "100 ÷ 1500 × 1380 = 92% · 250 × 92% = 230".
export function working(playerTotal, { base, avg, share, projection: proj, tenths }) {
  if (share === null) return DASH;
  const t = { tenths };
  return `100 ÷ ${base} × ${playerTotal} = ${share}% · ${show(avg, t)} × ${share}% = ${show(proj, t)}`;
}
