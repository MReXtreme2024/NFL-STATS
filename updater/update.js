// Weekly entry point.
//   node updater/update.js              latest 2 started weeks (first run backfills from Week 1)
//   node updater/update.js --weeks 1-6  re-check regular-season weeks 1 to 6
// Exit code 0: all good. 1: a hard check or ESPN failed, nothing to publish. 2: soft check failed, still publish.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getTeams, getRoster, getCalendar, getWeekEvents, getSummary, isCountedGame, isUpcomingGame, trimGame, trimUpcoming,
} from './espn.js';
import { checkGame } from './checks.js';
import { build } from './build.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const DATA_DIR = path.join(ROOT, 'data');
const GAMES_DIR = path.join(DATA_DIR, 'games', String(config.season));
const POSITIONS = path.join(DATA_DIR, 'positions.json');

const LOOK_BACK_WEEKS = 2;
const SOFT_FAIL = 2; // exit code: publish anyway, then fail the run so Nate gets an email (1 = hard failure)

function parseArgs(argv) {
  const i = argv.indexOf('--weeks');
  if (i === -1) return {};
  const m = /^(\d+)(?:-(\d+))?$/.exec(argv[i + 1] ?? '');
  if (!m) throw new Error('Use --weeks 1-6 (or a single week, --weeks 4)');
  const from = Number(m[1]);
  const to = Number(m[2] ?? m[1]);
  if (from < 1 || to > 18 || from > to) throw new Error('Regular-season weeks run 1 to 18');
  return { from, to };
}

// Write only when the content changed, so unchanged games don't show up as edits.
function writeJson(file, value) {
  const text = JSON.stringify(value, null, 2) + '\n';
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return true;
}

const readJson = (file, fallback) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback);

function savedGames() {
  return fs
    .readdirSync(GAMES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => readJson(path.join(GAMES_DIR, f)));
}

const weekLabel = ({ seasonType, week }) => (seasonType === 2 ? `Week ${week}` : `Postseason week ${week}`);

async function main() {
  const weeksArg = parseArgs(process.argv.slice(2));
  fs.mkdirSync(GAMES_DIR, { recursive: true });
  const firstRun = savedGames().length === 0;

  console.log('Teams list');
  const teams = await getTeams();
  writeJson(path.join(DATA_DIR, 'teams.json'), teams);
  const teamIds = new Set(teams.map((t) => t.id));

  // Which weeks to fetch. Every game in them is (re-)fetched, so stat corrections are picked up.
  let weeks;
  let calendar = null;
  if (weeksArg.from) {
    weeks = [];
    for (let w = weeksArg.from; w <= weeksArg.to; w++) weeks.push({ seasonType: 2, week: w });
  } else {
    calendar = await getCalendar();
    if (calendar.year !== config.season) {
      console.log(`ESPN's calendar is for ${calendar.year}, not ${config.season}: no weeks to fetch.`);
      weeks = [];
    } else {
      const started = calendar.weeks.filter((w) => new Date(w.start) <= new Date());
      weeks = firstRun ? started : started.slice(-LOOK_BACK_WEEKS);
    }
  }

  let saved = 0;
  let unchanged = 0;
  for (const w of weeks) {
    const events = await getWeekEvents(config.season, w.seasonType, w.week);
    const kept = events.filter((e) => isCountedGame(e, config.season, teamIds));
    console.log(`${weekLabel(w)}: ${events.length} games listed, ${kept.length} finished`);
    for (const event of kept) {
      const game = trimGame(await getSummary(event.id));
      try {
        checkGame(game);
      } catch (err) {
        if (!err.incomplete) throw err;
        console.warn(`  skipped ${event.id}: ${err.message}; kept the saved copy (if any), will try again next run`);
        continue;
      }
      const [a, b] = game.teams;
      if (writeJson(path.join(GAMES_DIR, `${event.id}.json`), game)) {
        saved++;
        console.log(`  saved ${event.id}  ${a.code} ${a.score} - ${b.score} ${b.code}`);
      } else {
        unchanged++;
      }
    }
  }
  console.log(`Done: ${saved} game files saved or updated, ${unchanged} unchanged.`);

  // The next week with games that haven't started, for the Upcoming games screen.
  calendar ??= await getCalendar();
  let upcoming = { label: '', games: [] };
  if (calendar.year === config.season) {
    for (const w of calendar.weeks.filter((x) => new Date(x.end) > new Date()).slice(0, 2)) {
      const games = (await getWeekEvents(config.season, w.seasonType, w.week))
        .filter((e) => isUpcomingGame(e, config.season, teamIds))
        .map(trimUpcoming);
      if (games.length) {
        upcoming = { label: weekLabel(w), games };
        break;
      }
    }
  }
  writeJson(path.join(DATA_DIR, 'upcoming.json'), upcoming);
  console.log(`Upcoming: ${upcoming.games.length} games${upcoming.label ? ` in ${upcoming.label}` : ''}`);

  // Positions from every team's current roster. Earlier positions are kept, so a player
  // released or traded mid-season still shows the position he had. The current rosters are
  // also saved, so upcoming-game projections leave out players who have moved on.
  console.log('Rosters (positions)');
  const positions = readJson(POSITIONS, {});
  const rosters = {};
  for (const t of teams) {
    const roster = await getRoster(t.id);
    Object.assign(positions, roster.positions);
    rosters[t.id] = roster.ids;
  }
  writeJson(POSITIONS, Object.fromEntries(Object.entries(positions).sort(([a], [b]) => a.localeCompare(b))));
  writeJson(path.join(DATA_DIR, 'rosters.json'), rosters);

  const { data, problems } = build();
  console.log(`Hard checks passed. Built app-data.json: ${data.teams.length} teams, checked ${data.checked}`);
  if (problems.length) {
    problems.forEach((p) => console.error(`SOFT CHECK: ${p}`));
    console.error(`${problems.length} soft check(s) failed: the site data was still rebuilt.`);
    process.exitCode = SOFT_FAIL;
  }
}

main().catch((err) => {
  console.error(`FAILED: ${err.message}`);
  process.exit(1);
});
