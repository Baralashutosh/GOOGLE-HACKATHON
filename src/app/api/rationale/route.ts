/**
 * Write the sentence a district officer reads before signing a transfer.
 *
 * Every figure passed to the model is already computed. Its job is to make the
 * reasoning legible, never to invent it, because an officer who does not
 * understand a proposal will not authorise it, and an unauthorised transfer
 * moves nothing.
 */

import { NextResponse } from 'next/server';
import { writeRationale } from '@/lib/gemini';
import { load } from '@/lib/data';

/** Turn the projection into something a sentence can be built around. */
function describePosition(daysToStockout: number | null): string {
  if (daysToStockout === null) return 'is not currently projected to run out';
  if (daysToStockout <= 0) return 'has none on the shelf today';
  if (daysToStockout === 1) return 'runs out tomorrow';
  return `runs out in ${daysToStockout} days`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const id = body?.proposalId;
    if (typeof id !== 'string') {
      return NextResponse.json({ error: 'proposalId is required.' }, { status: 400 });
    }

    const { mesh, facilities, drugs } = load();
    const proposal = mesh.proposals.find((p) => p.id === id);
    if (!proposal) {
      return NextResponse.json({ error: 'No such proposal.' }, { status: 404 });
    }

    const from = facilities.find((f) => f.id === proposal.fromFacilityId);
    const to = facilities.find((f) => f.id === proposal.toFacilityId);
    const drug = drugs.find((d) => d.id === proposal.drugId);
    if (!from || !to || !drug) {
      return NextResponse.json({ error: 'Proposal references missing records.' }, { status: 500 });
    }

    const recipient = mesh.assessments.find(
      (a) => a.facilityId === to.id && a.drugId === drug.id);

    const rationale = await writeRationale({
      drug: drug.inn,
      quantity: proposal.quantity,
      unit: drug.unit,
      fromFacility: from.name,
      toFacility: to.name,
      distanceKm: proposal.distanceKm,
      expiryDate: proposal.expiryDate,
      stockoutDaysAverted: proposal.stockoutDaysAverted,
      crossesDistrict: proposal.crossesDistrict,
      recipientPosition: describePosition(recipient?.daysToStockout ?? null),
    });

    return NextResponse.json({ rationale });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const missingKey = message.includes('GEMINI_API_KEY');
    return NextResponse.json(
      {
        error: missingKey
          ? 'Gemini is not configured on the server.'
          : 'Could not write a justification for this transfer.',
      },
      { status: missingKey ? 503 : 502 });
  }
}
