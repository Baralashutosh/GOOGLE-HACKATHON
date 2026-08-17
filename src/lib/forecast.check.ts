/**
 * Self-check for the dual-clock engine.  Run: npm run check
 *
 * Not a test suite — one runnable thing that fails loudly if the logic that
 * the whole product rests on stops being true.
 */

import assert from 'node:assert/strict';
import { fitForecast, assessRisk } from './forecast';
import type { ConsumptionPoint, StockBatch } from './types';

const DAY_MS = 86_400_000;
const AS_OF = '2026-08-17';

function history(
  drugId: string,
  days: number,
  shape: (dayOfYear: number) => number,
): ConsumptionPoint[] {
  const end = Date.parse(AS_OF);
  const out: ConsumptionPoint[] = [];
  for (let i = days; i > 0; i--) {
    const t = end - i * DAY_MS;
    const d = new Date(t);
    const doy = Math.floor((t - Date.UTC(d.getUTCFullYear(), 0, 1)) / DAY_MS);
    out.push({
      facilityId: 'f_test',
      drugId,
      date: d.toISOString().slice(0, 10),
      unitsDispensed: Math.max(0, Math.round(shape(doy))),
    });
  }
  return out;
}

function batch(qty: number, expiryDaysFromNow: number): StockBatch {
  return {
    facilityId: 'f_test',
    drugId: 'd_test',
    batchNo: `B${expiryDaysFromNow}`,
    quantity: qty,
    expiryDate: new Date(Date.parse(AS_OF) + expiryDaysFromNow * DAY_MS)
      .toISOString().slice(0, 10),
    lastCountedAt: AS_OF,
    source: 'simulated',
  };
}

let checks = 0;
const ok = (label: string) => { checks++; console.log(`  ok  ${label}`); };

console.log('dual-clock engine');

// --- the forecaster must see the season, since season-blindness is the bug ---
{
  // Monsoon-shaped demand: peaks around day 213, floor of 10, peak of ~110.
  const seasonal = history('d_al_fdc', 540, (doy) =>
    10 + 50 * (1 + Math.cos((2 * Math.PI * (doy - 213)) / 365)));
  const f = fitForecast(seasonal, AS_OF);

  const peak = Math.max(...f.seasonalIndex);
  const trough = Math.min(...f.seasonalIndex);
  assert.ok(peak / trough > 3,
    `forecaster flattened a strongly seasonal series (peak/trough = ${(peak / trough).toFixed(2)})`);
  ok(`detects seasonality (peak/trough ${(peak / trough).toFixed(1)}x)`);

  const mean = f.seasonalIndex.reduce((a, b) => a + b, 0) / f.seasonalIndex.length;
  assert.ok(Math.abs(mean - 1) < 0.01, `seasonal index must average 1, got ${mean}`);
  ok('seasonal index normalised');

  // A flat series must NOT acquire a season out of noise.
  const flat = fitForecast(history('d_metformin', 540, () => 40), AS_OF);
  const flatSpread = Math.max(...flat.seasonalIndex) / Math.min(...flat.seasonalIndex);
  assert.ok(flatSpread < 1.15, `invented seasonality in flat demand (${flatSpread.toFixed(3)}x)`);
  ok('does not invent seasonality in flat demand');
}

// --- clock one: running out ---
{
  const f = fitForecast(history('d_test', 400, () => 100), AS_OF);
  const r = assessRisk('f_test', 'd_test', [batch(1000, 900)], f, AS_OF);
  assert.ok(r.daysToStockout !== null, 'should predict a stockout');
  assert.ok(Math.abs(r.daysToStockout! - 10) <= 2,
    `1000 units at ~100/day should empty in ~10 days, got ${r.daysToStockout}`);
  assert.equal(r.status, 'critical');
  ok(`predicts stockout at day ${r.daysToStockout}`);
}

// --- clock two: expiring unused ---
{
  const f = fitForecast(history('d_test', 400, () => 1), AS_OF);
  const r = assessRisk('f_test', 'd_test', [batch(5000, 40)], f, AS_OF);
  assert.ok(r.unitsAtRiskOfExpiry > 4900,
    `5000 units at 1/day expiring in 40 days should nearly all be at risk, got ${r.unitsAtRiskOfExpiry}`);
  assert.equal(r.status, 'expiring_unused');
  ok(`flags ${r.unitsAtRiskOfExpiry} units expiring unused`);
}

// --- the case the whole product exists for ---
{
  // A big pile that expires in 20 days, real demand, and nothing behind it.
  // The facility is simultaneously about to waste stock AND about to run dry.
  // Any system that reports only one of these numbers is lying by omission.
  const f = fitForecast(history('d_test', 400, () => 20), AS_OF);
  const r = assessRisk('f_test', 'd_test', [batch(3000, 20)], f, AS_OF);

  assert.ok(r.unitsAtRiskOfExpiry > 2000,
    `expected a large expiring surplus, got ${r.unitsAtRiskOfExpiry}`);
  assert.ok(r.daysToStockout !== null && r.daysToStockout <= 25,
    `expected a stockout right after expiry, got ${r.daysToStockout}`);
  ok(`the paradox: ${r.unitsAtRiskOfExpiry} units expiring on day 20, empty by day ${r.daysToStockout}`);
}

// --- expired stock cannot serve patients ---
{
  const f = fitForecast(history('d_test', 400, () => 50), AS_OF);
  // Plenty of units, but every one of them expires tomorrow.
  const r = assessRisk('f_test', 'd_test', [batch(9999, 1)], f, AS_OF);
  assert.ok(r.daysToStockout !== null && r.daysToStockout <= 2,
    `stock expiring tomorrow must not count as cover, got ${r.daysToStockout}`);
  ok('expired stock does not count as cover');
}

// --- no demand is not an emergency ---
{
  const f = fitForecast(history('d_test', 400, () => 0), AS_OF);
  const r = assessRisk('f_test', 'd_test', [batch(500, 900)], f, AS_OF);
  assert.equal(r.daysToStockout, null, 'zero demand must not report a stockout');
  ok('zero demand reports no stockout');
}

console.log(`\n${checks} checks passed`);
