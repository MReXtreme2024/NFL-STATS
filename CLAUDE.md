# NFL Team Stats App — rules for Claude Code

The full spec is in `PLAN.md`. Build exactly that; suggest extras, don't add them unasked.
The owner, Nate, is not a developer: explain steps in plain English and run commands yourself.
Build one phase at a time and get Nate's OK before starting the next.

## Maths rules

- Whole numbers only. **Cut** = drop decimals toward zero (`Math.trunc`): 17.9 → 17, −0.7 → 0. Never round, never multiply decimals.
- Touchdowns are the one exception: their averages and projections keep one decimal, worked in **tenths** (whole numbers × 10).
- Team GP = the team's finished games, regular season plus playoffs. Byes don't count.
- Team total = one stat summed over the team's games, **built from player lines** (never ESPN's team net passing yards).
- Team average = cut(team total ÷ team GP).
- Player GP = games where ESPN's box score lists him with any of the ten stats (attempt, carry, target or TD). Player totals count only games for that team.
- Share % and projection, in this exact order (logic lives in `docs/calc.js`):

  ```js
  const cut = (a, b) => Math.trunc(a / b) + 0;       // "+ 0" turns -0 into 0
  const teamAvg    = cut(teamTotal, teamGP);
  const sharePct   = cut(100 * playerTotal, base);   // base = teamTotal (All team games) or teamTotalInHisGames (Games he played)
  const projection = cut(teamAvg * sharePct, 100);   // both modes use the full-season team average

  // touchdowns in tenths
  const tdAvg10  = cut(10 * teamTDs, teamGP);        // 26 → shown 2.6
  const tdProj10 = cut(tdAvg10 * sharePct, 100);     // 6  → shown 0.6
  ```

- Zero cases: team GP 0 → "—". Base total 0 or less → share 0%, projection 0. "Games he played" mode with player GP 0 → "—".
- Negative yards keep their sign in totals; a negative share cuts to 0, never −0 or −1.
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
