/**
 * The mesh.
 *
 * Every logistics system ever built for public health is a TREE: facility
 * reports up to district, district up to state, stock comes back down. There is
 * no sideways. A clinic 40km away sitting on 800 units that expire next month
 * is invisible to the clinic that ran dry this morning, and both of them are
 * visible to a warehouse that can help neither in time.
 *
 * This adds the missing edge. It matches surplus that is about to die against
 * shortage that is about to bite, and stops at the constraints that make
 * redistribution fail in the field rather than on a spreadsheet:
 *
 *   - a cold-chain drug into a facility with no fridge is a loss, not a saving
 *   - a batch that expires before it can be driven there and used is worse
 *     than useless, because someone still paid to move it
 *   - crossing a district boundary needs a signature, so it must be worth one
 *
 * Nothing here executes. Every proposal is a recommendation for a human, which
 * is the honest shape of the problem: redistribution fails for want of
 * permission far more often than for want of arithmetic.
 */

import type { Drug, Facility, StockBatch, TransferProposal, RiskAssessment } from './types';
import type { ExpiringLot } from './forecast';

/** Straight-line km underestimates road distance; this is the usual correction. */
const ROAD_FACTOR = 1.35;
/** Average effective speed on district roads, km/h. */
const ROAD_SPEED_KMH = 45;
/** Days of paperwork and dispatch before a vehicle actually moves. */
const DISPATCH_DAYS = 1;

export interface MatchOptions {
  /** Beyond this, a transfer costs more than the stock is worth. */
  maxDistanceKm: number;
  /** A batch must still be usable for this long once it arrives. */
  minUsableDaysOnArrival: number;
  /** Not worth a vehicle for a handful of units. */
  minTransferUnits: number;
  /** Only propose to facilities that will actually run out within this window. */
  recipientHorizonDays: number;
  /** Allow proposals between countries, the BRICS mutual-aid tier. */
  allowCrossBorder: boolean;
  /**
   * Cover a donor keeps back for itself before releasing anything. The single
   * most important number in the system: too low and the mesh solves one
   * shortage by causing another, which is worse than doing nothing.
   */
  donorSafetyDays: number;
}

export const DEFAULT_OPTIONS: MatchOptions = {
  maxDistanceKm: 250,
  minUsableDaysOnArrival: 21,
  minTransferUnits: 20,
  recipientHorizonDays: 60,
  allowCrossBorder: false,
  donorSafetyDays: 90,
};

/** One facility's position on one drug: where it stands, and what it holds. */
export interface Position {
  assessment: RiskAssessment;
  /** Lots projected to die unused. A subset of what is releasable. */
  expiringLots: ExpiringLot[];
  /** Everything on the shelf, needed to release overstock, not just spoilage. */
  batches: StockBatch[];
}

/**
 * What a facility can safely hand over.
 *
 * Not merely the stock that is visibly dying. The King Cetshwayo study found
 * overstocking drove redistribution alongside short-dated stock, and it is
 * obviously right: a clinic holding four hundred days of cover has stock to
 * spare whether or not the expiry date has become frightening yet. Waiting for
 * spoilage before acting is how the waste happens in the first place.
 *
 * Released shortest-dated first, which is both what redistribution guidelines
 * say and the only ordering that averts waste rather than relocating it.
 */
function releasableLots(p: Position, safetyDays: number, asOf: string): ReleasableLot[] {
  const { onHand, dailyDemand } = p.assessment;
  const keep = Math.ceil(dailyDemand * safetyDays);
  let releasable = Math.max(0, onHand - keep);
  if (releasable <= 0) return [];

  const asOfMs = Date.parse(asOf);
  const expiringByBatch = new Map(p.expiringLots.map((l) => [l.batchNo, l.units]));

  const lots: ReleasableLot[] = [];
  const sorted = [...p.batches].sort(
    (a, b) => Date.parse(a.expiryDate) - Date.parse(b.expiryDate));
  for (const b of sorted) {
    if (releasable <= 0) break;
    const take = Math.min(b.quantity, releasable);
    releasable -= take;
    lots.push({
      batchNo: b.batchNo,
      units: take,
      daysToExpiry: Math.round((Date.parse(b.expiryDate) - asOfMs) / DAY_MS),
      // Of these units, how many were headed for the incinerator anyway.
      // Tracked separately so "waste averted" stays an honest number rather
      // than quietly counting every relocated carton as a rescue.
      wasteUnits: Math.min(take, expiringByBatch.get(b.batchNo) ?? 0),
    });
  }
  return lots;
}

interface ReleasableLot extends ExpiringLot {
  /** Portion of `units` that was projected to expire unused. */
  wasteUnits: number;
}

const DAY_MS = 86_400_000;

/** Great-circle distance in km. */
export function haversineKm(
  aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function roadDistanceKm(a: Facility, b: Facility): number {
  return haversineKm(a.lat, a.lon, b.lat, b.lon) * ROAD_FACTOR;
}

export function travelDays(km: number): number {
  const hours = km / ROAD_SPEED_KMH;
  return DISPATCH_DAYS + Math.max(1, Math.ceil(hours / 8));
}

/**
 * Propose transfers across the whole mesh.
 *
 * Greedy: hardest-hit recipient first, then its nearest feasible donor. Not
 * optimal, and deliberately so, a district officer has to be able to follow
 * why a proposal exists, and "the clinic closest to you that has stock going to
 * waste" is a sentence. An optimal assignment that nobody trusts gets ignored,
 * which scores zero units delivered.
 *
 * ponytail: greedy nearest-feasible. Swap in min-cost-flow if a pilot ever
 * shows the greedy leaves meaningful units stranded.
 */
export function proposeTransfers(
  positions: Position[],
  facilities: Map<string, Facility>,
  drugs: Map<string, Drug>,
  asOf: string,
  options: Partial<MatchOptions> = {}): TransferProposal[] {
  const opt = { ...DEFAULT_OPTIONS, ...options };
  const asOfMs = Date.parse(asOf);
  const proposals: TransferProposal[] = [];

  // Group by drug, stock only ever moves within one molecule.
  const byDrug = new Map<string, Position[]>();
  for (const p of positions) {
    const list = byDrug.get(p.assessment.drugId) ?? [];
    list.push(p);
    byDrug.set(p.assessment.drugId, list);
  }

  for (const [drugId, group] of byDrug) {
    const drug = drugs.get(drugId);
    if (!drug) continue;

    const recipients = group
      .filter((p) => {
        const a = p.assessment;
        return a.daysToStockout !== null
          && a.daysToStockout <= opt.recipientHorizonDays
          && a.dailyDemand > 0;
      })
      .sort((a, b) => b.assessment.urgency - a.assessment.urgency);

    // Mutable pool of units genuinely available to give away.
    const donorPool = group
      .map((p) => ({
        facilityId: p.assessment.facilityId,
        lots: releasableLots(p, opt.donorSafetyDays, asOf),
      }))
      .filter((d) => d.lots.length > 0);

    for (const recipient of recipients) {
      const to = facilities.get(recipient.assessment.facilityId);
      if (!to) continue;
      if (drug.requiresColdChain && !to.hasColdChain) continue;

      // How much this facility still needs to get clear of the horizon.
      let stillNeeded = Math.ceil(
        recipient.assessment.dailyDemand * opt.recipientHorizonDays
        - recipient.assessment.onHand);
      if (stillNeeded < opt.minTransferUnits) continue;

      const candidates = donorPool
        .filter((d) => d.facilityId !== to.id && d.lots.some((l) => l.units > 0))
        .map((d) => ({ donor: d, from: facilities.get(d.facilityId) }))
        .filter((c): c is { donor: typeof donorPool[number]; from: Facility } => !!c.from)
        .filter((c) => opt.allowCrossBorder || c.from.country === to.country)
        .filter((c) => !drug.requiresColdChain || c.from.hasColdChain)
        .map((c) => ({ ...c, km: roadDistanceKm(c.from, to) }))
        .filter((c) => c.km <= opt.maxDistanceKm)
        .sort((a, b) => a.km - b.km);

      for (const cand of candidates) {
        if (stillNeeded < opt.minTransferUnits) break;

        const days = travelDays(cand.km);
        // Soonest-expiring lot first: it is the one actually at risk, and
        // moving it is the only version of this that averts waste.
        const lot = cand.donor.lots
          .filter((l) => l.units > 0 && l.daysToExpiry - days >= opt.minUsableDaysOnArrival)
          .sort((a, b) => a.daysToExpiry - b.daysToExpiry)[0];
        if (!lot) continue;

        // Never send more than the recipient can consume before it expires.
        // Moving stock somewhere else to die is theatre, not logistics.
        const usableDays = lot.daysToExpiry - days;
        const consumable = Math.floor(recipient.assessment.dailyDemand * usableDays);
        const qty = Math.min(lot.units, stillNeeded, consumable);
        if (qty < opt.minTransferUnits) continue;

        const coverDays = qty / recipient.assessment.dailyDemand;
        const stockoutDaysAverted = Math.round(
          Math.min(coverDays, opt.recipientHorizonDays - (recipient.assessment.daysToStockout ?? 0)));
        if (stockoutDaysAverted <= 0) continue;

        // Only the share of this move that was actually headed for expiry
        // counts as waste averted. The rest is useful rebalancing, but calling
        // it "waste prevented" would inflate the one number we most need to
        // be able to defend.
        const wasteAverted = Math.min(qty, lot.wasteUnits);
        lot.wasteUnits = Math.max(0, lot.wasteUnits - wasteAverted);
        lot.units -= qty;
        stillNeeded -= qty;

        proposals.push({
          id: `t_${drugId}_${cand.from.id}_${to.id}_${lot.batchNo}`,
          drugId,
          fromFacilityId: cand.from.id,
          toFacilityId: to.id,
          quantity: qty,
          batchNo: lot.batchNo,
          expiryDate: new Date(asOfMs + lot.daysToExpiry * DAY_MS).toISOString().slice(0, 10),
          distanceKm: Math.round(cand.km * 10) / 10,
          travelMinutes: Math.round((cand.km / ROAD_SPEED_KMH) * 60),
          score: scoreProposal(recipient.assessment, lot.daysToExpiry, cand.km, qty),
          stockoutDaysAverted,
          wasteAvertedUnits: wasteAverted,
          crossesDistrict: cand.from.admin2 !== to.admin2,
          rationale: '',   // filled by Gemini; see lib/rationale.ts
          status: 'proposed',
          createdAt: asOf,
        });
      }
    }
  }

  return proposals.sort((a, b) => b.score - a.score);
}

/**
 * Rank a proposal 0-100.
 *
 * Two goods, weighted unequally on purpose. A patient turned away today is
 * worse than a carton binned next quarter, so shortage outranks waste, but
 * waste never scores zero, because if it did the surplus half of the mesh
 * would go dark and there would be nothing to match against.
 */
function scoreProposal(
  recipient: RiskAssessment,
  lotDaysToExpiry: number,
  km: number,
  qty: number): number {
  const shortage = recipient.urgency / 100;
  const wasteUrgency = Math.max(0, 1 - lotDaysToExpiry / 180);
  const sizeWeight = Math.min(1, qty / 500);
  const distanceDecay = 150 / (150 + km);

  const raw = (0.55 * shortage + 0.45 * wasteUrgency * sizeWeight) * distanceDecay;
  return Math.round(Math.min(100, raw * 145));
}
