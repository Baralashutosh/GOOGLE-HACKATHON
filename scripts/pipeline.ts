/**
 * Run the whole mesh over the generated dataset. Run: npm run pipeline
 *
 * This is the honesty check on the entire thesis. If matching surplus against
 * shortage across a real district geography does not avert meaningful waste and
 * meaningful stockout-days, the idea is wrong and better to know now than on
 * stage. Writes mesh_output.json for the UI and prints the headline numbers.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fitForecast, project, assessRisk } from '../src/lib/forecast';
import { proposeTransfers, type Position } from '../src/lib/match';
import type { ConsumptionPoint, Drug, Facility, StockBatch } from '../src/lib/types';

const ROOT = join(import.meta.dirname, '..');
const GEN = join(ROOT, 'data', 'generated');
const AS_OF = '2026-08-17';

const key = (f: string, d: string) => `${f}|${d}`;

function readCsv(path: string): string[][] {
  const text = readFileSync(path, 'utf8').trim();
  const [, ...rows] = text.split('\n');   // drop the header line
  return rows.map((r) => r.trim().split(','));
}

console.log('loading...');
const facilities: Facility[] = JSON.parse(readFileSync(join(GEN, 'facilities.json'), 'utf8'));
const drugs: Drug[] = JSON.parse(readFileSync(join(ROOT, 'data', 'catalog', 'drugs.json'), 'utf8'));

const facilityMap = new Map(facilities.map((f) => [f.id, f]));
const drugMap = new Map(drugs.map((d) => [d.id, d]));

const batchesByPair = new Map<string, StockBatch[]>();
for (const [facility_id, drug_id, batch_no, quantity, expiry_date, last_counted_at] of
  readCsv(join(GEN, 'stock_batches.csv'))) {
  const k = key(facility_id, drug_id);
  const list = batchesByPair.get(k) ?? [];
  list.push({
    facilityId: facility_id, drugId: drug_id, batchNo: batch_no,
    quantity: Number(quantity), expiryDate: expiry_date,
    lastCountedAt: last_counted_at, source: 'simulated',
  });
  batchesByPair.set(k, list);
}

const historyByPair = new Map<string, ConsumptionPoint[]>();
for (const [facility_id, drug_id, date, units] of readCsv(join(GEN, 'consumption.csv'))) {
  const k = key(facility_id, drug_id);
  const list = historyByPair.get(k) ?? [];
  list.push({ facilityId: facility_id, drugId: drug_id, date, unitsDispensed: Number(units) });
  historyByPair.set(k, list);
}
console.log(`  ${facilities.length} facilities, ${drugs.length} drugs, ${historyByPair.size} pairs`);

console.log('forecasting and projecting...');
const positions: Position[] = [];
for (const [k, history] of historyByPair) {
  const [facilityId, drugId] = k.split('|');
  const batches = batchesByPair.get(k) ?? [];
  const forecast = fitForecast(history, AS_OF);
  const assessment = assessRisk(facilityId, drugId, batches, forecast, AS_OF);
  const { expiringLots } = project(batches, forecast, AS_OF);
  positions.push({ assessment, expiringLots, batches });
}

const tally = positions.reduce<Record<string, number>>((acc, p) => {
  acc[p.assessment.status] = (acc[p.assessment.status] ?? 0) + 1;
  return acc;
}, {});
console.log('  positions:', tally);

console.log('matching...');
const domestic = proposeTransfers(positions, facilityMap, drugMap, AS_OF);

/**
 * The BRICS tier, at the only altitude where it means anything.
 *
 * Facility-to-facility across 15,000km is not logistics, it is a slide. What is
 * real is NATIONAL pooling: one country's surplus of a molecule against
 * another's shortfall of the same molecule, joined on ATC code. Hemispheres
 * make this more than rhetoric, India's malaria peak is Brazil's trough, six
 * months out of phase, so the surpluses genuinely sit on opposite sides of the
 * calendar.
 */
function nationalBalances() {
  const bal = new Map<string, { surplus: number; deficit: number }>();
  for (const p of positions) {
    const f = facilityMap.get(p.assessment.facilityId);
    if (!f) continue;
    const k = `${f.country}|${p.assessment.drugId}`;
    const b = bal.get(k) ?? { surplus: 0, deficit: 0 };
    b.surplus += p.assessment.unitsAtRiskOfExpiry;
    if (p.assessment.daysToStockout !== null) {
      const shortfall = p.assessment.dailyDemand * 180 - p.assessment.onHand;
      if (shortfall > 0) b.deficit += Math.round(shortfall);
    }
    bal.set(k, b);
  }

  const opportunities: {
    drugId: string; drug: string; from: string; to: string; units: number;
  }[] = [];
  for (const d of drugs) {
    const rows = ['IN', 'BR', 'ZA'].map((c) => ({
      country: c, ...(bal.get(`${c}|${d.id}`) ?? { surplus: 0, deficit: 0 }),
    }));
    for (const donor of rows) {
      for (const recipient of rows) {
        if (donor.country === recipient.country) continue;
        const units = Math.min(donor.surplus, recipient.deficit);
        if (units > 1000) {
          opportunities.push({
            drugId: d.id, drug: d.inn,
            from: donor.country, to: recipient.country, units,
          });
        }
      }
    }
  }
  // A donor's surplus is often the binding constraint, so the same units can
  // appear as available to two different recipients. Reporting both would imply
  // India can ship one carton of amoxicillin to Brazil AND to South Africa.
  // Keep the strongest pairing per molecule; these are alternatives, not a sum.
  const best = new Map<string, (typeof opportunities)[number]>();
  for (const o of opportunities) {
    const prev = best.get(o.drugId);
    if (!prev || o.units > prev.units) best.set(o.drugId, o);
  }
  return [...best.values()].sort((a, b) => b.units - a.units);
}

const brics = nationalBalances();

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const wasteAverted = sum(domestic.map((p) => p.wasteAvertedUnits));
const stockoutDays = sum(domestic.map((p) => p.stockoutDaysAverted));
const crossDistrict = domestic.filter((p) => p.crossesDistrict).length;
const totalExpiring = sum(positions.map((p) => p.assessment.unitsAtRiskOfExpiry));

console.log('\n================ MESH RESULT ================');
console.log(`proposals                 ${domestic.length}`);
console.log(`  crossing a district     ${crossDistrict} (${pct(crossDistrict, domestic.length)}%)`);
console.log(`units of waste averted    ${wasteAverted.toLocaleString()}`);
console.log(`  of ${totalExpiring.toLocaleString()} units projected to expire  = ${pct(wasteAverted, totalExpiring)}% recovered`);
console.log(`stockout-days averted     ${stockoutDays.toLocaleString()}`);
console.log(`facilities helped         ${new Set(domestic.map((p) => p.toFacilityId)).size} of ${facilities.length}`);

console.log('\nBRICS national pooling (ATC-matched, surplus vs shortfall):');
for (const o of brics.slice(0, 6)) {
  console.log(`  ${o.from} -> ${o.to}   ${o.units.toLocaleString().padStart(9)} units  ${o.drug}`);
}

console.log('\ntop proposals:');
for (const p of domestic.slice(0, 6)) {
  const from = facilityMap.get(p.fromFacilityId)!;
  const to = facilityMap.get(p.toFacilityId)!;
  const d = drugMap.get(p.drugId)!;
  console.log(
    `  [${String(p.score).padStart(3)}] ${p.quantity.toLocaleString().padStart(7)} x ${d.inn}`
    + `\n        ${from.name} (${from.admin2})  ->  ${to.name} (${to.admin2})`
    + `\n        ${p.distanceKm}km, batch ${p.batchNo} expires ${p.expiryDate},`
    + ` averts ${p.stockoutDaysAverted} stockout-days`);
}

writeFileSync(join(GEN, 'mesh_output.json'), JSON.stringify({
  asOf: AS_OF,
  summary: {
    proposals: domestic.length,
    crossDistrict,
    wasteAvertedUnits: wasteAverted,
    totalUnitsExpiring: totalExpiring,
    recoveryRatePct: Number(pct(wasteAverted, totalExpiring)),
    stockoutDaysAverted: stockoutDays,
    facilitiesHelped: new Set(domestic.map((p) => p.toFacilityId)).size,
    positionTally: tally,
  },
  bricsPooling: brics,
  proposals: domestic,
}, null, 2));
console.log('\nwrote data/generated/mesh_output.json');

function pct(a: number, b: number): string {
  return b === 0 ? '0.0' : ((100 * a) / b).toFixed(1);
}
