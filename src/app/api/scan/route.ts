/**
 * Read a photographed stock register.
 *
 * Accepts what a phone actually sends: one image file in a multipart form.
 */

import { NextResponse } from 'next/server';
import { readRegister, REVIEW_THRESHOLD } from '@/lib/gemini';
import { getDrugs } from '@/lib/data';

/** A phone photo is comfortably under this. Beyond it, someone is not sending a register. */
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export async function POST(request: Request) {
  try {
    const form = await request.formData().catch(() => null);
    if (!form) {
      return NextResponse.json(
        { error: 'Send the image as multipart form data with a "file" field.' },
        { status: 400 });
    }

    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file was attached.' }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'That file is empty.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `That image is ${(file.size / 1e6).toFixed(1)}MB. The limit is 8MB.` },
        { status: 413 });
    }

    const mimeType = file.type || 'image/jpeg';
    if (!ACCEPTED.includes(mimeType)) {
      return NextResponse.json(
        { error: `${mimeType} is not a supported image type.` },
        { status: 415 });
    }

    const facilityId = String(form.get('facilityId') ?? 'f_in_001');
    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');

    const started = Date.now();
    const result = await readRegister(base64, mimeType, facilityId, getDrugs());

    return NextResponse.json({
      ...result,
      elapsedMs: Date.now() - started,
      reviewThreshold: REVIEW_THRESHOLD,
      /* Split here rather than in the browser: what is safe to commit and what
         a human must look at is a decision about medicine, not about layout. */
      accepted: result.rows.filter((r) => r.confidence >= REVIEW_THRESHOLD).length,
      needsReview: result.rows.filter((r) => r.confidence < REVIEW_THRESHOLD).length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    /* Never leak a key or a stack to the client, but say enough that the
       problem is fixable rather than mysterious. */
    const missingKey = message.includes('GEMINI_API_KEY');
    return NextResponse.json(
      {
        error: missingKey
          ? 'Gemini is not configured on the server.'
          : 'Could not read that register. Try a clearer photo of the full page.',
        detail: missingKey ? message : undefined,
      },
      { status: missingKey ? 503 : 502 });
  }
}
