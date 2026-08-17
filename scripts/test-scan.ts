/**
 * Measure register extraction against ground truth. Run: npm run test:scan
 *
 * The demo claims Gemini can read a paper stock register well enough to move
 * medicine on. That claim is worth exactly as much as its error rate, so this
 * scores every field against the truth file written beside each image instead
 * of eyeballing the output and calling it good.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readRegister, REVIEW_THRESHOLD } from '../src/lib/gemini';
import type { Drug } from '../src/lib/types';

const ROOT = join(import.meta.dirname, '..');
const drugs: Drug[] = JSON.parse(
  readFileSync(join(ROOT, 'data', 'catalog', 'drugs.json'), 'utf8'));

interface TruthRow {
  row: number; drugId: string; writtenName: string;
  batchNo: string; expiry: string; balance: number;
}

const only = process.argv[2]?.toUpperCase();
const countries: string[] = only ? [only] : ['IN', 'BR', 'ZA'];

async function main() {
  let grandTotal = 0;
  let grandCorrect = 0;

  for (const code of countries) {
    const stem = `register_${code.toLowerCase()}`;
    const image = readFileSync(join(ROOT, 'public', 'samples', `${stem}.jpg`));
    const truth: { rows: TruthRow[] } = JSON.parse(
      readFileSync(join(ROOT, 'public', 'samples', `${stem}.truth.json`), 'utf8'));

    process.stdout.write(`\n${code}  reading ${stem}.jpg ... `);
    const started = Date.now();
    const result = await readRegister(
      image.toString('base64'), 'image/jpeg', `f_${code.toLowerCase()}_001`, drugs);
    console.log(`${((Date.now() - started) / 1000).toFixed(1)}s`);

    console.log(`   rows: found ${result.rows.length} of ${truth.rows.length}`);

    // Align on position. The model is told to skip blanks and read top to bottom,
    // so row order is the honest join key; matching on best-fit would flatter the
    // score by hiding rows read in the wrong order.
    const fields = { drug: 0, batch: 0, quantity: 0, expiry: 0 };
    const n = Math.min(result.rows.length, truth.rows.length);

    for (let i = 0; i < n; i++) {
      const got = result.rows[i];
      const want = truth.rows[i];
      if (got.drugId === want.drugId) fields.drug++;
      if (got.batchNo === want.batchNo) fields.batch++;
      if (got.quantity === want.balance) fields.quantity++;
      if (got.expiryDate?.slice(0, 7) === want.expiry) fields.expiry++;
    }

    const pct = (v: number) => `${((100 * v) / truth.rows.length).toFixed(0)}%`;
    console.log(`   drug matched   ${String(fields.drug).padStart(2)}/${truth.rows.length}  ${pct(fields.drug)}`);
    console.log(`   batch exact    ${String(fields.batch).padStart(2)}/${truth.rows.length}  ${pct(fields.batch)}`);
    console.log(`   quantity exact ${String(fields.quantity).padStart(2)}/${truth.rows.length}  ${pct(fields.quantity)}`);
    console.log(`   expiry month   ${String(fields.expiry).padStart(2)}/${truth.rows.length}  ${pct(fields.expiry)}`);

    const flagged = result.rows.filter((r) => r.confidence < REVIEW_THRESHOLD);
    console.log(`   held for human review: ${flagged.length}`);

    // The number that actually matters. A row is only safe to act on if every
    // field is right; three correct fields and a wrong quantity still ships the
    // wrong amount of medicine to a real clinic.
    let fullyCorrect = 0;
    for (let i = 0; i < n; i++) {
      const got = result.rows[i], want = truth.rows[i];
      if (got.drugId === want.drugId && got.batchNo === want.batchNo
        && got.quantity === want.balance
        && got.expiryDate?.slice(0, 7) === want.expiry) fullyCorrect++;
    }
    console.log(`   ROWS FULLY CORRECT  ${fullyCorrect}/${truth.rows.length}  ${pct(fullyCorrect)}`);

    grandTotal += truth.rows.length;
    grandCorrect += fullyCorrect;

    const wrong = [];
    for (let i = 0; i < n; i++) {
      const got = result.rows[i], want = truth.rows[i];
      const diffs = [];
      if (got.drugId !== want.drugId) diffs.push(`drug "${got.rawName}" -> ${got.drugId ?? 'unmatched'} (want ${want.drugId})`);
      if (got.batchNo !== want.batchNo) diffs.push(`batch ${got.batchNo} (want ${want.batchNo})`);
      if (got.quantity !== want.balance) diffs.push(`qty ${got.quantity} (want ${want.balance})`);
      if (got.expiryDate?.slice(0, 7) !== want.expiry) diffs.push(`expiry ${got.expiryDate} (want ${want.expiry})`);
      if (diffs.length) wrong.push(`     row ${i + 1}: ${diffs.join('; ')}`);
    }
    if (wrong.length) {
      console.log('   misses:');
      console.log(wrong.slice(0, 8).join('\n'));
    }
  }

  console.log(`\n=========================================`);
  console.log(`OVERALL  ${grandCorrect}/${grandTotal} rows fully correct  `
    + `(${((100 * grandCorrect) / grandTotal).toFixed(1)}%)`);

}

main();
