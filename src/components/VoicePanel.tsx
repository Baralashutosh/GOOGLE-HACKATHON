'use client';

import { useRef, useState } from 'react';
import type { CapturedStockRow, Drug } from '@/lib/types';

/**
 * Stock reporting by voice.
 *
 * A pharmacist with one hand on a register and a queue at the counter will not
 * open a laptop. They will hold a button and talk. Gemini takes the audio
 * directly, so transcription, translation and structuring happen in one call
 * and a health worker in Muzaffarpur, Manaus or Mtubatuba speaks their own
 * language into the same endpoint.
 */

/**
 * Pre-recorded reports, so the feature works with no microphone.
 *
 * Microphone permission is the single most fragile thing in this demo: a judge
 * opening the deployed link may decline it, a screen recorder may hold the
 * device, and a conference laptop may have no working input at all. These were
 * synthesised with Gemini TTS and are read by the same endpoint as live speech,
 * so nothing about the demonstration is faked, only the microphone is skipped.
 */
const SAMPLES = [
  { id: 'voice_en', label: 'Play an English report', file: '/samples/voice_en.wav' },
  { id: 'voice_hi', label: 'Play a Hindi report', file: '/samples/voice_hi.wav' },
];

const LANGUAGES = [
  { code: '', label: 'Detect automatically' },
  { code: 'Hindi', label: 'हिन्दी, Hindi' },
  { code: 'Portuguese', label: 'Português' },
  { code: 'isiZulu', label: 'isiZulu' },
  { code: 'English', label: 'English' },
];

interface VoiceResult {
  rows: CapturedStockRow[];
  notes?: string;
  model?: string;
  elapsedMs: number;
  needsReview: number;
  reviewThreshold: number;
}

export function VoicePanel({ drugs }: { drugs: Drug[] }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('');

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const drugName = (id: string | null) => drugs.find((d) => d.id === id)?.inn ?? null;

  async function start() {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      mr.onstop = () => {
        /* Release the microphone. Leaving it open lights the browser's
           recording indicator for the rest of the session, which is alarming
           and rightly so. */
        stream.getTracks().forEach((t) => t.stop());
        void send(new Blob(chunks.current, { type: mr.mimeType }));
      };
      mr.start();
      recorder.current = mr;
      setRecording(true);
      setSeconds(0);
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError('Could not reach the microphone. Check the browser permission.');
    }
  }

  function stop() {
    recorder.current?.stop();
    recorder.current = null;
    setRecording(false);
    if (timer.current) clearInterval(timer.current);
  }

  async function playSample(file: string) {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      // Play it aloud as well as sending it: hearing the accent and the
      // code-switching is most of the point.
      new Audio(file).play().catch(() => { /* autoplay policy, not fatal */ });
      const blob = await (await fetch(file)).blob();
      await send(blob);
    } catch {
      setError('Could not load the sample recording.');
      setBusy(false);
    }
  }

  async function send(blob: Blob) {
    if (blob.size === 0) {
      setError('Nothing was recorded. Hold the button while you speak.');
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', blob, 'note.webm');
      if (language) form.append('language', language);
      const res = await fetch('/api/voice', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not read the recording.');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel p-6">
      <div className="flex flex-wrap items-start gap-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold">Report stock by voice</h2>
          <p className="mt-1.5 max-w-lg text-[12px] leading-relaxed text-ink-400">
            Hold the button and say what is on the shelf, in whichever language
            you think in. Try: &ldquo;Amoxicillin five hundred, batch H36223, two
            thousand three hundred and twenty four left, expires August
            twenty twenty seven.&rdquo; No microphone? Play one of the recorded
            reports instead, they go through the same endpoint.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onMouseDown={start}
              onMouseUp={stop}
              onMouseLeave={() => recording && stop()}
              onTouchStart={(e) => { e.preventDefault(); void start(); }}
              onTouchEnd={(e) => { e.preventDefault(); stop(); }}
              disabled={busy}
              className={`flex items-center gap-2.5 rounded-full px-5 py-3 text-[13px] font-semibold transition-all disabled:opacity-50 ${
                recording
                  ? 'scale-105 bg-shortage text-ink-950'
                  : 'bg-flow text-ink-950 hover:scale-[1.03]'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full bg-ink-950 ${recording ? 'animate-pulse' : ''}`}
              />
              {recording ? `Recording ${seconds}s, release to send` : 'Hold to speak'}
            </button>

            {SAMPLES.map((s2) => (
              <button
                key={s2.id}
                onClick={() => playSample(s2.file)}
                disabled={busy || recording}
                className="rounded-full border border-ink-600 px-4 py-2.5 text-[12px] text-ink-200 transition-colors hover:border-flow/60 hover:text-flow disabled:opacity-50"
              >
                {s2.label}
              </button>
            ))}

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-lg border rule bg-ink-850 px-3 py-2 text-[12px] text-ink-200"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>

          {busy && (
            <p className="mt-4 text-[13px] text-flow">Listening back and structuring...</p>
          )}
          {error && (
            <p className="mt-4 text-[13px] text-shortage">{error}</p>
          )}
        </div>

        {result && (
          <div className="min-w-[300px] flex-1">
            <div className="flex items-center gap-2">
              <span className="pill" data-state="flow">{result.rows.length} reported</span>
              <span className="ml-auto tabular text-[11px] text-ink-400">
                {(result.elapsedMs / 1000).toFixed(1)}s
              </span>
            </div>

            {result.notes && (
              <blockquote className="mt-3 border-l-2 border-ink-600 pl-3 text-[12px] italic leading-relaxed text-ink-300">
                {result.notes}
              </blockquote>
            )}

            <ul className="mt-3 divide-y divide-ink-800">
              {result.rows.map((r, i) => (
                <li key={i} className="flex items-baseline gap-2 py-2 text-[12px]">
                  <span className="tabular font-semibold text-ink-100">
                    {r.quantity?.toLocaleString() ?? '?'}
                  </span>
                  <span className="text-ink-200">
                    {drugName(r.drugId) ?? (
                      <span className="text-shortage">{r.rawName}, not in catalogue</span>
                    )}
                  </span>
                  {r.batchNo && (
                    <span className="tabular text-ink-400">batch {r.batchNo}</span>
                  )}
                  <span
                    className={`tabular ml-auto ${
                      r.confidence < result.reviewThreshold ? 'text-expiry' : 'text-flow'
                    }`}
                  >
                    {(r.confidence * 100).toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
