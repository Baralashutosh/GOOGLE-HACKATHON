/**
 * Server-side data access.
 *
 * The mesh is computed offline by scripts/pipeline.ts and read here. That split
 * is deliberate rather than lazy: forecasting 1,350 facility-drug pairs is a
 * batch job a ministry would run nightly, not something to redo on every page
 * view. It also means the demo cannot fall over mid-presentation because a
 * model was slow.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  Country, Drug, Facility, RiskAssessment, TransferProposal,
} from './types';

export interface BricsOpportunity {
  drugId: string;
  drug: string;
  from: string;
  to: string;
  units: number;
}

export interface MeshSummary {
  proposals: number;
  crossDistrict: number;
  wasteAvertedUnits: number;
  totalUnitsExpiring: number;
  recoveryRatePct: number;
  stockoutDaysAverted: number;
  facilitiesHelped: number;
  positionTally: Record<string, number>;
}

export interface Mesh {
  asOf: string;
  summary: MeshSummary;
  bricsPooling: BricsOpportunity[];
  proposals: TransferProposal[];
  assessments: RiskAssessment[];
}

const DATA = join(process.cwd(), 'data');

function readJson<T>(...parts: string[]): T {
  return JSON.parse(readFileSync(join(DATA, ...parts), 'utf8')) as T;
}

/* Read once per process. The files never change at runtime. */
let cache: {
  mesh: Mesh; facilities: Facility[]; drugs: Drug[]; countries: Country[];
} | null = null;

export function load() {
  if (!cache) {
    cache = {
      mesh: readJson<Mesh>('generated', 'mesh_output.json'),
      facilities: readJson<Facility[]>('generated', 'facilities.json'),
      drugs: readJson<Drug[]>('catalog', 'drugs.json'),
      countries: readJson<Country[]>('catalog', 'countries.json'),
    };
  }
  return cache;
}

export function getDrugs(): Drug[] {
  return load().drugs;
}

export function getCountries(): Country[] {
  return load().countries;
}

/** Everything the console needs for one country, already joined and ranked. */
export function countryView(code: string) {
  const { mesh, facilities, drugs, countries } = load();

  const country = countries.find((c) => c.code === code) ?? countries[0];
  const inCountry = facilities.filter((f) => f.country === country.code);
  const ids = new Set(inCountry.map((f) => f.id));

  const proposals = mesh.proposals.filter((p) => ids.has(p.toFacilityId));
  const assessments = mesh.assessments.filter((a) => ids.has(a.facilityId));

  /* Roll each facility up to its single worst position, which is what decides
     whether it needs attention this morning. */
  const worst = new Map<string, RiskAssessment>();
  for (const a of assessments) {
    const prev = worst.get(a.facilityId);
    if (!prev || a.urgency > prev.urgency) worst.set(a.facilityId, a);
  }

  return {
    country,
    countries,
    asOf: mesh.asOf,
    drugs,
    facilities: inCountry,
    worst,
    assessments,
    proposals,
    brics: mesh.bricsPooling,
    summary: mesh.summary,
    stats: {
      facilities: inCountry.length,
      stockedOut: assessments.filter((a) => a.status === 'stocked_out').length,
      critical: assessments.filter((a) => a.status === 'critical').length,
      expiring: assessments.filter((a) => a.status === 'expiring_unused').length,
      surplus: assessments.filter((a) => a.status === 'surplus').length,
      unitsExpiring: assessments.reduce((s, a) => s + a.unitsAtRiskOfExpiry, 0),
      proposals: proposals.length,
      crossDistrict: proposals.filter((p) => p.crossesDistrict).length,
      stockoutDaysAverted: proposals.reduce((s, p) => s + p.stockoutDaysAverted, 0),
      wasteAverted: proposals.reduce((s, p) => s + p.wasteAvertedUnits, 0),
    },
  };
}

/** Global figures for the landing page. */
export function globalStats() {
  const { mesh, facilities } = load();
  return {
    ...mesh.summary,
    asOf: mesh.asOf,
    facilities: facilities.length,
    districts: new Set(facilities.map((f) => `${f.country}|${f.admin2}`)).size,
    countries: new Set(facilities.map((f) => f.country)).size,
    brics: mesh.bricsPooling,
  };
}
