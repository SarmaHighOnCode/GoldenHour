// GoldenHour — CodeQuest 2026 pitch deck generator
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const FA = require("react-icons/fa");

// ---------- palette --------------------------------------------------------
const DARK = "151210";       // warm charcoal
const DARK2 = "201B16";      // raised dark surface
const CREAM = "FBF7F0";      // content background
const WHITE = "FFFFFF";
const INK = "1A1714";        // near-black text
const AMBER = "F59E0B";
const AMBER_DEEP = "B45309";
const CRIMSON = "DC2626";
const EMERALD = "10B981";
const SLATE = "5B5249";      // warm slate (muted text on cream)
const SLATE_DK = "B8AE9F";   // muted text on dark
const BORDER = "E8E1D4";
const HFONT = "Georgia";
const BFONT = "Calibri";

const makeShadow = () => ({ type: "outer", color: "5B4A2A", blur: 9, offset: 3, angle: 90, opacity: 0.16 });

// ---------- icon rasterizer ------------------------------------------------
function svgFor(Icon, color, size = 256) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(Icon, { color, size: String(size) })
  );
}
async function icon(Icon, color) {
  const png = await sharp(Buffer.from(svgFor(Icon, color))).png().toBuffer();
  return "image/png;base64," + png.toString("base64");
}

async function main() {
  // preload icons
  const I = {};
  const want = {
    pulse: [FA.FaHeartbeat, WHITE], clock: [FA.FaRegClock, CRIMSON],
    car: [FA.FaCarSide, AMBER_DEEP], hospW: [FA.FaHospital, WHITE],
    tintW: [FA.FaTint, WHITE], cross: [FA.FaTimesCircle, CRIMSON],
    check: [FA.FaCheckCircle, EMERALD], bolt: [FA.FaBolt, WHITE],
    shield: [FA.FaShieldAlt, WHITE], city: [FA.FaCity, WHITE],
    sms: [FA.FaCommentDots, WHITE], server: [FA.FaServer, WHITE],
    db: [FA.FaDatabase, WHITE], layers: [FA.FaLayerGroup, WHITE],
    trophy: [FA.FaTrophy, WHITE], sort: [FA.FaSortAmountDown, WHITE],
    react: [FA.FaReact, WHITE], python: [FA.FaPython, WHITE],
    map: [FA.FaMapMarkedAlt, WHITE], docker: [FA.FaDocker, WHITE],
    users: [FA.FaUsers, WHITE], ban: [FA.FaBan, CRIMSON],
    github: [FA.FaGithub, WHITE], vial: [FA.FaVial, WHITE],
    route: [FA.FaRoute, WHITE], cloud: [FA.FaCloud, WHITE],
    boltA: [FA.FaBolt, AMBER],
  };
  for (const [k, [Ic, c]] of Object.entries(want)) I[k] = await icon(Ic, c);

  const pres = new pptxgen();
  pres.defineLayout({ name: "GH", width: 13.333, height: 7.5 });
  pres.layout = "GH";
  pres.author = "Team GoldenHour";
  pres.title = "GoldenHour — CodeQuest 2026";
  const W = 13.333, H = 7.5, M = 0.7;

  // ---------- shared builders ----------------------------------------------
  const kicker = (s, text, color, dark) => {
    s.addShape(pres.shapes.RECTANGLE, { x: M, y: 0.62, w: 0.16, h: 0.34, fill: { color } });
    s.addText(text.toUpperCase(), {
      x: M + 0.26, y: 0.6, w: 9, h: 0.38, fontFace: BFONT, fontSize: 12.5, bold: true,
      color: dark ? AMBER : color, charSpacing: 3, align: "left", valign: "middle", margin: 0,
    });
  };
  const title = (s, text, dark, w = 11.6) => {
    s.addText(text, {
      x: M, y: 1.04, w, h: 1.1, fontFace: HFONT, fontSize: 30, bold: true,
      color: dark ? WHITE : INK, align: "left", valign: "top", lineSpacingMultiple: 0.98, margin: 0,
    });
  };
  const footer = (s, n) => {
    s.addText("GoldenHour", { x: M, y: H - 0.5, w: 4, h: 0.3, fontFace: BFONT, fontSize: 9.5, bold: true, color: SLATE, margin: 0 });
    s.addText("Bharat Academix CodeQuest 2026", { x: W - 5.2, y: H - 0.5, w: 3.8, h: 0.3, fontFace: BFONT, fontSize: 9.5, color: SLATE, align: "right", margin: 0 });
    s.addText(String(n).padStart(2, "0"), { x: W - 1.1, y: H - 0.5, w: 0.5, h: 0.3, fontFace: BFONT, fontSize: 9.5, bold: true, color: AMBER_DEEP, align: "right", margin: 0 });
  };
  const iconCircle = (s, x, y, d, bg, data) => {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: bg }, shadow: makeShadow() });
    const p = d * 0.27;
    s.addImage({ data, x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p });
  };
  const pulseDeco = (s, cx, cy) => {
    [[2.6, 95], [1.9, 92], [1.25, 88], [0.7, 80]].forEach(([d, t]) =>
      s.addShape(pres.shapes.OVAL, { x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: { color: AMBER, transparency: t } }));
  };

  // ============================ SLIDE 1 — TITLE ============================
  let s = pres.addSlide();
  s.background = { color: DARK };
  pulseDeco(s, 11.7, 6.2);
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 0.14, fill: { color: AMBER } });
  // brand chip
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 0.95, w: 5.55, h: 0.46, rectRadius: 0.23, fill: { color: DARK2 }, line: { color: AMBER_DEEP, width: 1 } });
  s.addText("BHARAT ACADEMIX CODEQUEST 2026  ·  MVP ROUND", { x: M + 0.2, y: 0.95, w: 5.3, h: 0.46, fontFace: BFONT, fontSize: 10.5, bold: true, color: AMBER, charSpacing: 1.5, valign: "middle", margin: 0 });
  // wordmark
  s.addText([
    { text: "Golden", options: { color: WHITE } },
    { text: "Hour", options: { color: AMBER } },
  ], { x: M - 0.04, y: 1.85, w: 11, h: 1.5, fontFace: HFONT, fontSize: 68, bold: true, align: "left", margin: 0 });
  // tagline
  s.addText("One tap. Two lifelines. The right hospital and ready blood —\nbefore the car even moves.", {
    x: M, y: 3.5, w: 10.6, h: 1.1, fontFace: HFONT, fontSize: 21, italic: true, color: SLATE_DK, lineSpacingMultiple: 1.05, margin: 0,
  });
  // sub
  s.addText("A GPS-triggered emergency app that finds a hospital with the right department and a free bed, and alerts compatible blood donors — two parallel actions, built for the self-transporting family in India.", {
    x: M, y: 4.75, w: 9.6, h: 1.2, fontFace: BFONT, fontSize: 14.5, color: "D8CFC0", lineSpacingMultiple: 1.12, margin: 0,
  });
  // bottom strip
  s.addShape(pres.shapes.LINE, { x: M, y: 6.35, w: 8.6, h: 0, line: { color: "3A332B", width: 1 } });
  s.addText([
    { text: "Team GoldenHour", options: { bold: true, color: WHITE } },
    { text: "    Healthcare · Social Impact · Emergency Response", options: { color: SLATE_DK } },
  ], { x: M, y: 6.5, w: 8.5, h: 0.4, fontFace: BFONT, fontSize: 12, margin: 0, valign: "middle" });
  s.addText("github.com/SarmaHighOnCode/GoldenHour", { x: W - 5.2, y: 6.5, w: 4.5, h: 0.4, fontFace: BFONT, fontSize: 11.5, bold: true, color: AMBER, align: "right", valign: "middle", margin: 0 });

  // ============================ SLIDE 2 — PROBLEM =========================
  s = pres.addSlide(); s.background = { color: CREAM };
  kicker(s, "The Problem", CRIMSON, false);
  title(s, "The golden hour is lost — not for lack of care,\nbut lack of coordination", false);
  s.addText("In India, most emergency patients reach hospital by private car or auto — entirely outside any ambulance or dispatch system. In the first 60 minutes after trauma, two things routinely go wrong:", {
    x: M, y: 2.5, w: 6.0, h: 1.8, fontFace: BFONT, fontSize: 15, color: INK, lineSpacingMultiple: 1.2, valign: "top", margin: 0,
  });
  // big stat
  s.addText([
    { text: "60", options: { fontSize: 64, bold: true, color: CRIMSON, fontFace: HFONT } },
    { text: " min", options: { fontSize: 26, bold: true, color: CRIMSON, fontFace: HFONT } },
  ], { x: M, y: 4.5, w: 6, h: 1.0, align: "left", margin: 0, valign: "middle" });
  s.addText("the window in which timely care most strongly decides survival.", { x: M, y: 5.55, w: 5.6, h: 0.7, fontFace: BFONT, italic: true, fontSize: 13.5, color: SLATE, margin: 0 });
  // two problem cards (right)
  const pcard = (y, accent, ic, head, body) => {
    s.addShape(pres.shapes.RECTANGLE, { x: 7.15, y, w: 5.45, h: 1.85, fill: { color: WHITE }, line: { color: BORDER, width: 1 }, shadow: makeShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x: 7.15, y, w: 0.12, h: 1.85, fill: { color: accent } });
    iconCircle(s, 7.5, y + 0.5, 0.85, accent, ic);
    s.addText(head, { x: 8.6, y: y + 0.34, w: 3.85, h: 0.5, fontFace: HFONT, fontSize: 17, bold: true, color: INK, margin: 0, valign: "middle" });
    s.addText(body, { x: 8.6, y: y + 0.86, w: 3.9, h: 0.85, fontFace: BFONT, fontSize: 12.5, color: SLATE, lineSpacingMultiple: 1.08, margin: 0, valign: "top" });
  };
  pcard(2.5, AMBER_DEEP, I.hospW, "Wrong hospital, twice", "The family drives to a hospital with no free bed or no matching department — then loses more minutes driving to another.");
  pcard(4.55, CRIMSON, I.tintW, "Blood arranged too late", "Replacement blood is organised through frantic phone calls — often only after the patient is already on the operating table.");

  footer(s, 2);

  // ============================ SLIDE 3 — THE GAP =========================
  s = pres.addSlide(); s.background = { color: CREAM };
  kicker(s, "The Gap", CRIMSON, false);
  title(s, "Everything out there solves half the problem", false);
  const gap = (y, tool, sub, miss) => {
    s.addShape(pres.shapes.RECTANGLE, { x: M, y, w: 11.93, h: 1.15, fill: { color: WHITE }, line: { color: BORDER, width: 1 }, shadow: makeShadow() });
    s.addText([
      { text: tool + "\n", options: { fontFace: HFONT, fontSize: 15.5, bold: true, color: INK } },
      { text: sub, options: { fontFace: BFONT, fontSize: 11, italic: true, color: SLATE } },
    ], { x: M + 0.35, y, w: 4.6, h: 1.15, valign: "middle", margin: 0, lineSpacingMultiple: 1.05 });
    s.addShape(pres.shapes.LINE, { x: 5.85, y: y + 0.22, w: 0, h: 0.71, line: { color: BORDER, width: 1 } });
    iconCircle(s, 6.1, y + 0.3, 0.55, CRIMSON, I.cross);
    s.addText(miss, { x: 6.85, y, w: 5.75, h: 1.15, fontFace: BFONT, fontSize: 13, color: INK, valign: "middle", margin: 0, lineSpacingMultiple: 1.06 });
  };
  gap(2.35, "Blood-donor apps", "e-RaktKosh · Friends2Support · BloodConnect", "Blood only — no hospital routing. Often direct donors to the patient, which is medically useless.");
  gap(3.66, "Hospital / ambulance finders", "108 · Practo", "A list of hospitals. No knowledge of whether a bed is actually free. No blood path at all.");
  gap(4.97, "General maps apps", "Distance-first navigation", "Distance only — no department match, no confirmation loop, no concurrency.");
  // bottom band
  s.addShape(pres.shapes.RECTANGLE, { x: M, y: 6.28, w: 11.93, h: 0.6, fill: { color: INK } });
  s.addShape(pres.shapes.RECTANGLE, { x: M, y: 6.28, w: 0.12, h: 0.6, fill: { color: AMBER } });
  s.addText([
    { text: "No tool runs routing AND blood — concurrently, from one tap — ", options: { color: WHITE, bold: true } },
    { text: "with a loop that never shows a bed that isn't real.", options: { color: AMBER, bold: true } },
  ], { x: M + 0.35, y: 6.28, w: 11.4, h: 0.6, fontFace: BFONT, fontSize: 13.5, valign: "middle", margin: 0 });
  footer(s, 3);

  // ============================ SLIDE 4 — SOLUTION (dark) =================
  s = pres.addSlide(); s.background = { color: DARK };
  kicker(s, "The Solution", AMBER, true);
  title(s, "One tap → two parallel lifelines", true);
  // trigger node
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 3.35, w: 2.55, h: 1.5, rectRadius: 0.12, fill: { color: AMBER }, shadow: makeShadow() });
  s.addText([
    { text: "ONE GPS TAP\n", options: { fontSize: 11, bold: true, color: "5A3A05", charSpacing: 1 } },
    { text: "POST /emergency", options: { fontSize: 14, bold: true, color: "2A1B02", fontFace: "Consolas" } },
  ], { x: M, y: 3.35, w: 2.55, h: 1.5, align: "center", valign: "middle", margin: 0, lineSpacingMultiple: 1.3 });
  // branch step boxes
  const step = (x, y, accent, ic, head, sub) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 2.75, h: 1.5, rectRadius: 0.1, fill: { color: DARK2 }, line: { color: accent, width: 1.5 }, shadow: makeShadow() });
    iconCircle(s, x + 0.22, y + 0.3, 0.62, accent, ic);
    s.addText([
      { text: head + "\n", options: { fontSize: 12.5, bold: true, color: WHITE } },
      { text: sub, options: { fontSize: 10, color: SLATE_DK } },
    ], { x: x + 0.95, y, w: 1.72, h: 1.5, valign: "middle", margin: 0, lineSpacingMultiple: 1.04 });
  };
  const arrow = (x, y, w, color) => s.addShape(pres.shapes.LINE, { x, y, w, h: 0, line: { color, width: 2, endArrowType: "triangle" } });
  // top (hospital) branch
  const ty = 1.95, by = 4.85, bx = [4.0, 7.05, 10.1];
  s.addText("HOSPITAL", { x: bx[0], y: ty - 0.42, w: 3, h: 0.3, fontFace: BFONT, fontSize: 10.5, bold: true, color: AMBER, charSpacing: 2, margin: 0 });
  step(bx[0], ty, AMBER, I.sort, "Rank hospitals", "prox · dept · reliability");
  step(bx[1], ty, AMBER, I.route, "1-tap confirm links", "sent to each hospital");
  step(bx[2], ty, AMBER, I.trophy, "First Accept wins", "flips live on patient screen");
  s.addText("BLOOD", { x: bx[0], y: by - 0.42, w: 3, h: 0.3, fontFace: BFONT, fontSize: 10.5, bold: true, color: CRIMSON, charSpacing: 2, margin: 0 });
  step(bx[0], by, CRIMSON, I.tintW, "Match donors", "ABO/Rh · within 5 km");
  step(bx[1], by, CRIMSON, I.bolt, "Alert nearest", "top-K, off cooldown");
  step(bx[2], by, CRIMSON, I.hospW, "Restock blood bank", "replacement donation");
  // arrows from trigger
  arrow(M + 2.55, ty + 0.75, 1.4, AMBER);
  arrow(M + 2.55, by + 0.75, 1.4, CRIMSON);
  arrow(bx[0] + 2.75, ty + 0.75, 0.27, AMBER); arrow(bx[1] + 2.75, ty + 0.75, 0.27, AMBER);
  arrow(bx[0] + 2.75, by + 0.75, 0.27, CRIMSON); arrow(bx[1] + 2.75, by + 0.75, 0.27, CRIMSON);
  s.addText("Both branches run concurrently — latency stays bounded by the slowest single call, not the candidate count.", { x: M, y: 6.7, w: 12, h: 0.4, fontFace: BFONT, italic: true, fontSize: 12.5, color: SLATE_DK, align: "center", margin: 0 });

  // ============================ SLIDE 5 — DIFFERENTIATORS =================
  s = pres.addSlide(); s.background = { color: CREAM };
  kicker(s, "Why We're Different", AMBER_DEEP, false);
  title(s, "Five things no one else does together", false);
  const dcard = (x, y, w, accent, ic, head, body) => {
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h: 1.95, fill: { color: WHITE }, line: { color: BORDER, width: 1 }, shadow: makeShadow() });
    iconCircle(s, x + 0.3, y + 0.32, 0.78, accent, ic);
    s.addText(head, { x: x + 1.25, y: y + 0.3, w: w - 1.45, h: 0.85, fontFace: HFONT, fontSize: 15, bold: true, color: INK, valign: "middle", margin: 0, lineSpacingMultiple: 0.95 });
    s.addText(body, { x: x + 0.3, y: y + 1.18, w: w - 0.55, h: 0.7, fontFace: BFONT, fontSize: 11.5, color: SLATE, lineSpacingMultiple: 1.05, margin: 0, valign: "top" });
  };
  const cW = 3.84, gap5 = 0.205, cx0 = M;
  dcard(cx0, 2.45, cW, EMERALD, I.shield, "Never a false bed", "First hospital to accept takes the patient; later accepts are told it's already routed.");
  dcard(cx0 + (cW + gap5), 2.45, cW, CRIMSON, I.tintW, "Medically-correct blood", "Donors are sent to the licensed blood bank for replacement donation — not the patient.");
  dcard(cx0 + 2 * (cW + gap5), 2.45, cW, AMBER_DEEP, I.city, "Works in any city", "Hospitals fetched live from OpenStreetMap + Google Places — the data is not seeded.");
  dcard(cx0, 4.62, cW, INK, I.bolt, "Concurrent by design", "Routing, blood matching and every ETA run in parallel; latency stays flat as cities grow.");
  dcard(cx0 + (cW + gap5), 4.62, cW, "7C3AED", I.sms, "Degrades gracefully", "Feature-phone SMS path, a 1-tap-call fallback, and a demo mode needing zero services.");
  // highlight cell
  s.addShape(pres.shapes.RECTANGLE, { x: cx0 + 2 * (cW + gap5), y: 4.62, w: cW, h: 1.95, fill: { color: INK }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: cx0 + 2 * (cW + gap5), y: 4.62, w: cW, h: 0.12, fill: { color: AMBER } });
  s.addText([
    { text: "The combination", options: { fontFace: HFONT, fontSize: 15, bold: true, color: WHITE, breakLine: true } },
    { text: "is the moat.", options: { fontFace: HFONT, fontSize: 15, bold: true, color: AMBER, breakLine: true } },
    { text: "Any one feature exists somewhere. All five, in one tap, do not.", options: { fontFace: BFONT, fontSize: 11.5, color: SLATE_DK } },
  ], { x: cx0 + 2 * (cW + gap5) + 0.3, y: 4.85, w: cW - 0.55, h: 1.6, valign: "top", margin: 0, lineSpacingMultiple: 1.05 });
  footer(s, 5);

  // ============================ SLIDE 6 — ARCHITECTURE ====================
  s = pres.addSlide(); s.background = { color: CREAM };
  kicker(s, "Architecture", AMBER_DEEP, false);
  title(s, "Contract-driven · three layers · two interchangeable stores", false);
  // layer bars (left)
  const lx = M, lw = 7.0;
  const layer = (y, h, bg, line, ic, head, sub, txtLight) => {
    s.addShape(pres.shapes.RECTANGLE, { x: lx, y, w: lw, h, fill: { color: bg }, line: line ? { color: line, width: 1.4 } : undefined, shadow: makeShadow() });
    iconCircle(s, lx + 0.28, y + (h - 0.8) / 2, 0.8, line || AMBER, ic);
    s.addText([
      { text: head + "\n", options: { fontFace: HFONT, fontSize: 16, bold: true, color: txtLight ? WHITE : INK } },
      { text: sub, options: { fontFace: BFONT, fontSize: 11.5, color: txtLight ? SLATE_DK : SLATE } },
    ], { x: lx + 1.3, y, w: lw - 1.5, h, valign: "middle", margin: 0, lineSpacingMultiple: 1.05 });
  };
  layer(2.45, 1.05, INK, null, I.layers, "HTTP layer — main.py", "Validate (schema) → call ONE service → return schema. No business logic.", true);
  // down arrow
  s.addShape(pres.shapes.LINE, { x: lx + lw / 2, y: 3.5, w: 0, h: 0.22, line: { color: SLATE, width: 2, endArrowType: "triangle" } });
  layer(3.74, 1.05, WHITE, AMBER, I.bolt, "Service layer — services/", "Ranking · blood matching · confirmation race · ETA · SMS · rate limiting.", false);
  s.addShape(pres.shapes.LINE, { x: lx + lw / 2, y: 4.79, w: 0, h: 0.22, line: { color: SLATE, width: 2, endArrowType: "triangle" } });
  // data layer — header pinned to top so the store chips below never overlap it
  const dY = 5.03, dH = 1.68;
  s.addShape(pres.shapes.RECTANGLE, { x: lx, y: dY, w: lw, h: dH, fill: { color: WHITE }, line: { color: CRIMSON, width: 1.4 }, shadow: makeShadow() });
  iconCircle(s, lx + 0.28, dY + 0.18, 0.6, CRIMSON, I.db);
  s.addText([
    { text: "Data layer — store.py\n", options: { fontFace: HFONT, fontSize: 16, bold: true, color: INK } },
    { text: "One method surface behind get_store().", options: { fontFace: BFONT, fontSize: 11.5, color: SLATE } },
  ], { x: lx + 1.05, y: dY + 0.14, w: lw - 1.25, h: 0.66, valign: "top", margin: 0, lineSpacingMultiple: 1.05 });
  const storeChip = (x, label, sub) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 5.92, w: 2.55, h: 0.62, rectRadius: 0.08, fill: { color: CREAM }, line: { color: BORDER, width: 1 } });
    s.addText([
      { text: label + "\n", options: { fontFace: BFONT, fontSize: 10.5, bold: true, color: INK } },
      { text: sub, options: { fontFace: BFONT, fontSize: 8.5, color: SLATE } },
    ], { x: x + 0.1, y: 5.92, w: 2.4, h: 0.62, align: "center", valign: "middle", margin: 0, lineSpacingMultiple: 1.0 });
  };
  storeChip(lx + 1.35, "InMemoryStore", "seeded · haversine · demo & CI");
  storeChip(lx + 4.05, "SupabaseStore", "PostgreSQL + PostGIS · prod");
  // side principles (right)
  const px = 8.05;
  s.addText("DESIGN RULES", { x: px, y: 2.45, w: 4.6, h: 0.3, fontFace: BFONT, fontSize: 11, bold: true, color: AMBER_DEEP, charSpacing: 2, margin: 0 });
  s.addText([
    { text: "Routes are thin", options: { bold: true, color: INK, bullet: { code: "2022" }, breakLine: true } },
    { text: "validate, call one service, return a schema.\n", options: { color: SLATE, fontSize: 12, breakLine: true } },
    { text: "Services never touch HTTP", options: { bold: true, color: INK, bullet: { code: "2022" }, breakLine: true } },
    { text: "plain values in, plain dicts out — unit-testable.\n", options: { color: SLATE, fontSize: 12, breakLine: true } },
    { text: "All data via store.py", options: { bold: true, color: INK, bullet: { code: "2022" }, breakLine: true } },
    { text: "identical maths in Python or PostGIS.\n", options: { color: SLATE, fontSize: 12, breakLine: true } },
    { text: "Schemas are the contract", options: { bold: true, color: INK, bullet: { code: "2022" }, breakLine: true } },
    { text: "frontend builds against the same shapes.", options: { color: SLATE, fontSize: 12 } },
  ], { x: px, y: 2.85, w: 4.65, h: 3.6, fontFace: BFONT, fontSize: 13.5, lineSpacingMultiple: 1.12, valign: "top", margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: px, y: 6.28, w: 4.6, h: 0.6, fill: { color: EMERALD } });
  s.addText("Demo runs with zero external services. Production is a config switch — no code changes.", { x: px + 0.2, y: 6.28, w: 4.25, h: 0.6, fontFace: BFONT, fontSize: 11, bold: true, color: WHITE, valign: "middle", margin: 0, lineSpacingMultiple: 1.0 });
  footer(s, 6);

  // ============================ SLIDE 7 — ALGORITHMS ======================
  s = pres.addSlide(); s.background = { color: CREAM };
  kicker(s, "Under the Hood", AMBER_DEEP, false);
  title(s, "Three algorithms doing the real work", false);
  const acard = (x, accent, ic, head, lines) => {
    const w = 3.84, y = 2.5, h = 3.9;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: WHITE }, line: { color: BORDER, width: 1 }, shadow: makeShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h: 0.12, fill: { color: accent } });
    iconCircle(s, x + 0.3, y + 0.38, 0.8, accent, ic);
    s.addText(head, { x: x + 1.25, y: y + 0.38, w: w - 1.4, h: 0.8, fontFace: HFONT, fontSize: 16, bold: true, color: INK, valign: "middle", margin: 0 });
    s.addText(lines, { x: x + 0.32, y: y + 1.45, w: w - 0.6, h: h - 1.6, fontFace: BFONT, fontSize: 12.5, color: INK, valign: "top", margin: 0, lineSpacingMultiple: 1.15 });
  };
  acard(M, AMBER_DEEP, I.sort, "Hospital ranking", [
    { text: "P(h) = 0.5·prox + 0.3·dept + 0.2·rel", options: { fontFace: "Consolas", fontSize: 11.5, bold: true, color: AMBER_DEEP, breakLine: true } },
    { text: "\n", options: { fontSize: 6, breakLine: true } },
    { text: "Closer ETA, matching department, and live acceptance rate. ", options: { color: SLATE, breakLine: true } },
    { text: "\nCold start: ", options: { bold: true, color: INK } },
    { text: "rel(h) only counts after 20 confirmations — until then ranking is pure proximity + department.", options: { color: SLATE } },
  ]);
  acard(M + 4.045, CRIMSON, I.tintW, "Blood matching", [
    { text: "Compatible donors only", options: { bold: true, color: INK, breakLine: true } },
    { text: "via a hardcoded ABO/Rh table.\n", options: { color: SLATE, breakLine: true } },
    { text: "\nAvailable · within 5 km · off a ", options: { color: SLATE, breakLine: true } },
    { text: "sex-aware cooldown", options: { bold: true, color: INK } },
    { text: " (90 days men / 120 women).\n", options: { color: SLATE, breakLine: true } },
    { text: "\nNearest top-K are alerted; Rh-negative requests flagged ", options: { color: SLATE } },
    { text: "rare_group", options: { fontFace: "Consolas", color: CRIMSON, bold: true } },
    { text: ".", options: { color: SLATE } },
  ]);
  acard(M + 8.09, EMERALD, I.trophy, "Confirmation race", [
    { text: "First Accept wins.", options: { bold: true, color: INK, breakLine: true } },
    { text: " Later acceptances get already_confirmed and never override the winner.\n", options: { color: SLATE, breakLine: true } },
    { text: "\nThe winner flips pending → confirmed, pushed live via Supabase Realtime.\n", options: { color: SLATE, breakLine: true } },
    { text: "\nNo confirm in 180 s → ", options: { color: SLATE } },
    { text: "unconfirmed_fallback", options: { fontFace: "Consolas", color: EMERALD, bold: true } },
    { text: " surfaces 1-tap calling. Never a false bed.", options: { color: SLATE } },
  ]);
  footer(s, 7);

  // ============================ SLIDE 8 — TECH STACK ======================
  s = pres.addSlide(); s.background = { color: CREAM };
  kicker(s, "Built With", AMBER_DEEP, false);
  title(s, "A production stack that runs the demo with zero setup", false);
  const tcard = (x, y, accent, ic, head, body) => {
    const w = 3.84, h = 1.78;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: WHITE }, line: { color: BORDER, width: 1 }, shadow: makeShadow() });
    iconCircle(s, x + 0.3, y + 0.32, 0.72, accent, ic);
    s.addText(head, { x: x + 1.18, y: y + 0.28, w: w - 1.35, h: 0.8, fontFace: HFONT, fontSize: 14.5, bold: true, color: INK, valign: "middle", margin: 0, lineSpacingMultiple: 0.95 });
    s.addText(body, { x: x + 0.3, y: y + 1.08, w: w - 0.55, h: 0.6, fontFace: BFONT, fontSize: 11, color: SLATE, margin: 0, lineSpacingMultiple: 1.0 });
  };
  const ty8 = 2.45, gy = 1.95;
  tcard(M, ty8, "61DAFB", I.react, "React 19 PWA", "Vite · Tailwind · Framer Motion · Leaflet");
  tcard(M + 4.045, ty8, "3776AB", I.python, "FastAPI · Python 3.12", "Async · Pydantic v2 · auto OpenAPI docs");
  tcard(M + 8.09, ty8, EMERALD, I.db, "Supabase + PostGIS", "Geo queries · Realtime push");
  tcard(M, ty8 + gy, AMBER_DEEP, I.map, "Maps & discovery", "Google Maps ETA · Places · OpenStreetMap");
  tcard(M + 4.045, ty8 + gy, "7C3AED", I.sms, "Messaging", "Console / Telegram (demo) · MSG91 (prod)");
  tcard(M + 8.09, ty8 + gy, INK, I.docker, "Ship & verify", "Docker · Render · Vercel · GitHub Actions CI");
  // band
  s.addShape(pres.shapes.RECTANGLE, { x: M, y: 6.28, w: 11.93, h: 0.6, fill: { color: INK } });
  s.addShape(pres.shapes.RECTANGLE, { x: M, y: 6.28, w: 0.12, h: 0.6, fill: { color: EMERALD } });
  s.addText([
    { text: "31 tests passing", options: { color: EMERALD, bold: true } },
    { text: "  on Python 3.11 & 3.12 — algorithms, API contract, live flow, and the production Supabase path.", options: { color: WHITE } },
  ], { x: M + 0.35, y: 6.28, w: 11.4, h: 0.6, fontFace: BFONT, fontSize: 12.5, valign: "middle", margin: 0 });
  footer(s, 8);

  // ============================ SLIDE 9 — SCALABILITY (dark) ==============
  s = pres.addSlide(); s.background = { color: DARK };
  kicker(s, "Scale & Trust", AMBER, true);
  title(s, "Built to scale — engineered to never lie about a bed", true);
  const stat = (x, big, small) => {
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.4, w: 3.84, h: 1.55, fill: { color: DARK2 }, line: { color: "3A332B", width: 1 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.4, w: 0.12, h: 1.55, fill: { color: AMBER } });
    s.addText(big, { x: x + 0.3, y: 2.55, w: 3.4, h: 0.9, fontFace: HFONT, fontSize: 40, bold: true, color: AMBER, margin: 0, valign: "middle" });
    s.addText(small, { x: x + 0.32, y: 3.4, w: 3.4, h: 0.5, fontFace: BFONT, fontSize: 12, color: SLATE_DK, margin: 0, valign: "top" });
  };
  stat(M, "0", "external services to run the full demo");
  stat(M + 4.045, "2 → 1", "stores behind one method surface");
  stat(M + 8.09, "31", "tests · CI on Python 3.11 & 3.12");
  // points
  s.addText([
    { text: "Stateless API", options: { bold: true, color: WHITE, bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "scales horizontally; rate-limit state designed to back onto Redis.\n", options: { color: SLATE_DK, fontSize: 12.5, breakLine: true } },
    { text: "Geo at the database", options: { bold: true, color: WHITE, bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "donor radius becomes real PostGIS ST_DWithin with spatial indexes.\n", options: { color: SLATE_DK, fontSize: 12.5, breakLine: true } },
    { text: "Realtime, not polling", options: { bold: true, color: WHITE, bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "confirmations stream over Supabase Realtime — no poll load at scale.", options: { color: SLATE_DK, fontSize: 12.5 } },
  ], { x: M, y: 4.4, w: 5.9, h: 2.6, fontFace: BFONT, fontSize: 14, lineSpacingMultiple: 1.1, valign: "top", margin: 0 });
  s.addText([
    { text: "Concurrent by default", options: { bold: true, color: WHITE, bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "discovery + ETAs run in parallel; latency tracks the slowest call.\n", options: { color: SLATE_DK, fontSize: 12.5, breakLine: true } },
    { text: "Rate-limited & single-use tokens", options: { bold: true, color: WHITE, bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "every public write guarded; confirm links are one-time.\n", options: { color: SLATE_DK, fontSize: 12.5, breakLine: true } },
    { text: "Health & readiness probes", options: { bold: true, color: WHITE, bullet: { code: "2022", indent: 18 }, breakLine: true } },
    { text: "/ready pings the DB — a deploy proves it's truly connected.", options: { color: SLATE_DK, fontSize: 12.5 } },
  ], { x: M + 6.2, y: 4.4, w: 5.9, h: 2.6, fontFace: BFONT, fontSize: 14, lineSpacingMultiple: 1.1, valign: "top", margin: 0 });

  // ============================ SLIDE 10 — IMPACT & SCOPE =================
  s = pres.addSlide(); s.background = { color: CREAM };
  kicker(s, "Impact & Honesty", AMBER_DEEP, false);
  title(s, "Who it helps — and what we deliberately left out", false);
  // impact column
  s.addShape(pres.shapes.RECTANGLE, { x: M, y: 2.45, w: 5.85, h: 4.05, fill: { color: WHITE }, line: { color: BORDER, width: 1 }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: M, y: 2.45, w: 5.85, h: 0.12, fill: { color: EMERALD } });
  iconCircle(s, M + 0.35, 2.8, 0.8, EMERALD, I.users);
  s.addText("Real-world impact", { x: M + 1.3, y: 2.8, w: 4.4, h: 0.8, fontFace: HFONT, fontSize: 18, bold: true, color: INK, valign: "middle", margin: 0 });
  s.addText([
    { text: "The self-transporting family", options: { bold: true, color: INK, bullet: { code: "2022", indent: 16 }, breakLine: true } },
    { text: "the majority of patients, who travel outside any ambulance system, get one action instead of four apps.\n", options: { color: SLATE, fontSize: 12.5, breakLine: true } },
    { text: "Any Indian city, day one", options: { bold: true, color: INK, bullet: { code: "2022", indent: 16 }, breakLine: true } },
    { text: "live hospital data, no per-city seeding.\n", options: { color: SLATE, fontSize: 12.5, breakLine: true } },
    { text: "A blood model a bank could adopt", options: { bold: true, color: INK, bullet: { code: "2022", indent: 16 }, breakLine: true } },
    { text: "replacement donation that restocks licensed supply — not a walk-in transfusion.", options: { color: SLATE, fontSize: 12.5 } },
  ], { x: M + 0.35, y: 3.75, w: 5.3, h: 2.6, fontFace: BFONT, fontSize: 14, lineSpacingMultiple: 1.12, valign: "top", margin: 0 });
  // scope column
  const sx = M + 6.08;
  s.addShape(pres.shapes.RECTANGLE, { x: sx, y: 2.45, w: 5.85, h: 4.05, fill: { color: WHITE }, line: { color: BORDER, width: 1 }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: sx, y: 2.45, w: 5.85, h: 0.12, fill: { color: SLATE } });
  iconCircle(s, sx + 0.35, 2.8, 0.8, SLATE, I.ban);
  s.addText("Deliberately out of scope", { x: sx + 1.3, y: 2.8, w: 4.4, h: 0.8, fontFace: HFONT, fontSize: 18, bold: true, color: INK, valign: "middle", margin: 0 });
  s.addText("Scope discipline is a feature. We left integration work — not the hard problem — for later:", { x: sx + 0.35, y: 3.7, w: 5.3, h: 0.75, fontFace: BFONT, fontSize: 12.5, italic: true, color: SLATE, valign: "top", margin: 0, lineSpacingMultiple: 1.12 });
  s.addText([
    { text: "SMS gateway billing / DLT registration", options: { bullet: { code: "2022", indent: 16 }, breakLine: true } },
    { text: "Hospital-staff authentication", options: { bullet: { code: "2022", indent: 16 }, breakLine: true } },
    { text: "Ambulance dispatch integration", options: { bullet: { code: "2022", indent: 16 } } },
  ], { x: sx + 0.35, y: 4.55, w: 5.3, h: 1.1, fontFace: BFONT, fontSize: 14, bold: true, color: INK, paraSpaceAfter: 7, valign: "top", margin: 0 });
  s.addText("The hard problem — concurrent ranking + blood matching, in any city, that never shows a false bed — is built and verified.", { x: sx + 0.35, y: 5.8, w: 5.3, h: 0.65, fontFace: BFONT, fontSize: 12.5, bold: true, color: AMBER_DEEP, valign: "top", margin: 0, lineSpacingMultiple: 1.12 });
  footer(s, 10);

  // ============================ SLIDE 11 — CLOSING (dark) =================
  s = pres.addSlide(); s.background = { color: DARK };
  pulseDeco(s, 11.6, 2.0);
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: H - 0.14, w: W, h: 0.14, fill: { color: AMBER } });
  s.addText([
    { text: "Golden", options: { color: WHITE } },
    { text: "Hour", options: { color: AMBER } },
  ], { x: M, y: 2.35, w: 11, h: 1.3, fontFace: HFONT, fontSize: 60, bold: true, align: "left", margin: 0 });
  s.addText("Because in an emergency, the right help should find you.", {
    x: M, y: 3.75, w: 11, h: 0.8, fontFace: HFONT, fontSize: 24, italic: true, color: AMBER, margin: 0,
  });
  s.addText("One tap finds the hospital and the blood — in parallel, in any Indian city, with a confirmation loop that never lies about a bed.", {
    x: M, y: 4.7, w: 10.5, h: 0.9, fontFace: BFONT, fontSize: 14.5, color: "D8CFC0", lineSpacingMultiple: 1.12, margin: 0,
  });
  // contact row
  s.addShape(pres.shapes.LINE, { x: M, y: 5.95, w: 12, h: 0, line: { color: "3A332B", width: 1 } });
  iconCircle(s, M, 6.2, 0.55, DARK2, I.github);
  s.addText("github.com/SarmaHighOnCode/GoldenHour", { x: M + 0.75, y: 6.2, w: 6, h: 0.55, fontFace: BFONT, fontSize: 13, bold: true, color: WHITE, valign: "middle", margin: 0 });
  s.addText([
    { text: "Live API ", options: { color: SLATE_DK } },
    { text: "goldenhour-api.onrender.com/docs", options: { color: AMBER, bold: true } },
  ], { x: W - 6.2, y: 6.2, w: 5.5, h: 0.55, fontFace: BFONT, fontSize: 12.5, align: "right", valign: "middle", margin: 0 });

  await pres.writeFile({ fileName: "../GoldenHour_Pitch_Deck.pptx" });
  console.log("OK wrote GoldenHour_Pitch_Deck.pptx");
}
main().catch(e => { console.error(e); process.exit(1); });
