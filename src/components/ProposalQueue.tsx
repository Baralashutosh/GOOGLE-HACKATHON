'use client';

import { useState } from 'react';
import type { Drug, Facility, TransferProposal } from '@/lib/types';

/**
 * The officer's morning queue.
 *
 * Nothing here executes on its own. Redistribution fails for want of a
 * signature far more often than for want of arithmetic, so the product is not
 * the optimisation, it is the moment a human reads one sentence and says yes.
 * Every figure shown is computed; Gemini only puts it into language.
 */

type Decision = 'approved' | 'rejected';

export function ProposalQueue({
  proposals,
  facilities,
  drugs,
  selectedFacilityId,
  onSelectFacility,
}: {
  proposals: TransferProposal[];
  facilities: Facility[];
  drugs: Drug[];
  selectedFacilityId: string | null;
  onSelectFacility: (id: string | null) => void;
}) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [rationales, setRationales] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const byId = Object.fromEntries(facilities.map((f) => [f.id, f]));
  const drugById = Object.fromEntries(drugs.map((d) => [d.id, d]));

  const visible = selectedFacilityId
    ? proposals.filter(
      (p) => p.toFacilityId === selectedFacilityId || p.fromFacilityId === selectedFacilityId)
    : proposals;

  const decided = Object.keys(decisions).length;
  const approvedDays = proposals
    .filter((p) => decisions[p.id] === 'approved')
    .reduce((s, p) => s + p.stockoutDaysAverted, 0);

  async function explain(id: string) {
    if (rationales[id] || loading) return;
    setLoading(id);
    setErrors((e) => ({ ...e, [id]: '' }));
    try {
      const res = await fetch('/api/rationale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not write a justification.');
      setRationales((r) => ({ ...r, [id]: data.rationale }));
    } catch (err) {
      setErrors((e) => ({
        ...e,
        [id]: err instanceof Error ? err.message : 'Something went wrong.',
      }));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b rule px-4 py-3">
        <h2 className="text-[14px] font-semibold">Transfer queue</h2>
        <span className="pill" data-state="flow">{visible.length}</span>
        {selectedFacilityId && (
          <button
            onClick={() => onSelectFacility(null)}
            className="ml-auto text-[12px] text-ink-400 underline underline-offset-4 hover:text-flow"
          >
            Clear filter
          </button>
        )}
      </div>

      {decided > 0 && (
        <div className="border-b rule bg-flow/[0.06] px-4 py-2.5 text-[12px] text-ink-200">
          <span className="tabular font-semibold text-flow">{decided}</span> decided,{' '}
          <span className="tabular font-semibold text-flow">{approvedDays}</span>{' '}
          stock-out days averted by the approvals
        </div>
      )}

      <div className="stagger flex-1 divide-y divide-ink-800 overflow-y-auto">
        {visible.length === 0 && (
          <p className="p-6 text-[13px] text-ink-400">
            No transfers proposed for this facility.
          </p>
        )}

        {visible.slice(0, 60).map((p) => {
          const from = byId[p.fromFacilityId];
          const to = byId[p.toFacilityId];
          const drug = drugById[p.drugId];
          if (!from || !to || !drug) return null;
          const decision = decisions[p.id];

          return (
            <article key={p.id} className="p-4 transition-colors hover:bg-ink-850/50">
              <div className="flex items-start gap-3">
                <ScoreDial score={p.score} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="tabular text-[15px] font-semibold text-ink-100">
                      {p.quantity.toLocaleString()}
                    </span>
                    <span className="text-[13px] text-ink-300">{drug.unit}s of</span>
                    <span className="text-[14px] font-medium text-ink-100">{drug.inn}</span>
                    {drug.requiresColdChain && (
                      <span className="pill" data-state="adequate">cold chain</span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-[12px]">
                    <button
                      onClick={() => onSelectFacility(from.id)}
                      className="-my-1 truncate py-1 text-expiry hover:underline"
                    >
                      {from.name}
                    </button>
                    <svg width="20" height="8" className="shrink-0" aria-hidden>
                      <path d="M0 4 H15 M11 1 L15 4 L11 7" stroke="var(--color-flow)"
                        strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <button
                      onClick={() => onSelectFacility(to.id)}
                      className="-my-1 truncate py-1 text-shortage hover:underline"
                    >
                      {to.name}
                    </button>
                  </div>

                  <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-400">
                    <Fact label="distance" value={`${p.distanceKm} km`} />
                    <Fact label="batch" value={p.batchNo} />
                    <Fact label="expires" value={p.expiryDate} tone="expiry" />
                    <Fact
                      label="averts"
                      value={`${p.stockoutDaysAverted} stock-out ${p.stockoutDaysAverted === 1 ? 'day' : 'days'}`}
                      tone="flow"
                    />
                  </dl>

                  {p.crossesDistrict && (
                    <p className="mt-2 text-[11px] text-ink-300">
                      Crosses a district boundary, needs district-level sign-off
                    </p>
                  )}

                  {rationales[p.id] && (
                    <blockquote className="mt-3 border-l-2 border-flow/50 bg-flow/[0.05] py-2 pl-3 text-[13px] leading-relaxed text-ink-200">
                      {rationales[p.id]}
                      <span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-ink-400">
                        written by Gemini from the computed figures
                      </span>
                    </blockquote>
                  )}

                  {errors[p.id] && (
                    <p className="mt-2 text-[12px] text-shortage">{errors[p.id]}</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {!decision && (
                      <>
                        <button
                          onClick={() => setDecisions((d) => ({ ...d, [p.id]: 'approved' }))}
                          className="rounded-md bg-flow px-3 py-1.5 text-[12px] font-semibold text-ink-950 transition-transform hover:scale-[1.03]"
                        >
                          Approve transfer
                        </button>
                        <button
                          onClick={() => setDecisions((d) => ({ ...d, [p.id]: 'rejected' }))}
                          className="rounded-md border border-ink-600 px-3 py-1.5 text-[12px] text-ink-300 transition-colors hover:border-shortage/50 hover:text-shortage"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {decision === 'approved' && (
                      <span className="pill" data-state="flow">Approved, dispatch raised</span>
                    )}
                    {decision === 'rejected' && (
                      <span className="pill" data-state="stocked_out">Declined</span>
                    )}

                    {!rationales[p.id] && (
                      <button
                        onClick={() => explain(p.id)}
                        disabled={loading === p.id}
                        className="-my-1 ml-auto py-1 text-[12px] text-ink-400 underline underline-offset-4 transition-colors hover:text-flow disabled:opacity-50"
                      >
                        {loading === p.id ? 'Writing...' : 'Why this transfer?'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: 'flow' | 'expiry' }) {
  const colour = tone === 'flow' ? 'text-flow' : tone === 'expiry' ? 'text-expiry' : 'text-ink-200';
  return (
    <div className="flex gap-1.5">
      <dt className="uppercase tracking-[0.1em]">{label}</dt>
      <dd className={`tabular ${colour}`}>{value}</dd>
    </div>
  );
}

/** Priority as a dial: readable at a glance from across a room. */
function ScoreDial({ score }: { score: number }) {
  const r = 15;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;
  const colour = score >= 75 ? 'var(--color-shortage)'
    : score >= 50 ? 'var(--color-expiry)'
      : 'var(--color-ink-400)';

  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="shrink-0" aria-hidden>
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--color-ink-700)" strokeWidth="3" />
      <circle
        cx="20" cy="20" r={r} fill="none" stroke={colour} strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        transform="rotate(-90 20 20)"
      />
      <text x="20" y="24" textAnchor="middle"
        className="tabular fill-ink-100 text-[12px] font-semibold">
        {score}
      </text>
    </svg>
  );
}
