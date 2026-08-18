# Submission fields

Copy-paste ready. Deadline **24 Aug 2026**, submit by midday, not deadline night.

## Team name
Two Clocks

## Project name
MedMesh

## Brief description (2 to 3 lines)

> Public health systems across BRICS run out of a medicine and throw the same
> medicine away, in the same district, in the same quarter. MedMesh reads the
> paper stock registers clinics already keep, projects when each medicine runs
> out and when it expires, and matches surplus to shortage before either becomes
> waste. Over 99 facilities it averted 13,552 stock-out days.

Shorter variant, if the field is tight:

> MedMesh finds the medicines a health system is about to throw away and the
> clinics about to run out of them, and moves one to the other. Gemini reads the
> paper registers clinics already keep, so facilities with no digital system can
> join the network without changing how they work.

## Track
03, Smart Health and Supply Chain Resilience (BRICS theme: Resilience)

## Links

| Item | Link |
|---|---|
| Source code | https://github.com/Baralashutosh/GOOGLE-HACKATHON |
| Deployed prototype | _paste the Vercel URL_ |
| Demo video | _paste the unlisted YouTube link_ |
| Pitch deck | `pitch/MedMesh-TwoClocks.pptx` |

## If asked how Google AI is used

Gemini does three load-bearing jobs. It reads handwritten paper stock registers
from a phone photo, which is the entire last mile and the reason facilities with
no digital system can join at all. It reads spoken stock reports natively, so a
worker speaks Hindi, Portuguese or isiZulu into the same endpoint. And it writes
the justification a district officer reads before approving a transfer.

Model choice was benchmarked rather than assumed: flash-lite with thinking
disabled reads a register in under 5 seconds where the larger model took 26 to
35 seconds for a character-identical answer.

Drug name matching is deliberately deterministic code, never a model decision,
because a confident invisible substitution of one molecule for another is the
failure that ends a pilot.

## Anticipated judge questions

**Is the data real?**
The calibration targets, the drug catalogue, the ATC codes and the districts are
real. Consumption and stock are simulated, because no ministry publishes
facility-level stock data, which is itself part of the problem. The generator
self-checks against five published measures and is within tolerance on all five.
The `/method` page states this plainly.

**Why has nobody built this?**
They have built the tree, repeatedly. OpenLMIS, DVDMS, Hórus, ePIMS all report
up and down. None do horizontal peer-to-peer matching, and the South African
study explicitly says the national system lacks a redistribution module. The
commercial redistribution products that exist are US hospital inventory tools or
charitable donation logistics, neither of which fits an LMIC public system.

**Why should waste-averted be believed?**
Because it is deliberately conservative. It counts only units the projection says
would have expired unused. Stock merely moved somewhere more useful is not
counted, which is why the number is smaller than it could be.

**What breaks first at scale?**
Straight-line distance. It is a 1.35 correction on Haversine, not real routing,
so a river or a closed pass breaks individual proposals. Google Maps Routes API
is a one-line swap that was left out only because it requires billing.
