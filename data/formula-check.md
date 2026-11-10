## Formula check, 2026 — latest week tested: REG-9

Smart steadying settings in config.json: pass 100, rush 25, rec 40, td 400.

### Latest week (REG-9)

| Option | Pass yds | Rush yds | Rec yds | Rec | TD | Overall vs All team games |
|---|---:|---:|---:|---:|---:|---:|
| All team games | 60.53 | 11.55 | 18.08 | 1.30 | 0.37 | 0.0% |
| Games he played | 53.68 | 11.01 | 17.56 | 1.14 | 0.42 | -3.9% |
| Smart | 47.32 | 11.02 | 17.62 | 1.14 | 0.37 | -8.3% |
| Smart+ (tracking) | 53.35 | 10.85 | 17.59 | 1.13 | 0.37 | -7.0% |
| Smart + market (tracking) | 50.06 | 10.98 | 17.62 | 1.14 | 0.36 | -7.8% |
| Claude's formula (upcoming games) | 50.38 | 11.10 | 17.17 | 1.27 | 0.33 | -7.9% |

Average miss per player per game (lower is better). Players scored: Pass yds 34, Rush yds 149, Rec yds 233, Rec 233, TD 173.

### Season so far (REG-3 to REG-9)

| Option | Pass yds | Rush yds | Rec yds | Rec | TD | Overall vs All team games |
|---|---:|---:|---:|---:|---:|---:|
| All team games | 70.60 | 14.44 | 19.87 | 1.55 | 0.47 | 0.0% |
| Games he played | 64.27 | 14.43 | 20.09 | 1.46 | 0.50 | -1.6% |
| Smart | 61.95 | 14.07 | 19.47 | 1.45 | 0.41 | -7.3% |
| Smart+ (tracking) | 62.17 | 14.00 | 19.44 | 1.44 | 0.41 | -7.6% |
| Smart + market (tracking) | 62.08 | 14.00 | 19.47 | 1.45 | 0.41 | -7.5% |
| Claude's formula (upcoming games) | 56.65 | 13.93 | 18.57 | 1.49 | 0.38 | -10.6% |

Average miss per player per game (lower is better). Players scored: Pass yds 225, Rush yds 944, Rec yds 1567, Rec 1570, TD 977.

### Smart settings check (season so far, overall vs All team games)

- pass: 50 → -7.2%, 100 → -7.3%, 200 → -7.2%, 400 → -7.1%
- rush: 10 → -7.3%, 25 → -7.3%, 50 → -7.3%, 100 → -7.2%
- rec: 10 → -7.2%, 20 → -7.2%, 40 → -7.3%, 80 → -7.3%
- td: 100 → -7.1%, 200 → -7.2%, 400 → -7.3%, 1000 → -7.3%

Keep the current settings: nothing tried beats them by half a percentage point or more (current -7.3%).

