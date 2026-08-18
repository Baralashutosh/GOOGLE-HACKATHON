# MedMesh

**The medicine already exists. It is in the wrong place.**

Team **Two Clocks** · Build with AI: Code for Communities, Second Edition · Track 03, Smart Health and Supply Chain Resilience

Public health systems across BRICS run out of a medicine and throw the same
medicine away, in the same district, in the same quarter. Not because supply is
short, but because nothing in the system can see both facts at once.

MedMesh finds both and moves one to the other.

---

## The problem, measured

| Finding | Source |
|---|---|
| Stock-outs hit **85.6%** of medicines, while **50.6%** were overstocked and **15.2%** expired, in the same district | King Cetshwayo District, KwaZulu-Natal. BMC Health Serv Res, 2023 |
| **82%** of 3,360 municipalities reported shortages, while **5 to 20%** of publicly purchased medicines were wasted | CNM, Brazil, 2022 |
| **52%** of essential medicines available in more than 80% of primary facilities | India |
| Facilities with core essential medicines available ranged **8% to 41%** | WHO GHO, 2010 to 2019 |

And the figure that should worry a ministry most: community health worker
stock-outs **rose from 26.4% to 48.7%** between 2006 and 2021, across exactly
the period when logistics systems were rolled out everywhere.

Fifteen years of tracking, and it got worse. Tracking was never the bottleneck.

## Why fifteen years of software missed it

Every health logistics system ever built is a **tree**. Stock reports up to the
district warehouse and comes back down. There is no sideways.

A clinic 11 km away sitting on insulin that expires next month is invisible to
the clinic that ran dry this morning. Both are perfectly visible to a warehouse
that can help neither in time.

This is not a gap we invented. The South African study says plainly that the
national pharmacy system *"lacks a redistribution module"*. Redistribution is
already official policy in India, South Africa and Uganda. It runs on phone
calls between pharmacists who happen to know each other.

MedMesh adds the missing edge. It does not replace DVDMS, Hórus or ePIMS. It is
the module they are missing, which is why a ministry could pilot one district in
weeks rather than years.

## What it does

**1. Reads what the clinic already keeps.** Most primary facilities never file a
digital stock count. They keep a paper register, and have no intention of
adopting software. Gemini reads a phone photo of that page, or a spoken report
in Hindi, Portuguese or isiZulu. No new workflow, no new hardware, no training.

**2. Runs two clocks at once.** Days until a medicine runs out, and days until it
expires, projected together over the same stock in one FEFO simulation. Ask
those questions separately and the answers quietly contradict each other.

**3. Puts it straight into the network.** A committed count re-runs both clocks
for that facility and re-runs the matcher across the district. Photographing one
page moves 13 medicines between states and creates 11 transfers that did not
exist a moment earlier, and can make a facility a *donor* as easily as a
recipient. Paper to transfer proposal, in one request.

**4. Proposes the move, and the reason.** Surplus matched to shortage on
distance, urgency and remaining shelf life, then written up as one sentence a
district officer can approve. Nothing executes on its own: redistribution fails
for want of a signature far more often than for want of arithmetic.

## Results

Run over **99 facilities**, 15 essential medicines, **9 real districts**, 3 countries:

| | |
|---|---|
| Transfer proposals generated | **614** |
| Crossing a district boundary | **274** (44.6%) |
| Facilities helped | **90 of 99** |
| **Stock-out days averted** | **13,552** |
| Units of waste averted | 96,935 |
| Register rows extracted fully correct | **42 of 42** (100%) |
| Self-checks on the engine and the matcher | **22** |

A real proposal, unedited from the run:

> **418 vials of human insulin.** CHC Manguzi to CHC Mtubatuba, uMkhanyakude,
> 11.1 km. Batch B26008 expires 26 October. Averts **47 stock-out days**.

Two clinics eleven kilometres apart. One about to bin insulin, one about to run
out of it. Neither can see the other today.

## Cross-border, as arithmetic rather than rhetoric

Medicines are keyed to **WHO ATC codes**, not national product codes, so an
Indian PHC, a Brazilian UBS and a South African clinic describe the same
molecule identically. One country's surplus can be matched against another's
shortfall.

Hemispheres are modelled explicitly, and they pay off:

> **South Africa to India: 53,934 units of Artemether-Lumefantrine.**
> Their antimalarial surplus sits in India's shortfall, because the malaria
> seasons are six months out of phase.

Computed at national level, not facility to facility. A truck between Bihar and
Amazonas is a slide, not logistics.

## Where Google AI does the work

| Job | Model | Why it is load-bearing |
|---|---|---|
| Read handwritten paper registers | `gemini-3.1-flash-lite`, vision | This is the entire last mile. Without it, facilities with no digital system cannot join the network at all. |
| Read spoken stock reports | same, native audio | Transcription, translation and structuring in one call. A worker speaks their own language into the same endpoint. |
| Write the officer's justification | `gemini-3.5-flash` | Makes computed reasoning legible so a human will actually sign it. |

Model choice is **benchmarked, not assumed**. Reading a register is
transcription, so flash-lite with thinking disabled does it in under 5 seconds
where the larger model took 26 to 35 seconds for a character-identical answer.
`scripts/bench-scan.ts` reproduces the comparison.

Calls retry with backoff and step down a fallback chain. The free tier returned
503 repeatedly during development, and a demo that dies when one model is busy
dies on stage.

**Drug name matching is deterministic code, never a model decision.** Letting an
LLM choose the molecule invites a confident, invisible substitution, and
confidently wrong medicine is the failure that ends a pilot.

## Running it

```bash
npm install
cp .env.example .env.local     # then paste a key from aistudio.google.com
npm run dev
```

Everything else is reproducible and seeded:

```bash
npm run data        # rebuild the dataset, deterministic
npm run registers   # rebuild the sample register photographs
npm run pipeline    # forecast, project, match, write mesh_output.json
npm run check       # 22 self-checks on the engine and matching
npm run test:scan   # score Gemini extraction against ground truth
```

`npm run check` asserts the things that must not silently break: no cold-chain
medicine routed to a clinic without a fridge, no batch sent that expires before
it can arrive and be used, no lot promised to two facilities at once.

It also guards medicine-name matching in both directions, and the false-positive
half matters more. Live testing caught three real bugs there: a pharmacist saying
just "insulin" went unmatched, while "vitamin C" matched Ceftriaxone and "tablet"
matched an iron supplement, both at commit confidence. A missed match costs a
human thirty seconds of review. A wrong match costs a patient the wrong medicine.

## Data honesty

No BRICS health ministry publishes facility-level stock data, which is itself
part of the problem. MedMesh runs on a **simulation calibrated to published
measurements**, and the generator self-checks against them:

| Measure | Simulated | Published |
|---|---|---|
| Medicines hit by stock-out | 79.3% | 85.6% |
| Medicines overstocked | 55.6% | 50.6% |
| Medicines lost to expiry | 8.8% | 15.2% |
| Stock-out episodes per facility per month | 2.79 | 2.3 |
| Mean stock-out duration | 21.7 days | 22.4 days |

The failure modes are not painted on by hand. They emerge from three documented
mechanisms: season-blind annual-average ordering, part-filled indents, and
short-dated deliveries. See [data/README.md](data/README.md) and the `/method`
page.

## Known limits

- Road distance is straight-line times 1.35, not real routing. Google Maps
  Routes API is a one-line swap, left out only because it requires billing.
- The matcher is greedy, not optimal. Deliberate: an officer must be able to
  follow why a proposal exists, and an optimal plan nobody trusts delivers
  nothing.
- The forecast assumes yesterday's seasonality holds, so an outbreak is exactly
  the case it would miss, and exactly when the mesh would matter most.

## Stack

Next.js 16 · TypeScript · Tailwind 4 · Gemini API · Python for data generation.
Forecasting runs in-process, so a district office can run this on a laptop with
no cloud bill. `sql/` holds the BigQuery ML equivalent for national scale.
