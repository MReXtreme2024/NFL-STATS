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
