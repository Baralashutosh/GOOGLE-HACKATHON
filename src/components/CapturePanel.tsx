'use client';

import { useRef, useState } from 'react';
import type { CapturedStockRow, Drug, Facility } from '@/lib/types';
import { CommitPanel } from './CommitPanel';

/**
 * The last mile, demonstrated.
 *
 * Everything upstream assumes a facility can tell the mesh what is on its
 * shelf. Most primary facilities across BRICS cannot, because they have no
 * digital stock system and no intention of adopting one. They do have a paper
 * register and a phone. This turns those into inventory.
 */

interface ScanResult {
  rows: CapturedStockRow[];
  notes?: string;
  model?: string;
  elapsedMs: number;
  accepted: number;
  needsReview: number;
  reviewThreshold: number;
}

const SAMPLES = [
  { code: 'IN', label: 'India', file: '/samples/register_in.jpg', sub: 'PHC Kanti, Bihar, Form 7-A' },
  { code: 'BR', label: 'Brazil', file: '/samples/register_br.jpg', sub: 'UBS Itacoatiara, Amazonas, in Portuguese' },
  { code: 'ZA', label: 'South Africa', file: '/samples/register_za.jpg', sub: 'Mtubatuba Clinic, KwaZulu-Natal' },
  { code: 'IN', label: 'Damaged page', file: '/samples/register_in_damaged.jpg', sub: 'Water damage, tea ring, crease, heavy blur' },
];

export function CapturePanel({ drugs, facilities }: { drugs: Drug[]; facilities: Facility[] }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const drugName = (id: string | null) =>
    drugs.find((d) => d.id === id)?.inn ?? null;

  async function scan(file: File | Blob, previewUrl: string) {
    setBusy(true);
    setError(null);
    setResult(null);
    setPreview(previewUrl);

    try {
      const form = new FormData();
      form.append('file', file, 'register.jpg');
      const res = await fetch('/api/scan', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Extraction failed.');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function scanSample(path: string) {
    setBusy(true);
    try {
      const blob = await (await fetch(path)).blob();
      await scan(blob, path);
    } catch {
      setError('Could not load the sample register.');
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
      {/* ---------------- input ---------------- */}
      <div className="space-y-4">
        <div className="panel p-5">
          <h2 className="text-[14px] font-semibold">Read a stock register</h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-400">
            These are photographs of filled paper forms, shot at an angle under
            uneven light, the way a pharmacist would actually send one.
          </p>

          <div className="mt-4 space-y-2">
            {SAMPLES.map((s) => (
              <button
                key={s.code}
                onClick={() => scanSample(s.file)}
                disabled={busy}
                className="panel panel-hover flex w-full items-center gap-3 p-3 text-left disabled:opacity-50"
              >
                <span className="tabular rounded-md bg-ink-800 px-2 py-1 text-[11px] font-semibold text-flow">
                  {s.code}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium">{s.label}</span>
                  <span className="block truncate text-[11px] text-ink-400">{s.sub}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 border-t rule pt-4">
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) scan(f, URL.createObjectURL(f));
              }}
            />
            <button
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              className="w-full rounded-lg border border-dashed border-ink-600 px-4 py-3 text-[13px] text-ink-300 transition-colors hover:border-flow/60 hover:text-flow disabled:opacity-50"
            >
              Or photograph your own register
            </button>
          </div>
        </div>

        {preview && (
          <div className="panel overflow-hidden">
            {/* Plain img: these are local sample photos of varying dimensions,
                and next/image would add layout constraints for no benefit. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="The register being read" className="w-full" />
          </div>
        )}
      </div>

      {/* ---------------- output ---------------- */}
      <div className="panel min-h-[420px] overflow-hidden">
        {busy && <Working />}

        {!busy && !result && !error && (
          <div className="flex h-full flex-col items-center justify-center p-10 text-center">
            <p className="text-[14px] text-ink-300">
              Pick a register on the left.
            </p>
            <p className="mt-2 max-w-sm text-[12px] leading-relaxed text-ink-400">
              Gemini reads the handwriting, and the extracted rows are matched
              to the WHO essential medicines catalogue in code, never by the
              model. Anything it is unsure of is held for a human.
            </p>
          </div>
        )}

        {error && (
          <div className="p-6">
            <p className="pill" data-state="stocked_out">Extraction failed</p>
            <p className="mt-3 text-[13px] text-ink-200">{error}</p>
          </div>
        )}

        {result && (
          <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-center gap-3 border-b rule px-4 py-3">
              <span className="pill" data-state="flow">
                {result.rows.length} rows read
              </span>
              {result.needsReview > 0 ? (
                <span className="pill" data-state="expiring_unused">
                  {result.needsReview} held for review
                </span>
              ) : (
                <span className="pill" data-state="adequate">all above threshold</span>
              )}
              <span className="ml-auto tabular text-[11px] text-ink-400">
                {(result.elapsedMs / 1000).toFixed(1)}s
                {result.model && `, ${result.model}`}
              </span>
            </div>

            {result.notes && (
              <div className="border-b rule bg-expiry/[0.06] px-4 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.12em] text-expiry">
                  What the model was unsure of
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-200">
                  {result.notes}
                </p>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="border-b rule text-[10px] uppercase tracking-[0.1em] text-ink-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">As written</th>
                    <th className="px-3 py-2 font-medium">Matched medicine</th>
                    <th className="px-3 py-2 font-medium">Batch</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 font-medium">Expiry</th>
                    <th className="px-3 py-2 text-right font-medium">Conf.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-800">
                  {result.rows.map((r, i) => {
                    const low = r.confidence < result.reviewThreshold;
                    return (
                      <tr key={i} className={low ? 'bg-expiry/[0.06]' : undefined}>
                        <td className="px-3 py-2 text-ink-300">{r.rawName}</td>
                        <td className="px-3 py-2">
                          {r.drugId ? (
                            <span className="text-ink-100">{drugName(r.drugId)}</span>
                          ) : (
                            <span className="text-shortage">not in catalogue</span>
                          )}
                        </td>
                        <td className="tabular px-3 py-2 text-ink-300">{r.batchNo ?? '—'}</td>
                        <td className="tabular px-3 py-2 text-right text-ink-100">
                          {r.quantity?.toLocaleString() ?? '?'}
                        </td>
                        <td className="tabular px-3 py-2 text-ink-300">{r.expiryDate ?? '?'}</td>
                        <td className="tabular px-3 py-2 text-right">
                          <span className={low ? 'text-expiry' : 'text-flow'}>
                            {(r.confidence * 100).toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <CommitPanel rows={result.rows} facilities={facilities} source="register_photo" />

            <div className="mt-auto border-t rule px-4 py-3">
              <p className="text-[11px] leading-relaxed text-ink-400">
                Rows at or above {(result.reviewThreshold * 100).toFixed(0)}%
                confidence are committed to the mesh. Anything below is queued
                for a human, because a confident wrong number does not stay on a
                screen, it sends medicine to the wrong clinic.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Working() {
  const steps = [
    'Uploading the page',
    'Reading handwriting',
    'Matching to the medicines catalogue',
    'Scoring confidence per row',
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-3 p-10">
      {steps.map((s, i) => (
        <div
          key={s}
          className="flex items-center gap-3 text-[13px] text-ink-300"
          style={{ animation: `rise 0.5s ease-out ${i * 0.35}s both` }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-flow" />
          {s}
        </div>
      ))}
      <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-ink-800">
        <div
          className="h-full w-1/3 rounded-full bg-flow"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--color-flow), transparent)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.6s linear infinite',
            width: '100%',
          }}
        />
      </div>
    </div>
  );
}
