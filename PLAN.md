# NFL Team Stats App — Build Plan

Oct 21, 2026 · @Nate Sutton

## How to use this plan

Hand this whole plan to Claude Code; it builds the app one phase at a time and stops whenever it needs you.

**For Nate**

1. Download this doc as Markdown and save it as `PLAN.md` in a new empty folder (for example `nfl-stats`).
2. If you don't have a GitHub account yet, make a free one at github.com.
3. Open Claude Code in that folder and type: *Read PLAN.md and build this app one phase at a time. I'm not a developer, so explain each step simply.*
4. When Claude Code asks you to sign in or click a setting, do it, then tell it you're done.

**For Claude Code: how to work with Nate**

- Nate is not a developer. Explain each step in plain English before doing it, and run every command yourself.
- Ask Nate only for what only he can do: sign-ins, approvals and GitHub settings. Give exact click-by-click steps.
- Ask before anything that costs money, creates an account or makes something public. Everything in this plan is free.
- Nate may already have the NBA version of this app (repo `nba-stats`). If it exists, reuse its look, page layout and maths file as the starting point, but keep the two apps separate.
- Build exactly this spec. Suggest extras at the end of a phase; don't add them unasked.
- Copy this plan into the repo as `PLAN.md`, and write a short `CLAUDE.md` holding the Maths rules and Data source rules so later sessions follow them.
- At the end of each phase, show Nate the result and get his OK before starting the next.

## What we're building

A personal, phone-friendly NFL website that updates itself every Wednesday at 12:00am Melbourne time with every team's and player's 2026 totals, regular season and playoffs.

The ten stats tracked everywhere: Passing attempts, Passing completions, Passing yards, Rushing attempts, Rushing yards, Rushing + receiving yards, Targets, Receptions, Receiving yards, Touchdowns.

- **Teams** — all 32 teams, each shown in its team colour.
- **Team page** — games played and the ten season totals with averages, plus a **Games** button and a **Players** button.
- **Games** — one row per game: Opponent, then the ten stats.
- **Players** — everyone who recorded any of the ten stats for the team, with games played and totals.
- **Player page** — share % and projection for each stat, with a switch between *All team games* and *Games he played*.

Each Wednesday a free GitHub job pulls the week's box scores from ESPN, rebuilds the totals and republishes the site. Nothing runs on Nate's computer.

&#91;embedded content: how the weekly update works · 4 parts\]

ESPN is the only data source. The weekly job and the saved stats live free on GitHub, and Nate just opens the app.

## Decisions already made

These are settled; build to them rather than revisiting them.

| Decision | Choice | Why |
| --- | --- | --- |
| Data source | ESPN's free public JSON API, no key | Same as the NBA app: works from GitHub's servers and has every stat needed, plus team colours. |
| Season | 2026 regular season (9 Sep 2026 to 10 Jan 2027, US dates) plus the playoffs through Super Bowl LXI on 14 Feb 2027; no preseason | As asked ([dates](https://en.wikipedia.org/wiki/2026_NFL_season)). |
| Playoffs | Playoff games add to the same season totals; the Games table tags them WC, DIV, CONF or SB | One set of numbers, and Nate can still see which games were playoffs. |
| Update time | 12:00am Australia/Melbourne every Wednesday, daylight saving handled | Monday night games finish by Tuesday afternoon Melbourne time; GitHub schedules accept a time zone ([source](https://github.com/github/docs/commit/1ead651)). |
| Hosting | Its own public GitHub repo (`nfl-stats`): Actions runs the weekly job, Pages serves the site | Free, works on phone and computer, and Nate's PC can stay off. |
| Privacy | The site link is public but unlisted | NFL stats aren't sensitive. Confirm with Nate before publishing. |
| Formulas | Same as the NBA app: share % and projection, in both *All team games* and *Games he played* modes | Nate's choice. |
| Decimals | Cut, never round, at every step; whole numbers everywhere except touchdowns | Nate's choice. |
| Touchdowns | Every TD a player scores: rushing, receiving, kick and punt returns, and defensive returns. TD averages and projections keep one decimal | Nate's choice; whole numbers would make almost every TD projection 0. |

## Data source: ESPN

Two kinds of call do everything: a scoreboard per week to find the games, then a summary per game for its box score.

| What | URL |
| --- | --- |
| Season calendar, current week, team colours | `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard` |
| Games in one week | `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=2026&seasontype=2&week=6` |
| One game's box score | `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=<eventId>` |

Confirm the query parameters on a real request before relying on them.

**Which games count**

- ESPN season types: 1 preseason, 2 regular season, 3 postseason ([ESPN calendar](https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard)). Keep 2 and 3 only.
- Regular season is weeks 1–18. Postseason weeks are 1 Wild Card, 2 Divisional, 3 Conference Championships, 4 Super Bowl.
- Keep only games between two of the 32 teams. The Pro Bowl game has been scrapped ([source](https://en.wikipedia.org/wiki/2026_NFL_season)), but this rule guards against any all-star or exhibition event.
- Finished games only (`status.type.completed` is true). Postponed games are picked up once they are final.
- Games abroad (London, Paris, Madrid and others) count normally; ESPN marks them `neutralSite`.
- ESPN labels this season 2026, the year it starts.

**Box-score fields.** `boxscore.players[]` has one entry per team. Each holds `statistics[]` categories (passing, rushing, receiving, kick returns, punt returns, defensive, interceptions and so on), each with labels and a `stats` list per athlete in the same order. Map by label or key, never by position. Confirm every name below on a real 2026 box score before writing the parser.

| Stat | Expected source |
| --- | --- |
| Passing attempts and completions | passing `C/ATT`, text like "24/34" |
| Passing yards | passing `YDS` (the passer's gross yards) |
| Rushing attempts and yards | rushing `CAR` and `YDS` |
| Targets | receiving `TGTS` |
| Receptions and receiving yards | receiving `REC` and `YDS` |
| Rushing + receiving yards | rushing `YDS` plus receiving `YDS` |
| Touchdowns | the `TD` column of the rushing, receiving, kick return, punt return and defensive categories |

**Quirks**

- **Passing yards:** never use ESPN's team net passing yards; they subtract sack yards. Build every team total from player lines so player shares add up to 100%.
- **Touchdowns:** a pick-six can appear under both defensive and interceptions. Count each TD once, then check: per team per game, player TDs must equal the touchdown plays in the summary's `scoringPlays`.
- **Negative yards:** rushing yards can go below zero (kneel-downs, losses). Keep the sign.
- **Targets:** if a 2026 box score has no targets column, stop and ask Nate before using another source.

**Team codes.** Use ESPN's abbreviations as shown (KC, LAR, JAX and so on).

**Be polite.** No key is needed. Send a normal browser User-Agent, pause about half a second between calls, and retry up to 3 times with growing waits. A weekly run is about 35 calls.

## Maths rules

All maths uses whole numbers and cuts the decimals at every step; touchdowns are the one exception and keep one decimal.

**Terms**

- **Cut** = drop the decimals, toward zero (17.9 → 17, −0.7 → 0). Never round.
- **Team GP** = the team's finished games, regular season plus playoffs. Bye weeks don't count.
- **Team total** = one stat summed over the team's games, built from player lines.
- **Team average** = cut(team total ÷ team GP). Touchdowns are cut to one decimal (16 ÷ 6 = 2.66 → 2.6).
- **Player GP** = games where ESPN's box score lists him with any of the ten stats (an attempt, carry, target or TD). Player totals count only games for this team.
- **Team total in his games** = the team's total for that stat over only the games he played.

**Formulas** (all ten stats)

| Mode | Share % | Projection |
| --- | --- | --- |
| *All team games* (Nate's formula, the default) | cut(100 ÷ team total × player total) | cut(team average × share %) |
| *Games he played* | cut(100 ÷ team total in his games × player total) | cut(team average × share %) |

Both modes use the full-season team average. Share % is always a whole number; TD projections keep one decimal.

In code, keep to this order and whole numbers only (tenths for touchdowns); the logic lives in `docs/calc.js`:

```js
const cut = (a, b) => Math.trunc(a / b) + 0;      // whole-number division toward zero; "+ 0" turns -0 into 0
const teamAvg    = cut(teamTotal, teamGP);         // 1500 ÷ 6 → 250
const sharePct   = cut(100 * playerTotal, base);   // base = teamTotal, or teamTotalInHisGames
const projection = cut(teamAvg * sharePct, 100);   // 250 × 92 ÷ 100 → 230

// touchdowns work in tenths
const tdAvg10  = cut(10 * teamTDs, teamGP);        // 160 ÷ 6 → 26, shown as 2.6
const tdProj10 = cut(tdAvg10 * sharePct, 100);     // 26 × 25 ÷ 100 → 6, shown as 0.6
```

Never multiply decimals. Floating-point error can turn an exact 1 into 0.9999, which cuts to 0.

**Zero cases.** Team GP 0 → show "—". A base total of 0 or less → share 0% and projection 0. In *Games he played* mode, player GP 0 → "—".

**Tests.** `tests/calc.test.js` must pass every case before any screen is built:

| Case | Inputs | Expected |
| --- | --- | --- |
| Team average | 1,500 passing yards over 6 games | 250 |
| Average is cut, not rounded | 101 rushing attempts over 6 games | 16 |
| Share, all team games | QB has 1,380 of the team's 1,500 passing yards | 92% |
| Projection, all team games | Team average 250, share 92% | 230 |
| Games he played | 30 targets in his 4 games, team had 140 targets in those games; team average 34 | 21%, projection 7 |
| Negative yards | Player −4 rushing yards of the team's 600 | 0%, projection 0 (never −0 or −1) |
| Touchdowns | Team 16 TDs over 6 games; player has 4 | Average 2.6, share 25%, projection 0.6 |
| No games yet | Team GP 0 | "—", no divide-by-zero error |

## Screens

Mobile-first: everything works at 375 px wide, and wide tables scroll sideways inside their own box with the first column fixed.

**1. Teams (home)**

- All 32 teams A–Z, each a full-width row in its ESPN team colour. Text is black or white, whichever reads better on that colour.
- Each row shows the team name and games played; tapping it opens the Team page.
- The header shows when the data was last checked, in Melbourne time (for example "Checked 12:03am Wed 28 Oct").
- A colour override in `config.json` lets Nate change any team's colour.

**2. Team page** — on the team colour, in the NBA app's wording style:

```text
<Team name>
Games played <GP>
Total passing attempts <total> (average <avg> passing attempts)
Total passing completions <total> (average <avg> completions)
Total passing yards <total> (average <avg> passing yards)
Total rushing attempts <total> (average <avg> rushing attempts)
Total rushing yards <total> (average <avg> rushing yards)
Total rushing and receiving yards <total> (average <avg> rush + rec yards)
Total targets <total> (average <avg> targets)
Total receptions <total> (average <avg> receptions)
Total receiving yards <total> (average <avg> receiving yards)
Total touchdowns <total> (average <avg, one decimal> touchdowns)
[ Games ]   [ Players ]
```

**3. Games**

- Columns in this order: Opponent, ATT, CMP, PASS YDS, CAR, RUSH YDS, R+R YDS, TGT, REC, REC YDS, TD.
- Opponent reads "vs KC" for a home game and "@ KC" for an away game. Beneath it in small text: the week ("Wk 6", or WC, DIV, CONF, SB for playoffs) and the Melbourne date.
- Newest game first.

**4. Players**

- Columns: Player, GP, then the same ten stat columns as Games, as season totals for this team only.
- Lists everyone with any of the ten stats for this team this season, with their position (QB, RB, WR, TE) when ESPN provides it.
- Sorted by R+R YDS, highest first; tapping a column heading re-sorts by it (PASS YDS for quarterbacks).
- Tapping a player opens the Player page.

**4b. Projections** (added at Nate's request after the plan)

- A third button on the Team page. Columns Player, GP, then projections for PASS YDS, RUSH YDS, REC YDS, REC and TD only (changed 22 Oct 2026).
- A projection shows if it is 1 or more (TDs: 0.1 or more), otherwise it is blank; players with nothing to show are left off.
- Uses the same *All team games* / *Games he played* switch as the Player page (and the remembered choice). Sorted by PASS YDS projection (ties by rushing + receiving yards); tapping a heading re-sorts; tapping a player opens the Player page.

**Decimals change** (Nate, 22 Oct 2026, replaces "cut at every step" in Maths rules): the projection formula keeps every decimal and only the final projection is cut, to a whole number (20.56 → 20) or one decimal for touchdowns. Averages and share % are shown with 2 decimals, cut. Worked examples are now: 1,500 ÷ 6 → 250.00; 1,380 of 1,500 → 92.00%, projection 230; games he played 30 of 140, team average 34 → 21.42%, projection 7; −4 of 600 → −0.66%, projection 0; TDs 4 of 16 over 6 games → average 2.66, 25.00%, projection 0.6. See `CLAUDE.md` and `tests/calc.test.js`.

**4c. Upcoming games** (added at Nate's request, 22 Oct 2026)

- A button at the top of the Teams screen opens the next week's games that haven't started, with Melbourne start times.
- Tapping a game shows, for each of PASS YDS, RUSH YDS, REC YDS, REC and TD, the two teams' players side by side, sorted by projection, showing only projections of 1 or more (TDs 0.1 or more). Only players on each team's current roster are included. Uses the same mode switch.

**4d. Smart projections** (added at Nate's request, 26 Oct 2026)

- A third option on the switch, **Smart**, next to *All team games* and *Games he played*, on the Player, Projections and Matchup pages.
- Projection = opportunities a game × steadied efficiency (rules in `CLAUDE.md`). Chosen by testing on Weeks 3–6 and checked on Week 7:
  about 8% smaller misses than *All team games*, mostly from touchdowns and passing yards.
- Each Wednesday after the update, `node updater/backtest.js` re-tests all three options on the latest week and the season so far,
  and Claude reports the result to Nate; settings change only with his OK.

**4e. Formula research tracking** (added at Nate's request, 26 Oct 2026)

- The Wednesday formula check also tracks two ideas not on the site, *Smart+* and *Smart + market* (betting lines from ESPN's game data).
- ESPN's injury report is saved every Wednesday and Saturday, to test a playing-time formula once a few weeks are collected.

**5. Player page**

- Header: the player's name on the team colour, and "Played X of Y team games".
- A switch at the top: **All team games** (default) or **Games he played**. The phone remembers the last choice.
- One row per stat showing player total, share % and projection in large text, with the working beneath in small text:
  - Passing yards: `100 ÷ 1500 × 1380 = 92% · 250 × 92% = 230`
  - Touchdowns: `100 ÷ 16 × 4 = 25% · 2.6 × 25% = 0.6`

**Everywhere**

- A back button on every page, tap targets at least 44 px, readable in light and dark mode.
- Installable on the home screen: a web app manifest with a plain football icon, no NFL or team logos.

## Weekly update and hosting

A GitHub Actions workflow runs every Wednesday at 12:00am Melbourne time, adds the week's finished games, checks the numbers and republishes the site.

```yaml
on:
  schedule:
    - cron: '0 0 * * 3'                 # Wednesday 12:00am
      timezone: 'Australia/Melbourne'   # GitHub adjusts for daylight saving
  workflow_dispatch:                    # adds a "Run workflow" button for manual updates
```

By then the NFL week is over: Monday night games finish by Tuesday afternoon Melbourne time. Runs at the top of the hour often start 5–30 minutes late ([guide](https://cronuru.com/guides/github-actions-scheduled-workflows)), which doesn't matter here.

**Each run**

1. Read ESPN's season calendar from the default scoreboard and find the latest 2 weeks that have started (regular season or postseason).
2. Fetch each of those weeks' scoreboards and keep the finished games that count (rules in Data source).
3. Fetch the box score for every kept game not yet saved. Re-fetch last week's games too, so stat corrections made later in the week are picked up.
4. Save each game as a trimmed file, `data/games/2026/<eventId>.json`: week, season type, date, teams, home/away, final score, scoring plays and every player's full box-score lines.
5. Rebuild `docs/data/app-data.json` from all saved games and stamp the check time.
6. Hard checks, which stop the run without publishing: 32 teams present; no team's GP went down; no team above 17 regular-season games; per team per game, player receptions equal player completions.
7. Soft checks, which publish anyway but end the run as failed so GitHub emails Nate the details: player TDs match the touchdown scoring plays; player rushing yards match ESPN's team rushing yards; player passing yards equal ESPN's team net passing yards plus sack yards.
8. Commit the changed files, then deploy `docs/` with GitHub's official Pages actions.

The check time is committed every week, even in the off-season. The site always shows when it last checked, and the repo never sits idle: GitHub silently pauses schedules in public repos after 60 days without activity ([guide](https://cronuru.com/guides/github-actions-scheduled-workflows)).

The first run backfills every finished game from Week 1. The same script with `--weeks 1-6` re-checks any weeks on demand.

**Hosting**

- A public repo under Nate's account, for example `nfl-stats`. GitHub Pages serves the `docs/` folder at `https://<username>.github.io/nfl-stats/`.
- No secrets: ESPN needs no key. The workflow's built-in token gets only `contents: write`, `pages: write` and `id-token: write`.

## Project structure and tech stack

The same stack as the NBA app: JavaScript on Node.js, with no frameworks, no build step and no npm packages.

- **Updater**: Node.js scripts (current LTS) using the built-in `fetch`.
- **Site**: plain HTML, CSS and JavaScript in `docs/`, reading `data/app-data.json`.
- **Maths**: `docs/calc.js`, one ES module shared by the site and the tests.
- **Tests**: Node's built-in runner, `node --test`.
- **Automation and hosting**: GitHub Actions and GitHub Pages.

```text
nfl-stats/
├── PLAN.md                    this plan
├── CLAUDE.md                  short rules for future Claude Code sessions
├── README.md                  plain-English guide for Nate
├── config.json                season, colour overrides
├── updater/
│   ├── update.js              weekly entry point (--weeks 1-6)
│   ├── espn.js                ESPN calls, retries, parsing
│   ├── build.js               saved games → app-data.json
│   └── checks.js              hard and soft checks
├── data/games/2026/           one trimmed JSON file per finished game
├── docs/                      the website GitHub Pages serves
│   ├── index.html  app.js  style.css  calc.js
│   ├── manifest.webmanifest  icon-192.png  icon-512.png
│   └── data/app-data.json     rebuilt weekly
├── tests/
│   ├── calc.test.js           the worked examples
│   └── build.test.js          totals and TDs from a saved sample game
└── .github/workflows/weekly.yml
```

**Shape of `app-data.json`** (numbers shown as 0 are placeholders):

```json
{
  "season": 2026,
  "checked": "2026-10-28T00:03:00+11:00",
  "teams": [{
    "id": "12", "code": "KC", "name": "Kansas City Chiefs",
    "colour": "#e31837", "textColour": "#ffffff", "gp": 0,
    "totals": { "passAtt": 0, "passCmp": 0, "passYds": 0, "rushAtt": 0, "rushYds": 0,
                "rushRecYds": 0, "targets": 0, "rec": 0, "recYds": 0, "td": 0 },
    "games": [{ "week": 6, "type": "REG", "date": "2026-10-19", "opp": "LAC", "home": true,
                "stats": { "passAtt": 0 } }],
    "players": [{ "id": "from ESPN", "name": "from ESPN", "pos": "QB", "gp": 0,
                  "totals": { "passAtt": 0 },
                  "teamTotalsInHisGames": { "passAtt": 0 } }]
  }]
}
```

Every stats object holds the same ten keys as `totals`. `type` is REG, WC, DIV, CONF or SB.

## Build order

Seven phases. Finish each phase's check, show Nate the result, then move on.

1. **Set up.** Install Node.js LTS, Git and the GitHub CLI if missing. Sign Nate in to GitHub, create the public `nfl-stats` repo, and add `PLAN.md` and `CLAUDE.md`. If the NBA app exists, copy its page layout, styles and `calc.js` as the starting point.
   - Done when: the repo is on GitHub with both files.
2. **Fetch games.** Write `espn.js` and `update.js`. First inspect one real 2026 box score and confirm every field in Data source, including targets. Then backfill Weeks 1–6.
   - Done when: every finished 2026 game so far is saved, and all hard checks pass.
3. **Build totals.** Write `build.js` to produce `app-data.json`, with touchdowns gathered from every category.
   - Done when: two teams' totals match ESPN's box scores, checked by hand with Nate, and the TD check passes for every game.
4. **Maths and tests.** Write `calc.js` and the tests in Maths rules.
   - Done when: `node --test` passes every case.
5. **Screens.** Build the five screens on the real data.
   - Done when: everything works at 375 px wide and on Nate's phone.
6. **Weekly job and publishing.** Add the workflow, the checks and the Pages deploy. Confirm with Nate before the site goes public.
   - Done when: a manual run succeeds, the live site shows the new check time, and the next Wednesday run also succeeds.
7. **Hand over.** Write `README.md` in plain English: the site link, adding it to the home screen, running an update by hand, and what a failure email means.
   - Done when: the app is on Nate's home screen.

Adding it to the home screen: on iPhone, open the link in Safari, then Share → Add to Home Screen. On Android, open it in Chrome, then the ⋮ menu → Add to Home screen.

## Edge cases and maintenance

- **Byes**: a bye week adds no game, so GP counts games, not weeks.
- **Traded or released players**: stats stay with the team they were earned for, so a player can appear on two teams' lists with separate totals.
- **Players with no touches**: blockers, and anyone without an attempt, carry, target or TD, don't appear; such games don't count toward that player's GP.
- **Postponed games**: counted once ESPN marks them final; the 2-week look-back (or `--weeks`) catches them.
- **Stat corrections**: last week's games are re-fetched every run.
- **Odd days**: Wednesday, Christmas and Saturday games fall inside their NFL week, so the next Wednesday run picks them up.
- **ESPN changes its format**: the run fails and Nate gets an email. Ask Claude Code to compare a fresh ESPN response with a saved game file and update `espn.js`; the saved games mean nothing is lost.
- **Off-season**: no games after Super Bowl LXI on 14 Feb 2027. The weekly check-time commit keeps the schedule alive; if GitHub ever pauses it, re-enable it in the repo's Actions tab.
- **Next season**: change the season in `config.json` (2027). Old seasons' game files stay as history.

## Sources

- [ESPN NFL scoreboard JSON](https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard): 2026 calendar, season types, week numbers, team colours, neutral-site games
- [Wikipedia: 2026 NFL season](https://en.wikipedia.org/wiki/2026_NFL_season): season and playoff dates, Super Bowl LXI, Pro Bowl ending
- [GitHub Docs change adding `timezone` to schedules](https://github.com/github/docs/commit/1ead651)
- [Cronuru: GitHub Actions schedules, delays and the 60-day pause](https://cronuru.com/guides/github-actions-scheduled-workflows)
