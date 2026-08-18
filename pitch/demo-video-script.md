# Demo video script

**Target: 4:00.** The brief allows 3 to 5 minutes. Four is the sweet spot: long
enough to show the thing working end to end, short enough that a judge watches
all of it.

**The one rule:** this is a *working prototype* demo, not a pitch. 25% of the
score is "does the prototype function end-to-end". So the screen should show the
software doing real work for at least half the runtime, and the register scan
must be a **live call**, not a cut to a finished result. The waiting is the
proof.

Record at 1920x1080. Close every other tab. Set browser zoom to 100%.

---

## 0:00 to 0:22 · The hook

**Screen:** `/` landing page, top of hero. Scroll slowly to the insulin diagram
and stop there.

> Two clinics in KwaZulu-Natal, eleven kilometres apart. One of them is about to
> throw away four hundred and eighteen vials of insulin because they expire in
> October. The other one has none, and will have none for the next forty-seven
> days.
>
> Neither of them can see the other. That is not a supply problem. That is what
> MedMesh fixes.

**Note:** do not rush this. The insulin case is the entire product and it is the
one thing a judge will still remember tomorrow.

---

## 0:22 to 0:52 · The problem is measured, not asserted

**Screen:** scroll to the three evidence cards, pause on each for about 2 seconds.

> This is not an edge case. In King Cetshwayo District, eighty-five percent of
> medicines were hit by stock-outs, while half of those same medicines were
> overstocked and fifteen percent expired unused. One district, one year, one
> shelf.
>
> Eighty-two percent of Brazilian municipalities report shortages while up to a
> fifth of what they buy is wasted.

**Screen:** scroll to the red "what should worry a ministry" panel.

> And here is the part that should worry a ministry. Community health worker
> stock-outs went from twenty-six percent to forty-nine percent, across exactly
> the fifteen years when logistics software was rolled out everywhere.
>
> Tracking was never the bottleneck.

---

## 0:52 to 1:15 · Why nobody solved it

**Screen:** scroll to the tree-versus-mesh diagram. Let the arc animate.

> Every health logistics system ever built is a tree. Stock reports up to the
> district and comes back down. There is no sideways.
>
> So a clinic forty kilometres away sitting on stock that expires next month is
> invisible to the clinic that ran dry this morning. We are not inventing this
> gap. The South African study says the national pharmacy system, quote, lacks a
> redistribution module.
>
> MedMesh is that module.

---

## 1:15 to 2:10 · Live demo one, the last mile

**Screen:** navigate to `/capture`. Click the **India** sample register. Let it
run. Do not cut.

> Everything so far assumes a clinic can tell us what is on its shelf. Most
> cannot. They keep a paper register, and every system so far has asked them to
> start typing instead. They did not, which is why national dashboards show green
> while the shelf is empty.
>
> So we read the register they already keep. This is a photograph of a filled
> paper form, shot at an angle under bad light.

**Screen:** the rows appear. Point at the confidence column, then the matched
medicine column.

> Gemini reads the handwriting and returns structured stock: medicine, batch,
> quantity, expiry, and an honest confidence per row. Anything below threshold
> goes to a human instead of into stock.
>
> Against ground truth, forty-two of forty-two rows across Indian, Brazilian and
> South African registers, every field correct.

**Screen:** click the **Damaged page** sample. When it returns, point at the
amber "what the model was unsure of" panel.

> This one has water damage, a tea ring and a crease. It still reads it, and it
> tells us which name it had to infer. No new hardware, no new workflow, no
> training.

---

## 2:10 to 3:05 · Live demo two, the mesh

**Screen:** navigate to `/console`. Let the map draw.

> This is a district officer's morning. Ninety-nine facilities, real districts in
> Bihar, Amazonas and KwaZulu-Natal. Red is running out. Amber is expiring
> unused. Both are failures, and until now no system showed them on one screen.

**Screen:** click a red facility on the map. The queue filters, arcs highlight.

> Every medicine is racing two clocks: the day it runs out and the day it
> expires. Where those clocks collide across two facilities, there is a transfer
> worth making.

**Screen:** scroll to a high-scoring proposal. Click **Why this transfer?** and
wait for Gemini.

> Redistribution does not fail for want of arithmetic. It fails for want of a
> signature. So Gemini writes the justification the officer actually reads,
> using only figures the engine already computed.

**Screen:** the sentence appears. Read it aloud from screen, then click
**Approve transfer**.

> One tap, and the dispatch is raised. Across this network: six hundred and
> fourteen transfers, forty-four percent of them crossing a district boundary,
> ninety of ninety-nine facilities helped, and thirteen and a half thousand
> stock-out days averted.

---

## 3:05 to 3:30 · Cross-border

**Screen:** switch country to **Brazil**, then **South Africa**. Same console,
different network, Portuguese and Zulu facility names.

> The same engine, unchanged, in another country. Medicines are keyed to WHO ATC
> codes rather than national product codes, so all three describe the same
> molecule identically.

**Screen:** back to `/` landing, scroll to the BRICS pooling section.

> Which means surplus can be matched across borders. South Africa has fifty-four
> thousand units of antimalarial that India is short of, because the malaria
> seasons are six months out of phase.
>
> That is cooperation as arithmetic, not as a slogan.

---

## 3:30 to 4:00 · Deployability and close

**Screen:** `/method` page, scroll briefly through the calibration table and the
"weaker than it looks" section.

> One thing we want to be straight about. No ministry publishes facility-level
> stock data, so this runs on a simulation, calibrated against five published
> measures and within tolerance on all five. The method page lists where we are
> weaker than the pitch implies, including that an outbreak is exactly what our
> forecast would miss.
>
> MedMesh does not replace DVDMS, Hórus or ePIMS. It sits beside them and adds
> the one link they are missing. Forecasting runs in-process, so a district
> office can run it on a laptop with no cloud bill.

**Screen:** back to the insulin diagram on `/`.

> The medicine already exists. It is in the wrong place.
>
> Give us one district and one quarter, and we will show you how much of it comes
> back.

---

## Recording checklist

- [ ] `.env.local` has a working key, and both API routes tested within the last hour
- [ ] Run each Gemini call once before recording so the model is warm
- [ ] Browser at 100% zoom, bookmarks bar hidden, no notifications
- [ ] Record system audio off, voice only
- [ ] Do not cut the register scan. The wait is the credibility.
- [ ] If a call 503s mid-take, keep rolling. It falls back to another model and
      recovers, which is worth showing.
- [ ] Export 1080p, under 200MB, upload unlisted to YouTube and paste that link
