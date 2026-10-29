import { MODES, SMART_STATS, TENTHS_STATS, playerStat, show, smartStat, smartWorking, teamAverage, working } from './calc.js';
import { allocateSide } from './claude.js';

const app = document.getElementById('app');
const TZ = 'Australia/Melbourne';
const STATS = ['passAtt', 'passCmp', 'passYds', 'rushAtt', 'rushYds', 'rushRecYds', 'targets', 'rec', 'recYds', 'td'];
const SHORT = {
  passAtt: 'ATT', passCmp: 'CMP', passYds: 'PASS YDS', rushAtt: 'CAR', rushYds: 'RUSH YDS',
  rushRecYds: 'R+R YDS', targets: 'TGT', rec: 'REC', recYds: 'REC YDS', td: 'TD',
};
const LONG = {
  passAtt: 'Passing attempts', passCmp: 'Passing completions', passYds: 'Passing yards',
  rushAtt: 'Rushing attempts', rushYds: 'Rushing yards', rushRecYds: 'Rushing + receiving yards',
  targets: 'Targets', rec: 'Receptions', recYds: 'Receiving yards', td: 'Touchdowns',
};
const PROJ_STATS = ['passYds', 'rushYds', 'recYds', 'rec', 'td']; // the Projections page shows only these
const MODE_KEY = 'playerMode';
const FORMULA_KEY = 'matchupFormula';
const D = { decimals: true };

let data;
let playerSort = 'rushRecYds';
let projectionSort = 'passYds';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const colours = (team) => `background:${team.colour};color:${team.textColour}`;
const tenths = (s) => ({ tenths: TENTHS_STATS.has(s) });

// "Checked 12:03am Wed 28 Oct" in Melbourne time.
function checkedText(iso) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-AU', {
      timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true, weekday: 'short', day: 'numeric', month: 'short',
    }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  );
  return `Checked ${p.hour}:${p.minute}${p.dayPeriod.toLowerCase()} ${p.weekday} ${p.day} ${p.month}`;
}

// "2026-10-19" (already a Melbourne date) -> "Mon 19 Oct"
function dateText(ymd) {
  return new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(`${ymd}T00:00:00Z`)).replace(',', '');
}

// "Wk 6" for the regular season; WC, DIV, CONF or SB for the playoffs.
const weekText = (g) => (g.type === 'REG' ? `Wk ${g.week}` : g.type);

// "2026-10-25T17:00Z" -> "Mon 26 Oct · 4:00am" in Melbourne time.
function startText(iso) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-AU', {
      timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true, weekday: 'short', day: 'numeric', month: 'short',
    }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  );
  return `${p.weekday} ${p.day} ${p.month} · ${p.hour}:${p.minute}${p.dayPeriod.toLowerCase()}`;
}

function bar(title, backHref, sub = '') {
  const back = backHref ? `<a class="back" href="${backHref}" aria-label="Back">‹</a>` : '';
  return `<header class="bar">${back}<h1>${esc(title)}${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</h1></header>`;
}

function readMode() {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    if (saved === MODES.SMART && !data.smart) return MODES.ALL; // data built before Smart existed
    return Object.values(MODES).includes(saved) ? saved : MODES.ALL;
  } catch { return MODES.ALL; }
}
function readFormula() {
  try { return localStorage.getItem(FORMULA_KEY) === 'claude' ? 'claude' : 'nate'; } catch { return 'nate'; }
}
function saveFormula(f) {
  try { localStorage.setItem(FORMULA_KEY, f); } catch { /* private mode: just don't remember */ }
}

// The Your formula / Claude's formula tabs on the Upcoming games and matchup pages.
function formulaTabs(formula) {
  const btn = (f, label) => `<button data-formula="${f}" aria-pressed="${formula === f}">${label}</button>`;
  return `<div class="switch tabs" role="group" aria-label="Formula">${btn('nate', 'Your formula')}${btn('claude', "Claude's formula")}</div>`;
}

// Claude's formula figures are decimals, shown cut: yards to whole numbers, the rest to one decimal.
const whole = (x) => String(Math.trunc(x + 1e-9) + 0);
const one = (x) => (Math.trunc(x * 10 + 1e-9) / 10 + 0).toFixed(1);

function saveMode(mode) {
  try { localStorage.setItem(MODE_KEY, mode); } catch { /* private mode: just don't remember */ }
}

// 1. Teams (home)
function teamsPage() {
  const rows = data.teams.map((t) => `
    <li><a class="row" href="#/team/${t.id}" style="${colours(t)}">
      <span>${esc(t.name)}</span><span class="gp">${t.gp} played</span>
    </a></li>`).join('');
  const count = data.upcoming?.games.length ?? 0;
  const when = data.upcoming?.label ? `${data.upcoming.label} · ` : '';
  const upcoming = `<a class="upcoming-link" href="#/upcoming"><span>Upcoming games</span><span class="gp">${when}${count} ${count === 1 ? 'game' : 'games'} ›</span></a>`;
  return `${bar(`NFL ${data.season}`, null, checkedText(data.checked))}${upcoming}<ul class="teams">${rows}</ul>`;
}

// 2. Team page, in Nate's wording
function teamPage(t) {
  const avg = (s) => show(teamAverage(t.totals[s], t.gp), D);
  const line = (s, total, avgLabel) => `Total ${total} ${t.totals[s]} (average ${avg(s)} ${avgLabel})`;
  const lines = [
    line('passAtt', 'passing attempts', 'passing attempts'),
    line('passCmp', 'passing completions', 'completions'),
    line('passYds', 'passing yards', 'passing yards'),
    line('rushAtt', 'rushing attempts', 'rushing attempts'),
    line('rushYds', 'rushing yards', 'rushing yards'),
    line('rushRecYds', 'rushing and receiving yards', 'rush + rec yards'),
    line('targets', 'targets', 'targets'),
    line('rec', 'receptions', 'receptions'),
    line('recYds', 'receiving yards', 'receiving yards'),
    line('td', 'touchdowns', 'touchdowns'),
  ];
  return `${bar('', '#/')}
    <section class="panel" style="${colours(t)}">
      <h2>${esc(t.name)}</h2>
      <p>Games played ${t.gp}</p>
      <div class="lines">${lines.map((l) => `<p>${l}</p>`).join('')}</div>
      <div class="buttons">
        <a class="button" href="#/team/${t.id}/games">Games</a>
        <a class="button" href="#/team/${t.id}/players">Players</a>
        <a class="button wide" href="#/team/${t.id}/projections">Projections</a>
      </div>
    </section>`;
}

// 3. Games, newest first, Opponent column stays put
function gamesPage(t) {
  const heads = ['Opponent', ...STATS.map((s) => SHORT[s])];
  const rows = t.games.map((g) => `
    <tr><td><span class="opp">${g.home ? 'vs' : '@'} ${esc(g.opp)}</span>
      <span class="date">${weekText(g)} · ${dateText(g.date)}</span></td>
    ${STATS.map((s) => `<td>${g.stats[s]}</td>`).join('')}</tr>`).join('');
  const body = t.games.length
    ? `<div class="table-wrap sticky"><table><thead><tr>${heads.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead>
       <tbody>${rows}</tbody></table></div>`
    : '<p class="message">No games yet.</p>';
  return `${bar(`${t.name} games`, `#/team/${t.id}`)}${body}`;
}

// 4. Players, sortable, Player column stays put
function playersPage(t) {
  const players = [...t.players].sort((a, b) => {
    if (playerSort === 'name') return a.name.localeCompare(b.name);
    const av = playerSort === 'gp' ? a.gp : a.totals[playerSort];
    const bv = playerSort === 'gp' ? b.gp : b.totals[playerSort];
    return bv - av || b.totals.rushRecYds - a.totals.rushRecYds || a.name.localeCompare(b.name);
  });
  const cols = [['name', 'Player'], ['gp', 'GP'], ...STATS.map((s) => [s, SHORT[s]])];
  const head = cols.map(([key, label]) =>
    `<th scope="col"${key === playerSort ? ' aria-sort="descending"' : ''}><button data-sort="${key}">${label}</button></th>`).join('');
  const rows = players.map((p) => {
    const href = `#/team/${t.id}/player/${p.id}`;
    const pos = p.pos ? `<span class="pos">${esc(p.pos)}</span>` : '';
    return `<tr data-href="${href}"><td><a class="name" href="${href}"><span>${esc(p.name)}</span>${pos}</a></td><td>${p.gp}</td>
      ${STATS.map((s) => `<td>${p.totals[s]}</td>`).join('')}</tr>`;
  }).join('');
  const body = t.players.length
    ? `<div class="table-wrap sticky"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`
    : '<p class="message">No players yet.</p>';
  return `${bar(`${t.name} players`, `#/team/${t.id}`)}${body}`;
}

// The All team games / Games he played / Smart switch, shared by the Projections, Matchup and Player pages.
function modeSwitch(mode) {
  const btn = (m, label) => `<button data-mode="${m}" aria-pressed="${mode === m}">${label}</button>`;
  const smart = data.smart ? btn(MODES.SMART, 'Smart') : '';
  return `<div class="switch${smart ? ' three' : ''}" role="group" aria-label="Projection formula">
      ${btn(MODES.ALL, 'All team games')}${btn(MODES.PLAYED, 'Games he played')}${smart}
    </div>`;
}

// One stat for one player in the given mode: Nate's share formula, or Smart.
function statFor(t, p, s, mode) {
  if (mode === MODES.SMART) {
    return smartStat(s, { playerTotals: p.totals, playerGP: p.gp, league: data.smart.league, strength: data.smart.strength },
      TENTHS_STATS.has(s));
  }
  return playerStat({
    teamTotal: t.totals[s], teamGP: t.gp, playerTotal: p.totals[s],
    teamTotalInHisGames: p.teamTotalsInHisGames[s], playerGP: p.gp,
  }, mode, TENTHS_STATS.has(s));
}

// One player's projection for each Projections-page stat in the given mode.
function projections(t, p, mode) {
  return Object.fromEntries(PROJ_STATS.map((s) => [s, statFor(t, p, s, mode).projection]));
}

// A projection worth showing: 1 or more, or 0.1 or more for touchdowns (held as tenths, so also >= 1).
const worthShowing = (v) => v !== null && v >= 1;

// 4b. Projections: Passing, Rushing and Receiving yards, Receptions and Touchdowns.
// Lists players with at least one projection worth showing; the rest are left blank.
function projectionsPage(t) {
  const mode = readMode();
  const yards = (proj) => (proj.rushYds ?? 0) + (proj.recYds ?? 0);
  const rows = t.players
    .map((p) => ({ p, proj: projections(t, p, mode) }))
    .filter(({ proj }) => PROJ_STATS.some((s) => worthShowing(proj[s])))
    .sort((a, b) => {
      if (projectionSort === 'name') return a.p.name.localeCompare(b.p.name);
      if (projectionSort === 'gp') return b.p.gp - a.p.gp || a.p.name.localeCompare(b.p.name);
      return (b.proj[projectionSort] ?? 0) - (a.proj[projectionSort] ?? 0)
        || yards(b.proj) - yards(a.proj) || a.p.name.localeCompare(b.p.name);
    });
  const cols = [['name', 'Player'], ['gp', 'GP'], ...PROJ_STATS.map((s) => [s, SHORT[s]])];
  const head = cols.map(([key, label]) =>
    `<th scope="col"${key === projectionSort ? ' aria-sort="descending"' : ''}><button data-psort="${key}">${label}</button></th>`).join('');
  const cell = (s, v) => (worthShowing(v) ? show(v, tenths(s)) : '');
  const body = rows.map(({ p, proj }) => {
    const href = `#/team/${t.id}/player/${p.id}`;
    const pos = p.pos ? `<span class="pos">${esc(p.pos)}</span>` : '';
    return `<tr data-href="${href}"><td><a class="name" href="${href}"><span>${esc(p.name)}</span>${pos}</a></td><td>${p.gp}</td>
      ${PROJ_STATS.map((s) => `<td>${cell(s, proj[s])}</td>`).join('')}</tr>`;
  }).join('');
  const table = rows.length
    ? `<div class="table-wrap sticky"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`
    : '<p class="message">No projections yet.</p>';
  return `${bar(`${t.name} projections`, `#/team/${t.id}`)}${modeSwitch(mode)}${table}`;
}

const teamById = (id) => data.teams.find((t) => t.id === id);
const pill = (t) => `<span class="pill" style="${colours(t)}">${esc(t.code)}</span>`;

// 6. Upcoming games: the next week's games not yet started, from the weekly update.
function upcomingPage() {
  const formula = readFormula();
  const games = data.upcoming?.games ?? [];
  const rows = games.map((g) => {
    const score = formula === 'claude' && g.claude
      ? `<span class="proj-score">${one(g.claude.away.score)} – ${one(g.claude.home.score)}</span>` : '';
    return `<li><a class="game-row" href="#/game/${g.id}">
      <span class="teams-line">${pill(teamById(g.awayId))}<span class="at">${g.neutral ? 'vs' : '@'}</span>${pill(teamById(g.homeId))}</span>
      <span class="when">${score}${startText(g.start)}</span></a></li>`;
  }).join('');
  const body = games.length
    ? `<ul class="games-list">${rows}</ul>`
    : '<p class="message">No upcoming games right now. The list refreshes with each weekly update.</p>';
  const label = data.upcoming?.label ? `${data.upcoming.label} · ` : '';
  return `${bar('Upcoming games', '#/', `${label}Melbourne times · tap a game for projections`)}${formulaTabs(formula)}${body}`;
}

// Players to project for an upcoming game: those on the current roster (when known) who have played for this team.
const projectable = (t, inactive = []) => t.players.filter((p) => (t.roster?.length ? t.roster.includes(p.id) : p.gp > 0) && !inactive.includes(p.id));

// 7. Matchup: for each projection stat, the two teams' players side by side, highest first,
// only projections worth showing (1 or more; TDs 0.1 or more).
// Claude's formula for one game: projected team scores, then each stat side by side.
const CLAUDE_STATS = [
  ['Passing yards', 'passYds', (p) => `${one(p.passAtt)} passes`],
  ['Rushing yards', 'rushYds', (p) => `${one(p.rushAtt)} carries`],
  ['Receiving yards', 'recYds', (p) => `${one(p.targets)} targets`],
  ['Touchdowns', 'td', (p) => `${one(p.rushAtt + p.targets)} carries + targets`],
];
const STATUS_TAG = { Questionable: 'Q' };

// Inactives Nate confirms before kick-off, kept on his phone: { home: [playerId], away: [playerId] }.
const INACTIVE_PREFIX = 'inactives:';
function readInactives(gameId) {
  try { return JSON.parse(localStorage.getItem(INACTIVE_PREFIX + gameId)) ?? null; } catch { return null; }
}
function saveInactives(gameId, value) {
  try {
    if (value) localStorage.setItem(INACTIVE_PREFIX + gameId, JSON.stringify(value));
    else localStorage.removeItem(INACTIVE_PREFIX + gameId);
  } catch { /* private mode: not kept */ }
}
// Forget inactives for games that are no longer upcoming.
function tidyInactives() {
  try {
    const live = new Set((data.upcoming?.games ?? []).map((g) => INACTIVE_PREFIX + g.id));
    for (const k of Object.keys(localStorage)) if (k.startsWith(INACTIVE_PREFIX) && !live.has(k)) localStorage.removeItem(k);
  } catch { /* nothing to tidy */ }
}

// Claude's formula for a game: the weekly figures, re-worked on the phone with Nate's confirmed inactives.
function claudeFor(g) {
  const inactive = readInactives(g.id);
  if (!g.claude || !inactive) return g.claude;
  const redo = (side, key) => (side.inputs ? { ...side, ...allocateSide(side.inputs, inactive[key] ?? []) } : side);
  return { ...g.claude, home: redo(g.claude.home, 'home'), away: redo(g.claude.away, 'away') };
}

function inactivesButton(g) {
  if (!g.claude?.home?.inputs) return '';
  const done = readInactives(g.id);
  return `<a class="lineup-link${done ? ' done' : ''}" href="#/game/${g.id}/inactives">${done
    ? '<span>✓ Inactives confirmed by you</span><span class="gp">Edit ›</span>'
    : '<span>Confirm inactives</span><span class="gp">90 min before kick-off ›</span>'}</a>`;
}

let inactiveDraft = null; // { gameId, home: [id], away: [id] } while Nate is editing
let inactivesFromMatchup = false;
const GROUP_ORDER = { QB: 0, RB: 1, WR: 2, TE: 3, other: 4 };

// 9. Inactives: tap a player to switch him between Active and Inactive; his numbers update straight away.
function inactivesPage(g) {
  const away = teamById(g.awayId);
  const home = teamById(g.homeId);
  if (inactiveDraft?.gameId !== g.id) {
    const saved = readInactives(g.id);
    const fromReport = (side) => side.inputs.rows.filter((r) => r.out).map((r) => r.id);
    inactiveDraft = { gameId: g.id, home: saved?.home ?? fromReport(g.claude.home), away: saved?.away ?? fromReport(g.claude.away) };
  }
  const block = (t, key) => {
    const side = g.claude[key];
    const result = allocateSide(side.inputs, inactiveDraft[key]);
    const opp = (r) => r.exp.passAtt + r.exp.rushAtt + r.exp.targets;
    const rows = [...side.inputs.rows]
      .filter((r) => opp(r) >= 0.5 || r.seasonPassAtt > 0) // players with a real role
      .sort((a, b) => (GROUP_ORDER[a.group] ?? 4) - (GROUP_ORDER[b.group] ?? 4) || opp(b) - opp(a))
      .map((r) => {
        const off = inactiveDraft[key].includes(r.id);
        const p = result.players.find((x) => x.id === r.id);
        const figs = off ? '0 yds · 0.0 TD'
          : [p.passYds >= 1 ? `${whole(p.passYds)} pass` : '', p.rushYds >= 1 ? `${whole(p.rushYds)} rush` : '',
            p.recYds >= 1 ? `${whole(p.recYds)} rec · ${one(p.rec)} rec` : '', `${one(p.td)} TD`].filter(Boolean).join(' · ');
        const tag = r.status ? ` <span class="tag">${esc(STATUS_TAG[r.status] ?? r.status)}</span>` : '';
        return `<li><button class="lineup-row role-${off ? 'out' : 'confirmed'}" data-inactive="${r.id}" data-side="${key}" aria-pressed="${off}">
          <span class="name">${esc(r.name)} <span class="pos">${esc(r.pos)}</span>${tag}<span class="mins">${figs}</span></span>
          <span class="state">${off ? 'Inactive' : 'Active'}</span></button></li>`;
      }).join('');
    return `<section class="stat"><h3><span class="pill" style="${colours(t)}">${esc(t.code)}</span> ${inactiveDraft[key].length} inactive</h3>
      <ul class="lineup">${rows}</ul></section>`;
  };
  return `${bar(`${away.code} ${g.neutral ? 'vs' : '@'} ${home.code} inactives`, `#/game/${g.id}`, 'Tap a player to switch Active / Inactive')}
    <div class="stats">${block(away, 'away')}${block(home, 'home')}</div>
    <div class="buttons lineup-actions">
      <button class="button" data-inactives="reset">Back to injury report</button>
      <button class="button primary" data-inactives="save">Save inactives</button>
    </div>
    <p class="working">NFL inactives are announced about 90 minutes before kick-off. Starting from the injury report (Out, Doubtful, Injured Reserve and suspended players inactive), mark who is actually inactive. Claude's formula re-works the game on your phone: inactive players are removed, their carries and targets go to teammates at the same position, and if the starting QB is inactive the next QB throws. Your formula leaves out inactive players.</p>`;
}

function claudeMatchup(g, away, home) {
  const c = claudeFor(g);
  if (!c) return '<p class="message">Claude\'s formula isn\'t ready for this game yet. It appears after the next weekly update.</p>';
  const scoreBox = (t, side) => {
    const parts = [`Stats model ${one(side.model)}`];
    if (side.market !== null) parts.push(`Betting market ${one(side.market)}`);
    return `<div class="panel" style="${colours(t)}"><p>${esc(t.code)} projected</p><h2 class="big">${one(side.score)}</h2>
      <p class="small">${parts.join(' · ')}</p>
      <p class="small">Passing ${whole(side.passYds)} · Rushing ${whole(side.rushYds)} · TDs ${one(side.td)}</p></div>`;
  };
  const outLine = (t, side) => (side.out.length
    ? `<p class="out-line"><b>${esc(t.code)} out:</b> ${side.out.map((o) => `${esc(o.name)}${o.pos ? ` (${esc(o.pos)})` : ''}`).join(', ')}</p>` : '');
  const show1 = (key, v) => (key === 'td' ? one(v) : whole(v));
  const worth = (key, v) => (key === 'td' ? Math.trunc(v * 10 + 1e-9) >= 1 : Math.trunc(v + 1e-9) >= 1);
  const column = (t, side, key, sub) => {
    const items = side.players
      .filter((p) => worth(key, p[key]))
      .sort((a, b) => b[key] - a[key] || a.name.localeCompare(b.name))
      .map((p) => {
        const tag = p.status ? ` <span class="tag">${esc(STATUS_TAG[p.status] ?? p.status)}</span>` : '';
        const pos = p.pos ? ` <span class="pos">${esc(p.pos)}</span>` : '';
        return `<li><a href="#/team/${t.id}/player/${p.id}"><span class="name">${esc(p.name)}${pos}${tag}<span class="mins">${sub(p)}</span></span><b>${show1(key, p[key])}</b></a></li>`;
      }).join('');
    return `<div class="side"><div class="side-head" style="${colours(t)}">${esc(t.code)}</div>
      ${items ? `<ul>${items}</ul>` : '<p class="none">No projections</p>'}</div>`;
  };
  const sections = CLAUDE_STATS.map(([label, key, sub]) => `<section class="stat"><h3>${label}</h3>
      <div class="sides">${column(away, c.away, key, sub)}${column(home, c.home, key, sub)}</div></section>`).join('');
  return `<section class="matchup">${scoreBox(away, c.away)}${scoreBox(home, c.home)}</section>
    ${outLine(away, c.away)}${outLine(home, c.home)}
    <div class="stats">${sections}</div>
    <p class="working">How Claude's formula works: team scores blend a points model (10%) with the betting market's expected score (90%). Player figures are expected opportunities (passes, carries, targets: this season blended with last season) × efficiency pulled toward his own last season and the league average. The expected starting quarterback gets the team's passes; players ruled out (Out, Doubtful, Injured Reserve, suspended) are removed and their carries and targets shared among teammates at the same position; Q = questionable. Touchdowns follow carries + targets and the betting market's expected points. Yards are cut to whole numbers, the rest to one decimal.</p>`;
}

// The upcoming game before or after this one (wrapping round), for swiping and the ‹ › arrows.
function neighbourGame(id, step) {
  const games = data.upcoming?.games ?? [];
  const i = games.findIndex((g) => g.id === id);
  return i === -1 || games.length < 2 ? null : games[(i + step + games.length) % games.length];
}

// "‹  3 of 14  ›" under the title of a matchup page.
function gameNav(g) {
  const games = data.upcoming?.games ?? [];
  if (games.length < 2) return '';
  const i = games.findIndex((x) => x.id === g.id);
  return `<nav class="game-nav" aria-label="Other upcoming games">
    <a href="#/game/${neighbourGame(g.id, -1).id}" data-replace aria-label="Previous game">‹</a>
    <span>Game ${i + 1} of ${games.length} · swipe for more</span>
    <a href="#/game/${neighbourGame(g.id, 1).id}" data-replace aria-label="Next game">›</a></nav>`;
}

function matchupPage(g) {
  const formula = readFormula();
  const mode = readMode();
  const away = teamById(g.awayId);
  const home = teamById(g.homeId);
  const head = (sub) => `${bar(`${away.code} ${g.neutral ? 'vs' : '@'} ${home.code}`, '#/upcoming', sub)}${gameNav(g)}${inactivesButton(g)}${formulaTabs(formula)}`;
  if (formula === 'claude') return `${head(startText(g.start))}${claudeMatchup(g, away, home)}`;
  const inactive = readInactives(g.id);
  const column = (t, s) => {
    const items = projectable(t, inactive?.[t.id === g.homeId ? 'home' : 'away'] ?? [])
      .map((p) => ({ p, v: projections(t, p, mode)[s] }))
      .filter(({ v }) => worthShowing(v))
      .sort((a, b) => b.v - a.v || a.p.name.localeCompare(b.p.name))
      .map(({ p, v }) => {
        const pos = p.pos ? ` <span class="pos">${esc(p.pos)}</span>` : '';
        return `<li><a href="#/team/${t.id}/player/${p.id}"><span class="name">${esc(p.name)}${pos}</span><b>${show(v, tenths(s))}</b></a></li>`;
      })
      .join('');
    return `<div class="side"><div class="side-head" style="${colours(t)}">${esc(t.code)}</div>
      ${items ? `<ul>${items}</ul>` : '<p class="none">No projections</p>'}</div>`;
  };
  const sections = PROJ_STATS.map((s) => `<section class="stat"><h3>${LONG[s]}</h3>
      <div class="sides">${column(away, s)}${column(home, s)}</div></section>`).join('');
  const sideLabel = (homeAway) => (g.neutral ? 'Neutral site' : homeAway);
  return `${head(startText(g.start))}
    <section class="matchup">
      <div class="panel" style="${colours(away)}"><h2>${esc(away.name)}</h2><p>${sideLabel('Away')} · ${away.gp} played</p></div>
      <div class="panel" style="${colours(home)}"><h2>${esc(home.name)}</h2><p>${sideLabel('Home')} · ${home.gp} played</p></div>
    </section>
    ${modeSwitch(mode)}
    <div class="stats">${sections}</div>`;
}

// The middle figure on a Player page card: share % for Nate's formula; for Smart, the steadied rate,
// or his average a game for stats with no rate.
function middleFigure(s, r, mode) {
  if (mode !== MODES.SMART) return [show(r.share, { ...D, suffix: '%' }), 'Share'];
  const def = SMART_STATS[s];
  if (s === 'rushRecYds' || !def?.k) return [show(r.exact, D), 'A game'];
  return [show(r.rate, { ...D, suffix: def.pct ? '%' : '' }), RATE_LABEL[s]];
}
const RATE_LABEL = {
  passCmp: 'Completed (steadied)', passYds: 'Yds a pass (steadied)', rushYds: 'Yds a carry (steadied)',
  rec: 'Caught (steadied)', recYds: 'Yds a target (steadied)', td: 'Scoring rate (steadied)',
};

// 5. Player page: total, share % (or Smart rate) and projection per stat, three modes
function playerPage(t, p) {
  const mode = readMode();
  const cards = STATS.map((s) => {
    const r = statFor(t, p, s, mode);
    const [mid, midLabel] = middleFigure(s, r, mode);
    const work = mode === MODES.SMART ? smartWorking(s, r, p.totals, p.gp) : working(p.totals[s], r);
    return `<div class="stat"><h3>${LONG[s]}</h3>
      <div class="figures">
        <div><b>${p.totals[s]}</b><span>Total</span></div>
        <div><b>${mid}</b><span>${midLabel}</span></div>
        <div><b>${show(r.projection, tenths(s))}</b><span>Projection</span></div>
      </div>
      <p class="working">${work}</p></div>`;
  }).join('');
  const pos = p.pos ? ` · ${esc(p.pos)}` : '';
  return `${bar('', `#/team/${t.id}/players`)}
    <section class="panel" style="${colours(t)}">
      <h2>${esc(p.name)}</h2><p>${esc(t.name)}${pos}</p><p>Played ${p.gp} of ${t.gp} team games</p>
    </section>
    ${modeSwitch(mode)}
    <div class="stats">${cards}</div>`;
}

function render() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  let html;
  let title = 'NFL Team Stats';
  const team = parts[0] === 'team' ? data.teams.find((t) => t.id === parts[1]) : null;
  const game = parts[0] === 'game' ? data.upcoming?.games.find((g) => g.id === parts[1]) : null;
  if (parts.length === 0) {
    html = teamsPage();
  } else if (parts[0] === 'upcoming') {
    html = upcomingPage(); title = 'Upcoming games';
  } else if (game && parts[2] === 'inactives' && game.claude?.home?.inputs) {
    html = inactivesPage(game); title = `${teamById(game.awayId).code} ${game.neutral ? 'vs' : '@'} ${teamById(game.homeId).code} inactives`;
  } else if (game) {
    inactiveDraft = null;
    html = matchupPage(game); title = `${teamById(game.awayId).code} ${game.neutral ? 'vs' : '@'} ${teamById(game.homeId).code}`;
  } else if (team && parts.length === 2) {
    html = teamPage(team); title = team.name;
  } else if (team && parts[2] === 'games') {
    html = gamesPage(team); title = `${team.name} games`;
  } else if (team && parts[2] === 'projections') {
    html = projectionsPage(team); title = `${team.name} projections`;
  } else if (team && parts[2] === 'players') {
    html = playersPage(team); title = `${team.name} players`;
  } else if (team && parts[2] === 'player' && team.players.some((p) => p.id === parts[3])) {
    const player = team.players.find((p) => p.id === parts[3]);
    html = playerPage(team, player); title = player.name;
  } else {
    html = `${bar('Not found', '#/')}<p class="message">That page doesn't exist.</p>`;
  }
  document.title = title;
  app.innerHTML = html;
}

app.addEventListener('click', (e) => {
  const sortBtn = e.target.closest('[data-sort]');
  if (sortBtn) { playerSort = sortBtn.dataset.sort; render(); return; }
  const projSortBtn = e.target.closest('[data-psort]');
  if (projSortBtn) { projectionSort = projSortBtn.dataset.psort; render(); return; }
  const formulaBtn = e.target.closest('[data-formula]');
  if (formulaBtn) { saveFormula(formulaBtn.dataset.formula); render(); return; }
  const modeBtn = e.target.closest('[data-mode]');
  if (modeBtn) { saveMode(modeBtn.dataset.mode); render(); return; }
  if (e.target.closest('.lineup-link')) inactivesFromMatchup = true;
  const toggle = e.target.closest('[data-inactive]');
  if (toggle && inactiveDraft) {
    const list = inactiveDraft[toggle.dataset.side];
    const id = toggle.dataset.inactive;
    inactiveDraft[toggle.dataset.side] = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    const y = window.scrollY; render(); window.scrollTo(0, y); return;
  }
  const action = e.target.closest('[data-inactives]');
  if (action && inactiveDraft) {
    const gameId = inactiveDraft.gameId;
    saveInactives(gameId, action.dataset.inactives === 'save' ? { home: inactiveDraft.home, away: inactiveDraft.away } : null);
    inactiveDraft = null;
    if (inactivesFromMatchup) history.back(); else location.replace(`#/game/${gameId}`);
    inactivesFromMatchup = false;
    return;
  }
  const replaceLink = e.target.closest('a[data-replace]');
  if (replaceLink) { e.preventDefault(); location.replace(replaceLink.getAttribute('href')); return; }
  const row = e.target.closest('tr[data-href]');
  if (row && !e.target.closest('a')) location.hash = row.dataset.href;
});

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

// Matchup pages: swipe left for the next upcoming game, right for the previous one.
// Moving between games replaces the page in history, so Back still returns to the games list.
let touch = null;
app.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  // ignore two-finger gestures, tables that scroll sideways, and the screen edge (the phone's own back swipe)
  touch = e.touches.length === 1 && !e.target.closest('.table-wrap') && t.clientX > 24 && t.clientX < innerWidth - 24
    ? { x: t.clientX, y: t.clientY } : null;
}, { passive: true });
app.addEventListener('touchend', (e) => {
  const m = /^#\/game\/([^/]+)$/.exec(location.hash);
  if (!touch || !m) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touch.x;
  const dy = t.clientY - touch.y;
  touch = null;
  if (Math.abs(dx) < 60 || Math.abs(dx) < 2 * Math.abs(dy)) return; // not a clear sideways swipe
  const next = neighbourGame(m[1], dx < 0 ? 1 : -1);
  if (next) location.replace(`#/game/${next.id}`);
}, { passive: true });

try {
  const res = await fetch('data/app-data.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(res.status);
  data = await res.json();
  tidyInactives();
  render();
} catch {
  app.innerHTML = `<p class="message">Couldn't load the stats. Check your connection and try again.</p>`;
}
