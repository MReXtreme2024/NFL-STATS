import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, chanceOver, lineAt } from '../docs/lines.js';
import { learn } from '../updater/calibrate.js';

// Misses shaped like a bell curve (good enough for a test).
const bell = Array.from({ length: 101 }, (_, i) => {
  const p = Math.min(0.995, Math.max(0.005, i / 100));
  const t = Math.sqrt(-2 * Math.log(p < 0.5 ? p : 1 - p));
  const z = t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t ** 3);
  return p < 0.5 ? -z : z;
});
const yards = { bias: 1, k: 20, shape: bell };
const tds = { bias: 1, poisson: true };

test('yards: about 50% at the projection; higher shares give lower lines', () => {
  assert.ok(Math.abs(chanceOver(60.5, 60.5, yards) - 0.5) < 0.05);
  const lines = LEVELS.map((v) => lineAt(60, yards, v));
  for (let i = 1; i < lines.length; i++) assert.ok(lines[i] >= lines[i - 1]);
  assert.ok(Math.abs(chanceOver(60, lineAt(60, yards, 0.8), yards) - 0.8) <= 0.05);
  assert.equal(lineAt(60, null, 0.5), null);
});

test('touchdowns: whole-number counts, so most shares have no line', () => {
  // 0.5 projected TDs: chance of scoring = 1 − e^−0.5 ≈ 39%
  assert.ok(Math.abs(chanceOver(0.5, 0.5, tds) - (1 - Math.exp(-0.5))) < 1e-12);
  assert.equal(lineAt(0.5, tds, 0.4), 0.5);
  assert.equal(lineAt(0.5, tds, 0.9), null); // no TD line is 90% likely
});

test('learning: lean from results; touchdowns kept as a count', () => {
  const records = [];
  for (let i = 0; i < 100; i++) records.push({ stat: 'recYds', mu: 50, x: i % 2 ? 40 : 50 }, { stat: 'td', mu: 0.5, x: i % 4 ? 0 : 1 });
  const cal = learn(records);
  assert.ok(Math.abs(cal.recYds.bias - 0.9) < 1e-9);
  assert.equal(cal.recYds.shape.length, 101);
  assert.ok(cal.td.poisson);
  assert.ok(Math.abs(cal.td.bias - 0.5) < 1e-9);
  assert.equal(cal.passYds, null); // too few results
});

test("Claude's self-correction: the learned lean scales rushing, receiving and TDs, never passing", async () => {
  const { allocateSide } = await import('../docs/claude.js');
  const { leanOf } = await import('../updater/calibrate.js');
  const input = {
    score: 24, model: 24, market: 24, teamAvg: { passAtt: 30, rushAtt: 25, targets: 30 }, tdFactor: 1, scaleRange: [0.8, 1.2], listMinOpps: 2,
    rows: [{ id: 'qb', name: 'QB', pos: 'QB', group: 'QB', status: '', out: false, seasonPassAtt: 60, recentPasses: 60,
      exp: { passAtt: 30, rushAtt: 5, targets: 0 }, rate100: { passYds: 700, rushYds: 400, recYds: 0, rec: 0, td: 5 } },
    { id: 'rb', name: 'RB', pos: 'RB', group: 'RB', status: '', out: false, seasonPassAtt: 0, recentPasses: 0,
      exp: { passAtt: 0, rushAtt: 20, targets: 30 }, rate100: { passYds: 0, rushYds: 450, recYds: 800, rec: 65, td: 4 } }],
  };
  const raw = allocateSide(input);
  const lean = leanOf({ rushYds: { bias: 0.9 }, recYds: { bias: 0.95 }, td: { bias: 0.8 } });
  const fixed = allocateSide({ ...input, lean });
  const [r0, r1] = [raw.players.find((p) => p.id === 'rb'), fixed.players.find((p) => p.id === 'rb')];
  assert.ok(Math.abs(r1.rushYds - 0.9 * r0.rushYds) < 1e-9);
  assert.ok(Math.abs(r1.recYds - 0.95 * r0.recYds) < 1e-9);
  assert.ok(Math.abs(r1.td - 0.8 * r0.td) < 1e-9);
  assert.equal(r1.rec, r0.rec);
  assert.equal(fixed.players[0].passYds, raw.players[0].passYds);
  assert.equal(leanOf({ rushYds: { bias: 0.9 } }), null); // not learned yet: no correction
});
