/**
 * Self-check for medicine name matching. Run: npm run check
 *
 * This is the highest-consequence function in the codebase. Everything else
 * fails visibly: a bad forecast shows a wrong date, a bad transfer shows a
 * strange distance. A bad name match silently sends the wrong molecule to a
 * clinic and looks completely normal on screen.
 *
 * Both directions are asserted, and the false-positive half matters more.
 * A missed match costs a human thirty seconds of review. A wrong match costs a
 * patient the wrong medicine.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { matchDrug } from './gemini';
import type { Drug } from './types';

const drugs: Drug[] = JSON.parse(
  readFileSync(join(process.cwd(), 'data', 'catalog', 'drugs.json'), 'utf8'));

let n = 0;
const ok = (s: string) => { n++; console.log(`  ok  ${s}`); };

console.log('\nmedicine name matching');

/* Must match: the ways a real person writes or says a medicine. */
const SHOULD_MATCH: [string, string][] = [
  // The bare molecule. A live voice test caught this failing: Dice alone
  // scored "insulin" at 0.5 against "Insulin (human, soluble)" and dropped it.
  ['Insulin', 'd_insulin'],
  ['insulin', 'd_insulin'],
  ['ORS', 'd_ors'],
  ['Amoxicillin', 'd_amoxicillin'],
  // As written on an Indian register.
  ['Human Insulin 40IU/ml', 'd_insulin'],
  ['ORS Sachet', 'd_ors'],
  ['RH FDC (TB)', 'd_rhz_fdc'],
  ['Polyvalent Anti-Snake Venom', 'd_asv'],
  // Portuguese, with accents.
  ['Sais de Reidratação Oral (SRO)', 'd_ors'],
  ['Soro Antiofídico Polivalente', 'd_asv'],
  ['Sulfato de Magnésio', 'd_magnesium_sulfate'],
  ['Ocitocina 5UI', 'd_oxytocin'],
  ['Rifampicina + Isoniazida', 'd_rhz_fdc'],
  // Transcription wobble.
  ['Amoxicilina 500mg', 'd_amoxicillin'],
  ['Paracetamol 500', 'd_paracetamol'],
  ['anti-snake venom', 'd_asv'],
];

for (const [written, expected] of SHOULD_MATCH) {
  const r = matchDrug(written, drugs);
  assert.equal(r.drugId, expected,
    `"${written}" matched ${r.drugId ?? 'nothing'}, expected ${expected}`);
}
ok(`${SHOULD_MATCH.length} real-world spellings resolve to the right medicine`);

/* Must NOT match. A confident substitution is the failure that ends a pilot. */
const SHOULD_NOT_MATCH = [
  'vitamin C',    // the single letter C prefix-matched Ceftriaxone at 0.74
  'C',
  'aspirin',
  'banana',
  'saline',
  'cough syrup',
  'multivitamin',
  '',
];

for (const written of SHOULD_NOT_MATCH) {
  const r = matchDrug(written, drugs);
  assert.equal(r.drugId, null,
    `"${written}" wrongly matched ${r.drugId} at confidence ${r.confidence}`);
}
ok(`${SHOULD_NOT_MATCH.length} non-catalogue names correctly refused`);

/* A fuller name must outrank a bare one when both are present, so the
   catalogue entry that actually describes the product wins. */
{
  const bare = matchDrug('Insulin', drugs).confidence;
  const full = matchDrug('Insulin (human, soluble)', drugs).confidence;
  assert.ok(full > bare, `full name (${full}) should outrank bare (${bare})`);
  ok(`a fuller name outranks a bare one (${full.toFixed(2)} over ${bare.toFixed(2)})`);
}

/* Nothing should ever match above the commit threshold by accident. */
{
  const junk = ['xyz', 'tablet', '500mg', 'injection'];
  for (const j of junk) {
    const r = matchDrug(j, drugs);
    assert.ok(r.confidence < 0.75,
      `"${j}" reached commit confidence ${r.confidence} on ${r.drugId}`);
  }
  ok('dosage words and junk never reach commit confidence');
}

console.log(`\n${n} checks passed`);
