/**
 * MedMesh pitch deck, 12 slides.
 *
 * Built dark throughout, matching the product, because this gets shown to
 * health ministers and international delegates and should read as an operations
 * briefing rather than a product launch. Colour carries meaning and nothing
 * else: amber is stock about to expire, red is a shelf about to run dry, teal
 * is the transfer that resolves both. Those three appear on every slide and
 * mean the same thing every time.
 *
 * Run: node pitch/build.js
 */

const pptxgen = require('pptxgenjs');
const fs = require('node:fs');
const path = require('node:path');

const OUT = path.join(__dirname, 'MedMesh-TwoClocks.pptx');
const LOGO = path.join(__dirname, '..', 'brand', 'logo-transparent-1024.png');

// Palette. Never prefixed with #, never 8 digits.
const INK = '0B0F1A';
const SURFACE = '161D2E';
const LINE = '2C3850';
const TEXT = 'E8EEF7';
const MUTED = '94A3B8';
const AMBER = 'F5A524';
const RED = 'FF4D5E';
const TEAL = '2DD4A7';

const BODY = 'Calibri';
const HEAD = 'Calibri';

// Slide is 13.333 x 7.5. Everything lives inside this margin.
const L = 0.7;
const W = 11.93;

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';          // must be set before any slide is added
pres.author = 'Two Clocks';
pres.title = 'MedMesh';

const logo = fs.existsSync(LOGO)
  ? 'image/png;base64,' + fs.readFileSync(LOGO).toString('base64')
  : null;

/** Every slide starts here so the ground and the mark never drift. */
function slide({ dark = true } = {}) {
  const s = pres.addSlide();
  s.background = { color: dark ? INK : SURFACE };
  return s;
}

/** Section eyebrow plus title. One call, so vertical rhythm is identical. */
function heading(s, eyebrow, title, { titleSize = 34 } = {}) {
  s.addText(eyebrow.toUpperCase(), {
    x: L, y: 0.45, w: W, h: 0.28,
    fontFace: BODY, fontSize: 11, bold: true, color: TEAL,
    charSpacing: 2, margin: 0,
  });
  s.addText(title, {
    x: L, y: 0.78, w: W, h: 1.15,
    fontFace: HEAD, fontSize: titleSize, bold: true, color: TEXT,
    margin: 0, valign: 'top',
  });
}

function footer(s, n) {
  if (logo) s.addImage({ data: logo, x: L, y: 6.92, w: 0.28, h: 0.28 });
  s.addText('MedMesh  ·  Two Clocks', {
    x: L + 0.38, y: 6.92, w: 5, h: 0.28,
    fontFace: BODY, fontSize: 10, color: MUTED, margin: 0, valign: 'middle',
  });
  s.addText(String(n), {
    x: W - 0.5 + L, y: 6.92, w: 0.5, h: 0.28,
    fontFace: BODY, fontSize: 10, color: MUTED, align: 'right', margin: 0, valign: 'middle',
  });
}

/** A stat card. Big number, label under it, optional source line. */
function card(s, { x, y, w, h = 1.6, value, label, note, color = TEAL }) {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.08,
    fill: { color: SURFACE }, line: { color: LINE, width: 1 },
  });
  s.addText(value, {
    x: x + 0.25, y: y + 0.18, w: w - 0.5, h: 0.6,
    fontFace: HEAD, fontSize: 30, bold: true, color, margin: 0, valign: 'middle',
  });
  s.addText(label, {
    x: x + 0.25, y: y + 0.78, w: w - 0.5, h: 0.44,
    fontFace: BODY, fontSize: 12, color: TEXT, margin: 0, valign: 'top',
  });
  if (note) {
    s.addText(note, {
      x: x + 0.25, y: y + h - 0.48, w: w - 0.5, h: 0.38,
      fontFace: BODY, fontSize: 10, color: MUTED, margin: 0, valign: 'top',
    });
  }
}

/* ========================= 1. TITLE ========================= */
{
  const s = slide();
  if (logo) s.addImage({ data: logo, x: L, y: 1.5, w: 0.85, h: 0.85 });

  s.addText('MedMesh', {
    x: L, y: 2.5, w: W, h: 1.15,
    fontFace: HEAD, fontSize: 54, bold: true, color: TEXT, margin: 0,
  });
  s.addText('The medicine already exists. It is in the wrong place.', {
    x: L, y: 3.45, w: 9.6, h: 0.6,
    fontFace: HEAD, fontSize: 24, color: MUTED, margin: 0,
  });
  s.addText(
    'Public health systems run out of a medicine and throw the same medicine away, '
    + 'in the same district, in the same quarter.',
    {
      x: L, y: 4.25, w: 9.2, h: 0.8,
      fontFace: BODY, fontSize: 15, color: TEXT, margin: 0, lineSpacingMultiple: 1.3,
    });

  s.addText('Team Two Clocks   ·   Track 03, Smart Health and Supply Chain Resilience', {
    x: L, y: 5.5, w: W, h: 0.3,
    fontFace: BODY, fontSize: 12, color: TEAL, margin: 0,
  });
  s.addText('Build with AI: Code for Communities, Second Edition', {
    x: L, y: 5.82, w: W, h: 0.3,
    fontFace: BODY, fontSize: 12, color: MUTED, margin: 0,
  });
  s.addNotes(
    'MedMesh, from team Two Clocks. One sentence: the medicine already exists, it is '
    + 'in the wrong place. Health systems across BRICS stock out of a drug and expire '
    + 'that same drug in the same district in the same quarter.');
}

/* ==================== 2. THE CONTRADICTION ==================== */
{
  const s = slide();
  heading(s, 'The problem, measured', 'One district. Both failures at once.');

  card(s, {
    x: L, y: 2.0, w: 3.75, h: 1.85, value: '85.6%', color: RED,
    label: 'of medicines hit by stock-outs',
    note: 'King Cetshwayo, South Africa',
  });
  card(s, {
    x: L + 4.09, y: 2.0, w: 3.75, h: 1.85, value: '50.6%', color: AMBER,
    label: 'of the same medicines overstocked',
    note: 'Same district, same study',
  });
  card(s, {
    x: L + 8.18, y: 2.0, w: 3.75, h: 1.85, value: '15.2%', color: AMBER,
    label: 'lost to expiry, unused',
    note: 'BMC Health Serv Res, 2023',
  });

  s.addText(
    'These are not three different places. They are one district, one year, one shelf.',
    {
      x: L, y: 4.15, w: W, h: 0.4,
      fontFace: HEAD, fontSize: 17, bold: true, color: TEXT, margin: 0,
    });

  s.addText([
    { text: 'Brazil:  ', options: { bold: true, color: TEXT } },
    { text: '82% of 3,360 municipalities reported shortages, while 5 to 20% of publicly purchased medicines were wasted.  (CNM, 2022)', options: { color: MUTED } },
  ], { x: L, y: 4.75, w: W, h: 0.42, fontFace: BODY, fontSize: 13, margin: 0 });

  s.addText([
    { text: 'India:  ', options: { bold: true, color: TEXT } },
    { text: 'only 52% of essential medicines available in more than 80% of primary facilities.', options: { color: MUTED } },
  ], { x: L, y: 5.2, w: W, h: 0.42, fontFace: BODY, fontSize: 13, margin: 0 });

  s.addText([
    { text: 'WHO, 2010 to 2019:  ', options: { bold: true, color: TEXT } },
    { text: 'facilities with core essential medicines available ranged 8% to 41% across low and lower-middle income countries.', options: { color: MUTED } },
  ], { x: L, y: 5.65, w: W, h: 0.42, fontFace: BODY, fontSize: 13, margin: 0 });

  footer(s, 2);
  s.addNotes('The contradiction is measured, not asserted. Same district, same year: '
    + '85.6% of medicines stocked out while half were overstocked and 15% expired.');
}

/* ================= 3. IT IS GETTING WORSE ================= */
{
  const s = slide();
  heading(s, 'The number that should worry a ministry', 'We built the tracking. Stock-outs doubled anyway.');

  s.addShape(pres.ShapeType.roundRect, {
    x: L, y: 2.15, w: W, h: 2.0, rectRadius: 0.08,
    fill: { color: SURFACE }, line: { color: LINE, width: 1 },
  });

  s.addText('26.4%', {
    x: L + 0.5, y: 2.5, w: 2.6, h: 0.9,
    fontFace: HEAD, fontSize: 40, bold: true, color: MUTED, margin: 0, valign: 'middle',
  });
  s.addText('2006 to 2015', {
    x: L + 0.5, y: 3.35, w: 2.6, h: 0.35,
    fontFace: BODY, fontSize: 12, color: MUTED, margin: 0,
  });

  s.addShape(pres.ShapeType.rightArrow, {
    x: L + 3.4, y: 2.85, w: 1.1, h: 0.34, fill: { color: LINE },
  });

  s.addText('48.7%', {
    x: L + 5.0, y: 2.5, w: 2.6, h: 0.9,
    fontFace: HEAD, fontSize: 40, bold: true, color: RED, margin: 0, valign: 'middle',
  });
  s.addText('2016 to 2021', {
    x: L + 5.0, y: 3.35, w: 2.6, h: 0.35,
    fontFace: BODY, fontSize: 12, color: MUTED, margin: 0,
  });

  s.addText('Community health worker\nstock-out rate', {
    x: L + 8.2, y: 2.55, w: 3.2, h: 1.0,
    fontFace: BODY, fontSize: 14, color: TEXT, margin: 0, valign: 'middle',
    lineSpacingMultiple: 1.25,
  });

  s.addText(
    'That rise happened across exactly the period when logistics systems were rolled '
    + 'out everywhere. OpenLMIS runs in 11,000 facilities. India has DVDMS. Brazil has '
    + 'Hórus. South Africa has ePIMS.',
    {
      x: L, y: 4.5, w: W, h: 0.9,
      fontFace: BODY, fontSize: 15, color: TEXT, margin: 0, lineSpacingMultiple: 1.35,
    });

  s.addText('Fifteen years of tracking, and it got worse. Tracking was never the bottleneck.', {
    x: L, y: 5.5, w: W, h: 0.5,
    fontFace: HEAD, fontSize: 19, bold: true, color: TEAL, margin: 0,
  });

  footer(s, 3);
  s.addNotes('This is the slide that reframes the problem. Everyone assumes the gap is '
    + 'visibility. Fifteen years of visibility software, and community health worker '
    + 'stock-outs nearly doubled.');
}

/* ================= 4. WHY NOBODY SOLVED IT ================= */
{
  const s = slide();
  heading(s, 'Why fifteen years of software missed it', 'Every supply system is a tree. Medicine needs a mesh.', { titleSize: 29 });

  // Tree, left
  s.addShape(pres.ShapeType.roundRect, {
    x: L, y: 2.1, w: 5.7, h: 3.1, rectRadius: 0.08,
    fill: { color: SURFACE }, line: { color: LINE, width: 1 },
  });
  s.addText('What exists today', {
    x: L + 0.3, y: 2.3, w: 5.1, h: 0.3,
    fontFace: BODY, fontSize: 12, bold: true, color: MUTED, margin: 0, charSpacing: 1,
  });
  s.addShape(pres.ShapeType.ellipse, { x: L + 2.65, y: 2.75, w: 0.34, h: 0.34, fill: { color: MUTED } });
  ['3.95', '4.75', '5.55'].forEach((yy, i) => {
    const xs = [L + 1.0, L + 2.65, L + 4.3];
    s.addShape(pres.ShapeType.line, {
      x: L + 2.82, y: 3.09, w: xs[i] + 0.17 - (L + 2.82), h: 0.66,
      line: { color: LINE, width: 1.5 },
    });
  });
  [[L + 1.0, AMBER], [L + 2.65, LINE], [L + 4.3, RED]].forEach(([xx, col]) => {
    s.addShape(pres.ShapeType.ellipse, { x: xx, y: 3.75, w: 0.34, h: 0.34, fill: { color: col } });
  });
  s.addText('These two cannot see each other.', {
    x: L + 0.3, y: 4.35, w: 5.1, h: 0.35,
    fontFace: BODY, fontSize: 13, color: TEXT, margin: 0,
  });
  s.addText('Stock reports up and comes back down. There is no sideways.', {
    x: L + 0.3, y: 4.7, w: 5.1, h: 0.45,
    fontFace: BODY, fontSize: 12, color: MUTED, margin: 0,
  });

  // Mesh, right
  s.addShape(pres.ShapeType.roundRect, {
    x: L + 6.23, y: 2.1, w: 5.7, h: 3.1, rectRadius: 0.08,
    fill: { color: SURFACE }, line: { color: TEAL, width: 1 },
  });
  s.addText('MedMesh adds one edge', {
    x: L + 6.53, y: 2.3, w: 5.1, h: 0.3,
    fontFace: BODY, fontSize: 12, bold: true, color: TEAL, margin: 0, charSpacing: 1,
  });
  s.addShape(pres.ShapeType.ellipse, { x: L + 8.88, y: 2.75, w: 0.34, h: 0.34, fill: { color: MUTED } });
  [[L + 7.23], [L + 8.88], [L + 10.53]].forEach(([xx], i) => {
    s.addShape(pres.ShapeType.line, {
      x: L + 9.05, y: 3.09, w: xx + 0.17 - (L + 9.05), h: 0.66,
      line: { color: LINE, width: 1.5 },
    });
  });
  [[L + 7.23, AMBER], [L + 8.88, LINE], [L + 10.53, RED]].forEach(([xx, col]) => {
    s.addShape(pres.ShapeType.ellipse, { x: xx, y: 3.75, w: 0.34, h: 0.34, fill: { color: col } });
  });
  s.addShape(pres.ShapeType.line, {
    x: L + 7.4, y: 4.16, w: 3.3, h: 0,
    line: { color: TEAL, width: 2.5, endArrowType: 'triangle' },
  });
  s.addText('Surplus moves to shortage.', {
    x: L + 6.53, y: 4.35, w: 5.1, h: 0.35,
    fontFace: BODY, fontSize: 13, color: TEXT, margin: 0,
  });
  s.addText('One link, and the pair becomes visible to each other.', {
    x: L + 6.53, y: 4.7, w: 5.1, h: 0.45,
    fontFace: BODY, fontSize: 12, color: MUTED, margin: 0,
  });

  s.addText(
    'We did not invent this gap. The South African study states that the national pharmacy '
    + 'system "lacks a redistribution module". Redistribution is already policy in India, '
    + 'South Africa and Uganda. It runs on phone calls between pharmacists who happen to know each other.',
    {
      x: L, y: 5.45, w: W, h: 0.85,
      fontFace: BODY, fontSize: 13, color: MUTED, margin: 0, lineSpacingMultiple: 1.3,
    });

  footer(s, 4);
  s.addNotes('Every logistics system ever built is a tree. Facility reports up, warehouse '
    + 'reports up. No sideways channel. A clinic 11km away with expiring stock is invisible.');
}

/* ==================== 5. THE INSIGHT ==================== */
{
  const s = slide();
  heading(s, 'The insight', 'Every medicine is racing two clocks.');

  card(s, {
    x: L, y: 2.2, w: 5.7, h: 2.0, value: 'Clock one', color: RED,
    label: 'The day it runs out',
    note: 'Tracked badly by existing systems',
  });
  card(s, {
    x: L + 6.23, y: 2.2, w: 5.7, h: 2.0, value: 'Clock two', color: AMBER,
    label: 'The day it expires',
    note: 'Tracked by almost nobody',
  });

  s.addText(
    'Ask those two questions separately and the answers quietly contradict each other. '
    + 'Ask them together, over the same stock, in one simulation, and you get the truth: '
    + 'a facility can be days from empty while holding stock it will never use.',
    {
      x: L, y: 4.5, w: W, h: 1.0,
      fontFace: BODY, fontSize: 15, color: TEXT, margin: 0, lineSpacingMultiple: 1.35,
    });

  s.addText('Where those clocks collide across two facilities, there is a transfer worth making.', {
    x: L, y: 5.6, w: W, h: 0.5,
    fontFace: HEAD, fontSize: 19, bold: true, color: TEAL, margin: 0,
  });

  footer(s, 5);
  s.addNotes('This is the technical core and the reason the team is called Two Clocks.');
}

/* ==================== 6. HOW IT WORKS ==================== */
{
  const s = slide();
  heading(s, 'How it works', 'Three steps, and the first one is the hard one.');

  const steps = [
    ['01', 'Read what the clinic already keeps',
      'Most primary facilities never file a digital stock count. They keep a paper register and have no intention of adopting software. Gemini reads a phone photo of that page, or a spoken report in Hindi, Portuguese or isiZulu.',
      '42 of 42 rows correct'],
    ['02', 'Run both clocks at once',
      'Days until it runs out and days until it expires, projected together over the same stock in one first-expiry-first-out simulation. Season-aware, because season-blind ordering is the failure being corrected.',
      'Seasonal forecast'],
    ['03', 'Move it, and say why',
      'A committed count re-runs both clocks and re-runs the matcher across the district. One photographed page moved 13 medicines between states and created 11 transfers that did not exist a moment before. Gemini writes the justification; a human approves.',
      'Paper to transfer, one request'],
  ];

  steps.forEach(([n, title, body, badge], i) => {
    const x = L + i * 4.09;
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 2.05, w: 3.75, h: 3.6, rectRadius: 0.08,
      fill: { color: SURFACE }, line: { color: LINE, width: 1 },
    });
    s.addText(n, {
      x: x + 0.28, y: 2.25, w: 1, h: 0.35,
      fontFace: HEAD, fontSize: 15, bold: true, color: TEAL, margin: 0,
    });
    s.addText(title, {
      x: x + 0.28, y: 2.65, w: 3.2, h: 0.75,
      fontFace: HEAD, fontSize: 15, bold: true, color: TEXT, margin: 0, valign: 'top',
    });
    s.addText(body, {
      x: x + 0.28, y: 3.45, w: 3.2, h: 1.75,
      fontFace: BODY, fontSize: 11.5, color: MUTED, margin: 0, valign: 'top',
      lineSpacingMultiple: 1.25,
    });
    s.addText(badge, {
      x: x + 0.28, y: 5.22, w: 3.2, h: 0.3,
      fontFace: BODY, fontSize: 11, bold: true, color: TEAL, margin: 0,
    });
  });

  footer(s, 6);
  s.addNotes('Step one is the one everybody skips, and it is why every previous system '
    + 'failed at the last mile.');
}

/* ==================== 7. GOOGLE AI ==================== */
{
  const s = slide();
  heading(s, 'Where Google AI does the work', 'Load-bearing, not decorative.');

  const rows = [
    ['Read handwritten paper registers', 'gemini-3.1-flash-lite, vision',
      'The entire last mile. Without it, facilities with no digital system cannot join at all.'],
    ['Read spoken stock reports', 'same model, native audio',
      'Transcription, translation and structuring in one call, in the worker’s own language.'],
    ['Write the officer’s justification', 'gemini-3.5-flash',
      'Makes computed reasoning legible so a human will actually sign it.'],
  ];

  rows.forEach(([job, model, why], i) => {
    const y = 2.05 + i * 1.15;
    s.addShape(pres.ShapeType.roundRect, {
      x: L, y, w: W, h: 1.0, rectRadius: 0.06,
      fill: { color: SURFACE }, line: { color: LINE, width: 1 },
    });
    s.addText(job, {
      x: L + 0.3, y: y + 0.14, w: 3.5, h: 0.34,
      fontFace: HEAD, fontSize: 14, bold: true, color: TEXT, margin: 0,
    });
    s.addText(model, {
      x: L + 0.3, y: y + 0.5, w: 3.5, h: 0.32,
      fontFace: BODY, fontSize: 11, color: TEAL, margin: 0,
    });
    s.addText(why, {
      x: L + 4.1, y: y + 0.22, w: 7.5, h: 0.6,
      fontFace: BODY, fontSize: 12.5, color: MUTED, margin: 0, valign: 'middle',
      lineSpacingMultiple: 1.2,
    });
  });

  s.addText(
    'Model choice is benchmarked, not assumed. Reading a register is transcription, so '
    + 'flash-lite with thinking disabled does it in under 5 seconds where the larger model '
    + 'took 26 to 35 seconds for a character-identical answer.',
    {
      x: L, y: 5.6, w: W, h: 0.7,
      fontFace: BODY, fontSize: 13, color: TEXT, margin: 0, lineSpacingMultiple: 1.3,
    });

  footer(s, 7);
  s.addNotes('Drug name matching is deterministic code, never a model decision. Letting an '
    + 'LLM pick the molecule invites a confident invisible substitution, and confidently '
    + 'wrong medicine is the failure that ends a pilot.');
}

/* ==================== 8. RESULTS ==================== */
{
  const s = slide();
  heading(s, '99 facilities · 9 districts · 3 countries', 'What the mesh found.');

  card(s, { x: L, y: 2.05, w: 2.85, h: 1.75, value: '13,552', color: TEAL, label: 'Stock-out days averted', note: 'Days a patient is not turned away' });
  card(s, { x: L + 3.03, y: 2.05, w: 2.85, h: 1.75, value: '614', color: TEAL, label: 'Transfers proposed', note: '274 cross a district boundary' });
  card(s, { x: L + 6.06, y: 2.05, w: 2.85, h: 1.75, value: '90 / 99', color: TEXT, label: 'Facilities helped', note: 'Received a viable transfer' });
  card(s, { x: L + 9.09, y: 2.05, w: 2.85, h: 1.75, value: '96,935', color: AMBER, label: 'Units of waste averted', note: 'Only genuinely doomed stock' });

  s.addShape(pres.ShapeType.roundRect, {
    x: L, y: 4.1, w: W, h: 1.62, rectRadius: 0.08,
    fill: { color: SURFACE }, line: { color: TEAL, width: 1 },
  });
  s.addText('A real proposal, unedited from the run', {
    x: L + 0.35, y: 4.28, w: 11.2, h: 0.3,
    fontFace: BODY, fontSize: 11, bold: true, color: TEAL, margin: 0, charSpacing: 1,
  });
  s.addText(
    '418 vials of human insulin.  CHC Manguzi to CHC Mtubatuba, uMkhanyakude, 11.1 km. '
    + 'Batch expires 26 October. Averts 47 stock-out days.',
    {
      x: L + 0.35, y: 4.60, w: 11.2, h: 0.66,
      fontFace: HEAD, fontSize: 15, bold: true, color: TEXT, margin: 0, valign: 'top',
    });
  s.addText(
    'Two clinics eleven kilometres apart. One about to bin insulin, one about to run out of it. Neither can see the other today.',
    {
      x: L + 0.35, y: 5.28, w: 11.2, h: 0.35,
      fontFace: BODY, fontSize: 12.5, color: MUTED, margin: 0,
    });

  s.addText(
    'End to end, live: photographing one register page moves 13 medicines between states and '
    + 'creates 11 transfers that did not exist seconds earlier. Waste averted counts only units '
    + 'that would genuinely have expired, keeping the number smaller and defensible.',
    {
      x: L, y: 5.88, w: W, h: 0.62,
      fontFace: BODY, fontSize: 11.5, color: MUTED, margin: 0,
    });

  footer(s, 8);
  s.addNotes('The insulin case is the whole product in one line. Lead with it if time is short.');
}

/* ==================== 9. CROSS BORDER ==================== */
{
  const s = slide();
  heading(s, 'Cooperation as arithmetic', 'Malaria season in India is the off-season in Brazil.');

  s.addText(
    'Medicines are keyed to WHO ATC codes rather than national product codes, so an Indian PHC, '
    + 'a Brazilian UBS and a South African clinic describe the same molecule identically. One '
    + 'country’s surplus can be matched against another’s shortfall.',
    {
      x: L, y: 1.95, w: W, h: 0.85,
      fontFace: BODY, fontSize: 14, color: TEXT, margin: 0, lineSpacingMultiple: 1.3,
    });

  s.addShape(pres.ShapeType.roundRect, {
    x: L, y: 2.95, w: W, h: 1.5, rectRadius: 0.08,
    fill: { color: SURFACE }, line: { color: TEAL, width: 1 },
  });
  s.addText('South Africa  →  India', {
    x: L + 0.35, y: 3.2, w: 4.2, h: 0.45,
    fontFace: HEAD, fontSize: 20, bold: true, color: TEXT, margin: 0, valign: 'middle',
  });
  s.addText('53,934 units', {
    x: L + 0.35, y: 3.68, w: 4.2, h: 0.45,
    fontFace: HEAD, fontSize: 22, bold: true, color: TEAL, margin: 0, valign: 'middle',
  });
  s.addText(
    'Artemether-Lumefantrine. Their antimalarial surplus sits in India’s shortfall, '
    + 'because the malaria seasons are six months out of phase.',
    {
      x: L + 5.0, y: 3.25, w: 6.5, h: 0.95,
      fontFace: BODY, fontSize: 13.5, color: MUTED, margin: 0, valign: 'middle',
      lineSpacingMultiple: 1.3,
    });

  s.addText('Hemispheres are modelled explicitly, which turns a slogan into a calculation.', {
    x: L, y: 4.65, w: W, h: 0.4,
    fontFace: HEAD, fontSize: 16, bold: true, color: TEXT, margin: 0,
  });
  s.addText(
    'Computed at national level, not facility to facility. A truck between Bihar and Amazonas '
    + 'is a slide, not logistics. The same engine runs unchanged in any BRICS member, because '
    + 'the join key is a molecule, not a country.',
    {
      x: L, y: 5.15, w: W, h: 0.85,
      fontFace: BODY, fontSize: 13, color: MUTED, margin: 0, lineSpacingMultiple: 1.3,
    });

  footer(s, 9);
  s.addNotes('This is the cross-border slide. The hemisphere point is the strongest single '
    + 'argument that pooling across BRICS is arithmetic rather than diplomacy.');
}

/* ==================== 10. DEPLOYABILITY ==================== */
{
  const s = slide();
  heading(s, 'Deployability', 'Not a replacement. The module they are missing.', { titleSize: 30 });

  const systems = [
    ['India', 'DVDMS / e-Aushadhi'],
    ['Brazil', 'Hórus'],
    ['South Africa', 'ePIMS / RxSolution'],
  ];
  systems.forEach(([country, sys], i) => {
    const x = L + i * 4.09;
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 2.15, w: 3.75, h: 1.2, rectRadius: 0.06,
      fill: { color: SURFACE }, line: { color: LINE, width: 1 },
    });
    s.addText(country, {
      x: x + 0.28, y: 2.35, w: 3.2, h: 0.32,
      fontFace: BODY, fontSize: 12, color: MUTED, margin: 0,
    });
    s.addText(sys, {
      x: x + 0.28, y: 2.68, w: 3.2, h: 0.4,
      fontFace: HEAD, fontSize: 15, bold: true, color: TEXT, margin: 0,
    });
  });

  s.addText('All three keep running. MedMesh sits beside them and adds the sideways link.', {
    x: L, y: 3.6, w: W, h: 0.4,
    fontFace: HEAD, fontSize: 17, bold: true, color: TEAL, margin: 0,
  });

  const points = [
    'No new hardware, no new workflow at the facility. A phone photo of the register they already keep.',
    'Forecasting runs in-process, so a district office can run this on a laptop with no cloud bill.',
    'One district is a pilot. The engine is country-agnostic, so the second district costs nothing new.',
    'Every transfer is a recommendation. A human officer approves, which is how it survives audit.',
  ];
  points.forEach((p, i) => {
    const y = 4.15 + i * 0.5;
    s.addShape(pres.ShapeType.ellipse, {
      x: L + 0.05, y: y + 0.13, w: 0.12, h: 0.12, fill: { color: TEAL },
    });
    s.addText(p, {
      x: L + 0.4, y, w: W - 0.4, h: 0.44,
      fontFace: BODY, fontSize: 13.5, color: TEXT, margin: 0, valign: 'middle',
    });
  });

  footer(s, 10);
  s.addNotes('Judges weight deployability heavily. The key line: this is the module they are '
    + 'missing, not a replacement for anything.');
}

/* ==================== 11. HONESTY ==================== */
{
  const s = slide();
  heading(s, 'What we are not claiming', 'Where this is weaker than it looks.');

  const limits = [
    ['Distance is approximate', 'Straight-line times 1.35, not real routing. A river breaks individual proposals. Google Maps Routes API is a one-line swap.'],
    ['The matcher is greedy, not optimal', 'Deliberate. An officer must follow why a proposal exists, and an optimal plan nobody trusts delivers nothing.'],
    ['The data is simulated', 'No ministry publishes facility-level stock, which is part of the problem. Calibrated to five published measures, within tolerance on all five.'],
    ['Outbreaks are the blind spot', 'The forecast assumes last year’s seasonality holds, so a cholera surge is exactly what it would miss, and exactly when the mesh matters most.'],
  ];

  limits.forEach(([title, body], i) => {
    const x = L + (i % 2) * 6.06;
    const y = 2.05 + Math.floor(i / 2) * 1.85;
    s.addShape(pres.ShapeType.roundRect, {
      x, y, w: 5.87, h: 1.6, rectRadius: 0.06,
      fill: { color: SURFACE }, line: { color: LINE, width: 1 },
    });
    s.addText(title, {
      x: x + 0.3, y: y + 0.2, w: 5.27, h: 0.35,
      fontFace: HEAD, fontSize: 14, bold: true, color: AMBER, margin: 0,
    });
    s.addText(body, {
      x: x + 0.3, y: y + 0.58, w: 5.27, h: 0.9,
      fontFace: BODY, fontSize: 12, color: MUTED, margin: 0, valign: 'top',
      lineSpacingMultiple: 1.25,
    });
  });

  s.addText(
    'Calibration: stock-outs 79.3% against 85.6% published, overstock 55.6% against 50.6%, '
    + 'mean stock-out duration 21.7 days against 22.4. The generator self-checks on every run.',
    {
      x: L, y: 5.85, w: W, h: 0.5,
      fontFace: BODY, fontSize: 12, color: TEXT, margin: 0,
    });

  footer(s, 11);
  s.addNotes('Saying this out loud buys more credibility than it costs. Judges assume '
    + 'weaknesses exist; naming them first means they trust the rest.');
}

/* ==================== 12. CLOSE ==================== */
{
  const s = slide();
  if (logo) s.addImage({ data: logo, x: L, y: 1.35, w: 0.75, h: 0.75 });

  s.addText('The medicine already exists.', {
    x: L, y: 2.35, w: W, h: 0.75,
    fontFace: HEAD, fontSize: 40, bold: true, color: TEXT, margin: 0,
  });
  s.addText('It is in the wrong place.', {
    x: L, y: 3.1, w: W, h: 0.75,
    fontFace: HEAD, fontSize: 40, bold: true, color: TEAL, margin: 0,
  });

  s.addText(
    'Two clinics eleven kilometres apart, one binning insulin and one without any. '
    + 'That is not a supply problem. It is a visibility problem with a shape nobody built for.',
    {
      x: L, y: 4.15, w: 9.8, h: 0.85,
      fontFace: BODY, fontSize: 15, color: MUTED, margin: 0, lineSpacingMultiple: 1.35,
    });

  s.addText('What we are asking for', {
    x: L, y: 5.2, w: W, h: 0.3,
    fontFace: BODY, fontSize: 11, bold: true, color: TEAL, margin: 0, charSpacing: 2,
  });
  s.addText('One district. One quarter. Beside the system that is already there.', {
    x: L, y: 5.5, w: W, h: 0.45,
    fontFace: HEAD, fontSize: 20, bold: true, color: TEXT, margin: 0,
  });

  s.addText('Team Two Clocks   ·   github.com/Baralashutosh/GOOGLE-HACKATHON', {
    x: L, y: 6.3, w: W, h: 0.3,
    fontFace: BODY, fontSize: 12, color: MUTED, margin: 0,
  });

  s.addNotes('Close on the insulin image. Ask for one district, one quarter. Small ask, '
    + 'concrete, and it is genuinely all we need to prove this.');
}

pres.writeFile({ fileName: OUT }).then(() => {
  console.log('wrote', OUT);
});
