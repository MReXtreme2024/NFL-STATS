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

The weekly run is at **12:07am** Wednesday, Australia/Melbourne (`cron: '7 0 * * 3'`), not 12:00am as in PLAN.md. Nate approved the move because GitHub delays or drops jobs scheduled exactly on the hour (the NBA app's first midnight run started about 5 hours late).
