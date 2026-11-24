## Formula check, 2026 — latest week tested: REG-11

Smart steadying settings in config.json: pass 100, rush 25, rec 40, td 400.

### Latest week (REG-11)

| Option | Pass yds | Rush yds | Rec yds | Rec | TD | Overall vs All team games |
|---|---:|---:|---:|---:|---:|---:|
| All team games | 63.83 | 13.38 | 17.10 | 1.54 | 0.38 | 0.0% |
| Games he played | 47.63 | 13.08 | 17.06 | 1.41 | 0.42 | -4.9% |
| Smart | 49.60 | 12.78 | 17.61 | 1.42 | 0.36 | -7.3% |
| Smart+ (tracking) | 48.43 | 12.17 | 17.82 | 1.41 | 0.36 | -8.3% |
| Smart + market (tracking) | 52.63 | 12.98 | 17.61 | 1.42 | 0.36 | -6.0% |
| Claude's formula (upcoming games) | 36.20 | 12.56 | 16.82 | 1.42 | 0.33 | -14.1% |

Average miss per player per game (lower is better). Players scored: Pass yds 30, Rush yds 144, Rec yds 217, Rec 217, TD 179.

### Season so far (REG-3 to REG-11)

| Option | Pass yds | Rush yds | Rec yds | Rec | TD | Overall vs All team games |
|---|---:|---:|---:|---:|---:|---:|
| All team games | 71.69 | 14.17 | 19.71 | 1.56 | 0.45 | 0.0% |
| Games he played | 63.70 | 14.10 | 19.82 | 1.45 | 0.48 | -2.3% |
| Smart | 62.18 | 13.84 | 19.36 | 1.44 | 0.40 | -7.2% |
| Smart+ (tracking) | 61.95 | 13.65 | 19.38 | 1.44 | 0.40 | -7.6% |
| Smart + market (tracking) | 62.50 | 13.78 | 19.36 | 1.44 | 0.40 | -7.4% |
| Claude's formula (upcoming games) | 56.62 | 13.68 | 18.52 | 1.48 | 0.37 | -10.6% |

Average miss per player per game (lower is better). Players scored: Pass yds 284, Rush yds 1232, Rec yds 2006, Rec 2009, TD 1327.

### Smart settings check (season so far, overall vs All team games)

- pass: 50 → -7.2%, 100 → -7.2%, 200 → -7.1%, 400 → -6.9%
- rush: 10 → -7.2%, 25 → -7.2%, 50 → -7.2%, 100 → -7.1%
- rec: 10 → -7.1%, 20 → -7.1%, 40 → -7.2%, 80 → -7.1%
- td: 100 → -7.0%, 200 → -7.1%, 400 → -7.2%, 1000 → -7.2%

Keep the current settings: nothing tried beats them by half a percentage point or more (current -7.2%).

