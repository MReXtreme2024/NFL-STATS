# NFL Team Stats App — rules for Claude Code

The full spec is in `PLAN.md`. Build exactly that; suggest extras, don't add them unasked.
The owner, Nate, is not a developer: explain steps in plain English and run commands yourself.
Build one phase at a time and get Nate's OK before starting the next.

## Maths rules

Nate changed these on 22 Oct 2026 (same change as the NBA app); they replace PLAN.md's "cut at every step" rule.

- All maths is done in **whole numbers** (no floating-point), so results are exact. Never multiply decimals.
- **Cut** = drop decimals toward zero: 17.9 → 17, −0.7 → 0. Never round, and never show −0.
- Team GP = the team's finished games, regular season plus playoffs. Byes don't count.
- Team total = one stat summed over the team's games, **built from player lines** (never ESPN's team net passing yards).
- Player GP = games where ESPN's box score lists him with any of the ten stats (attempt, carry, target or TD). Player totals count only games for that team.
- **The projection formula keeps every decimal; only the final projection is cut**: to a whole number (20.56 → 20), or to **one decimal for touchdowns** (1.86 → 1.8).
- **Shown** averages (TDs included) and share % have **2 decimals, cut**: 16.83, 21.42%.
- Logic lives in `docs/calc.js`; shown figures are held as whole hundredths (2142 = 21.42), TD projections as tenths (18 = 1.8):

  ```js
  const cut = (a, b) => (a - (a % b)) / b + 0;                 // whole-number division toward zero; "+ 0" turns -0 into 0
  const teamAvg100 = cut(100 * teamTotal, teamGP);             // 101 over 6 → 1683, shown 16.83
  const share100   = cut(10000 * playerTotal, base);           // base = teamTotal (All team games) or teamTotalInHisGames (Games he played)
  const projection = cut(teamTotal * playerTotal, teamGP * base);       // = team average × share with every decimal kept
  const tdProj10   = cut(10 * teamTDs * playerTDs, teamGP * base);      // touchdowns: tenths, 18 → shown 1.8
  ```

- Both modes use the full-season team average.
- Zero cases: team GP 0 → "—". Base total 0 or less → share 0.00%, projection 0. "Games he played" mode with player GP 0 → "—".
- Negative yards keep their sign: −4 of 600 is −0.66%, projection 0; −40 of 600 projects −6.
- **Projections page** (Team page's third button): only Passing yards, Rushing yards, Receiving yards, Receptions and Touchdowns. A projection shows if it is 1 or more (TDs: 0.1 or more), otherwise it is blank; players with nothing to show are left off. Uses the remembered mode switch; sorted by PASS YDS (ties by rushing + receiving yards); headings re-sort; rows open the Player page. The Player page keeps all ten stats.
- `tests/calc.test.js` (run with `node --test`) must pass before any screen work.

## Smart formula (third option on the switch, added 26 Oct 2026 at Nate's request)

- Projection = his opportunities a game (in games he played) × his **steadied** rate, where the rate is pulled
  toward the league rate as if he'd had K extra league-average opportunities:
  `opps × (made × leagueOpps + K × leagueMade) ÷ (GP × (opps + K) × leagueOpps)`, worked in BigInt, cut like every projection.
- Opportunities and K (K values live in `config.json` → `smartFormula`): pass yds and completions per pass attempt (pass 100);
  rush yds per carry (rush 25); rec yds and receptions per target (rec 40); TDs per carry + target (td 400).
  Attempts, carries and targets: his average in his games. Rush + rec yds = rushing + receiving, added before the cut.
- League totals = all saved games, built into `app-data.json` → `smart.league`. Logic in `docs/calc.js` (`smartStat`); tests in `tests/smart.test.js`.
- Nate's own two modes are unchanged; never change his formula or the Smart settings without his OK.

## Weekly formula check (Nate asked for this every Wednesday)

- After each Wednesday update, pull `main`, run `node updater/backtest.js --out data/formula-check.md`, commit that file,
  and report to Nate in plain English: how All team games, Games he played and Smart did last week and season to date,
  and whether new Smart settings or a new formula idea did better. Try new ideas in a scratch folder first.
- Suggest only. Change `config.json` or any formula only after Nate says yes.
- The report also has two **tracking** rows (in `updater/backtest.js` only, not on the site), added 26 Oct 2026 at Nate's request:
  **Smart+** (recent share of team opportunities × team opportunities a game × steadied opponent allowance) and
  **Smart + market** (TDs scaled by the betting line's expected team points; passing/rushing nudged by expected lead).
  Watch them against Smart for a few weeks; suggest a new site option only if one keeps winning on both the latest week and the season.
- Each saved game keeps ESPN's betting line (`odds`: home spread and over/under, from the summary's `pickcenter`) for this check.

## Injury reports (for a future playing-time formula)

- `node updater/injuries.js` saves ESPN's league injury report (`.../football/nfl/injuries`, everyone not Active) to
  `data/injuries/<season>/<Melbourne date>-<time>.json`. It runs in every weekly-job run (a failure doesn't stop the update).
- Claude's formula uses the latest saved report (see below).

## Claude's formula (upcoming games, added 26 Oct 2026 at Nate's request, like the NBA app's)

- Upcoming games and matchup pages have **Your formula / Claude's formula** tabs (remembered). Your formula = Nate's
  matchup page exactly as before (with his mode switch). Logic in `updater/model.js`, built into `app-data.json` →
  `upcoming.games[].claude` by `build.js`; tests in `tests/model.test.js`. Ordinary decimals, shown cut (yards whole, the rest one decimal).
- Team score: 90% betting market's expected points (from the game's line on the scoreboard), 10% points model
  (scored and allowed, pulled toward league average with 4 games, ±0.75 home edge). Also shows team passing, rushing and TDs.
- Players: expected passes, carries and targets (this season + last season counted as 1, ½ and 1 extra games) ×
  efficiency pulled toward his own last season (`data/prior/<last season>.json`, from `node updater/priors.js`) and the league.
  Only the expected starting QB (most passes in the team's last two games, not ruled out) throws. Out, Doubtful, IR,
  suspended and PUP players are removed, their carries and targets shared at the same position, then carries and targets
  scaled to the team's usual totals (±20%). TDs = (carries + targets) × steadied scoring rate × (expected points ÷ usual)^0.5.
  Questionable players stay, tagged Q.
- Weekly formula check scores it as "Claude's formula (upcoming games)", using the game's betting line and treating a QB who
  played in the team's last two games but not that week as Out (stand-in for the injury report).
- Each new season: run `node updater/priors.js <last season>` (from ESPN, or `--dir` saved games) before Week 1.

## Data source rules

- ESPN's free public JSON API is the **only** source. No key.
  - Calendar / current week / team colours: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`
  - One week: `.../scoreboard?dates=2026&seasontype=2&week=6`
  - Box score: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=<eventId>`
  - Positions (box scores have none): `.../teams/<teamId>/roster`, merged into `data/positions.json` each run so released or traded players keep theirs.
- Season types: keep 2 (regular, weeks 1–18) and 3 (postseason: 1 WC, 2 DIV, 3 CONF, 4 SB). Never 1 (preseason).
- Keep only finished games (`status.type.completed`) between two of the 32 teams. Neutral-site games count normally.
- ESPN labels this season 2026. Use ESPN's team abbreviations as given (KC, LAR, JAX…).
- Map box-score stats by label/key, never by position. Passing `C/ATT` is text like "24/34".
- Touchdowns: rushing, receiving, kick return, punt return and defensive TD columns. Count each TD once (a pick-six can show under both defensive and interceptions).
- No targets column in a box score → stop and ask Nate before using any other source.
- Be polite: browser User-Agent, ~0.5 s between calls, up to 3 retries with growing waits.
- Hard checks (stop the run, don't publish): 32 teams; no team GP goes down; no team above 17 regular-season games; per team per game, player receptions = player completions.
- Soft checks (publish, but fail the run so Nate gets an email): player TDs = touchdown scoring plays; player rushing yards = ESPN team rushing yards; player passing yards = ESPN team net passing yards + sack yards.

## Tech

Node.js (LTS) built-ins only: no frameworks, no npm packages, no build step. Site is plain HTML/CSS/JS in `docs/`.
The NBA app (`MReXtreme2024/nba-stats`) is the starting point for look, layout and `calc.js`, but the two apps stay separate.

## Schedule

The weekly run is at **12:07am** Wednesday, Australia/Melbourne (`cron: '7 0 * * 3'`), not 12:00am as in PLAN.md,
plus **9:07am Saturday** (`cron: '7 9 * * 6'`, added 26 Oct 2026) so injury reports and betting lines are fresh before Sunday's games. Nate approved the move because GitHub delays or drops jobs scheduled exactly on the hour (the NBA app's first midnight run started about 5 hours late).

## Upcoming games

Added at Nate's request (22 Oct 2026). Each run saves the next calendar week with games that haven't started (`status.type.state === 'pre'`, regular season or playoffs, two of the 32 teams) to `data/upcoming.json`, and every team's current roster ids to `data/rosters.json`. The home screen's **Upcoming games** button lists them ("vs" for neutral sites); tapping one shows a matchup page with, for each of PASS YDS, RUSH YDS, REC YDS, REC and TD, both teams' players side by side, sorted by projection, showing only projections of 1 or more (TDs 0.1 or more). Players are those on the current roster who have played for the team (all players if the roster is unknown). Same maths and remembered mode switch as everywhere else. On a matchup page, swiping left/right (or the ‹ › arrows) moves to the next/previous upcoming game, wrapping round; it replaces the history entry so Back returns to the list (added 29 Oct 2026).

## Confirm inactives (added 29 Oct 2026 at Nate's request)

- Matchup pages have a **Confirm inactives** button. The last step of Claude's formula lives in `docs/claude.js` (`allocateSide`), shared by `updater/model.js` (`prepareSide` makes the inputs, `claudeSide` = both) and the app; each side of `upcoming.games[].claude` keeps its `inputs` (rates as `rate100`, all to 3 decimals; the site's figures are worked from the same rounded inputs). The phone re-runs `allocateSide(inputs, inactive)` with Nate's list (`{ home: [id], away: [id] }`, localStorage `inactives:<gameId>`, removed once the game leaves the upcoming list); it replaces the injury report. Nate's tab drops inactive players.
- Replacement QB (Nate approved 29 Oct 2026): when the usual starting QB (most passes in the last two games) is out — injury report or Nate's inactives — the QB who takes over gets at least the team's usual passes a game (`teamAvg.passAtt`). Season pass-yds miss 59.43 → 56.30; Claude's formula overall −10.7% → −11.6% vs All team games.
