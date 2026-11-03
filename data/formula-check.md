## Formula check, 2026 — latest week tested: REG-8

Smart steadying settings in config.json: pass 100, rush 25, rec 40, td 400.

### Latest week (REG-8)

| Option | Pass yds | Rush yds | Rec yds | Rec | TD | Overall vs All team games |
|---|---:|---:|---:|---:|---:|---:|
| All team games | 72.16 | 15.01 | 18.40 | 1.49 | 0.45 | 0.0% |
| Games he played | 71.91 | 15.56 | 19.90 | 1.45 | 0.45 | +2.0% |
| Smart | 71.84 | 15.23 | 19.40 | 1.40 | 0.43 | -0.6% |
| Smart+ (tracking) | 71.81 | 14.99 | 19.61 | 1.41 | 0.43 | -0.7% |
| Smart + market (tracking) | 72.38 | 14.94 | 19.40 | 1.40 | 0.43 | -1.1% |
| Claude's formula (upcoming games) | 65.03 | 14.87 | 18.54 | 1.48 | 0.42 | -3.1% |

Average miss per player per game (lower is better). Players scored: Pass yds 32, Rush yds 142, Rec yds 213, Rec 213, TD 157.

### Season so far (REG-3 to REG-8)

| Option | Pass yds | Rush yds | Rec yds | Rec | TD | Overall vs All team games |
|---|---:|---:|---:|---:|---:|---:|
| All team games | 72.39 | 14.98 | 20.18 | 1.59 | 0.50 | 0.0% |
| Games he played | 66.16 | 15.07 | 20.53 | 1.51 | 0.52 | -1.3% |
| Smart | 64.55 | 14.64 | 19.80 | 1.50 | 0.42 | -7.2% |
| Smart+ (tracking) | 63.74 | 14.58 | 19.77 | 1.49 | 0.42 | -7.7% |
| Smart + market (tracking) | 64.22 | 14.57 | 19.80 | 1.50 | 0.42 | -7.5% |
| Claude's formula (upcoming games) | 57.76 | 14.65 | 18.81 | 1.53 | 0.41 | -10.2% |

Average miss per player per game (lower is better). Players scored: Pass yds 191, Rush yds 795, Rec yds 1334, Rec 1337, TD 804.

### Smart settings check (season so far, overall vs All team games)

- pass: 50 → -7.1%, 100 → -7.2%, 200 → -7.1%, 400 → -7.0%
- rush: 10 → -7.1%, 25 → -7.2%, 50 → -7.2%, 100 → -7.1%
- rec: 10 → -7.0%, 20 → -7.0%, 40 → -7.2%, 80 → -7.2%
- td: 100 → -6.9%, 200 → -7.1%, 400 → -7.2%, 1000 → -7.2%

Keep the current settings: nothing tried beats them by half a percentage point or more (current -7.2%).

