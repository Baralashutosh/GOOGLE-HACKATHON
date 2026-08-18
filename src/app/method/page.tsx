import Link from 'next/link';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { globalStats } from '@/lib/data';

export const metadata = { title: 'Method, MedMesh' };

interface Calibration {
  source: string;
  pairs: number;
  checks: Record<string, { simulated: number; target: number; within_tolerance: boolean }>;
  stockout_episodes_per_facility_per_month: number;
  mean_stockout_duration_days: number;
}

const REPRODUCE = [
  'npm install',
  'npm run data        # rebuild the dataset, deterministic',
  'npm run registers   # rebuild the sample register photographs',
  'npm run pipeline    # forecast, project, match, write mesh_output.json',
  'npm run check       # 22 self-checks on the engine and matching',
  'npm run test:scan   # score Gemini extraction against ground truth',
].join('\n');

/**
 * The page that decides whether anything else here is believable.
 *
 * A prototype showing impressive numbers without saying where they came from is
 * asking to be taken on trust, and no ministry should. This states plainly what
 * is measured, what is modelled, and where the model is weaker than the pitch
 * might imply.
 */
export default function MethodPage() {
  const s = globalStats();
  const cal: Calibration = JSON.parse(
    readFileSync(join(process.cwd(), 'data', 'generated', 'calibration.json'), 'utf8'));

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-[11px] uppercase tracking-[0.16em] text-flow">Method</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">
        Where every number on this site comes from
      </h1>
      <p className="mt-5 text-[15px] leading-relaxed text-ink-300">
        No BRICS health ministry publishes facility-level stock data. That is
        itself part of the problem being described. So MedMesh runs on a
        simulation, and the only thing that makes a simulation worth anything is
        whether it reproduces measurements somebody actually took.
      </p>

      <Section title="What is real">
        <ul className="space-y-2.5 text-[14px] leading-relaxed text-ink-300">
          <Bullet>
            The medicines catalogue: 15 essential medicines with their genuine
            WHO ATC codes, the key that lets three countries describe the same
            molecule identically.
          </Bullet>
          <Bullet>
            The geography: Muzaffarpur, Sitamarhi and Vaishali in Bihar; the
            Manaus, Itacoatiara and Manacapuru regions of Amazonas; King
            Cetshwayo, uMkhanyakude and Zululand in KwaZulu-Natal. Real districts,
            real administrative tiers.
          </Bullet>
          <Bullet>
            Every calibration target below, and every statistic quoted on the
            overview page.
          </Bullet>
          <Bullet>
            The extraction accuracy: 42 of 42 register rows read correctly, scored
            field by field against ground truth files written alongside each
            image, not judged by eye.
          </Bullet>
        </ul>
      </Section>

      <Section title="What is modelled">
        <p className="text-[14px] leading-relaxed text-ink-300">
          Consumption, stock levels, batch numbers and expiry dates for{' '}
          <span className="tabular text-ink-100">{cal.pairs.toLocaleString()}</span>{' '}
          facility-medicine pairs over 18 months. The failure modes are not
          painted onto the data by hand. They fall out of three mechanisms that
          are documented reality in public health supply chains.
        </p>
        <ol className="mt-4 space-y-3 text-[14px] leading-relaxed text-ink-300">
          <Numbered n="1">
            <strong className="text-ink-100">
              Planners order against an annual average while demand is seasonal.
            </strong>{' '}
            Order the year&rsquo;s mean of an antimalarial and you are short every
            monsoon and buried in it every dry season. That single mistake
            produces stock-outs and expiry in the same medicine in the same year,
            which is the entire thesis, derived rather than asserted.
          </Numbered>
          <Numbered n="2">
            <strong className="text-ink-100">
              Indents come back part-filled, or not at all.
            </strong>{' '}
            14% go unfilled. The tier above is short too. This, not patient
            demand, is what empties a primary health centre.
          </Numbered>
          <Numbered n="3">
            <strong className="text-ink-100">
              Deliveries arrive already part-way through shelf life,
            </strong>{' '}
            between 20% and 80% remaining, so some stock is doomed before it
            lands.
          </Numbered>
        </ol>
      </Section>

      <Section title="Calibration">
        <p className="text-[14px] leading-relaxed text-ink-300">
          The generator self-checks against {cal.source}. Run{' '}
          <Code>python data/generator/generate.py</Code> and it prints this table.
        </p>

        <div className="panel mt-5 overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b rule text-[10px] uppercase tracking-[0.1em] text-ink-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">Measure</th>
                <th className="px-4 py-2.5 text-right font-medium">Simulated</th>
                <th className="px-4 py-2.5 text-right font-medium">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {Object.entries(cal.checks).map(([label, v]) => (
                <tr key={label}>
                  <td className="px-4 py-2.5 text-ink-200">{label}</td>
                  <td className="tabular px-4 py-2.5 text-right text-flow">{v.simulated}%</td>
                  <td className="tabular px-4 py-2.5 text-right text-ink-300">{v.target}%</td>
                </tr>
              ))}
              <tr>
                <td className="px-4 py-2.5 text-ink-200">
                  Stock-out episodes per facility per month
                </td>
                <td className="tabular px-4 py-2.5 text-right text-flow">
                  {cal.stockout_episodes_per_facility_per_month}
                </td>
                <td className="tabular px-4 py-2.5 text-right text-ink-300">2.3</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-ink-200">Mean stock-out duration</td>
                <td className="tabular px-4 py-2.5 text-right text-flow">
                  {cal.mean_stockout_duration_days} days
                </td>
                <td className="tabular px-4 py-2.5 text-right text-ink-300">22.4 days</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-ink-400">
          One note on the episode figure, since the arithmetic invites a fair
          challenge. 2.3 episodes a month lasting 22.4 days each is measured per
          facility across its whole basket of medicines, not per medicine. 2.3
          times 22.4 exceeds a month and could not describe a single drug. The
          generator reports it on the same basis.
        </p>
      </Section>

      <Section title="Where this is weaker than it looks">
        <ul className="space-y-2.5 text-[14px] leading-relaxed text-ink-300">
          <Bullet>
            Road distance is straight-line distance times a 1.35 correction, not
            real routing. A river or a closed pass would break individual
            proposals. The Google Maps Routes API is a one-line swap, left out
            only because it requires billing.
          </Bullet>
          <Bullet>
            The matcher is greedy: hardest-hit facility first, then its nearest
            feasible donor. It is not an optimal assignment. That is a deliberate
            trade, because an officer has to be able to follow why a proposal
            exists, and an optimal plan nobody trusts gets ignored, which delivers
            nothing.
          </Bullet>
          <Bullet>
            Waste averted counts only units the projection says would have expired
            unused. Stock merely moved somewhere more useful is not counted, which
            makes the headline smaller and defensible.
          </Bullet>
          <Bullet>
            The forecast assumes yesterday&rsquo;s seasonality holds. A cholera
            outbreak or a campaign surge is exactly the case it would miss, and
            exactly when the mesh would matter most.
          </Bullet>
        </ul>
      </Section>

      <Section title="Reproducing it">
        <pre className="panel overflow-x-auto p-4 text-[12px] leading-relaxed text-ink-200">
          {REPRODUCE}
        </pre>
        <p className="mt-4 text-[13px] text-ink-400">
          Everything is seeded. The figures on this site come from{' '}
          <span className="tabular text-ink-200">{s.facilities}</span> facilities across{' '}
          <span className="tabular text-ink-200">{s.districts}</span> districts and{' '}
          <span className="tabular text-ink-200">{s.countries}</span> countries.
        </p>
      </Section>

      <div className="mt-12 border-t rule pt-6">
        <Link href="/console" className="text-[14px] text-flow hover:underline">
          Open the district console
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-11">
      <h2 className="mb-4 text-[20px] font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-ink-800 px-1.5 py-0.5 text-[12px] text-flow">
      {children}
    </code>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-flow" />
      <span>{children}</span>
    </li>
  );
}

function Numbered({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="tabular shrink-0 text-flow">{n}</span>
      <span>{children}</span>
    </li>
  );
}
