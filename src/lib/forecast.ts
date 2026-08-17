/**
 * The dual-clock engine.
 *
 * Every medicine at every facility is running two clocks: the day it runs out,
 * and the day it expires. Supply systems track the first badly and the second
 * not at all, and compare them never. Where the clocks collide across two
 * facilities — one about to run dry, one about to throw the same drug away —
 * there is a transfer worth making. Finding those collisions is the product.
 *
 * The forecaster is deliberately SEASON-AWARE, because season-blindness is the
 * failure it exists to correct: planners size orders from an annual average, so
 * they are short every peak and buried every trough. A flat mean would
 * reproduce the very mistake we are here to fix.
 *
 * Runs in-process, no cloud service, no credentials. A district office can run
 * this on a laptop. `sql/forecast_bqml.sql` holds the BigQuery ML ARIMA_PLUS
 * equivalent for when this moves to national scale.
 */

import type { ConsumptionPoint, RiskAssessment, StockBatch } from './types';

/** Half-month buckets: 24 a year. Fine enough to catch a monsoon, coarse
 *  enough that 18 months of history puts real observations in each one. */
const BUCKETS = 24;
/** How far ahead the two clocks are projected. */
export const HORIZON_DAYS = 180;
/** Recent demand counts for more than old demand, but old demand still counts. */
const LEVEL_HALF_LIFE_DAYS = 45;
/** Pull seasonal factors toward 1 when a bucket is thinly observed. */
const SEASONAL_SHRINKAGE = 4;

const DAY_MS = 86_400_000;

function toDay(iso: string): number {
  return Math.floor(Date.parse(iso) / DAY_MS);
}

function bucketOf(dayNumber: number): number {
  const doy = dayOfYear(dayNumber);
  return Math.min(BUCKETS - 1, Math.floor((doy / 365) * BUCKETS));
}

function dayOfYear(dayNumber: number): number {
  const d = new Date(dayNumber * DAY_MS);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - start) / DAY_MS);
}

export interface Forecast {
  /** Deseasonalised current run-rate, units/day. */
  level: number;
  /** Multiplier per half-month bucket. Mean 1. */
  seasonalIndex: number[];
  /** Expected units on a given absolute day number. */
  demandOn(dayNumber: number): number;
}

/**
 * Fit a seasonal level model to one facility-drug history.
 *
 * Classic decomposition rather than anything clever: estimate the shape of the
 * year, divide it out, take an exponentially weighted level of what remains,
 * then multiply the shape back in. It is explainable to a health officer in one
 * sentence, which matters more here than a fractionally better fit.
 */
export function fitForecast(history: ConsumptionPoint[], asOf: string): Forecast {
  const asOfDay = toDay(asOf);
  const points = history
    .map((p) => ({ day: toDay(p.date), units: p.unitsDispensed }))
    .filter((p) => p.day <= asOfDay)
    .sort((a, b) => a.day - b.day);

  if (points.length === 0) {
    const flat = new Array(BUCKETS).fill(1);
    return { level: 0, seasonalIndex: flat, demandOn: () => 0 };
  }

  const overallMean =
    points.reduce((s, p) => s + p.units, 0) / points.length;

  // --- seasonal shape ---
  const sums = new Array(BUCKETS).fill(0);
  const counts = new Array(BUCKETS).fill(0);
  for (const p of points) {
    const b = bucketOf(p.day);
    sums[b] += p.units;
    counts[b] += 1;
  }
  const seasonalIndex = sums.map((sum, i) => {
    if (counts[i] === 0 || overallMean <= 0) return 1;
    const raw = sum / counts[i] / overallMean;
    // Shrink toward 1 in proportion to how little we saw of this bucket.
    const w = counts[i] / (counts[i] + SEASONAL_SHRINKAGE);
    return w * raw + (1 - w) * 1;
  });
  // Renormalise so the year's factors average to 1 and the level keeps meaning.
  const idxMean = seasonalIndex.reduce((a, b) => a + b, 0) / BUCKETS;
  const normalised = idxMean > 0 ? seasonalIndex.map((v) => v / idxMean) : seasonalIndex;

  // --- level, on deseasonalised history ---
  const decay = Math.log(2) / LEVEL_HALF_LIFE_DAYS;
  let wSum = 0;
  let vSum = 0;
  for (const p of points) {
    const age = asOfDay - p.day;
    const w = Math.exp(-decay * age);
    const factor = normalised[bucketOf(p.day)] || 1;
    vSum += w * (p.units / factor);
    wSum += w;
  }
  const level = wSum > 0 ? vSum / wSum : 0;

  return {
    level,
    seasonalIndex: normalised,
    demandOn: (dayNumber: number) => Math.max(0, level * (normalised[bucketOf(dayNumber)] || 1)),
  };
}

/**
 * Run both clocks forward over the same batches, FEFO, and report where they land.
 *
 * Running them in ONE simulation is the point. Ask "when do I run out?" and
 * "what will I waste?" separately and you get two numbers that quietly
 * contradict each other; ask them together and you get the truth, which is that
 * a facility can be days from empty and still holding stock it will never use.
 */
export interface ExpiringLot {
  batchNo: string;
  /** Units of this specific lot projected to die unused. */
  units: number;
  daysToExpiry: number;
}

export interface Projection {
  daysToStockout: number | null;
  /** Per-batch, because the matcher has to name the lot it is moving. */
  expiringLots: ExpiringLot[];
  totalExpiring: number;
}

/**
 * Run the two clocks forward over the same FEFO simulation.
 *
 * Running them in ONE pass is the point. Ask "when do I run out?" and "what
 * will I waste?" separately and you get two numbers that quietly contradict
 * each other; ask them together and you get the truth, which is that a facility
 * can be days from empty while holding stock it will never use.
 */
export function project(
  batches: StockBatch[],
  forecast: Forecast,
  asOf: string,
  horizonDays = HORIZON_DAYS,
): Projection {
  const asOfDay = toDay(asOf);

  // Work on a copy; this is a projection, not a transaction.
  const lots = batches
    .map((b) => ({ batchNo: b.batchNo, qty: b.quantity, expiryDay: toDay(b.expiryDate) }))
    .sort((a, b) => a.expiryDay - b.expiryDay);

  let daysToStockout: number | null = null;
  const expiringLots: ExpiringLot[] = [];

  for (let d = 0; d < horizonDays; d++) {
    const day = asOfDay + d;

    // Retire lots that expired overnight — BEFORE serving, because expired
    // stock cannot serve anyone. That ordering is the whole subtlety: get it
    // backwards and a shelf of dead stock reads as healthy cover.
    for (const lot of lots) {
      if (lot.qty > 0 && lot.expiryDay <= day) {
        expiringLots.push({
          batchNo: lot.batchNo,
          units: lot.qty,
          daysToExpiry: lot.expiryDay - asOfDay,
        });
        lot.qty = 0;
      }
    }

    const remaining = lots.reduce((s, l) => s + l.qty, 0);
    if (remaining <= 0 && daysToStockout === null) {
      // Zero stock only counts as a stockout if anyone actually wants the drug.
      if (forecast.demandOn(day) > 0) daysToStockout = d;
    }

    let need = Math.round(forecast.demandOn(day));
    for (const lot of lots) {
      if (need <= 0) break;
      const take = Math.min(lot.qty, need);
      lot.qty -= take;
      need -= take;
    }
  }

  return {
    daysToStockout,
    expiringLots,
    totalExpiring: expiringLots.reduce((s, l) => s + l.units, 0),
  };
}

export function assessRisk(
  facilityId: string,
  drugId: string,
  batches: StockBatch[],
  forecast: Forecast,
  asOf: string,
): RiskAssessment {
  const asOfDay = toDay(asOf);
  const onHand = batches.reduce((s, b) => s + b.quantity, 0);

  const { daysToStockout, expiringLots, totalExpiring } = project(batches, forecast, asOf);
  const expiredUnits = totalExpiring;
  const firstExpiryDay =
    expiringLots.length === 0 ? null : asOfDay + Math.min(...expiringLots.map((l) => l.daysToExpiry));

  const dailyDemand = forecast.demandOn(asOfDay);
  const daysOfCover = dailyDemand > 0 ? onHand / dailyDemand : Infinity;

  return {
    facilityId,
    drugId,
    onHand,
    dailyDemand: round(dailyDemand, 2),
    daysToStockout,
    unitsAtRiskOfExpiry: expiredUnits,
    daysToExpiry: firstExpiryDay === null ? null : firstExpiryDay - asOfDay,
    status: classify(onHand, daysToStockout, expiredUnits, daysOfCover),
    urgency: urgencyScore(daysToStockout, expiredUnits, onHand),
  };
}

function classify(
  onHand: number,
  daysToStockout: number | null,
  expiring: number,
  daysOfCover: number,
): RiskAssessment['status'] {
  if (onHand <= 0) return 'stocked_out';
  // Expiry is judged as a share of the pile, not an absolute count — 200 units
  // dying is a rounding error in a warehouse and a scandal in a village clinic.
  if (expiring > 0 && expiring / onHand > 0.3) return 'expiring_unused';
  if (daysToStockout !== null && daysToStockout <= 30) return 'critical';
  if (daysOfCover > 180) return 'surplus';
  return 'adequate';
}

/**
 * One number to sort a district officer's morning queue by.
 *
 * Both ends of the scale are failures, so both score. Imminent emptiness
 * outranks imminent waste — a patient turned away today is worse than stock
 * binned next quarter — but waste never scores zero, which is what makes the
 * surplus side of the mesh visible at all.
 */
function urgencyScore(
  daysToStockout: number | null,
  expiring: number,
  onHand: number,
): number {
  let score = 0;
  if (daysToStockout !== null) {
    score += 70 * Math.max(0, 1 - daysToStockout / 90);
  }
  if (expiring > 0 && onHand > 0) {
    score += 30 * Math.min(1, expiring / onHand);
  }
  return Math.round(Math.min(100, score));
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
