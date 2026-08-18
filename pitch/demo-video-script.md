# Demo video script

**Target 4:30.** The brief allows 3 to 5 minutes.

**The one rule:** this is a *working prototype* demo, not a pitch. 25% of the
score is "does the prototype function end-to-end", so the screen must show the
software doing real work for most of the runtime, and the Gemini calls must be
**live**, not cut to a finished result. The waiting is the proof.

Record at 1920x1080 against **https://medmesh-google.vercel.app**. Close every
other tab, hide the bookmarks bar, silence notifications, browser at 100% zoom.

---

## 0:00 to 0:22 · The hook

**Screen:** `/`, top of hero. Scroll slowly to the insulin diagram and stop.

> Two clinics in KwaZulu-Natal, eleven kilometres apart. One is about to throw
> away four hundred and eighteen vials of insulin because they expire in
> October. The other has none, and will have none for the next forty-seven days.
>
> Neither can see the other. That is not a supply problem, and that is what
> MedMesh fixes.

Do not rush this. It is the one thing a judge still remembers tomorrow.

---

## 0:22 to 0:50 · Measured, not asserted

**Screen:** scroll through the three evidence cards, about 2 seconds each.

> In King Cetshwayo District, eighty-five percent of medicines were hit by
> stock-outs, while half of those same medicines were overstocked and fifteen
> percent expired unused. One district, one year, one shelf.

**Screen:** the red panel.

> And the part that should worry a ministry: community health worker stock-outs
> went from twenty-six percent to forty-nine percent, across exactly the fifteen
> years when logistics software was rolled out everywhere.
>
> Tracking was never the bottleneck.

---

## 0:50 to 1:10 · Why nobody solved it

**Screen:** the tree-versus-mesh diagram. Let the arc animate.

> Every health logistics system ever built is a tree. Stock reports up to the
> district and comes back down. There is no sideways, so the clinic with
> expiring stock is invisible to the clinic that ran dry.
>
> We are not inventing this gap. The South African study says the national
> pharmacy system, quote, lacks a redistribution module. MedMesh is that module.

---

## 1:10 to 2:25 · Live demo one, paper to transfer

**Screen:** `/capture`. Click the **India** sample. Do not cut.

> Everything so far assumes a clinic can tell us what is on its shelf. Most
> cannot. They keep a paper register, and every system so far asked them to
> start typing instead. They did not, which is why national dashboards show
> green while the shelf is empty. So we read the register they already keep.

**Screen:** rows appear. Point at the confidence column.

> Gemini returns structured stock: medicine, batch, quantity, expiry, and an
> honest confidence per row. Forty-two of forty-two rows correct against ground
> truth, across Indian, Brazilian and South African registers.

**Screen:** now the important part. Choose **PHC, Katra** in the selector and
click **Commit to the mesh**. Wait for it.

> But extraction on its own only proves a model can read handwriting. The claim
> is that a clinic with no digital system can join the network by photographing
> a page. So watch what the page does.

**Screen:** the outcome panel appears.

> Thirteen medicines change posture. Antivenom goes from stocked out to
> adequate. Ceftriaxone goes the other way, critical to stocked out. And eleven
> transfers now exist that did not exist ten seconds ago.
>
> Look at the third one. Katra is *sending* magnesium sulfate to Kurhani. A
> fresh count can make you a donor, not just a recipient, which is why the
> matcher re-runs across the whole district and not just this clinic.

**Screen:** scroll to the voice panel, click **Play a Hindi report**.

> And if writing is the problem, speak. This is Hindi with English drug names,
> the way people actually talk. Same endpoint, same schema.

---

## 2:25 to 3:10 · Live demo two, the officer's morning

**Screen:** `/console`. Let the map draw. Click a red facility.

> Ninety-nine facilities across real districts in Bihar, Amazonas and
> KwaZulu-Natal. Red is running out. Amber is expiring unused. Both are
> failures, and until now no system put them on one screen.
>
> Every medicine races two clocks: the day it runs out and the day it expires.
> Where those clocks collide across two facilities, there is a transfer worth
> making.

**Screen:** click **Why this transfer?** on a high-scoring proposal. Wait.

> Redistribution does not fail for want of arithmetic. It fails for want of a
> signature. So Gemini writes the justification the officer reads, using only
> figures the engine already computed.

**Screen:** read the sentence aloud, then click **Approve transfer**.

> Six hundred and fourteen transfers across this network, forty-four percent
> crossing a district boundary, ninety of ninety-nine facilities helped,
> thirteen and a half thousand stock-out days averted.

---

## 3:10 to 3:45 · Cross-border

**Screen:** switch country to **Brazil**, then **South Africa**.

> The same engine, unchanged, in another country. Medicines are keyed to WHO ATC
> codes rather than national product codes, so all three describe the same
> molecule identically.

**Screen:** navigate to `/brics`. Scroll to the hemisphere table, then a
pooling card.

> Which is what makes this possible. India is northern, Brazil and South Africa
> are southern, so for every seasonal medicine their peaks are six months apart.
> The month India is buying antimalarials is the month South Africa is watching
> them expire.
>
> Fifty-four thousand units. That is cooperation as arithmetic, not as a slogan.

---

## 3:45 to 4:30 · Honesty and close

**Screen:** `/method`, scroll the calibration table and the limits section.

> One thing we want to be straight about. No ministry publishes facility-level
> stock data, so this runs on a simulation, calibrated against five published
> measures and within tolerance on all five. This page also lists where we are
> weaker than the pitch implies, including that an outbreak is exactly what our
> forecast would miss.
>
> MedMesh does not replace DVDMS, Hórus or ePIMS. It sits beside them and adds
> the one link they are missing. Forecasting runs in-process, so a district
> office can run it on a laptop with no cloud bill.

**Screen:** back to the insulin diagram on `/`.

> The medicine already exists. It is in the wrong place.
>
> Give us one district and one quarter, and we will show you how much comes back.

---

## Recording checklist

- [ ] Run one scan, one commit, one rationale and one voice sample **before**
      recording, so every model is warm and the takes are fast
- [ ] Use the deployed URL, not localhost. Judges are watching the thing they
      can click
- [ ] Do not cut any Gemini call. The wait is the credibility
- [ ] If a call 503s mid-take, keep rolling. It falls back to another model and
      recovers, which is worth showing rather than hiding
- [ ] The voice sample plays audio aloud. Make sure system audio is captured, or
      say what it is saying
- [ ] Export 1080p, upload unlisted to YouTube, paste the link into the
      submission
