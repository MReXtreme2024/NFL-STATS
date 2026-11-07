## Formula check, 2026 — latest week tested: REG-9

Smart steadying settings in config.json: pass 100, rush 25, rec 40, td 400.

### Latest week (REG-9)

| Option | Pass yds | Rush yds | Rec yds | Rec | TD | Overall vs All team games |
|---|---:|---:|---:|---:|---:|---:|
| All team games | 25.00 | 16.75 | 16.78 | 1.11 | 0.29 | 0.0% |
| Games he played | 82.00 | 15.92 | 17.78 | 0.89 | 0.32 | +43.4% |
| Smart | 46.50 | 15.67 | 17.72 | 0.89 | 0.28 | +12.5% |
| Smart+ (tracking) | 56.00 | 14.83 | 18.11 | 0.83 | 0.27 | +17.5% |
| Smart + market (tracking) | 61.00 | 15.58 | 17.72 | 0.89 | 0.24 | +20.8% |
| Claude's formula (upcoming games) | 71.50 | 13.67 | 15.56 | 0.94 | 0.23 | +24.9% |

Average miss per player per game (lower is better). Players scored: Pass yds 2, Rush yds 12, Rec yds 18, Rec 18, TD 13.

### Season so far (REG-3 to REG-9)

| Option | Pass yds | Rush yds | Rec yds | Rec | TD | Overall vs All team games |
|---|---:|---:|---:|---:|---:|---:|
| All team games | 71.90 | 15.00 | 20.13 | 1.58 | 0.49 | 0.0% |
| Games he played | 66.32 | 15.08 | 20.49 | 1.50 | 0.52 | -1.2% |
| Smart | 64.36 | 14.66 | 19.77 | 1.49 | 0.42 | -7.1% |
| Smart+ (tracking) | 63.66 | 14.59 | 19.74 | 1.48 | 0.42 | -7.6% |
| Smart + market (tracking) | 64.19 | 14.58 | 19.77 | 1.49 | 0.41 | -7.5% |
| Claude's formula (upcoming games) | 57.91 | 14.45 | 18.77 | 1.52 | 0.39 | -10.9% |

Average miss per player per game (lower is better). Players scored: Pass yds 193, Rush yds 807, Rec yds 1352, Rec 1355, TD 817.

### Smart settings check (season so far, overall vs All team games)

- pass: 50 → -7.1%, 100 → -7.1%, 200 → -7.0%, 400 → -6.9%
- rush: 10 → -7.1%, 25 → -7.1%, 50 → -7.1%, 100 → -7.1%
- rec: 10 → -6.9%, 20 → -7.0%, 40 → -7.1%, 80 → -7.1%
- td: 100 → -6.8%, 200 → -7.0%, 400 → -7.1%, 1000 → -7.1%

Keep the current settings: nothing tried beats them by half a percentage point or more (current -7.1%).

