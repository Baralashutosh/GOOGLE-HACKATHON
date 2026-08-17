/**
 * Read a spoken stock report.
 *
 * The pharmacist speaks in whatever language they think in. Gemini transcribes,
 * translates and structures in one call, so Hindi, Portuguese and isiZulu all
 * arrive at the mesh as the same rows.
 */

import { NextResponse } from 'next/server';
import { readVoiceNote, REVIEW_THRESHOLD } from '@/lib/gemini';
import { getDrugs } from '@/lib/data';

const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const form = await request.formData().catch(() => null);
    if (!form) {
      return NextResponse.json(
        { error: 'Send the audio as multipart form data with a "file" field.' },
        { status: 400 });
    }

    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No audio was attached.' }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json(
        { error: 'The recording was empty. Hold the button while speaking.' },
        { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'That recording is too long. Keep it under a minute.' },
        { status: 413 });
    }

    const facilityId = String(form.get('facilityId') ?? 'f_in_001');
    const language = form.get('language');
    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');

    const started = Date.now();
    const result = await readVoiceNote(
      base64,
      file.type || 'audio/webm',
      facilityId,
      getDrugs(),
      typeof language === 'string' && language ? language : undefined);

    return NextResponse.json({
      ...result,
      elapsedMs: Date.now() - started,
      reviewThreshold: REVIEW_THRESHOLD,
      accepted: result.rows.filter((r) => r.confidence >= REVIEW_THRESHOLD).length,
      needsReview: result.rows.filter((r) => r.confidence < REVIEW_THRESHOLD).length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const missingKey = message.includes('GEMINI_API_KEY');
    return NextResponse.json(
      {
        error: missingKey
          ? 'Gemini is not configured on the server.'
          : 'Could not read that recording. Speak the medicine name and the quantity.',
        detail: missingKey ? message : undefined,
      },
      { status: missingKey ? 503 : 502 });
  }
}
