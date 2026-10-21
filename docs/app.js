import { MODES, TENTHS_STATS, playerStat, show, teamAverage, working } from './calc.js';

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
const MODE_KEY = 'playerMode';

let data;
let playerSort = 'rushRecYds';
let projectionSort = 'rushRecYds';

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

function bar(title, backHref, sub = '') {
  const back = backHref ? `<a class="back" href="${backHref}" aria-label="Back">‹</a>` : '';
  return `<header class="bar">${back}<h1>${esc(title)}${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</h1></header>`;
}

function readMode() {
  try { return localStorage.getItem(MODE_KEY) === MODES.PLAYED ? MODES.PLAYED : MODES.ALL; } catch { return MODES.ALL; }
}
function saveMode(mode) {
  try { localStorage.setItem(MODE_KEY, mode); } catch { /* private mode: just don't remember */ }
}

// 1. Teams (home)
function teamsPage() {
  const rows = data.teams.map((t) => `
    <li><a class="row" href="#/team/${t.id}" style="${colours(t)}">
      <span>${esc(t.name)}</span><span class="gp">${t.gp} played</span>
    </a></li>`).join('');
  return `${bar(`NFL ${data.season}`, null, checkedText(data.checked))}<ul class="teams">${rows}</ul>`;
}

// 2. Team page, in Nate's wording
function teamPage(t) {
  const avg = (s) => show(teamAverage(t.totals[s], t.gp, TENTHS_STATS.has(s)), tenths(s));
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

// The All team games / Games he played switch, shared by the Projections and Player pages.
function modeSwitch(mode) {
  const btn = (m, label) => `<button data-mode="${m}" aria-pressed="${mode === m}">${label}</button>`;
  return `<div class="switch" role="group" aria-label="Share based on">
      ${btn(MODES.ALL, 'All team games')}${btn(MODES.PLAYED, 'Games he played')}
    </div>`;
}

// One player's projection for every stat in the given mode.
function projections(t, p, mode) {
  return Object.fromEntries(STATS.map((s) => [s, playerStat({
    teamTotal: t.totals[s], teamGP: t.gp, playerTotal: p.totals[s],
    teamTotalInHisGames: p.teamTotalsInHisGames[s], playerGP: p.gp,
  }, mode, TENTHS_STATS.has(s)).projection]));
}

// 4b. Projections: players with any projection other than 0; zero projections are left blank.
function projectionsPage(t) {
  const mode = readMode();
  const rows = t.players
    .map((p) => ({ p, proj: projections(t, p, mode) }))
    .filter(({ proj }) => STATS.some((s) => proj[s] !== null && proj[s] !== 0))
    .sort((a, b) => {
      if (projectionSort === 'name') return a.p.name.localeCompare(b.p.name);
      if (projectionSort === 'gp') return b.p.gp - a.p.gp || a.p.name.localeCompare(b.p.name);
      return (b.proj[projectionSort] ?? 0) - (a.proj[projectionSort] ?? 0)
        || (b.proj.rushRecYds ?? 0) - (a.proj.rushRecYds ?? 0) || a.p.name.localeCompare(b.p.name);
    });
  const cols = [['name', 'Player'], ['gp', 'GP'], ...STATS.map((s) => [s, SHORT[s]])];
  const head = cols.map(([key, label]) =>
    `<th scope="col"${key === projectionSort ? ' aria-sort="descending"' : ''}><button data-psort="${key}">${label}</button></th>`).join('');
  const cell = (s, v) => (v === null || v === 0 ? '' : show(v, tenths(s)));
  const body = rows.map(({ p, proj }) => {
    const href = `#/team/${t.id}/player/${p.id}`;
    const pos = p.pos ? `<span class="pos">${esc(p.pos)}</span>` : '';
    return `<tr data-href="${href}"><td><a class="name" href="${href}"><span>${esc(p.name)}</span>${pos}</a></td><td>${p.gp}</td>
      ${STATS.map((s) => `<td>${cell(s, proj[s])}</td>`).join('')}</tr>`;
  }).join('');
  const table = rows.length
    ? `<div class="table-wrap sticky"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`
    : '<p class="message">No projections yet.</p>';
  return `${bar(`${t.name} projections`, `#/team/${t.id}`)}${modeSwitch(mode)}${table}`;
}

// 5. Player page: share % and projection per stat, two modes
function playerPage(t, p) {
  const mode = readMode();
  const cards = STATS.map((s) => {
    const r = playerStat({
      teamTotal: t.totals[s], teamGP: t.gp, playerTotal: p.totals[s],
      teamTotalInHisGames: p.teamTotalsInHisGames[s], playerGP: p.gp,
    }, mode, TENTHS_STATS.has(s));
    return `<div class="stat"><h3>${LONG[s]}</h3>
      <div class="figures">
        <div><b>${p.totals[s]}</b><span>Total</span></div>
        <div><b>${show(r.share, { suffix: '%' })}</b><span>Share</span></div>
        <div><b>${show(r.projection, tenths(s))}</b><span>Projection</span></div>
      </div>
      <p class="working">${working(p.totals[s], r)}</p></div>`;
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
  if (parts.length === 0) {
    html = teamsPage();
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
  const modeBtn = e.target.closest('[data-mode]');
  if (modeBtn) { saveMode(modeBtn.dataset.mode); render(); return; }
  const row = e.target.closest('tr[data-href]');
  if (row && !e.target.closest('a')) location.hash = row.dataset.href;
});

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

try {
  const res = await fetch('data/app-data.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(res.status);
  data = await res.json();
  render();
} catch {
  app.innerHTML = `<p class="message">Couldn't load the stats. Check your connection and try again.</p>`;
}
