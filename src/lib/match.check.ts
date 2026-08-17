/**
 * Self-check for the mesh matcher. Run: npm run check
 *
 * These assert the constraints that make redistribution fail in the FIELD.
 * A matcher that ignores them still produces a beautiful list of transfers;
 * it just produces one that wastes fuel and kills stock.
 */

import assert from 'node:assert/strict';
import { proposeTransfers, haversineKm, travelDays, type Position } from './match';
import type { Drug, Facility, RiskAssessment } from './types';

const AS_OF = '2026-08-17';

function facility(id: string, lat: number, lon: number, opts: Partial<Facility> = {}): Facility {
  return {
    id, name: id, country: 'IN', tier: 'primary',
    admin1: 'Bihar', admin2: 'Muzaffarpur',
    lat, lon, populationServed: 30000, hasColdChain: true, ...opts,
  };
}

function drug(id: string, opts: Partial<Drug> = {}): Drug {
  return {
    id, atc: 'X', inn: id, localNames: {}, form: 'tablet', unit: 'tablet',
    essential: true, requiresColdChain: false, shelfLifeMonths: 24,
    therapeuticClass: 'test', seasonality: 'flat', ...opts,
  };
}

function needy(facilityId: string, drugId: string, dailyDemand: number, onHand = 0): Position {
  const assessment: RiskAssessment = {
    facilityId, drugId, onHand, dailyDemand,
    daysToStockout: Math.floor(onHand / dailyDemand),
    unitsAtRiskOfExpiry: 0, daysToExpiry: null,
    status: 'critical', urgency: 90,
  };
  return { assessment, expiringLots: [], batches: [] };
}

function donor(
  facilityId: string, drugId: string, units: number, daysToExpiry: number,
): Position {
  const assessment: RiskAssessment = {
    facilityId, drugId, onHand: units, dailyDemand: 0.1,
    daysToStockout: null, unitsAtRiskOfExpiry: units, daysToExpiry,
    status: 'expiring_unused', urgency: 25,
  };
  return {
    assessment,
    expiringLots: [{ batchNo: 'B1', units, daysToExpiry }],
    batches: [{
      facilityId, drugId, batchNo: 'B1', quantity: units,
      expiryDate: new Date(Date.parse(AS_OF) + daysToExpiry * 86_400_000).toISOString().slice(0, 10),
      lastCountedAt: AS_OF, source: 'simulated',
    }],
  };
}

let n = 0;
const ok = (s: string) => { n++; console.log(`  ok  ${s}`); };

console.log('\nmesh matcher');

// --- distance sanity, since everything else is priced off it ---
{
  // Muzaffarpur to Patna, roughly 60 km apart.
  const km = haversineKm(26.12, 85.36, 25.59, 85.13);
  assert.ok(km > 50 && km < 75, `expected ~60km, got ${km.toFixed(1)}`);
  ok(`haversine sane (${km.toFixed(0)} km Muzaffarpur-Patna)`);
  assert.ok(travelDays(40) >= 2, 'even a short hop needs dispatch time');
  ok(`travel days include dispatch (40km -> ${travelDays(40)}d)`);
}

const drugs = new Map([['d1', drug('d1')], ['cold', drug('cold', { requiresColdChain: true })]]);

// --- the basic match must happen ---
{
  const facs = new Map([
    ['A', facility('A', 26.12, 85.36)],
    ['B', facility('B', 26.30, 85.50)],
  ]);
  const out = proposeTransfers(
    [needy('A', 'd1', 50, 100), donor('B', 'd1', 4000, 120)],
    facs, drugs, AS_OF,
  );
  assert.equal(out.length, 1, `expected one proposal, got ${out.length}`);
  assert.equal(out[0].fromFacilityId, 'B');
  assert.equal(out[0].toFacilityId, 'A');
  assert.ok(out[0].quantity > 0);
  ok(`matches surplus to shortage (${out[0].quantity} units, score ${out[0].score})`);
}

// --- a fridge drug must not go where there is no fridge ---
{
  const facs = new Map([
    ['A', facility('A', 26.12, 85.36, { hasColdChain: false })],
    ['B', facility('B', 26.30, 85.50, { hasColdChain: true })],
  ]);
  const out = proposeTransfers(
    [needy('A', 'cold', 50, 100), donor('B', 'cold', 4000, 120)],
    facs, drugs, AS_OF,
  );
  assert.equal(out.length, 0, 'cold-chain drug routed to a facility with no cold chain');
  ok('refuses cold-chain transfer into a facility without cold chain');
}

// --- a batch that cannot survive the journey must not be sent ---
{
  const facs = new Map([
    ['A', facility('A', 26.12, 85.36)],
    ['B', facility('B', 26.30, 85.50)],
  ]);
  // Expires in 5 days. Travel plus the usability floor exceeds that.
  const out = proposeTransfers(
    [needy('A', 'd1', 50, 100), donor('B', 'd1', 4000, 5)],
    facs, drugs, AS_OF,
  );
  assert.equal(out.length, 0, 'sent stock that expires before it can be used');
  ok('refuses a batch that expires before it can arrive and be used');
}

// --- never send more than the recipient can actually consume in time ---
{
  const facs = new Map([
    ['A', facility('A', 26.12, 85.36)],
    ['B', facility('B', 26.30, 85.50)],
  ]);
  // 10/day, batch expires in 40 days: at most ~400 units are ever usable.
  const out = proposeTransfers(
    [needy('A', 'd1', 10, 50), donor('B', 'd1', 99999, 40)],
    facs, drugs, AS_OF,
  );
  assert.equal(out.length, 1);
  assert.ok(out[0].quantity <= 400,
    `sent ${out[0].quantity} units the recipient cannot consume before expiry`);
  ok(`caps quantity at what the recipient can consume (${out[0].quantity} units)`);
}

// --- distance cap ---
{
  const facs = new Map([
    ['A', facility('A', 26.12, 85.36)],
    ['B', facility('B', 20.00, 79.00)],   // ~900 km away
  ]);
  const out = proposeTransfers(
    [needy('A', 'd1', 50, 100), donor('B', 'd1', 4000, 120)],
    facs, drugs, AS_OF,
  );
  assert.equal(out.length, 0, 'proposed a transfer beyond the distance cap');
  ok('respects the distance cap');
}

// --- one lot cannot be promised to two facilities ---
{
  const facs = new Map([
    ['A', facility('A', 26.12, 85.36)],
    ['B', facility('B', 26.14, 85.38)],
    ['S', facility('S', 26.13, 85.37)],
  ]);
  const supply = 300;
  const out = proposeTransfers(
    [needy('A', 'd1', 50, 0), needy('B', 'd1', 50, 0), donor('S', 'd1', supply, 120)],
    facs, drugs, AS_OF,
  );
  const promised = out.reduce((s, p) => s + p.quantity, 0);
  assert.ok(promised <= supply,
    `promised ${promised} units from a lot holding ${supply}`);
  ok(`never over-promises a lot (${promised} of ${supply} units across ${out.length} proposals)`);
}

// --- borders are closed unless explicitly opened ---
{
  const facs = new Map([
    ['A', facility('A', 26.12, 85.36, { country: 'IN' })],
    ['B', facility('B', 26.20, 85.44, { country: 'BR' })],
  ]);
  const positions = [needy('A', 'd1', 50, 100), donor('B', 'd1', 4000, 120)];
  assert.equal(proposeTransfers(positions, facs, drugs, AS_OF).length, 0,
    'crossed a border without being asked to');
  ok('does not cross borders by default');

  const opened = proposeTransfers(positions, facs, drugs, AS_OF, { allowCrossBorder: true });
  assert.equal(opened.length, 1, 'cross-border tier did not produce a proposal when enabled');
  ok('crosses borders when the mutual-aid tier is enabled');
}

console.log(`\n${n} checks passed`);
