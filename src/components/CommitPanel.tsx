'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CapturedStockRow, Facility } from '@/lib/types';

/**
 * The moment the paper actually reaches the network.
 *
 * Extraction on its own proves a model can read handwriting. It does not prove
 * the system works, and the difference matters: the claim is that a facility
 * with no digital system can join the mesh by photographing the page it already
 * keeps. That is only true if the page changes what the network does.
 *
 * So this shows the consequence, not a confirmation toast. Which medicines
 * changed posture, and which transfers now exist that did not exist a moment
 * ago.
 */

interface Changed {
  drugId: string;
  drug: string;
  onHandBefore: number | null;
  onHandAfter: number;
  statusBefore: string | null;
  statusAfter: string;
  daysToStockoutBefore: number | null;
  daysToStockoutAfter: number | null;
}

interface Proposal {
  id: string;
  quantity: number;
  distanceKm: number;
  stockoutDaysAverted: number;
  crossesDistrict: boolean;
  fromName?: string;
  toName?: string;
  drugName?: string;
  unit?: string;
}

interface CommitResult {
  facility: { id: string; name: string; admin2: string };
  committed: number;
  heldForReview: number;
  changed: Changed[];
  proposals: Proposal[];
  newProposalCount: number;
}

export function CommitPanel({
  rows,
  facilities,
  source,
}: {
  rows: CapturedStockRow[];
  facilities: Facility[];
  source: 'register_photo' | 'voice_note';
}) {
  const [facilityId, setFacilityId] = useState(facilities[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function commit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facilityId, rows, source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not commit this count.');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (result) return <Outcome result={result} />;

  return (
    <div className="border-t rule bg-flow/[0.04] px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[12px] text-ink-300">Commit this count to</span>
        <select
          value={facilityId}
          onChange={(e) => setFacilityId(e.target.value)}
          className="max-w-[260px] rounded-md border rule bg-ink-850 px-2.5 py-1.5 text-[12px] text-ink-100"
        >
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}, {f.admin2}
            </option>
          ))}
        </select>
        <button
          onClick={commit}
          disabled={busy || !facilityId}
          className="rounded-md bg-flow px-3.5 py-1.5 text-[12px] font-semibold text-ink-950 transition-transform hover:scale-[1.03] disabled:opacity-50"
        >
          {busy ? 'Re-projecting the network...' : 'Commit to the mesh'}
        </button>
      </div>
      {error && <p className="mt-2 text-[12px] text-shortage">{error}</p>}
      <p className="mt-2 text-[11px] text-ink-400">
        Both clocks are re-run for this facility and the matcher re-runs across
        the whole district. A fresh count can make a facility a donor just as
        easily as a recipient.
      </p>
    </div>
  );
}

function Outcome({ result }: { result: CommitResult }) {
  const moved = result.changed.filter((c) => c.statusBefore !== c.statusAfter);

  return (
    <div className="border-t rule bg-flow/[0.04]">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="pill" data-state="flow">Committed</span>
        <span className="text-[13px] text-ink-200">
          {result.committed} medicines counted at{' '}
          <span className="font-semibold text-ink-100">{result.facility.name}</span>
        </span>
        {result.heldForReview > 0 && (
          <span className="pill" data-state="expiring_unused">
            {result.heldForReview} held for a human
          </span>
        )}
      </div>

      {moved.length > 0 && (
        <div className="border-t rule px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.12em] text-ink-400">
            {moved.length} medicines changed posture
          </p>
          <ul className="mt-2 space-y-1.5">
            {moved.slice(0, 6).map((c) => (
              <li key={c.drugId} className="flex flex-wrap items-baseline gap-2 text-[12px]">
                <span className="font-medium text-ink-100">{c.drug}</span>
                <span className="pill" data-state={c.statusBefore ?? 'adequate'}>
                  {(c.statusBefore ?? 'unknown').replace('_', ' ')}
                </span>
                <span className="text-ink-400">to</span>
                <span className="pill" data-state={c.statusAfter}>
                  {c.statusAfter.replace('_', ' ')}
                </span>
                <span className="tabular ml-auto text-ink-400">
                  {c.onHandBefore?.toLocaleString() ?? '?'} to {c.onHandAfter.toLocaleString()} units
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t rule px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.12em] text-flow">
          {result.newProposalCount} transfers now exist that did not before
        </p>
        <ul className="mt-2 space-y-2">
          {result.proposals.slice(0, 4).map((p) => (
            <li key={p.id} className="text-[12px] leading-relaxed">
              <span className="tabular font-semibold text-ink-100">
                {p.quantity.toLocaleString()}
              </span>{' '}
              <span className="text-ink-300">{p.unit}s of</span>{' '}
              <span className="text-ink-100">{p.drugName}</span>
              <br />
              <span className="text-expiry">{p.fromName}</span>
              <span className="text-ink-400"> to </span>
              <span className="text-shortage">{p.toName}</span>
              <span className="tabular text-ink-400">
                {' '}· {p.distanceKm} km · averts {p.stockoutDaysAverted} stock-out
                {p.stockoutDaysAverted === 1 ? ' day' : ' days'}
              </span>
              {p.crossesDistrict && (
                <span className="text-ink-400"> · crosses a district</span>
              )}
            </li>
          ))}
        </ul>

        <Link
          href="/console"
          className="mt-3 inline-block text-[12px] text-flow underline underline-offset-4"
        >
          See these in the district console
        </Link>
      </div>
    </div>
  );
}
