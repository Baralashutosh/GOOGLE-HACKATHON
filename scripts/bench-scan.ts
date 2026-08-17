/**
 * Find the fastest configuration that still reads a register perfectly.
 *
 * Accuracy was 100% at 25-35s per page. That is correct and unusable: nobody
 * watches a progress spinner for half a minute in a demo, let alone a clinic.
 * Gemini 3 models think before answering, and transcription may not need much
 * of it. This measures the trade rather than guessing at it.
 *
 * Run: node --env-file=.env.local --import tsx scripts/bench-scan.ts
 */

import { GoogleGenAI, Type } from '@google/genai';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const image = readFileSync(join(ROOT, 'public', 'samples', 'register_in.jpg'));
const truth = JSON.parse(
  readFileSync(join(ROOT, 'public', 'samples', 'register_in.truth.json'), 'utf8'));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const schema = {
  type: Type.OBJECT,
  properties: {
    rows: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          rawName: { type: Type.STRING },
          batchNo: { type: Type.STRING },
          quantity: { type: Type.NUMBER, nullable: true },
          expiryDate: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
        },
        required: ['rawName', 'batchNo', 'quantity', 'expiryDate', 'confidence'],
      },
    },
  },
  required: ['rows'],
};

const PROMPT = `Read every filled row of this stock register.
Transcribe the medicine name EXACTLY as written. The "Balance" column is the
quantity. Expiry MM/YY means the last day of that month, format YYYY-MM-DD.
Give an honest confidence 0-1 per row.`;

interface Variant { label: string; model: string; thinking?: number }

const variants: Variant[] = [
  { label: '3.7-flash  default thinking', model: 'gemini-3.7-flash' },
  { label: '3.7-flash  thinking 0', model: 'gemini-3.7-flash', thinking: 0 },
  { label: '3.5-flash  thinking 0', model: 'gemini-3.5-flash', thinking: 0 },
  { label: '3.1-flash-lite thinking 0', model: 'gemini-3.1-flash-lite', thinking: 0 },
  { label: '2.5-flash  thinking 0', model: 'gemini-2.5-flash', thinking: 0 },
];

async function main() {
  console.log('variant                        time    rows  qty-exact  batch-exact');
  console.log('-'.repeat(70));

  for (const v of variants) {
    const started = Date.now();
    try {
      const res = await ai.models.generateContent({
        model: v.model,
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: image.toString('base64') } },
            { text: PROMPT },
          ],
        }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0,
          ...(v.thinking !== undefined
            ? { thinkingConfig: { thinkingBudget: v.thinking } }
            : {}),
        },
      });
      const secs = (Date.now() - started) / 1000;
      const rows = JSON.parse(res.text ?? '{"rows":[]}').rows ?? [];

      let qty = 0, batch = 0;
      const n = Math.min(rows.length, truth.rows.length);
      for (let i = 0; i < n; i++) {
        if (rows[i].quantity === truth.rows[i].balance) qty++;
        if (rows[i].batchNo === truth.rows[i].batchNo) batch++;
      }
      console.log(
        `${v.label.padEnd(30)} ${secs.toFixed(1).padStart(5)}s  ${String(rows.length).padStart(4)}`
        + `  ${String(qty).padStart(6)}/14  ${String(batch).padStart(8)}/14`);
    } catch (err) {
      console.log(`${v.label.padEnd(30)}  FAILED  ${(err as Error).message.slice(0, 60)}`);
    }
  }
}

main();
