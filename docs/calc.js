// All app maths, done in whole numbers so there is no floating-point error
// (which could turn an exact 1 into 0.9999 and cut it to 0).
// The projection formula keeps every decimal; only the final projection is cut (toward zero):
// to a whole number, or to one decimal for touchdowns.
// Averages and share % are shown with 2 decimals, cut (never rounded): 33.627% shows as 33.62%.
// Shown 2-decimal figures are held as whole hundredths (3362 means 33.62); TD projections as tenths (6 means 0.6).
// null means "no figure yet" and is shown as "—".

export const DASH = '—';

// a ÷ b with the decimals cut toward zero; "+ 0" turns -0 into 0. a and b are whole numbers, b > 0.
export const cut = (a, b) => (a - (a % b)) / b + 0;

// Stats whose projections keep one decimal.
export const TENTHS_STATS = new Set(['td']);

// Team average in hundredths: 101 over 6 games -> 1683 (shown 16.83). null when the team hasn't played.
export function teamAverage(teamTotal, teamGP) {
  return teamGP > 0 ? cut(100 * teamTotal, teamGP) : null;
}

// Share % in hundredths: 100 ÷ 140 × 30 = 21.428…% -> 2142 (shown 21.42%). A base of 0 or less gives 0.
export function sharePct(playerTotal, base) {
  return base > 0 ? cut(10000 * playerTotal, base) : 0;
}

// Projection with every decimal kept: team average × share
//   = (teamTotal ÷ teamGP) × (playerTotal ÷ base) = (teamTotal × playerTotal) ÷ (teamGP × base).
// Returns the exact value in hundredths (for the working) and the projection: whole, or tenths for TDs.
export function projection(teamTotal, teamGP, playerTotal, base, tenths = false) {
  if (base <= 0) return { exact: 0, value: 0 };
  const top = teamTotal * playerTotal;
  const bottom = teamGP * base;
  return { exact: cut(100 * top, bottom), value: cut((tenths ? 10 : 1) * top, bottom) };
}

export const MODES = { ALL: 'all', PLAYED: 'played' };

// One stat on the Player page.
//   mode ALL:    base = team total over all team games (Nate's formula, the default)
//   mode PLAYED: base = team total over only the games he played
// Both modes project with the full-season team average. With tenths, the projection is in tenths.
export function playerStat(
  { teamTotal, teamGP, playerTotal, teamTotalInHisGames, playerGP },
  mode = MODES.ALL,
  tenths = false,
) {
  const avg = teamAverage(teamTotal, teamGP);
  const base = mode === MODES.PLAYED ? teamTotalInHisGames : teamTotal;
  if (avg === null || (mode === MODES.PLAYED && playerGP === 0)) {
    return { base, avg, share: null, exact: null, projection: null, tenths };
  }
  const p = projection(teamTotal, teamGP, playerTotal, base, tenths);
  return { base, avg, share: sharePct(playerTotal, base), exact: p.exact, projection: p.value, tenths };
}

// Fixed-decimal text keeping the sign: (1769, 100) -> "17.69", (-66, 100) -> "-0.66", (6, 10) -> "0.6".
function fixed(n, scale) {
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  const digits = String(scale).length - 1;
  return `${sign}${cut(a, scale)}.${String(a % scale).padStart(digits, '0')}`;
}
export const hundredths = (n) => fixed(n, 100);
export const tenthsText = (n) => fixed(n, 10);

// A figure as text: "—" for null; 2 decimals when in hundredths, 1 decimal when in tenths, else whole.
export const show = (value, { decimals = false, tenths = false, suffix = '' } = {}) => {
  if (value === null) return DASH;
  const text = decimals ? hundredths(value) : tenths ? tenthsText(value) : String(value);
  return `${text}${suffix}`;
};

// The working shown beneath each stat, e.g. "100 ÷ 140 × 30 = 21.42% · 34.00 × 21.42% = 7.28 → 7".
// The product is worked from the full decimals, so it can be a touch above the shown figures multiplied.
export function working(playerTotal, { base, avg, share, exact, projection: proj, tenths }) {
  if (share === null) return DASH;
  return `100 ÷ ${base} × ${playerTotal} = ${hundredths(share)}% · ${hundredths(avg)} × ${hundredths(share)}% = ${hundredths(exact)} → ${show(proj, { tenths })}`;
}
