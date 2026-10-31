## Formula check, 2026 — latest week tested: REG-8

Smart steadying settings in config.json: pass 100, rush 25, rec 40, td 400.

### Latest week (REG-8)

| Option | Pass yds | Rush yds | Rec yds | Rec | TD | Overall vs All team games |
|---|---:|---:|---:|---:|---:|---:|
| All team games | 42.50 | 7.09 | 10.65 | 1.65 | 0.51 | 0.0% |
| Games he played | 42.50 | 5.09 | 17.88 | 1.65 | 0.44 | +5.2% |
| Smart | 40.50 | 7.73 | 16.88 | 1.53 | 0.38 | +6.3% |
| Smart+ (tracking) | 42.00 | 8.27 | 16.29 | 1.59 | 0.37 | +7.5% |
| Smart + market (tracking) | 51.00 | 8.18 | 16.88 | 1.53 | 0.37 | +11.9% |
| Claude's formula (upcoming games) | 35.50 | 8.27 | 13.59 | 1.71 | 0.42 | +2.6% |

Average miss per player per game (lower is better). Players scored: Pass yds 2, Rush yds 11, Rec yds 17, Rec 17, TD 13.

### Season so far (REG-3 to REG-8)

| Option | Pass yds | Rush yds | Rec yds | Rec | TD | Overall vs All team games |
|---|---:|---:|---:|---:|---:|---:|
| All team games | 72.07 | 14.84 | 20.37 | 1.61 | 0.51 | 0.0% |
| Games he played | 64.72 | 14.80 | 20.61 | 1.53 | 0.53 | -1.9% |
| Smart | 62.80 | 14.41 | 19.83 | 1.52 | 0.42 | -8.4% |
| Smart+ (tracking) | 61.86 | 14.39 | 19.75 | 1.51 | 0.42 | -8.9% |
| Smart + market (tracking) | 62.43 | 14.38 | 19.83 | 1.52 | 0.41 | -8.7% |
| Claude's formula (upcoming games) | 56.04 | 14.50 | 18.78 | 1.54 | 0.40 | -11.4% |

Average miss per player per game (lower is better). Players scored: Pass yds 161, Rush yds 664, Rec yds 1138, Rec 1141, TD 660.

### Smart settings check (season so far, overall vs All team games)

- pass: 50 → -8.4%, 100 → -8.4%, 200 → -8.3%, 400 → -8.1%
- rush: 10 → -8.4%, 25 → -8.4%, 50 → -8.4%, 100 → -8.3%
- rec: 10 → -8.3%, 20 → -8.3%, 40 → -8.4%, 80 → -8.4%
- td: 100 → -8.0%, 200 → -8.3%, 400 → -8.4%, 1000 → -8.4%

Keep the current settings: nothing tried beats them by half a percentage point or more (current -8.4%).

