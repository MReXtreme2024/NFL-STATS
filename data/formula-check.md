## Formula check, 2026 — latest week tested: REG-12

Smart steadying settings in config.json: pass 100, rush 25, rec 40, td 400.

### Latest week (REG-12)

| Option | Pass yds | Rush yds | Rec yds | Rec | TD | Overall vs All team games |
|---|---:|---:|---:|---:|---:|---:|
| All team games | 117.10 | 12.51 | 18.07 | 1.37 | 0.42 | 0.0% |
| Games he played | 94.50 | 12.71 | 19.10 | 1.33 | 0.42 | -2.7% |
| Smart | 94.30 | 13.27 | 18.81 | 1.35 | 0.38 | -4.1% |
| Smart+ (tracking) | 85.80 | 13.05 | 18.44 | 1.28 | 0.35 | -8.3% |
| Smart + market (tracking) | 96.90 | 13.22 | 18.81 | 1.35 | 0.36 | -4.6% |
| Claude's formula (upcoming games) | 95.30 | 13.64 | 17.59 | 1.33 | 0.35 | -6.0% |

Average miss per player per game (lower is better). Players scored: Pass yds 10, Rush yds 59, Rec yds 81, Rec 81, TD 72.

### Season so far (REG-3 to REG-12)

| Option | Pass yds | Rush yds | Rec yds | Rec | TD | Overall vs All team games |
|---|---:|---:|---:|---:|---:|---:|
| All team games | 73.23 | 14.09 | 19.65 | 1.55 | 0.45 | 0.0% |
| Games he played | 64.74 | 14.03 | 19.79 | 1.45 | 0.48 | -2.4% |
| Smart | 63.27 | 13.81 | 19.34 | 1.44 | 0.40 | -7.1% |
| Smart+ (tracking) | 62.77 | 13.63 | 19.34 | 1.43 | 0.40 | -7.7% |
| Smart + market (tracking) | 63.67 | 13.75 | 19.34 | 1.44 | 0.40 | -7.3% |
| Claude's formula (upcoming games) | 57.94 | 13.68 | 18.48 | 1.48 | 0.37 | -10.4% |

Average miss per player per game (lower is better). Players scored: Pass yds 294, Rush yds 1291, Rec yds 2087, Rec 2090, TD 1399.

### Smart settings check (season so far, overall vs All team games)

- pass: 50 → -7.1%, 100 → -7.1%, 200 → -7.0%, 400 → -6.8%
- rush: 10 → -7.1%, 25 → -7.1%, 50 → -7.1%, 100 → -7.0%
- rec: 10 → -7.0%, 20 → -7.0%, 40 → -7.1%, 80 → -7.0%
- td: 100 → -6.9%, 200 → -7.0%, 400 → -7.1%, 1000 → -7.1%

Keep the current settings: nothing tried beats them by half a percentage point or more (current -7.1%).

