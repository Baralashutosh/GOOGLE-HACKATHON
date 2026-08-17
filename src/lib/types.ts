/**
 * MedMesh domain model.
 *
 * One idea holds the whole system together: every medicine at every facility is
 * racing two clocks at once, the day it runs out, and the day it expires.
 * Existing supply systems track neither well and compare them never. The
 * collision of those two numbers is what MedMesh acts on.
 *
 * Drugs are keyed by WHO ATC code, not by national product code, so an Indian
 * PHC, a Brazilian UBS and a South African clinic are describing the same
 * molecule in the same language. That is what makes the mesh cross-border.
 */

export type CountryCode = 'IN' | 'BR' | 'ZA';

/** Facility tiers, normalised across countries. Ordered smallest to largest. */
export type FacilityTier = 'health_post' | 'primary' | 'community' | 'district_hospital' | 'warehouse';

export interface Country {
  code: CountryCode;
  name: string;
  /** BCP-47 tag of the primary field language used for voice/text capture. */
  locale: string;
  /** Extra languages a frontline worker might actually report stock in. */
  fieldLocales: string[];
  currency: string;
  /** What this country calls its two sub-national tiers, e.g. State / District. */
  admin1Label: string;
  admin2Label: string;
  /** National name for the primary-care unit, shown in UI. e.g. "PHC", "UBS". */
  primaryCareLabel: string;
}

export interface Facility {
  id: string;
  name: string;
  country: CountryCode;
  tier: FacilityTier;
  admin1: string;
  admin2: string;
  lat: number;
  lon: number;
  /** Catchment population. Drives expected demand scale. */
  populationServed: number;
  /**
   * Whether this facility has working cold-chain storage. A transfer of a
   * cold-chain drug into a facility without it is not a saving, it is a loss.
   */
  hasColdChain: boolean;
}

export interface Drug {
  id: string;
  /** WHO ATC code, the cross-border join key. */
  atc: string;
  /** International Nonproprietary Name. */
  inn: string;
  /** Display names per country, since the same molecule is branded differently. */
  localNames: Partial<Record<CountryCode, string>>;
  form: string;
  /** Unit of issue, e.g. "tablet", "vial", "sachet". */
  unit: string;
  /** On the WHO Model List of Essential Medicines. */
  essential: boolean;
  requiresColdChain: boolean;
  /** Shelf life from manufacture, in months. Drives expiry pressure. */
  shelfLifeMonths: number;
  therapeuticClass: string;
  /**
   * Demand shape over a year. 'flat' = chronic disease, steady offtake.
   * The seasonal ones are where mislocation hurts most: demand moves across
   * the map faster than stock does.
   */
  seasonality: 'flat' | 'monsoon' | 'winter' | 'summer' | 'campaign';
}

/** A physical lot of a drug sitting at one facility. Expiry lives here, not on Drug. */
export interface StockBatch {
  facilityId: string;
  drugId: string;
  batchNo: string;
  quantity: number;
  /** ISO date. */
  expiryDate: string;
  /** ISO date this count was last confirmed, stale counts are their own problem. */
  lastCountedAt: string;
  /** How this count reached us. Provenance matters for trust in the number. */
  source: StockSource;
}

/**
 * The last-mile problem in one type. Most public facilities never file a
 * digital stock count; they keep a paper register. MedMesh accepts whatever
 * the facility can actually produce rather than demanding a new workflow.
 */
export type StockSource =
  | 'lmis'            // pulled from an existing national system (DVDMS, Hórus, ePIMS)
  | 'register_photo'  // Gemini read the facility's own paper register
  | 'voice_note'      // pharmacist spoke it, in their own language
  | 'manual'          // typed into MedMesh directly
  | 'simulated';      // demo data

export interface ConsumptionPoint {
  facilityId: string;
  drugId: string;
  /** ISO date. */
  date: string;
  unitsDispensed: number;
}

/** The two clocks, resolved. One row per facility-drug. */
export interface RiskAssessment {
  facilityId: string;
  drugId: string;
  onHand: number;
  /** Forecast mean daily offtake. */
  dailyDemand: number;
  /** null when demand is zero, it will never run out, which is its own signal. */
  daysToStockout: number | null;
  /**
   * Units projected to expire unused: stock that its own facility cannot
   * consume before the expiry date. This is the surplus worth moving.
   */
  unitsAtRiskOfExpiry: number;
  /** Days until the earliest at-risk batch expires. */
  daysToExpiry: number | null;
  /** Derived posture. Both ends of this scale are failures. */
  status: 'stocked_out' | 'critical' | 'adequate' | 'surplus' | 'expiring_unused';
  /** 0-100. Ranks the queue a district officer sees each morning. */
  urgency: number;
}

/**
 * A proposed move. Nothing here executes automatically, a human officer
 * approves it. Redistribution fails in the field for want of permission far
 * more often than for want of arithmetic, so the rationale is part of the
 * product, not decoration.
 */
export interface TransferProposal {
  id: string;
  drugId: string;
  fromFacilityId: string;
  toFacilityId: string;
  quantity: number;
  batchNo: string;
  expiryDate: string;
  distanceKm: number;
  /** Estimated road time in minutes, from the routing provider. */
  travelMinutes: number;
  /** Units of waste averted plus stockout-days averted, combined. 0-100. */
  score: number;
  /** Days of stockout this prevents at the receiving facility. */
  stockoutDaysAverted: number;
  /** Units that would otherwise have expired unused. */
  wasteAvertedUnits: number;
  /** Crosses an admin2 boundary, needs higher sign-off in most countries. */
  crossesDistrict: boolean;
  /** Plain-language justification, written by Gemini for the approving officer. */
  rationale: string;
  status: 'proposed' | 'approved' | 'rejected' | 'in_transit' | 'delivered';
  createdAt: string;
}

/** What a facility-side capture (photo or voice) resolves to before it is committed. */
export interface CaptureResult {
  facilityId: string;
  source: StockSource;
  /** Rows Gemini extracted. Low-confidence rows are held for human review. */
  rows: CapturedStockRow[];
  /** Raw transcript or model notes, kept for audit. */
  notes?: string;
  /**
   * Which model actually answered. Under load the primary steps down to a
   * fallback, and the UI should say so rather than imply the headline model
   * did work it did not do.
   */
  model?: string;
}

export interface CapturedStockRow {
  /** Whatever text appeared on the page or in the audio, before normalisation. */
  rawName: string;
  /** Resolved catalogue drug, or null when the name could not be matched. */
  drugId: string | null;
  batchNo: string | null;
  quantity: number | null;
  expiryDate: string | null;
  /** 0-1. Anything below the review threshold goes to a human, never straight to stock. */
  confidence: number;
}
