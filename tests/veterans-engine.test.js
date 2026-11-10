// The Veterans Day route engine (site/veterans/veterans-day/engine.js) on a small made-up town.
// No browser, no network: `node --test veterans-engine.test.js`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const E = require(path.join(here, "..", "site", "veterans", "veterans-day", "engine.js"));

const MIN = 60000;
const T0 = Date.UTC(2026, 10, 11, 6, 0); // midnight Central (CST, UTC-6) on 11 Nov 2026
const at = (h, m = 0) => T0 + (h * 60 + m) * MIN; // local Central clock time

function town() {
  // Three places in a row, 10 minutes apart; one grid point at each place.
  const places = [
    { id: "p0", offer: "breakfast", lat: 46.80, lng: -96.80, open: at(6), close: at(14) },
    { id: "p1", offer: "lunch", lat: 46.81, lng: -96.80, open: at(11), close: at(22) },
    { id: "p2", offer: "coffee", lat: 46.82, lng: -96.80, open: at(6), close: at(20) },
  ];
  const offers = [
    { id: "breakfast", status: "offering", category: "breakfast", value: 12, grade: "B", start: at(5), end: at(10, 30),
      minutes: 45, meal: true, dineIn: true, eligible: ["veteran", "active"], guard_reserve: "unclear", spouse: "no", proof: [] },
    { id: "lunch", status: "offering", category: "meal", value: 15, grade: "B", start: at(11), end: at(14),
      minutes: 50, meal: true, dineIn: true, eligible: ["veteran", "active", "guard_reserve"], guard_reserve: "yes", spouse: "no", proof: [] },
    { id: "coffee", status: "offering", category: "coffee", value: 4, grade: "A", minutes: 8, eligible: ["veteran"],
      guard_reserve: "unclear", spouse: "yes", proof: [] },
  ];
  const s = 600; // 10 minutes
  const drive = {
    places: [[0, s, 2 * s], [s, 0, s], [2 * s, s, 0]],
    anchors: places.map((p) => [p.lat, p.lng]),
    fromAnchor: [[0, s, 2 * s], [s, 0, s], [2 * s, s, 0]],
  };
  return { offers, places, drive, tzOffsetMin: -360 };
}
const profile = (o = {}) => ({ status: "veteran", spouse: false, kids: 0, proof: { military_id: true }, ready: {},
  pace: "balanced", dayEnd: at(21), mealsMax: 2, roads: "normal", blocks: [], ...o });
const state = (o = {}) => ({ done: {}, away: {}, strikes: {}, vetoed: {}, pinned: {}, prefs: {}, ...o });
const NO_REPORTS = { place: {}, offer: {} };
const home = { lat: 46.80, lng: -96.80 };

test("before 10:30 it sends you to breakfast first, because breakfast closes and coffee doesn't", () => {
  const ctx = E.prepare(town(), profile(), state(), NO_REPORTS, at(8), home);
  const opts = E.nextOptions(ctx);
  assert.equal(opts[0].step.c.offer.id, "breakfast");
});

test("a deal you can't reach before it ends is left out", () => {
  const ctx = E.prepare(town(), profile(), state(), NO_REPORTS, at(10, 25), home);
  const ids = E.nextOptions(ctx).map((o) => o.step.c.offer.id);
  assert.ok(!ids.includes("breakfast"), "breakfast ends 10:30; parking alone takes past the arrive-by time");
});

test("a ceremony with an arrive-by time (v1.3) is left out once you can't get there by its start", () => {
  const ceremony = (arriveBy) => {
    const d = town();
    d.offers[2] = { id: "coffee", status: "offering", category: "event", value: 0, worth: 12, grade: "A", start: at(9, 30), end: at(11),
      arriveBy, minutes: 60, eligible: ["veteran", "public"], guard_reserve: "unclear", spouse: "yes", proof: [] };
    return E.nextOptions(E.prepare(d, profile(), state(), NO_REPORTS, at(9, 30), home)).map((o) => o.step);
  };
  // 20 minutes' drive and parking from home: arriving about 9:52.
  assert.ok(ceremony(undefined).some((s) => s.c.offer.id === "coffee"), "without arriveBy, any time before 10:55 will do");
  assert.ok(!ceremony(at(9, 45)).some((s) => s.c.offer.id === "coffee"), "the program starts at 9:45: too late");
  const ok = ceremony(at(10, 0)).find((s) => s.c.offer.id === "coffee");
  assert.ok(ok, "be there by 10:00: it fits");
  assert.equal(ok.arriveBy, at(10, 0));
  assert.ok(ok.slackMin < 10, "the time to spare counts to the arrive-by time, not the end");
});

test("the day plan collects all three in a workable order, each inside its window", () => {
  const data = town();
  const ctx = E.prepare(data, profile({ pace: "max" }), state(), NO_REPORTS, at(7), home);
  const plan = E.planDay(ctx);
  assert.deepEqual(plan.steps.map((s) => s.c.offer.id).sort(), ["breakfast", "coffee", "lunch"]);
  for (const s of plan.steps) {
    assert.ok(s.start >= s.c.open && s.start <= s.c.close - 5 * MIN, `${s.c.offer.id} starts inside its window`);
  }
  for (let i = 1; i < plan.steps.length; i++) assert.ok(plan.steps[i].leave >= plan.steps[i - 1].depart);
});

test("a veto, a finished deal and an active strike each remove the deal", () => {
  for (const st of [state({ vetoed: { coffee: true } }), state({ done: { coffee: { r: "worked", t: at(7) } } }),
    state({ strikes: { coffee: { n: 1, until: at(9) } } })]) {
    const ctx = E.prepare(town(), profile(), st, NO_REPORTS, at(8), home);
    assert.ok(!ctx.cands.some((c) => c.offer.id === "coffee"));
    assert.ok(ctx.excluded.p2);
  }
});

test("the third skip turns into a veto", () => {
  let st = state();
  for (let i = 0; i < 3; i++) {
    const r = E.strike(st, "coffee", at(8));
    st = { ...st, strikes: { coffee: r.strike } };
    assert.equal(r.veto, i === 2);
  }
});

test("Guard/Reserve: 'no' excludes, 'unclear' keeps the deal with a warning", () => {
  const data = town();
  data.offers[2].guard_reserve = "no";
  const ctx = E.prepare(data, profile({ status: "guard_reserve" }), state(), NO_REPORTS, at(8), home);
  assert.equal(ctx.excluded.p2, "not eligible");
  const bf = ctx.cands.find((c) => c.offer.id === "breakfast");
  assert.ok(bf.flags.some((f) => /Guard\/Reserve not named/.test(f)));
});

test("a spouse doubles a spouse-eligible deal's value", () => {
  const one = E.prepare(town(), profile(), state(), NO_REPORTS, at(8), home).cands.find((c) => c.offer.id === "coffee");
  const two = E.prepare(town(), profile({ spouse: true }), state(), NO_REPORTS, at(8), home).cands.find((c) => c.offer.id === "coffee");
  assert.ok(Math.abs(two.base - 2 * one.base) < 1e-9);
});

test("field reports move confidence: 'turned away' lowers it, 'ran out' nearly zeroes it, a later 'worked' restores it", () => {
  const o = town().offers[1];
  const base = E.confidence(o, "p1", NO_REPORTS, at(12)).p;
  const away = E.confidence(o, "p1", { place: { p1: [{ k: "away", t: at(11, 50) }, { k: "away", t: at(11, 55) }] }, offer: {} }, at(12)).p;
  assert.ok(away < base);
  const out = E.confidence(o, "p1", { place: { p1: [{ k: "out", t: at(11, 30) }] }, offer: {} }, at(12));
  assert.ok(out.ranOut && out.p < 0.1);
  const back = E.confidence(o, "p1", { place: { p1: [{ k: "out", t: at(11, 30) }, { k: "worked", t: at(11, 45) }] }, offer: {} }, at(12));
  assert.ok(!back.ranOut && back.p > base);
});

test("a reported line is used as the wait", () => {
  const rep = { place: { p1: [{ k: "line", t: at(11, 50), m: 35 }] }, offer: {} };
  const ctx = E.prepare(town(), profile(), state(), rep, at(12), home);
  const c = ctx.cands.find((x) => x.offer.id === "lunch");
  const step = E.evalStop(ctx, E._internal.startState(ctx, at(12)), c);
  assert.equal(step.queueMin, 35);
});

test("after a sit-down meal, another one right away is worth much less, and none past the meal limit", () => {
  const ctx = E.prepare(town(), profile({ mealsMax: 1 }), state({ done: { breakfast: { r: "worked", t: at(9) } } }),
    NO_REPORTS, at(11), home);
  assert.equal(ctx.meals, 1);
  const c = ctx.cands.find((x) => x.offer.id === "lunch");
  const step = E.evalStop(ctx, E._internal.startState(ctx, at(11)), c);
  assert.ok(step === null || step.full <= 0.05);
});

test("a blocked hour pushes the next stop after it", () => {
  const ctx = E.prepare(town(), profile({ blocks: [{ start: at(11), end: at(12) }] }), state(), NO_REPORTS, at(10, 50), home);
  const c = ctx.cands.find((x) => x.offer.id === "lunch");
  const step = E.evalStop(ctx, E._internal.startState(ctx, at(10, 50)), c);
  assert.ok(step.leave >= at(12));
});

test("drive time from a position uses the nearest grid points plus a slow first leg", () => {
  const d = town();
  const t = E.fromPosition(d.drive, d.places, { lat: 46.805, lng: -96.80 }); // halfway between p0 and p1
  assert.ok(t[1] > 0 && t[1] < 600 + 200, `to p1: ${t[1]} s`);
  assert.ok(t[2] > 600 && t[2] < 1200 + 200, `to p2: ${t[2]} s`);
});

test("a deal handed out outside the store's hours keeps its own window (Texas Roadhouse vouchers at lunch)", () => {
  const data = town();
  data.places[1] = { ...data.places[1], open: at(16), close: at(22) }; // dining room opens at 4 PM
  const ctx = E.prepare(data, profile(), state(), NO_REPORTS, at(11), home);
  const c = ctx.cands.find((x) => x.offer.id === "lunch");
  assert.equal(c.open, at(11));
  assert.equal(c.close, at(14));
});

test("one of a kind a day: two haircut offers never both land in a plan, and one done hides the other", () => {
  const data = town();
  data.offers[1] = { ...data.offers[1], id: "clips-a", category: "service", value: 22, start: undefined, end: undefined, minutes: 30, meal: false, dineIn: false, group: "haircut" };
  data.offers[2] = { ...data.offers[2], id: "clips-b", category: "service", value: 25, minutes: 30, group: "haircut", eligible: ["veteran"] };
  data.places[1].offer = "clips-a"; data.places[2].offer = "clips-b";
  const plan = E.planDay(E.prepare(data, profile({ pace: "max" }), state(), NO_REPORTS, at(9), home));
  assert.equal(plan.steps.filter((s) => s.c.offer.group === "haircut").length, 1);
  const ctx = E.prepare(data, profile(), state({ done: { "clips-a": { r: "worked", t: at(9) } } }), NO_REPORTS, at(10), home);
  assert.match(ctx.excluded.p2, /already have one/);
});

test("preferences: done nudges a category up, a skip nudges it down, within bounds", () => {
  let p = {};
  for (let i = 0; i < 40; i++) p = E.learn(p, "coffee", "worked");
  assert.equal(p.coffee, 2);
  for (let i = 0; i < 60; i++) p = E.learn(p, "coffee", "skip");
  assert.equal(p.coffee, 0.3);
});

// ---------------------------------------------------------------- engine v1.1: tickets, appetite, goals
// A row of five places, 10 minutes apart: a breakfast that ends at 9, a haircut card that opens at 9, a sit-down
// lunch, a quick bite that can be taken home, and a buy-one-get-one that needs a purchase.
function row() {
  const P = (id, offer, k, open, close) => ({ id, offer, lat: 46.80 + k * 0.01, lng: -96.80, open, close });
  const places = [P("q0", "early", 0, at(6), at(14)), P("q1", "card", 1, at(9), at(19)), P("q2", "sitdown", 2, at(11), at(21)),
    P("q3", "burger", 3, at(6), at(23)), P("q4", "bogo", 4, at(10), at(21))];
  const base = { status: "offering", grade: "B", eligible: ["veteran", "active"], guard_reserve: "unclear", spouse: "no", proof: [] };
  const offers = [
    { ...base, id: "early", category: "breakfast", value: 8, start: at(6), end: at(9), minutes: 12, meal: false, dineIn: false, snack: true, mode: "to_go" },
    { ...base, id: "card", category: "service", value: 22, minutes: 5, meal: false, dineIn: false, ticket: true, mode: "in_store" },
    { ...base, id: "sitdown", category: "meal", value: 15, minutes: 50, meal: true, dineIn: true, mode: "dine_in" },
    { ...base, id: "burger", category: "quick", value: 6, minutes: 10, meal: false, dineIn: false, snack: true, mode: "dine_in_or_to_go" },
    { ...base, id: "bogo", category: "quick", value: 9, minutes: 12, meal: false, dineIn: false, snack: true, purchase: true, mode: "in_store" },
  ];
  const s = 600, n = places.length;
  const table = places.map((_, i) => places.map((__, j) => Math.abs(i - j) * s));
  return { offers, places, drive: { places: table, anchors: places.map((p) => [p.lat, p.lng]), fromAnchor: table }, tzOffsetMin: -360 };
}
const ids = (plan) => plan.steps.map((s) => s.c.offer.id);

test("a ticket for later is a quick stop that fills nothing; food eaten there does", () => {
  const data = row();
  assert.equal(E.eatWeight(data.offers[1]), 0);
  const ctx = E.prepare(data, profile(), state({ done: { sitdown: { r: "worked", t: at(12) } } }), NO_REPORTS, at(12, 50), home);
  const st = E._internal.startState(ctx, at(12, 50));
  const card = E.evalStop(ctx, st, ctx.cands.find((c) => c.offer.id === "card"));
  assert.equal(card.full, 1, "a card after lunch is worth all of it");
  assert.equal(card.eats, false);
  const burger = E.evalStop(ctx, st, ctx.cands.find((c) => c.offer.id === "burger"));
  assert.ok(burger === null || burger.full < 0.6, "a burger eaten right after lunch is worth much less");
});

test("taking food home: it fills nothing, so a sit-down meal right after is worth all of it", () => {
  const data = row();
  for (const togo of [false, true]) {
    const ctx = E.prepare(data, profile({ togo }), state({ done: { burger: { r: "worked", t: at(11) } } }), NO_REPORTS, at(11, 10), home);
    const step = E.evalStop(ctx, E._internal.startState(ctx, at(11, 10)), ctx.cands.find((c) => c.offer.id === "sitdown"));
    if (togo) assert.equal(step.full, 1);
    else assert.ok(step.full < 1);
  }
});

test("too full to eat: a stop that means eating right after a sit-down meal is left out", () => {
  const data = row();
  data.offers[3].dineIn = true; // the burger has to be eaten there
  const nextDoor = { lat: data.places[3].lat, lng: data.places[3].lng };
  const ctx = E.prepare(data, profile(), state({ done: { sitdown: { r: "worked", t: at(12, 45) } } }), NO_REPORTS, at(12, 50), nextDoor);
  const step = E.evalStop(ctx, E._internal.startState(ctx, at(12, 50)), ctx.cands.find((c) => c.offer.id === "burger"));
  assert.equal(step, null);
});

test("deals that need a purchase stay out when that's turned off, and come back when it's on", () => {
  const off = E.prepare(row(), profile(), state({ prefs: { purchase: 0 } }), NO_REPORTS, at(10), home);
  assert.match(off.excluded.q4, /needs a purchase/);
  const on = E.prepare(row(), profile(), state({ prefs: { purchase: 1 } }), NO_REPORTS, at(10), home);
  assert.ok(on.cands.some((c) => c.offer.id === "bogo"));
});

test("a wait for an opening gets filled: breakfast before the 9:00 haircut card, even when the search is greedy", () => {
  const ctx = E.prepare(row(), profile(), state(), NO_REPORTS, at(7), home);
  const plan = E.planDay(ctx, { width: 1 }); // a beam of one goes straight for the card and waits
  const order = ids(plan);
  assert.ok(order.includes("early") && order.indexOf("early") < order.indexOf("card"), order.join(" > "));
});

test("Maximize: most stops visits at least as many places, most savings collects at least as many dollars", () => {
  const plans = {};
  for (const goal of ["best", "stops", "savings", "both"]) {
    const ctx = E.prepare(row(), profile({ goal, dayEnd: at(13) }), state({ prefs: { purchase: 1 } }), NO_REPORTS, at(7), home);
    assert.equal(ctx.goal, goal);
    plans[goal] = E.planDay(ctx);
    for (const s of plans[goal].steps) assert.ok(s.arrive <= s.c.close - 5 * MIN && s.depart <= at(13), `${goal}: ${s.c.offer.id} fits`);
  }
  assert.ok(plans.stops.steps.length >= plans.best.steps.length);
  assert.ok(plans.stops.count >= plans.savings.count - 1e-9 && plans.stops.count >= plans.both.count - 1e-9);
  assert.ok(plans.savings.dollars >= plans.stops.dollars - 1e-9 && plans.savings.dollars >= plans.both.dollars - 1e-9);
  assert.ok(plans.both.ref && plans.both.ref.n >= 1 && plans.both.ref.d >= 1);
});

test("an unknown goal falls back to the usual plan", () => {
  assert.equal(E.prepare(row(), profile({ goal: "everything" }), state(), NO_REPORTS, at(7), home).goal, "best");
});

// ---------------------------------------------------------------- tickets don't open a route (8 Nov 2026)
// Home, then a haircut card, pancakes and coffee in a row, 5 minutes apart. Grabbing the card first is quickest on
// paper, but it is good all day, so the route opens with breakfast and picks the card up later.
function strip(cardEnd) {
  const P = (id, offer, k, open, close) => ({ id, offer, lat: 46.80 + k * 0.005, lng: -96.80, open, close });
  const places = [P("s1", "card", 1, at(9), at(19)), P("s2", "pancakes", 2, at(6), at(14)), P("s3", "coffee", 3, at(6), at(20))];
  const base = { status: "offering", grade: "B", eligible: ["veteran", "active"], guard_reserve: "unclear", spouse: "no", proof: [] };
  const offers = [
    { ...base, id: "card", category: "service", value: 22, minutes: 5, meal: false, dineIn: false, ticket: true, mode: "in_store", start: at(9), end: cardEnd },
    { ...base, id: "pancakes", category: "breakfast", value: 12, minutes: 30, meal: true, dineIn: true, start: at(6), end: at(11), mode: "dine_in" },
    { ...base, id: "coffee", category: "coffee", value: 4, minutes: 5, meal: false, dineIn: false, mode: "in_store" },
  ];
  const s = 300, ks = [1, 2, 3];
  return { offers, places, tzOffsetMin: -360, drive: { places: ks.map((a) => ks.map((b) => Math.abs(a - b) * s)),
    anchors: [[46.80, -96.80], ...places.map((p) => [p.lat, p.lng])], fromAnchor: [0, 1, 2, 3].map((a) => ks.map((b) => Math.abs(a - b) * s)) } };
}

test("a route doesn't open with a ticket for later that fits further on, in every goal", () => {
  for (const goal of ["optimal", "best", "stops", "savings", "both"]) {
    const ctx = E.prepare(strip(), profile({ goal }), state(), NO_REPORTS, at(9), { lat: 46.80, lng: -96.80 });
    const plan = ids(E.planDay(ctx, { t: at(9) }));
    assert.notEqual(plan[0], "card", `${goal}: ${plan.join(" > ")}`);
    assert.ok(plan.includes("card"), `${goal}: the card is still collected`);
  }
});

test("a ticket still goes first when its window is closing, or when you chose it", () => {
  const ctx = E.prepare(strip(at(9, 20)), profile(), state(), NO_REPORTS, at(9), { lat: 46.80, lng: -96.80 });
  assert.equal(ids(E.planDay(ctx, { t: at(9) }))[0], "card", "the card ends at 9:20");
  const all = E.prepare(strip(), profile(), state(), NO_REPORTS, at(9), { lat: 46.80, lng: -96.80 });
  const first = all.cands.find((c) => c.offer.id === "card");
  assert.equal(ids(E.planDay(all, { t: at(9), first }))[0], "card", "Go here first wins");
});

// ---------------------------------------------------------------- Optimal (v1.4, the publisher 10 Nov 2026)
// Four coffee shops, a lunch and a haircut card in a row, 5 minutes apart. Most stops takes every coffee in a row;
// Optimal takes the best one and never another within 3 hours. A ticket for later doesn't count as a repeat.
function coffees() {
  const ids6 = ["c1", "c2", "c3", "lunch", "card", "c4"];
  const places = ids6.map((offer, k) => ({ id: "q" + k, offer, lat: 46.80 + k * 0.005, lng: -96.80, open: at(6), close: at(22) }));
  const base = { status: "offering", grade: "A", eligible: ["veteran"], guard_reserve: "unclear", spouse: "no", proof: [], meal: false, dineIn: false };
  const offers = [
    { ...base, id: "c1", category: "coffee", kinds: ["coffee"], value: 3, minutes: 6 },
    { ...base, id: "c2", category: "coffee", kinds: ["coffee"], value: 5, minutes: 6 },
    { ...base, id: "c3", category: "coffee", kinds: ["coffee"], value: 4, minutes: 6 },
    { ...base, id: "lunch", category: "meal", kinds: ["meal"], value: 14, minutes: 45, meal: true, dineIn: true, start: at(11), end: at(14) },
    { ...base, id: "card", category: "service", kinds: [], value: 20, minutes: 5, ticket: true },
    { ...base, id: "c4", category: "coffee", kinds: ["coffee"], value: 3, minutes: 6 },
  ];
  const s = 300, ks = [1, 2, 3, 4, 5, 6];
  return { offers, places, tzOffsetMin: -360, drive: { places: ks.map((a) => ks.map((b) => Math.abs(a - b) * s)),
    anchors: [[46.80, -96.80], ...places.map((p) => [p.lat, p.lng])], fromAnchor: [0, ...ks].map((a) => ks.map((b) => Math.abs(a - b) * s)) } };
}
const coffeeSteps = (plan) => plan.steps.filter((s) => s.c.offer.category === "coffee");
const spaced = (steps) => steps.every((s, i) => i === 0 || s.start - steps[i - 1].start >= 3 * 60 * MIN);

test("Optimal is the first goal, and takes the best coffee once in a morning where Most stops takes them all", () => {
  assert.equal(E.GOALS[0], "optimal");
  assert.equal(E.SPACING_MS, 3 * 60 * MIN);
  const plan = (goal) => E.planDay(E.prepare(coffees(), profile({ goal, dayEnd: at(10, 30) }), state(), NO_REPORTS, at(8), home), { t: at(8) });
  const opt = plan("optimal"), most = plan("stops");
  assert.deepEqual(coffeeSteps(opt).map((s) => s.c.offer.id), ["c2"], "one coffee, the best one: " + ids(opt).join(" > "));
  assert.ok(coffeeSteps(most).length >= 3, "Most stops still stacks them: " + ids(most).join(" > "));
  assert.ok(ids(opt).includes("card"), "a ticket for later isn't a repeat of anything");
});

test("Optimal: the same kind can come back 3 hours later, never sooner", () => {
  const ctx = E.prepare(coffees(), profile({ goal: "optimal", dayEnd: at(21) }), state(), NO_REPORTS, at(8), home);
  const plan = E.planDay(ctx, { t: at(8) }), cs = coffeeSteps(plan);
  assert.ok(cs.length >= 2, "a long day has room for a second coffee: " + ids(plan).join(" > "));
  assert.ok(spaced(cs), "coffees start 3 hours apart or more");
  assert.ok(ids(plan).includes("lunch"));
});

test("Optimal: a coffee you've had counts; a pin or Go here first may repeat it", () => {
  const had = { c1: { r: "worked", t: at(8) } };
  const p = profile({ goal: "optimal", dayEnd: at(10, 30) });
  const none = E.planDay(E.prepare(coffees(), p, state({ done: had }), NO_REPORTS, at(9), home), { t: at(9) });
  assert.equal(coffeeSteps(none).length, 0, "an hour after a coffee, no other: " + ids(none).join(" > "));
  const pinned = E.planDay(E.prepare(coffees(), p, state({ done: had, pinned: { c3: true } }), NO_REPORTS, at(9), home), { t: at(9) });
  assert.ok(ids(pinned).includes("c3"), "a pinned coffee fits anyway");
  const ctx = E.prepare(coffees(), p, state({ done: had }), NO_REPORTS, at(9), home);
  const first = ctx.cands.find((c) => c.offer.id === "c2");
  assert.equal(ids(E.planDay(ctx, { t: at(9), first }))[0], "c2", "Go here first wins");
  // A turned-away visit isn't a coffee you had.
  const away = E.planDay(E.prepare(coffees(), p, state({ done: { c1: { r: "away", t: at(8) } } }), NO_REPORTS, at(9), home), { t: at(9) });
  assert.equal(coffeeSteps(away).length, 1);
});

test("kinds: a ticket has none; older data falls back to the category", () => {
  assert.deepEqual(E.kindsOf({ ticket: true, kinds: ["haircut"], category: "service" }), []);
  assert.deepEqual(E.kindsOf({ category: "coffee" }), ["coffee"]);
  assert.deepEqual(E.kindsOf({ category: "service", group: "haircut" }), ["haircut"]);
  assert.deepEqual(E.kindsOf({ category: "service", id: "car-wash-x" }), ["car-wash-x"]);
  assert.deepEqual(E.kindsOf({ category: "meal", kinds: ["bar", "meal"] }), ["bar", "meal"]);
});

test("an event open to the public is open to veterans, retirees, active duty and the Guard (v1.4 fix)", () => {
  const o = { eligible: ["public"], guard_reserve: "unclear", proof: [] };
  for (const status of ["veteran", "retired", "active", "guard_reserve"]) {
    const el = E.eligibility(o, { status, proof: {}, ready: {} });
    assert.ok(el.ok, status);
    assert.ok(!el.flags.some((f) => /Guard/.test(f)), status + ": no 'ask' flag for a public event");
  }
  assert.ok(!E.eligibility({ eligible: ["veteran"], guard_reserve: "no", proof: [] }, { status: "active", proof: {}, ready: {} }).ok, "veterans-only stays veterans-only");
});
