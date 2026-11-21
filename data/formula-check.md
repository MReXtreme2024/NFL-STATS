## Formula check, 2026 — latest week tested: REG-11

Smart steadying settings in config.json: pass 100, rush 25, rec 40, td 400.

### Latest week (REG-11)

| Option | Pass yds | Rush yds | Rec yds | Rec | TD | Overall vs All team games |
|---|---:|---:|---:|---:|---:|---:|
| All team games | 39.33 | 15.86 | 14.19 | 1.75 | 0.29 | 0.0% |
| Games he played | 42.33 | 17.07 | 13.06 | 1.38 | 0.34 | +0.1% |
| Smart | 46.00 | 15.43 | 15.88 | 1.38 | 0.31 | +2.4% |
| Smart+ (tracking) | 50.33 | 14.86 | 15.94 | 1.44 | 0.33 | +5.7% |
| Smart + market (tracking) | 45.00 | 13.93 | 15.88 | 1.38 | 0.29 | -1.9% |
| Claude's formula (upcoming games) | 41.00 | 12.57 | 12.75 | 1.44 | 0.23 | -13.3% |

Average miss per player per game (lower is better). Players scored: Pass yds 3, Rush yds 14, Rec yds 16, Rec 16, TD 14.

### Season so far (REG-3 to REG-11)

| Option | Pass yds | Rush yds | Rec yds | Rec | TD | Overall vs All team games |
|---|---:|---:|---:|---:|---:|---:|
| All team games | 72.23 | 14.29 | 19.98 | 1.56 | 0.46 | 0.0% |
| Games he played | 65.32 | 14.27 | 20.09 | 1.45 | 0.49 | -2.0% |
| Smart | 63.46 | 14.00 | 19.54 | 1.44 | 0.41 | -7.1% |
| Smart+ (tracking) | 63.40 | 13.86 | 19.53 | 1.44 | 0.41 | -7.4% |
| Smart + market (tracking) | 63.45 | 13.88 | 19.54 | 1.44 | 0.40 | -7.5% |
| Claude's formula (upcoming games) | 58.82 | 13.81 | 18.67 | 1.49 | 0.38 | -10.3% |

Average miss per player per game (lower is better). Players scored: Pass yds 257, Rush yds 1102, Rec yds 1805, Rec 1808, TD 1162.

### Smart settings check (season so far, overall vs All team games)

- pass: 50 → -7.1%, 100 → -7.1%, 200 → -7.1%, 400 → -6.9%
- rush: 10 → -7.1%, 25 → -7.1%, 50 → -7.1%, 100 → -7.1%
- rec: 10 → -7.0%, 20 → -7.0%, 40 → -7.1%, 80 → -7.1%
- td: 100 → -6.9%, 200 → -7.1%, 400 → -7.1%, 1000 → -7.2%

Keep the current settings: nothing tried beats them by half a percentage point or more (current -7.1%).

