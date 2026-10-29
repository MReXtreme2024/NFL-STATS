## Formula check, 2026 — latest week tested: REG-7

Smart steadying settings in config.json: pass 100, rush 25, rec 40, td 400.

### Latest week (REG-7)

| Option | Pass yds | Rush yds | Rec yds | Rec | TD | Overall vs All team games |
|---|---:|---:|---:|---:|---:|---:|
| All team games | 75.33 | 16.27 | 19.43 | 1.39 | 0.45 | 0.0% |
| Games he played | 65.70 | 15.77 | 20.06 | 1.32 | 0.47 | -2.6% |
| Smart | 68.12 | 15.20 | 19.85 | 1.37 | 0.41 | -5.0% |
| Smart+ (tracking) | 67.97 | 15.00 | 19.70 | 1.33 | 0.40 | -6.0% |
| Smart + market (tracking) | 70.03 | 15.06 | 19.85 | 1.37 | 0.40 | -4.8% |
| Claude's formula (upcoming games) | 67.33 | 15.58 | 18.34 | 1.40 | 0.39 | -6.6% |

Average miss per player per game (lower is better). Players scored: Pass yds 33, Rush yds 132, Rec yds 217, Rec 217, TD 151.

### Season so far (REG-3 to REG-7)

| Option | Pass yds | Rush yds | Rec yds | Rec | TD | Overall vs All team games |
|---|---:|---:|---:|---:|---:|---:|
| All team games | 72.44 | 14.97 | 20.53 | 1.61 | 0.51 | 0.0% |
| Games he played | 65.00 | 14.96 | 20.66 | 1.53 | 0.54 | -1.9% |
| Smart | 63.08 | 14.52 | 19.88 | 1.52 | 0.42 | -8.5% |
| Smart+ (tracking) | 62.11 | 14.50 | 19.80 | 1.51 | 0.42 | -9.1% |
| Smart + market (tracking) | 62.58 | 14.49 | 19.88 | 1.52 | 0.41 | -8.8% |
| Claude's formula (upcoming games) | 56.30 | 14.60 | 18.88 | 1.54 | 0.40 | -11.6% |

Average miss per player per game (lower is better). Players scored: Pass yds 159, Rush yds 653, Rec yds 1120, Rec 1123, TD 647.

### Smart settings check (season so far, overall vs All team games)

- pass: 50 → -8.5%, 100 → -8.5%, 200 → -8.4%, 400 → -8.2%
- rush: 10 → -8.5%, 25 → -8.5%, 50 → -8.5%, 100 → -8.4%
- rec: 10 → -8.4%, 20 → -8.4%, 40 → -8.5%, 80 → -8.5%
- td: 100 → -8.1%, 200 → -8.4%, 400 → -8.5%, 1000 → -8.5%

Keep the current settings: nothing tried beats them by half a percentage point or more (current -8.5%).

