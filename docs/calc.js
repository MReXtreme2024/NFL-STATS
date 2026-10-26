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

export const MODES = { ALL: 'all', PLAYED: 'played', SMART: 'smart' };

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

// ---- Smart: opportunities × steadied efficiency (added 26 Oct 2026, tested against weeks 3-7) ----
// projection = his opportunities a game × his rate, where his rate is pulled toward the league rate
// as if he'd had K extra league-average opportunities:
//   steadied rate = (made + K × leagueMade ÷ leagueOpps) ÷ (opps + K)
//   projection    = opps ÷ GP × steadied rate = opps × (made × leagueOpps + K × leagueMade) ÷ (GP × (opps + K) × leagueOpps)
// Worked in BigInt, so the products never lose precision; BigInt division already cuts toward zero.
// Stats with no rate (attempts, carries, targets) are simply his average in the games he played.
// Rush + rec yards = rushing yards + receiving yards, added before the cut.
export const SMART_STATS = {
  passAtt: { opps: 'passAtt' },
  passCmp: { opps: 'passAtt', k: 'pass', rate: '% completed', pct: true },
  passYds: { opps: 'passAtt', k: 'pass', rate: 'yds a pass' },
  rushAtt: { opps: 'rushAtt' },
  rushYds: { opps: 'rushAtt', k: 'rush', rate: 'yds a carry' },
  targets: { opps: 'targets' },
  rec: { opps: 'targets', k: 'rec', rate: '% caught', pct: true },
  recYds: { opps: 'targets', k: 'rec', rate: 'yds a target' },
  td: { opps: 'touches', k: 'td', rate: '% score', pct: true },
};
const OPPS_LABEL = { passAtt: 'passes', rushAtt: 'carries', targets: 'targets', touches: 'carries + targets' };

const big = BigInt;
const cutBig = (a, b) => Number(a / b); // BigInt division truncates toward zero; never -0
const oppsOf = (totals, key) => (key === 'touches' ? totals.rushAtt + totals.targets : totals[key]);

// One rate-based stat as an exact fraction top ÷ bottom (projection a game), plus the shown pieces.
function smartFraction(stat, { playerTotals, playerGP, league, strength }) {
  const def = SMART_STATS[stat];
  const opps = big(oppsOf(playerTotals, def.opps));
  const gp = big(playerGP);
  if (!def.k) return { top: opps, bottom: gp, opps, gp };
  const k = big(strength[def.k]);
  const made = big(playerTotals[stat]);
  const lOpps = big(oppsOf(league, def.opps));
  const lMade = big(league[stat]);
  if (lOpps <= 0n || opps + k <= 0n) return { top: 0n, bottom: 1n, opps, gp, rateTop: 0n, rateBottom: 1n };
  const rateTop = made * lOpps + k * lMade;
  const rateBottom = (opps + k) * lOpps;
  return { top: opps * rateTop, bottom: gp * rateBottom, opps, gp, rateTop, rateBottom };
}

// Smart projection for one stat. input: { playerTotals, playerGP, league, strength }.
// Returns { exact (hundredths), projection (whole, or tenths for TDs), perGame (hundredths), rate (hundredths) }.
export function smartStat(stat, input, tenths = false) {
  if (input.playerGP <= 0) return { exact: null, projection: null, perGame: null, rate: null, tenths };
  let top;
  let bottom;
  let first;
  let parts = null;
  if (stat === 'rushRecYds') {
    const a = smartFraction('rushYds', input);
    const b = smartFraction('recYds', input);
    top = a.top * b.bottom + b.top * a.bottom;
    bottom = a.bottom * b.bottom;
    parts = { rush: cutBig(100n * a.top, a.bottom), rec: cutBig(100n * b.top, b.bottom) };
  } else {
    first = smartFraction(stat, input);
    ({ top, bottom } = first);
  }
  const def = SMART_STATS[stat];
  return {
    exact: cutBig(100n * top, bottom),
    projection: cutBig((tenths ? 10n : 1n) * top, bottom),
    perGame: first ? cutBig(100n * first.opps, first.gp) : null,
    rate: first?.rateTop !== undefined ? cutBig((def.pct ? 10000n : 100n) * first.rateTop, first.rateBottom) : null,
    parts,
    tenths,
  };
}

// The working shown beneath each stat in Smart mode, e.g.
// "10.40 targets a game × 7.56 yds a target (steadied) = 78.67 → 78".
export function smartWorking(stat, r, playerTotals, playerGP) {
  if (r.exact === null) return DASH;
  const proj = show(r.projection, { tenths: r.tenths });
  // The sum is worked from the full decimals, so it can be 0.01 above the two shown parts added.
  if (stat === 'rushRecYds') return `${hundredths(r.parts.rush)} rushing + ${hundredths(r.parts.rec)} receiving = ${hundredths(r.exact)} → ${proj}`;
  const def = SMART_STATS[stat];
  const label = OPPS_LABEL[def.opps];
  if (!def.k) return `${oppsOf(playerTotals, def.opps)} ${label} ÷ ${playerGP} games = ${hundredths(r.exact)} → ${proj}`;
  const rate = def.pct ? `${hundredths(r.rate)}${def.rate}` : `${hundredths(r.rate)} ${def.rate}`;
  return `${hundredths(r.perGame)} ${label} a game × ${rate} (steadied) = ${hundredths(r.exact)} → ${proj}`;
}
