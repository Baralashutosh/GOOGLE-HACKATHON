import Link from 'next/link';
import { globalStats } from '@/lib/data';
import { Counter } from '@/components/Counter';
import { ParadoxDiagram, TreeVersusMesh } from '@/components/ParadoxDiagram';

const COUNTRY_NAME: Record<string, string> = {
  IN: 'India', BR: 'Brazil', ZA: 'South Africa',
};

/* Measured, published, and cited on the Method page. Nothing here is estimated. */
const EVIDENCE = [
  {
    place: 'King Cetshwayo District, South Africa',
    stat: '85.6%',
    line: 'of medicines hit by stock-outs, while 50.6% were overstocked and 15.2% expired',
    source: 'BMC Health Serv Res, 2023',
  },
  {
    place: 'Brazil',
    stat: '82%',
    line: 'of 3,360 municipalities reported shortages, while 5 to 20% of public medicine purchases were wasted',
    source: 'CNM, 2022',
  },
  {
    place: 'India',
    stat: '52%',
    line: 'of essential medicines available in more than 80% of primary facilities',
    source: 'National survey',
  },
];

export default function Home() {
  const s = globalStats();

  return (
    <div>
      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden border-b rule">
        <div className="gridlines absolute inset-0 opacity-[0.35]" />
        <div
          className="absolute inset-x-0 top-0 h-72 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 70% 100% at 50% 0%, color-mix(in oklab, var(--color-flow) 22%, transparent), transparent 70%)',
          }}
        />

        <div className="relative mx-auto max-w-7xl px-5 pt-16 pb-20">
          <div className="stagger max-w-3xl">
            <span className="pill pill-wrap" data-state="flow">
              Track 03, Smart Health and Supply Chain Resilience
            </span>

            <h1 className="mt-6 text-5xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
              The medicine already exists.
              <br />
              <span className="text-ink-400">It is in the wrong place.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-300">
              Public health systems across BRICS run out of a medicine and throw the
              same medicine away, in the same district, in the same quarter. Not
              because supply is short, but because nothing in the system can see
              both facts at once.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/console"
                className="rounded-lg bg-flow px-5 py-2.5 text-[14px] font-semibold text-ink-950 transition-transform hover:scale-[1.02]"
              >
                Open the district console
              </Link>
              <Link
                href="/capture"
                className="rounded-lg border border-ink-600 px-5 py-2.5 text-[14px] font-medium text-ink-200 transition-colors hover:border-flow/50 hover:text-flow"
              >
                Read a paper register
              </Link>
            </div>
          </div>

          <div className="panel mt-14 p-6 sm:p-8">
            <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-ink-400">
              An actual proposal from this prototype
            </p>
            <ParadoxDiagram />
          </div>
        </div>
      </section>

      {/* ========================== EVIDENCE ========================== */}
      <section className="border-b rule">
        <div className="mx-auto max-w-7xl px-5 py-16">
          <SectionLabel>This is measured, not asserted</SectionLabel>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Three countries. The same contradiction.
          </h2>

          <div className="stagger mt-10 grid gap-4 md:grid-cols-3">
            {EVIDENCE.map((e) => (
              <div key={e.place} className="panel panel-hover p-6">
                <div className="tabular text-4xl font-semibold text-shortage">{e.stat}</div>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-200">{e.line}</p>
                <div className="mt-5 border-t rule pt-3">
                  <p className="text-[13px] font-medium text-ink-100">{e.place}</p>
                  <p className="text-[12px] text-ink-400">{e.source}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="panel mt-6 border-shortage/25 bg-shortage/[0.04] p-6">
            <p className="text-[15px] leading-relaxed text-ink-200">
              <strong className="text-ink-100">The part that should worry a ministry.</strong>{' '}
              Community health worker stock-outs rose from 26.4% to 48.7% between
              2006 and 2021, across the very period when logistics systems were
              rolled out everywhere. Fifteen years of tracking, and it got worse.
              Tracking was never the bottleneck.
            </p>
          </div>
        </div>
      </section>

      {/* ======================= WHY UNSOLVED ========================= */}
      <section className="border-b rule bg-ink-900/40">
        <div className="mx-auto max-w-7xl px-5 py-16">
          <SectionLabel>Why fifteen years of software missed it</SectionLabel>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Every supply system is a tree. Medicine needs a mesh.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-300">
            Stock reports up to the district and comes back down. There is no
            sideways. A clinic 11 km away sitting on stock that expires next month
            is invisible to the clinic that ran dry this morning, and both are
            visible to a warehouse that can help neither in time.
          </p>

          <div className="panel mt-10 p-6 sm:p-8">
            <TreeVersusMesh />
          </div>

          <p className="mt-6 max-w-3xl text-[14px] leading-relaxed text-ink-400">
            This is not a gap we invented. The South African study states plainly
            that the national pharmacy system{' '}
            <span className="text-ink-200">lacks a redistribution module</span>.
            Redistribution is already official policy in India, South Africa and
            Uganda. It runs on phone calls between pharmacists who happen to know
            each other.
          </p>
        </div>
      </section>

      {/* ========================== RESULTS =========================== */}
      <section className="border-b rule">
        <div className="mx-auto max-w-7xl px-5 py-16">
          <SectionLabel>Run over {s.facilities} facilities, {s.districts} districts, {s.countries} countries</SectionLabel>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            What the mesh found
          </h2>

          <div className="stagger mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              value={s.stockoutDaysAverted}
              label="Stock-out days averted"
              detail="Days a patient would have been turned away"
              tone="flow"
            />
            <Metric
              value={s.proposals}
              label="Transfers proposed"
              detail={`${s.crossDistrict} of them cross a district boundary`}
              tone="flow"
            />
            <Metric
              value={s.facilitiesHelped}
              label={`Facilities helped, of ${s.facilities}`}
              detail="Received at least one viable transfer"
              tone="calm"
            />
            <Metric
              value={s.wasteAvertedUnits}
              label="Units of waste averted"
              detail="Counted only where stock was genuinely doomed"
              tone="expiry"
            />
          </div>

          <div className="panel mt-6 p-6">
            <p className="text-[14px] leading-relaxed text-ink-300">
              <strong className="text-ink-100">On that last number.</strong> It counts
              only units that the projection says would have expired unused. Stock
              that was merely moved somewhere more useful is not counted as waste
              prevented, which is why the figure is smaller than it could be and
              why it can be defended.
            </p>
          </div>
        </div>
      </section>

      {/* =========================== BRICS ============================ */}
      <section className="border-b rule bg-ink-900/40">
        <div className="mx-auto max-w-7xl px-5 py-16">
          <SectionLabel>Cooperation as arithmetic</SectionLabel>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Malaria season in India is the off-season in Brazil.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-300">
            Medicines are keyed to WHO ATC codes rather than national product
            codes, so one country&rsquo;s surplus of a molecule can be matched against
            another&rsquo;s shortfall of the same molecule. Because the hemispheres are
            six months out of phase, those surpluses genuinely sit on opposite
            sides of the calendar.
          </p>

          <div className="stagger mt-10 grid gap-3 md:grid-cols-2">
            {s.brics.slice(0, 6).map((o) => (
              <div
                key={`${o.drugId}-${o.from}-${o.to}`}
                className="panel panel-hover flex items-center gap-4 p-4"
              >
                <div className="flex items-center gap-2 text-[13px] font-semibold">
                  <span className="text-expiry">{COUNTRY_NAME[o.from] ?? o.from}</span>
                  <svg width="26" height="10" viewBox="0 0 26 10" aria-hidden>
                    <path d="M0 5 H20 M16 1 L20 5 L16 9" className="stroke-flow" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-shortage">{COUNTRY_NAME[o.to] ?? o.to}</span>
                </div>
                <div className="ml-auto text-right">
                  <div className="tabular text-[15px] font-semibold text-ink-100">
                    {o.units.toLocaleString()}
                  </div>
                  <div className="text-[12px] text-ink-400">{o.drug}</div>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-[13px] text-ink-400">
            Computed at national level, not facility to facility. A truck between
            Bihar and Amazonas is a slide, not logistics.
          </p>
        </div>
      </section>

      {/* ========================== HOW ============================== */}
      <section className="border-b rule">
        <div className="mx-auto max-w-7xl px-5 py-16">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Three steps, and the first one is the hard one
          </h2>

          <div className="stagger mt-10 grid gap-4 md:grid-cols-3">
            <Step
              n="01"
              title="Read what the clinic already keeps"
              body="Most primary facilities never file a digital stock count. They keep a paper register. Gemini reads a phone photo of that page, or a spoken report in Hindi, Portuguese or isiZulu. No new workflow, no new hardware."
              badge="42 of 42 rows correct"
            />
            <Step
              n="02"
              title="Run both clocks at once"
              body="Days until it runs out, and days until it expires, projected together over the same stock. Ask those questions separately and the answers quietly contradict each other."
              badge="Season-aware forecast"
            />
            <Step
              n="03"
              title="Propose the move, and the reason"
              body="Surplus matched to shortage on distance, urgency and remaining shelf life, then written up as one sentence an officer can approve. Redistribution fails for want of permission far more often than for want of arithmetic."
              badge="Human approves, always"
            />
          </div>
        </div>
      </section>

      {/* =========================== CTA ============================== */}
      <section>
        <div className="mx-auto max-w-7xl px-5 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            It does not replace the national system.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-ink-300">
            It is the module they are missing. DVDMS, Hórus and ePIMS keep doing
            what they do. MedMesh adds the sideways link, which is why a ministry
            could pilot one district in weeks rather than years.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/console"
              className="rounded-lg bg-flow px-6 py-3 text-[14px] font-semibold text-ink-950 transition-transform hover:scale-[1.02]"
            >
              Open the district console
            </Link>
            <Link
              href="/method"
              className="rounded-lg border border-ink-600 px-6 py-3 text-[14px] font-medium text-ink-200 transition-colors hover:border-flow/50 hover:text-flow"
            >
              How the numbers were produced
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-flow">
      {children}
    </p>
  );
}

function Metric({
  value, label, detail, tone,
}: {
  value: number; label: string; detail: string; tone: 'flow' | 'expiry' | 'calm';
}) {
  const colour = {
    flow: 'text-flow', expiry: 'text-expiry', calm: 'text-calm',
  }[tone];

  return (
    <div className="panel panel-hover p-6">
      <Counter to={value} className={`tabular block text-4xl font-semibold ${colour}`} />
      <p className="mt-3 text-[14px] font-medium text-ink-100">{label}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-400">{detail}</p>
    </div>
  );
}

function Step({
  n, title, body, badge,
}: { n: string; title: string; body: string; badge: string }) {
  return (
    <div className="panel panel-hover flex flex-col p-6">
      <span className="tabular text-[13px] font-semibold text-flow">{n}</span>
      <h3 className="mt-3 text-[17px] font-semibold tracking-tight">{title}</h3>
      <p className="mt-3 flex-1 text-[14px] leading-relaxed text-ink-300">{body}</p>
      <span className="pill mt-5 self-start" data-state="flow">{badge}</span>
    </div>
  );
}
