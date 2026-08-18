/**
 * Gemini: the bridge from paper to the mesh.
 *
 * Every logistics platform built for public health has asked frontline
 * facilities to start typing their stock into a system. They did not, which is
 * why national dashboards glow green while the shelf is empty. The register the
 * pharmacist already keeps is the only record that reliably exists.
 *
 * So MedMesh reads that. A phone photo of a paper page, or twenty seconds of
 * speech in whatever language the pharmacist actually speaks, becomes
 * structured inventory. No new workflow, no new hardware, no training.
 *
 * Three jobs here, all load-bearing:
 *   readRegister, handwriting on a photographed form -> rows
 *   readVoiceNote, speech in any BRICS language -> rows
 *   writeRationale,  a transfer proposal -> a sentence an officer will act on
 */

import { GoogleGenAI, Type } from '@google/genai';
import type { CapturedStockRow, CaptureResult, Drug, StockSource } from './types';

/**
 * Reading a register is transcription, not reasoning, and it was benchmarked
 * as such: flash-lite with thinking disabled read all 14 rows perfectly in
 * 4.6s, where the larger model took 26-35s for exactly the same answer. Six
 * times the wait for nothing. The small model is also far less contended,
 * which matters more than raw capability when judges are hitting the deployed
 * link at once.
 *
 * scripts/bench-scan.ts reproduces the comparison.
 */
const EXTRACTION_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite';

/** One sentence of judgement for a human. Worth a slightly larger model. */
const RATIONALE_MODEL = process.env.GEMINI_RATIONALE_MODEL ?? 'gemini-3.5-flash';

/**
 * Models to fall back through when the primary is unavailable.
 *
 * The free tier returns 503 under load, and did so repeatedly during
 * development. A demo that dies because one model was busy is a demo that dies
 * on stage, so a busy model degrades to another rather than to an error page.
 */
const FALLBACKS: Record<string, string[]> = {
  [EXTRACTION_MODEL]: ['gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-flash-latest'],
  [RATIONALE_MODEL]: ['gemini-flash-latest', 'gemini-3.1-flash-lite'],
};

const RETRIES_PER_MODEL = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 503 and 429 are worth waiting out. A 400 is our bug and retrying hides it. */
function isTransient(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 503 || status === 429 || status === 500;
}

/**
 * Call Gemini, surviving a busy model.
 *
 * Exponential backoff within a model, then step down to the next one. Returns
 * which model actually answered so the UI can be honest about it rather than
 * silently claiming the headline model did the work.
 */
async function generate(
  primary: string,
  request: Omit<Parameters<GoogleGenAI['models']['generateContent']>[0], 'model'>,
): Promise<{ text: string; model: string }> {
  const ai = client();
  let lastError: unknown;

  for (const model of [primary, ...(FALLBACKS[primary] ?? [])]) {
    for (let attempt = 0; attempt < RETRIES_PER_MODEL; attempt++) {
      try {
        const response = await ai.models.generateContent({ ...request, model });
        const text = response.text;
        if (!text) throw new Error('Gemini returned an empty response.');
        return { text, model };
      } catch (err) {
        lastError = err;
        if (!isTransient(err)) break;          // our fault, next model won't help
        await sleep(400 * 2 ** attempt + Math.random() * 250);
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`Gemini unavailable: ${String(lastError)}`);
}

/**
 * Below this, a row goes to a human instead of into stock.
 *
 * Deliberately conservative. A wrong stock number does not stay wrong on a
 * screen, it moves medicine to the wrong clinic. Confident nonsense is the one
 * failure mode this system cannot tolerate, so the model is instructed to admit
 * uncertainty and we route anything shaky to review.
 */
export const REVIEW_THRESHOLD = 0.75;

function client(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'paste-your-key-here') {
    throw new Error(
      'GEMINI_API_KEY is not set. Copy .env.example to .env.local and paste a key '
      + 'from https://aistudio.google.com.');
  }
  return new GoogleGenAI({ apiKey });
}

/** Schema shared by the photo and voice paths, one shape, one downstream. */
const STOCK_ROWS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    rows: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          rawName: { type: Type.STRING, description: 'Medicine name exactly as written or spoken, unchanged.' },
          batchNo: { type: Type.STRING, description: 'Batch or lot number. Empty string if absent.' },
          quantity: { type: Type.NUMBER, description: 'Closing balance on hand. Null if unreadable.', nullable: true },
          expiryDate: { type: Type.STRING, description: 'Expiry as YYYY-MM-DD. Use the last day of the month when only month and year are given. Empty string if absent.' },
          confidence: { type: Type.NUMBER, description: 'Your genuine confidence 0-1 that every field in this row is correct.' },
        },
        required: ['rawName', 'batchNo', 'quantity', 'expiryDate', 'confidence'],
      },
    },
    notes: { type: Type.STRING, description: 'Anything ambiguous, damaged or unreadable.' },
  },
  required: ['rows', 'notes'],
};

const EXTRACTION_RULES = `
You are reading a stock record from a primary health facility. The output moves
real medicine between real clinics, so accuracy matters more than completeness.

Rules:
- Transcribe the medicine name EXACTLY as written or spoken. Do not translate,
  expand abbreviations, correct spelling, or substitute a name you think is
  more likely. Downstream code does the matching to the drug catalogue.
- "Balance", "Saldo", "Closing" or the final column is the quantity on hand.
  Not the opening balance, not the quantity issued.
- Expiry written as MM/YY means the LAST day of that month.
- If a digit is genuinely ambiguous, give your best reading and drop confidence
  below 0.7. Never invent a value to fill a field.
- Skip blank rows entirely rather than emitting empty ones.
- Confidence must be honest. A wrong number that looks certain is worse than an
  uncertain one, because nobody checks the confident ones.
`.trim();

/**
 * Read a photographed paper stock register.
 *
 * The image is what a pharmacist would actually send: shot at an angle, uneven
 * light, handwriting cramped into printed columns.
 */
export async function readRegister(
  imageBase64: string,
  mimeType: string,
  facilityId: string,
  catalogue: Drug[]): Promise<CaptureResult> {
  const { text, model } = await generate(EXTRACTION_MODEL, {
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: imageBase64 } },
        {
          text: `${EXTRACTION_RULES}\n\nRead every filled row of this stock register.`,
        },
      ],
    }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: STOCK_ROWS_SCHEMA,
      // Transcription, not composition. Sampling variety here is pure downside.
      temperature: 0,
      // Benchmarked: thinking adds 20+ seconds and changes not one character
      // of the answer. See scripts/bench-scan.ts.
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  return { ...toCaptureResult(text, facilityId, 'register_photo', catalogue), model };
}

/**
 * Read a spoken stock report.
 *
 * Gemini handles the audio natively, transcription, translation and structuring
 * in one call rather than three services chained together. That matters beyond
 * elegance: a health worker in Muzaffarpur, Manaus or Mtubatuba speaks into the
 * same endpoint in their own language and the mesh receives the same schema.
 */
export async function readVoiceNote(
  audioBase64: string,
  mimeType: string,
  facilityId: string,
  catalogue: Drug[],
  languageHint?: string): Promise<CaptureResult> {
  const { text, model } = await generate(EXTRACTION_MODEL, {
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: audioBase64 } },
        {
          text: `${EXTRACTION_RULES}\n\nThis is a pharmacist reporting current stock aloud`
            + `${languageHint ? `, likely in ${languageHint}` : ''}. They may speak Hindi, `
            + `Portuguese, isiZulu, English or a mixture, and may switch mid-sentence. `
            + `Extract each medicine they report. Keep the medicine name in the language `
            + `they said it. Put a plain transcript of what they said in notes.`,
        },
      ],
    }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: STOCK_ROWS_SCHEMA,
      temperature: 0,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  return { ...toCaptureResult(text, facilityId, 'voice_note', catalogue), model };
}

function toCaptureResult(
  raw: string | undefined,
  facilityId: string,
  source: StockSource,
  catalogue: Drug[]): CaptureResult {
  if (!raw) throw new Error('Gemini returned an empty response.');

  let parsed: { rows?: unknown[]; notes?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Gemini returned malformed JSON: ${raw.slice(0, 200)}`);
  }

  const rows: CapturedStockRow[] = (parsed.rows ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const rawName = String(row.rawName ?? '').trim();
    const match = matchDrug(rawName, catalogue);
    const quantity = row.quantity === null || row.quantity === undefined
      ? null
      : Number(row.quantity);

    return {
      rawName,
      drugId: match.drugId,
      batchNo: str(row.batchNo),
      quantity: Number.isFinite(quantity) ? quantity : null,
      expiryDate: normaliseDate(str(row.expiryDate)),
      // The model's confidence in its reading, tempered by ours in the name
      // match. A perfectly-read name we cannot place in the catalogue is not a
      // usable row, and should not present itself as one.
      confidence: Math.min(clamp01(Number(row.confidence ?? 0)), match.confidence),
    };
  }).filter((r) => r.rawName.length > 0);

  return { facilityId, source, rows, notes: parsed.notes };
}

function str(v: unknown): string | null {
  const s = String(v ?? '').trim();
  return s.length ? s : null;
}

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

function normaliseDate(s: string | null): string | null {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Month precision only: take the last day of that month, which is when the
  // stock genuinely stops being usable.
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (m) {
    const last = new Date(Date.UTC(Number(m[1]), Number(m[2]), 0));
    return last.toISOString().slice(0, 10);
  }
  return null;
}

/**
 * Resolve written or spoken text to a catalogue drug.
 *
 * Kept as deterministic code rather than asking the model to pick. The
 * catalogue is the system of record; letting a language model choose the
 * molecule invites a confident, invisible substitution, and "confidently wrong
 * medicine" is the failure that ends a pilot.
 */
export function matchDrug(
  rawName: string,
  catalogue: Drug[]): { drugId: string | null; confidence: number } {
  const q = normalise(rawName);
  if (!q) return { drugId: null, confidence: 0 };

  let best: { drugId: string; score: number } | null = null;

  for (const drug of catalogue) {
    const candidates = [drug.inn, ...Object.values(drug.localNames)];
    for (const c of candidates) {
      const score = similarity(q, normalise(c));
      if (!best || score > best.score) best = { drugId: drug.id, score };
    }
  }

  if (!best || best.score < 0.55) return { drugId: null, confidence: 0 };
  return { drugId: best.drugId, confidence: best.score };
}

/**
 * Dosage forms, in the languages the catalogue carries.
 *
 * The catalogue keeps `form` as its own field because the form is not the
 * medicine, and the matcher has to agree. Left in, a register row reading only
 * "Tablet" scored 0.92 against "IFA Tablet" and would have committed a stock
 * count of iron supplements on the strength of one generic noun.
 */
const FORM_WORDS =
  /\b(tablets?|capsules?|injections?|inj|vials?|sachets?|inhalers?|syrups?|ampoules?|solutions?|drops?|comprimidos?|capsulas?|injecao|ampolas?|aerossol|saches?|frascos?|gotas?)\b/g;

function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')     // strip accents: "Ácido" -> "acido"
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b\d+\s*(mg|ml|mcg|iu|g)\b/g, ' ')  // dose is not identity
    .replace(FORM_WORDS, ' ')                    // nor is the dosage form
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * How closely a spoken or written name matches a catalogue name.
 *
 * Dice alone is wrong here, and a live voice test proved it: a pharmacist who
 * says just "insulin" scores 2x1/(1+3) = 0.5 against "Insulin (human, soluble)"
 * and falls under the threshold, so the medicine goes unmatched. Saying the
 * bare molecule is the most natural thing a person can do.
 *
 * So containment counts too. When every token of one name appears in the other,
 * that is a strong match regardless of how many extra words the catalogue
 * carries. It is scored just below an exact token match so a fuller name still
 * wins when both are present.
 */
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ta = new Set(a.split(' ').filter(Boolean));
  const tb = new Set(b.split(' ').filter(Boolean));
  if (!ta.size || !tb.size) return 0;

  let shared = 0;
  for (const t of ta) {
    if (tb.has(t)) shared += 1;
    // Credit near-misses so a shaky transcription still lands: "amoxicilina"
    // against "amoxicillin" should not score zero.
    //
    // BOTH tokens must be long enough to carry a prefix. Without the guard on
    // the query token, the single letter in "vitamin C" prefix-matched
    // "ceftriaxone" and scored 0.74, which is the precise failure this system
    // must never make: a confident substitution of one medicine for another.
    else if (t.length >= 5 && [...tb].some(
      (u) => u.length >= 5 && (u.startsWith(t.slice(0, 5)) || t.startsWith(u.slice(0, 5))))) {
      shared += 0.8;
    }
  }

  const dice = (2 * shared) / (ta.size + tb.size);
  // Containment: what fraction of the shorter name is present in the longer.
  const coverage = shared / Math.min(ta.size, tb.size);
  return Math.max(dice, 0.92 * coverage);
}

/**
 * Write the sentence a district officer reads before signing.
 *
 * This is not decoration. Redistribution fails for want of permission far more
 * often than for want of arithmetic; an officer who does not understand why a
 * transfer is proposed will not authorise it, and unauthorised transfers move
 * nothing. The model's job is to make the reasoning legible, never to invent
 * the reasoning, every figure it is given is already computed.
 */
export async function writeRationale(facts: {
  drug: string;
  quantity: number;
  unit: string;
  fromFacility: string;
  toFacility: string;
  distanceKm: number;
  expiryDate: string;
  stockoutDaysAverted: number;
  crossesDistrict: boolean;
  /**
   * Already phrased, not a raw count. Passing 0 produced "faces 0 days to
   * stockout", which reads as a broken field rather than the emergency it
   * actually describes: the shelf is empty today.
   */
  recipientPosition: string;
}): Promise<string> {
  const { text } = await generate(RATIONALE_MODEL, {
    contents: `Write ONE sentence, maximum 34 words, briefing a district health
officer who is deciding whether to approve this medicine transfer.

Rules:
- Lead with what happens if nobody acts. That is the reason the transfer exists.
- Third person, stating the situation. Never first person. You are not the
  officer and must not say "I approve", "I recommend" or "we should".
- Plain language a non-clinician reads once and understands. No greeting, no
  jargon, no closing.
- Use only the facts given. Invent nothing, round nothing.

Facts:

${JSON.stringify(facts, null, 2)}`,
    config: { temperature: 0.3, maxOutputTokens: 24000 },
  });

  return text.trim();
}
