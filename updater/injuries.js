// Injury report snapshot, saved for testing a playing-time formula later (not shown on the site).
//   node updater/injuries.js   saves data/injuries/<season>/<Melbourne date>-<time>.json
// Run by the Wednesday update (covers Thursday games) and the Saturday snapshot (after Friday's final reports).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getInjuries } from './espn.js';
import { isoIn } from './build.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));

async function main() {
  const now = new Date();
  const fetched = isoIn(now, config.timeZone); // e.g. "2026-10-31T09:07:12+11:00"
  const injuries = await getInjuries();
  const dir = path.join(ROOT, 'data', 'injuries', String(config.season));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${fetched.slice(0, 10)}-${fetched.slice(11, 16).replace(':', '')}.json`);
  fs.writeFileSync(file, JSON.stringify({ fetched, injuries }, null, 1) + '\n');
  const counts = {};
  injuries.forEach((i) => (counts[i.status] = (counts[i.status] ?? 0) + 1));
  console.log(`Saved ${path.relative(ROOT, file)}: ${injuries.length} players (${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')})`);
}

main().catch((err) => {
  console.error(`FAILED: ${err.message}`);
  process.exit(1);
});
