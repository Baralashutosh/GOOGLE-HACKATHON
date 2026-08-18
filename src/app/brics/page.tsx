import Link from 'next/link';
import { load, globalStats } from '@/lib/data';

export const metadata = { title: 'BRICS pooling, MedMesh' };

const COUNTRY: Record<string, { name: string; hemisphere: 'N' | 'S'; lmis: string }> = {
  IN: { name: 'India', hemisphere: 'N', lmis: 'DVDMS / e-Aushadhi' },
  BR: { name: 'Brazil', hemisphere: 'S', lmis: 'Hórus' },
  ZA: { name: 'South Africa', hemisphere: 'S', lmis: 'ePIMS / RxSolution' },
};

/** Northern-hemisphere peak month per demand shape. Southern flips by six. */
const PEAK: Record<string, { n: string; s: string; label: string }> = {
  monsoon: { n: 'Jul, Aug', s: 'Jan, Feb', label: 'Monsoon' },
  winter: { n: 'Dec, Jan', s: 'Jun, Jul', label: 'Winter respiratory' },
  summer: { n: 'May, Jun', s: 'Nov, Dec', label: 'Summer diarrhoeal' },
  campaign: { n: 'Apr and Oct', s: 'Apr and Oct', label: 'Campaign driven' },
  flat: { n: 'Even', s: 'Even', label: 'Chronic, no season' },
};

/**
 * The cross-border case, at the only altitude where it is real.
 *
 * A truck between Bihar and Amazonas is a slide, not logistics. What is real is
 * national pooling on a shared molecule code, and the reason it is more than a
 * diplomatic gesture is arithmetic: the hemispheres are six months out of
 * phase, so one country's peak sits in another's trough.
 */
export default function BricsPage() {
  const { mesh, facilities, drugs } = load();
  const s = globalStats();
  const drugById = Object.fromEntries(drugs.map((d) => [d.id, d]));

  /* Per-country, per-medicine surplus and shortfall, the inputs to pooling. */
  const balance = new Map<string, { surplus: number; deficit: number }>();
  for (const a of mesh.assessments) {
    const f = facilities.find((x) => x.id === a.facilityId);
    if (!f) continue;
    const k = `${f.country}|${a.drugId}`;
    const b = balance.get(k) ?? { surplus: 0, deficit: 0 };
    b.surplus += a.unitsAtRiskOfExpiry;
    if (a.daysToStockout !== null) {
      const short = a.dailyDemand * 180 - a.onHand;
      if (short > 0) b.deficit += Math.round(short);
    }
    balance.set(k, b);
  }

  const seasonal = drugs.filter((d) => d.seasonality !== 'flat');

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <p className="text-[11px] uppercase tracking-[0.16em] text-flow">
        Cooperation as arithmetic
      </p>
      <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-tight">
        One molecule code, three health systems, opposite calendars.
      </h1>
      <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-ink-300">
        Medicines here are keyed to WHO ATC codes rather than national product
        codes, so an Indian PHC, a Brazilian UBS and a South African clinic
        describe the same molecule identically. That is what makes a surplus in
        one country legible as a shortfall in another.
      </p>

      {/* ---------------- the hemisphere argument ---------------- */}
      <section className="mt-10">
        <h2 className="text-[20px] font-semibold tracking-tight">
          Why the surpluses sit on opposite sides of the year
        </h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-400">
          India is northern. Brazil and South Africa are southern. For every
          medicine whose demand follows a season, their peaks are six months
          apart, which means the month India is buying antimalarials is the month
          South Africa is watching them expire.
        </p>

        <div className="panel mt-5 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-[13px]">
            <thead className="border-b rule text-[10px] uppercase tracking-[0.1em] text-ink-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">Medicine</th>
                <th className="px-4 py-2.5 font-medium">Demand season</th>
                <th className="px-4 py-2.5 font-medium">Peaks in India</th>
                <th className="px-4 py-2.5 font-medium">Peaks in Brazil and South Africa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {seasonal.map((d) => {
                const p = PEAK[d.seasonality];
                return (
                  <tr key={d.id}>
                    <td className="px-4 py-2.5 text-ink-100">{d.inn}</td>
                    <td className="px-4 py-2.5 text-ink-400">{p.label}</td>
                    <td className="px-4 py-2.5 text-expiry">{p.n}</td>
                    <td className="px-4 py-2.5 text-calm">{p.s}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------- the pooling matrix ---------------- */}
      <section className="mt-12">
        <h2 className="text-[20px] font-semibold tracking-tight">
          Where one country could cover another today
        </h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-400">
          Surplus is stock projected to expire unused. Shortfall is demand over
          the next 180 days that current stock cannot meet. Each row is the
          strongest single pairing for that molecule, not a sum: a carton can
          only be sent once.
        </p>

        <div className="stagger mt-5 grid gap-3">
          {s.brics.map((o) => {
            const drug = drugById[o.drugId];
            const from = COUNTRY[o.from];
            const to = COUNTRY[o.to];
            const donor = balance.get(`${o.from}|${o.drugId}`);
            const recipient = balance.get(`${o.to}|${o.drugId}`);
            const crossesHemisphere = from?.hemisphere !== to?.hemisphere;

            return (
              <div key={o.drugId} className="panel panel-hover p-5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-[15px] font-semibold text-ink-100">{drug?.inn}</h3>
                  <span className="tabular text-[11px] text-ink-400">ATC {drug?.atc}</span>
                  {crossesHemisphere && (
                    <span className="pill" data-state="flow">seasons six months apart</span>
                  )}
                  {drug?.requiresColdChain && (
                    <span className="pill" data-state="adequate">cold chain</span>
                  )}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div>
                    <p className="text-[13px] font-medium text-expiry">{from?.name}</p>
                    <p className="tabular mt-0.5 text-[19px] font-semibold text-ink-100">
                      {(donor?.surplus ?? 0).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-ink-400">
                      units projected to expire unused
                    </p>
                  </div>

                  <div className="flex flex-col items-center">
                    <svg width="72" height="16" viewBox="0 0 72 16" aria-hidden>
                      <path d="M2 8 H62 M56 3 L62 8 L56 13" fill="none"
                        className="stroke-flow" strokeWidth="1.6"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="tabular mt-1 text-[13px] font-semibold text-flow">
                      {o.units.toLocaleString()}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.1em] text-ink-400">
                      poolable
                    </span>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-[13px] font-medium text-shortage">{to?.name}</p>
                    <p className="tabular mt-0.5 text-[19px] font-semibold text-ink-100">
                      {(recipient?.deficit ?? 0).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-ink-400">
                      units short over 180 days
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- how it would actually work ---------------- */}
      <section className="mt-12">
        <h2 className="text-[20px] font-semibold tracking-tight">
          What a member nation would have to do
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {Object.entries(COUNTRY).map(([code, c]) => (
            <div key={code} className="panel p-5">
              <p className="text-[14px] font-semibold text-ink-100">{c.name}</p>
              <p className="mt-1 text-[12px] text-ink-400">
                Keeps running {c.lmis}. MedMesh reads from it and adds the
                sideways link, so nothing is replaced and nothing is migrated.
              </p>
            </div>
          ))}
        </div>
        <p className="mt-5 max-w-3xl text-[13px] leading-relaxed text-ink-400">
          Pooling is computed at national level and stops at a recommendation.
          Moving medicine across a border is a regulatory act involving customs,
          national regulators and mutual recognition of batch release, and no
          software should pretend otherwise. What this removes is the part that
          is genuinely missing: nobody currently knows the surplus exists.
        </p>
      </section>

      <div className="mt-12 flex flex-wrap gap-4 border-t rule pt-6">
        <Link href="/console" className="text-[14px] text-flow hover:underline">
          Open the district console
        </Link>
        <Link href="/method" className="text-[14px] text-ink-300 hover:underline">
          How these figures were produced
        </Link>
      </div>
    </div>
  );
}
