'use client';

import { useState } from 'react';
import { DistrictMap } from './DistrictMap';
import { ProposalQueue } from './ProposalQueue';
import type { Country, Drug, Facility, RiskAssessment, TransferProposal } from '@/lib/types';

/**
 * The district officer's screen.
 *
 * Map and queue share one selection: clicking a facility filters the queue,
 * clicking a facility name in the queue moves the map. They are two views of
 * one decision, so they must never disagree about what is currently in focus.
 */
export function ConsoleShell({
  country,
  countries,
  facilities,
  worst,
  proposals,
  drugs,
  stats,
  asOf,
}: {
  country: Country;
  countries: Country[];
  facilities: Facility[];
  worst: Record<string, RiskAssessment>;
  proposals: TransferProposal[];
  drugs: Drug[];
  stats: Record<string, number>;
  asOf: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-[1600px] px-5 py-6">
      <header className="mb-5 flex flex-wrap items-end gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-flow">
            District console
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {country.name}
            <span className="ml-2 text-ink-400">
              {facilities.length} facilities, {country.primaryCareLabel} network
            </span>
          </h1>
          <p className="mt-1 text-[12px] text-ink-400">
            Position as of {asOf}. Alongside {country.lmisName ?? 'the national system'},
            not instead of it.
          </p>
        </div>

        <nav className="ml-auto flex gap-1 rounded-lg border rule p-1">
          {countries.map((c) => (
            <a
              key={c.code}
              href={`/console?country=${c.code}`}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                c.code === country.code
                  ? 'bg-flow text-ink-950'
                  : 'text-ink-300 hover:bg-ink-800 hover:text-ink-100'
              }`}
            >
              {c.name}
            </a>
          ))}
        </nav>
      </header>

      <div className="stagger mb-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Stocked out" value={stats.stockedOut} tone="shortage" />
        <Stat label="Runs out in 30d" value={stats.critical} tone="shortage" />
        <Stat label="Expiring unused" value={stats.unitsExpiring} tone="expiry" suffix=" units" />
        <Stat label="Transfers proposed" value={stats.proposals} tone="flow" />
        <Stat label="Cross-district" value={stats.crossDistrict} tone="flow" />
        <Stat label="Stock-out days averted" value={stats.stockoutDaysAverted} tone="flow" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <section className="panel overflow-hidden">
          <div className="flex items-center gap-3 border-b rule px-4 py-3">
            <h2 className="text-[14px] font-semibold">
              {country.admin2Label} network
            </h2>
            <p className="text-[12px] text-ink-400">
              {selected ? 'Showing every transfer touching this facility' : 'Click a facility to filter'}
            </p>
          </div>
          <DistrictMap
            facilities={facilities}
            worst={worst}
            proposals={proposals}
            selectedId={selected}
            onSelect={setSelected}
          />
        </section>

        <section className="panel max-h-[760px] overflow-hidden">
          <ProposalQueue
            proposals={proposals}
            facilities={facilities}
            drugs={drugs}
            selectedFacilityId={selected}
            onSelectFacility={setSelected}
          />
        </section>
      </div>
    </div>
  );
}

function Stat({
  label, value, tone, suffix = '',
}: {
  label: string; value: number; tone: 'shortage' | 'expiry' | 'flow'; suffix?: string;
}) {
  const colour = {
    shortage: 'text-shortage', expiry: 'text-expiry', flow: 'text-flow',
  }[tone];
  return (
    <div className="panel px-4 py-3">
      <div className={`tabular text-2xl font-semibold ${colour}`}>
        {value.toLocaleString()}
        <span className="text-[13px] font-normal text-ink-400">{suffix}</span>
      </div>
      <p className="mt-0.5 text-[11px] uppercase tracking-[0.1em] text-ink-400">{label}</p>
    </div>
  );
}
