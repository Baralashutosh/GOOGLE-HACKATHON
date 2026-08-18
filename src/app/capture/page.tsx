import { getDrugs, load } from '@/lib/data';
import { CapturePanel } from '@/components/CapturePanel';
import { VoicePanel } from '@/components/VoicePanel';

export const metadata = {
  title: 'Capture, MedMesh',
};

export default function CapturePage() {
  const drugs = getDrugs();
  const facilities = load().facilities;

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-8">
      <header className="mb-7 max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.16em] text-flow">
          The last mile
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Every other system asked clinics to start typing.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-300">
          They did not, which is why national dashboards show green while the
          shelf is empty. Most primary facilities across BRICS keep a paper
          register and have no intention of adopting software. MedMesh reads the
          register they already keep, and listens to the pharmacist who already
          has a phone.
        </p>
        <p className="mt-3 text-[13px] text-ink-400">
          Measured against ground truth: 42 of 42 rows extracted fully correct
          across Indian, Brazilian and South African registers, every field.
        </p>
      </header>

      <CapturePanel drugs={drugs} facilities={facilities} />

      <div className="mt-4">
        <VoicePanel drugs={drugs} />
      </div>
    </div>
  );
}
