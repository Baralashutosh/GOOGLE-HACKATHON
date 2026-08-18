/**
 * Commit a stock count into the mesh, and report what changed.
 *
 * This closes the loop the prototype was missing. Reading a register was
 * previously a dead end: impressive extraction, then nothing. But the whole
 * claim is that a facility with no digital system can join the network by
 * photographing the page it already keeps, and that claim is only true if the
 * page actually moves the network.
 *
 * So: rows in, stock replaced, both clocks re-run for that facility, matcher
 * re-run against every other facility, and the before and after returned side
 * by side. Paper to transfer proposal, in one request.
 */

import { NextResponse } from 'next/server';
import { load, positions, reprojectPair, pairKey } from '@/lib/data';
import { proposeTransfers } from '@/lib/match';
import { REVIEW_THRESHOLD } from '@/lib/gemini';
import type { CapturedStockRow, StockBatch, RiskAssessment } from '@/lib/types';

/** Same shape the capture UI receives, so nothing is reinterpreted client-side. */
interface CommitBody {
  facilityId?: string;
  rows?: CapturedStockRow[];
  source?: 'register_photo' | 'voice_note' | 'manual';
}

export async function POST(request: Request) {
  const body: CommitBody | null = await request.json().catch(() => null);
  if (!body?.facilityId || !Array.isArray(body.rows)) {
    return NextResponse.json(
      { error: 'facilityId and rows are required.' }, { status: 400 });
  }

  const { mesh, facilities, drugs } = load();
  const facility = facilities.find((f) => f.id === body.facilityId);
  if (!facility) {
    return NextResponse.json({ error: 'No such facility.' }, { status: 404 });
  }

  /* Only rows the model was confident about, and only ones that resolved to a
     medicine in the catalogue. Everything else is a human's problem, by
     design: a wrong stock number does not stay wrong on a screen, it sends
     medicine to the wrong clinic. */
  const usable = body.rows.filter(
    (r) => r.drugId && r.quantity !== null && r.quantity >= 0
      && r.confidence >= REVIEW_THRESHOLD);

  const held = body.rows.length - usable.length;
  if (usable.length === 0) {
    return NextResponse.json({
      error: 'No rows were confident enough to commit.',
      heldForReview: held,
    }, { status: 422 });
  }

  const facilityMap = new Map(facilities.map((f) => [f.id, f]));
  const drugMap = new Map(drugs.map((d) => [d.id, d]));

  const before: RiskAssessment[] = [];
  const after: RiskAssessment[] = [];
  const updated = new Map<string, ReturnType<typeof reprojectPair>>();

  for (const row of usable) {
    const drugId = row.drugId!;
    const key = pairKey(facility.id, drugId);

    const priorPosition = positions().find(
      (p) => p.assessment.facilityId === facility.id && p.assessment.drugId === drugId);

    const batch: StockBatch = {
      facilityId: facility.id,
      drugId,
      batchNo: row.batchNo ?? 'UNLABELLED',
      quantity: row.quantity!,
      /* A register without a legible expiry is not a reason to treat the stock
         as immortal. Fall back to the shortest plausible remaining life so the
         projection stays cautious rather than optimistic. */
      expiryDate: row.expiryDate ?? defaultExpiry(mesh.asOf),
      lastCountedAt: mesh.asOf,
      source: body.source ?? 'register_photo',
    };

    const next = reprojectPair(facility.id, drugId, [batch]);
    if (!next) continue;

    if (priorPosition) before.push(priorPosition.assessment);
    after.push(next.assessment);
    updated.set(key, next);
  }

  /* Re-run the matcher over the whole network with the updated positions
     swapped in. Running it only over this facility would miss the point: a new
     count can just as easily make this facility a DONOR to someone else. */
  const network = positions().map((p) => {
    const swapped = updated.get(pairKey(p.assessment.facilityId, p.assessment.drugId));
    return swapped ?? p;
  });

  const priorIds = new Set(mesh.proposals.map((p) => p.id));
  const all = proposeTransfers(network, facilityMap, drugMap, mesh.asOf);

  const touching = all.filter(
    (p) => p.toFacilityId === facility.id || p.fromFacilityId === facility.id);
  const fresh = touching.filter((p) => !priorIds.has(p.id));

  return NextResponse.json({
    facility: { id: facility.id, name: facility.name, admin2: facility.admin2 },
    committed: usable.length,
    heldForReview: held,
    before: summarise(before),
    after: summarise(after),
    changed: after
      .map((a) => {
        const b = before.find((x) => x.drugId === a.drugId);
        const drug = drugMap.get(a.drugId);
        return {
          drugId: a.drugId,
          drug: drug?.inn ?? a.drugId,
          onHandBefore: b?.onHand ?? null,
          onHandAfter: a.onHand,
          statusBefore: b?.status ?? null,
          statusAfter: a.status,
          daysToStockoutBefore: b?.daysToStockout ?? null,
          daysToStockoutAfter: a.daysToStockout,
        };
      })
      /* Surface the medicines whose posture actually moved. A list where
         nothing changed is noise dressed as a result. */
      .sort((x, y) => Number(y.statusBefore !== y.statusAfter)
        - Number(x.statusBefore !== x.statusAfter)),
    proposals: fresh.slice(0, 8).map((p) => ({
      ...p,
      fromName: facilityMap.get(p.fromFacilityId)?.name,
      toName: facilityMap.get(p.toFacilityId)?.name,
      drugName: drugMap.get(p.drugId)?.inn,
      unit: drugMap.get(p.drugId)?.unit,
    })),
    newProposalCount: fresh.length,
  });
}

function summarise(rows: RiskAssessment[]) {
  return {
    stockedOut: rows.filter((r) => r.status === 'stocked_out').length,
    critical: rows.filter((r) => r.status === 'critical').length,
    expiring: rows.filter((r) => r.status === 'expiring_unused').length,
    unitsAtRisk: rows.reduce((s, r) => s + r.unitsAtRiskOfExpiry, 0),
  };
}

/** Six months, the shortest shelf life a delivery routinely arrives with. */
function defaultExpiry(asOf: string): string {
  const d = new Date(Date.parse(asOf) + 182 * 86_400_000);
  return d.toISOString().slice(0, 10);
}
