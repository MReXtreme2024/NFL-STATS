## Formula check, 2026 — latest week tested: REG-10

Smart steadying settings in config.json: pass 100, rush 25, rec 40, td 400.

### Latest week (REG-10)

| Option | Pass yds | Rush yds | Rec yds | Rec | TD | Overall vs All team games |
|---|---:|---:|---:|---:|---:|---:|
| All team games | 88.28 | 13.20 | 21.18 | 1.63 | 0.41 | 0.0% |
| Games he played | 75.86 | 12.95 | 20.61 | 1.43 | 0.43 | -5.1% |
| Smart | 77.00 | 13.38 | 20.24 | 1.41 | 0.40 | -6.5% |
| Smart+ (tracking) | 74.28 | 12.90 | 20.42 | 1.45 | 0.40 | -7.1% |
| Smart + market (tracking) | 75.97 | 13.08 | 20.24 | 1.41 | 0.39 | -7.5% |
| Claude's formula (upcoming games) | 77.52 | 13.10 | 19.85 | 1.49 | 0.37 | -7.8% |

Average miss per player per game (lower is better). Players scored: Pass yds 29, Rush yds 144, Rec yds 222, Rec 222, TD 171.

### Season so far (REG-3 to REG-10)

| Option | Pass yds | Rush yds | Rec yds | Rec | TD | Overall vs All team games |
|---|---:|---:|---:|---:|---:|---:|
| All team games | 72.62 | 14.27 | 20.03 | 1.56 | 0.47 | 0.0% |
| Games he played | 65.59 | 14.23 | 20.15 | 1.45 | 0.49 | -2.1% |
| Smart | 63.67 | 13.98 | 19.57 | 1.44 | 0.41 | -7.2% |
| Smart+ (tracking) | 63.55 | 13.85 | 19.56 | 1.44 | 0.41 | -7.5% |
| Smart + market (tracking) | 63.67 | 13.88 | 19.57 | 1.44 | 0.40 | -7.6% |
| Claude's formula (upcoming games) | 59.03 | 13.83 | 18.73 | 1.49 | 0.38 | -10.2% |

Average miss per player per game (lower is better). Players scored: Pass yds 254, Rush yds 1088, Rec yds 1789, Rec 1792, TD 1148.

### Smart settings check (season so far, overall vs All team games)

- pass: 50 → -7.2%, 100 → -7.2%, 200 → -7.1%, 400 → -7.0%
- rush: 10 → -7.2%, 25 → -7.2%, 50 → -7.2%, 100 → -7.1%
- rec: 10 → -7.1%, 20 → -7.1%, 40 → -7.2%, 80 → -7.2%
- td: 100 → -7.0%, 200 → -7.1%, 400 → -7.2%, 1000 → -7.2%

Keep the current settings: nothing tried beats them by half a percentage point or more (current -7.2%).

