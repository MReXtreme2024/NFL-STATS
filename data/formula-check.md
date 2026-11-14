## Formula check, 2026 — latest week tested: REG-10

Smart steadying settings in config.json: pass 100, rush 25, rec 40, td 400.

### Latest week (REG-10)

| Option | Pass yds | Rush yds | Rec yds | Rec | TD | Overall vs All team games |
|---|---:|---:|---:|---:|---:|---:|
| All team games | 145.67 | 13.88 | 23.07 | 1.93 | 0.40 | 0.0% |
| Games he played | 119.67 | 12.75 | 24.07 | 1.71 | 0.42 | -5.7% |
| Smart | 117.67 | 11.63 | 23.21 | 1.57 | 0.43 | -9.0% |
| Smart+ (tracking) | 115.33 | 11.88 | 24.29 | 1.71 | 0.44 | -6.1% |
| Smart + market (tracking) | 118.67 | 11.50 | 23.21 | 1.57 | 0.44 | -8.6% |
| Claude's formula (upcoming games) | 65.00 | 14.88 | 23.36 | 1.64 | 0.41 | -11.9% |

Average miss per player per game (lower is better). Players scored: Pass yds 3, Rush yds 8, Rec yds 14, Rec 14, TD 12.

### Season so far (REG-3 to REG-10)

| Option | Pass yds | Rush yds | Rec yds | Rec | TD | Overall vs All team games |
|---|---:|---:|---:|---:|---:|---:|
| All team games | 71.59 | 14.43 | 19.89 | 1.55 | 0.47 | 0.0% |
| Games he played | 65.00 | 14.41 | 20.12 | 1.46 | 0.50 | -1.7% |
| Smart | 62.68 | 14.05 | 19.51 | 1.45 | 0.41 | -7.3% |
| Smart+ (tracking) | 62.87 | 13.98 | 19.49 | 1.44 | 0.41 | -7.6% |
| Smart + market (tracking) | 62.82 | 13.98 | 19.51 | 1.45 | 0.41 | -7.6% |
| Claude's formula (upcoming games) | 56.76 | 13.94 | 18.61 | 1.49 | 0.38 | -10.7% |

Average miss per player per game (lower is better). Players scored: Pass yds 228, Rush yds 952, Rec yds 1581, Rec 1584, TD 989.

### Smart settings check (season so far, overall vs All team games)

- pass: 50 → -7.3%, 100 → -7.3%, 200 → -7.3%, 400 → -7.1%
- rush: 10 → -7.3%, 25 → -7.3%, 50 → -7.3%, 100 → -7.3%
- rec: 10 → -7.2%, 20 → -7.2%, 40 → -7.3%, 80 → -7.3%
- td: 100 → -7.1%, 200 → -7.3%, 400 → -7.3%, 1000 → -7.3%

Keep the current settings: nothing tried beats them by half a percentage point or more (current -7.3%).

