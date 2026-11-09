// The Map's route line (site/veterans/veterans-day/roads.js): splitting OSRM's answer into legs, what gets drawn,
// and what is asked of OSRM's public server and when. No browser, no network: fetch and the clock are stand-ins.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { read } from "./lib/source.js";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const R = require(path.join(here, "..", "site", "veterans", "veterans-day", "roads.js"));
const REAL = JSON.parse(read("tests/fixtures/osrm-route.json")); // a real answer for four stores (9 Nov 2026)

const stop = (id, lat, lng) => ({ id, lat, lng });
const A = stop("a", 46.80, -96.80), B = stop("b", 46.81, -96.82), C = stop("c", 46.83, -96.81),
  D = stop("d", 46.85, -96.79), X = stop("x", 46.87, -96.85);

// An answer shaped like OSRM's: one line through every stop, each leg with a bend in the middle, the joining
// points shared, and one annotation distance per segment.
function answerFor(stops) {
  const coords = [[stops[0].lng + 0.0001, stops[0].lat]], legs = [];
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1], b = stops[i];
    coords.push([a.lng, b.lat], [b.lng + 0.0001, b.lat]);
    legs.push({ annotation: { distance: [100, 100] } });
  }
  return { code: "Ok", routes: [{ geometry: { coordinates: coords }, legs }] };
}
const stopsOf = (u) => new URL(u).pathname.split("/").pop().split(";").map((p) => p.split(",").map(Number));

// A stand-in clock, timers and fetch. respond(url) returns an answer, or throws / returns a status for failures.
function bench(respond) {
  let t = 0;
  const timers = [], calls = [];
  const env = {
    calls, updates: 0,
    now: () => t,
    setTimeout: (fn, ms) => { const h = { at: t + ms, fn, live: true }; timers.push(h); return h; },
    clearTimeout: (h) => { if (h) h.live = false; },
    fetch: (u, opts) => {
      calls.push({ url: u, opts, at: t });
      return new Promise((resolve, reject) => {
        const r = respond(u, opts);
        if (r === "hang") { if (opts.signal) opts.signal.addEventListener("abort", () => reject(new Error("aborted"))); return; }
        if (r instanceof Error) return reject(r);
        if (typeof r === "number") return resolve({ ok: false, status: r, json: async () => ({}) });
        resolve({ ok: true, status: 200, json: async () => r });
      });
    },
  };
  // Move the clock forward, firing timers in order and letting promises settle in between.
  env.advance = async (ms) => {
    const end = t + ms;
    for (;;) {
      await settle();
      const next = timers.filter((h) => h.live && h.at <= end).sort((a, b) => a.at - b.at)[0];
      if (!next) break;
      t = next.at; next.live = false; next.fn();
    }
    t = end;
    await settle();
  };
  env.roads = R.create({ fetch: env.fetch, now: env.now, setTimeout: env.setTimeout, clearTimeout: env.clearTimeout,
    onUpdate: () => { env.updates++; } });
  return env;
}
const settle = () => new Promise((r) => setImmediate(r));
const answering = (u) => answerFor(stopsOf(u).map(([lng, lat], i) => stop("s" + i, lat, lng)));

test("a real OSRM answer splits into one line per leg, each starting and ending at the stores", () => {
  const legs = R.splitLegs(REAL.stops, REAL.answer);
  assert.equal(legs.length, REAL.stops.length - 1);
  legs.forEach(([key, line], i) => {
    const a = REAL.stops[i], b = REAL.stops[i + 1];
    assert.equal(key, a.id + ">" + b.id);
    assert.deepEqual(line[0], [a.lat, a.lng], "starts at the store");
    assert.deepEqual(line[line.length - 1], [b.lat, b.lng], "ends at the next store");
    assert.ok(line.length > 10, "follows the roads, not a straight line");
    for (const [lat, lng] of line) assert.ok(lat > 46.7 && lat < 47 && lng > -97 && lng < -96.6, "inside the metro");
  });
  // Neighbouring legs meet where OSRM placed the stop on the road.
  for (let i = 1; i < legs.length; i++) {
    const end = legs[i - 1][1], start = legs[i][1];
    assert.deepEqual(end[end.length - 2], start[1]);
  }
});

test("an answer that doesn't fit the request is refused, so the legs stay straight", () => {
  const ok = answerFor([A, B, C]);
  assert.equal(R.splitLegs([A, B, C], ok).length, 2);
  assert.throws(() => R.splitLegs([A, B, C, D], ok), "fewer legs than asked for");
  assert.throws(() => R.splitLegs([A, B, C], { code: "NoRoute" }));
  const long = structuredClone(ok); long.routes[0].geometry.coordinates.push([-96.8, 46.8]);
  assert.throws(() => R.splitLegs([A, B, C], long), "more points than its legs");
  const bad = structuredClone(ok); bad.routes[0].geometry.coordinates[1] = [null, 46.8];
  assert.throws(() => R.splitLegs([A, B, C], bad), "a point that isn't a number");
});

test("the request carries the stores' coordinates only, in route order", () => {
  const u = R.url([A, B, C]);
  assert.ok(u.startsWith(R.ROUTER + "/route/v1/driving/"));
  assert.deepEqual(stopsOf(u), [[A.lng, A.lat], [B.lng, B.lat], [C.lng, C.lat]]);
  assert.match(u, /overview=full&geometries=geojson&annotations=distance/);
  assert.equal(R.ROUTER, "https://router.project-osrm.org");
});

test("legs without a road shape are drawn straight, and neighbouring legs of the same kind join into one line", () => {
  assert.deepEqual(R.lines([A, B, C], new Map()), [{ road: false, pts: [[A.lat, A.lng], [B.lat, B.lng], [C.lat, C.lng]] }]);
  const have = new Map(R.splitLegs([B, C, D], answerFor([B, C, D])));
  const ls = R.lines([A, B, C, D], have);
  assert.deepEqual(ls.map((l) => l.road), [false, true]);
  assert.deepEqual(ls[0].pts, [[A.lat, A.lng], [B.lat, B.lng]]);
  assert.deepEqual(ls[1].pts[0], [B.lat, B.lng]);
  assert.deepEqual(ls[1].pts[ls[1].pts.length - 1], [D.lat, D.lng]);
  assert.deepEqual(R.lines([A], have), [], "one stop, no line");
});

test("one request covers the whole route; the road line replaces the straight one when it arrives", async () => {
  const b = bench(answering);
  b.roads.want([A, B, C, D]);
  assert.deepEqual(b.roads.lines([A, B, C, D]).map((l) => l.road), [false], "straight at once");
  await b.advance(0);
  assert.equal(b.calls.length, 1);
  assert.deepEqual(stopsOf(b.calls[0].url), [A, B, C, D].map((s) => [s.lng, s.lat]));
  assert.equal(b.calls[0].opts.credentials, "omit", "no cookies");
  assert.equal(b.updates, 1);
  assert.deepEqual(b.roads.lines([A, B, C, D]).map((l) => l.road), [true]);
});

test("each leg is kept: the same route, a stop marked or a reshuffle of known legs asks for nothing", async () => {
  const b = bench(answering);
  b.roads.want([A, B, C, D]);
  await b.advance(5000);
  b.roads.want([A, B, C, D]);   // the 30-second refresh
  b.roads.want([B, C, D]);      // stop A marked "Got it"
  b.roads.want([C, D]);
  await b.advance(5000);
  assert.equal(b.calls.length, 1);
});

test("a changed route asks only for the stretch it is missing", async () => {
  const b = bench(answering);
  b.roads.want([A, B, C, D]);
  await b.advance(5000);
  b.roads.want([A, B, X, C, D]); // X fitted in between B and C
  await b.advance(5000);
  assert.equal(b.calls.length, 2);
  assert.deepEqual(stopsOf(b.calls[1].url), [B, X, C].map((s) => [s.lng, s.lat]));
  assert.deepEqual(b.roads.lines([A, B, X, C, D]).map((l) => l.road), [true]);
});

test("at most one request a second, however often the route changes", async () => {
  const b = bench(answering);
  const routes = [[A, B], [B, C], [C, D], [D, X], [X, A], [A, C], [B, D]];
  for (const r of routes) { b.roads.want(r); await b.advance(100); }
  await b.advance(10000);
  const at = b.calls.map((c) => c.at);
  for (let i = 1; i < at.length; i++) assert.ok(at[i] - at[i - 1] >= R.GAP, `requests ${i - 1} and ${i} were ${at[i] - at[i - 1]} ms apart`);
  // Only the route on show is fetched: the ones passed over while waiting are skipped.
  assert.ok(b.calls.length < routes.length, `${b.calls.length} requests for ${routes.length} quick changes`);
  assert.deepEqual(stopsOf(b.calls[b.calls.length - 1].url), [B, D].map((s) => [s.lng, s.lat]));
});

test("when the Map is hidden nothing more is asked for", async () => {
  const b = bench(answering);
  b.roads.want([A, B]);
  await b.advance(0);
  b.roads.want([C, D]);
  b.roads.want([]);             // the user went back to the Route tab before the second request was due
  await b.advance(10000);
  assert.equal(b.calls.length, 1);
});

test("offline or refused: the line stays straight, and the router is asked again only after a minute", async () => {
  for (const failure of [new TypeError("Failed to fetch"), 429, 503, { code: "NoRoute" }]) {
    const b = bench(() => failure);
    b.roads.want([A, B, C]);
    await b.advance(0);
    assert.equal(b.calls.length, 1);
    assert.equal(b.updates, 0);
    assert.deepEqual(b.roads.lines([A, B, C]).map((l) => l.road), [false]);
    for (let s = 0; s < 50; s += 10) { b.roads.want([A, B, C]); await b.advance(10000); }
    assert.equal(b.calls.length, 1, "no retry within the minute");
    await b.advance(11000);
    b.roads.want([A, B, C]);
    await b.advance(0);
    assert.equal(b.calls.length, 2, "asked again after a minute");
  }
});

test("a request that hangs gives up after 8 seconds, and the line stays straight", async () => {
  const b = bench(() => "hang");
  b.roads.want([A, B]);
  await b.advance(0);
  assert.equal(b.roads.stats().busy, true);
  const signal = b.calls[0].opts.signal;
  await b.advance(R.TIMEOUT - 1);
  assert.equal(signal.aborted, false);
  await b.advance(1);
  assert.equal(signal.aborted, true, "the request is cancelled");
  assert.equal(b.roads.stats().busy, false);
  assert.deepEqual(b.roads.lines([A, B]).map((l) => l.road), [false]);
});

test("only each stop's id and coordinates reach the module, and it never looks for the phone's position", () => {
  const src = read("site/veterans/veterans-day/roads.js");
  assert.ok(!/geolocation|localStorage|sessionStorage|document\.|position/i.test(src.replace(/\/\*[\s\S]*?\*\//, "")),
    "roads.js reads no position or storage");
  const app = read("site/veterans/veterans-day/app.js");
  const calls = [...app.matchAll(/roadLines\.want\(([^)]*)\)/g)].map((m) => m[1]);
  assert.deepEqual(calls.sort(), ["[]", "shownRoute.stops"]);
  assert.match(app, /shownRoute = \{ stops: plan\.steps\.map\(\(x\) => x\.c\.place\), where \}/, "the stops are the plan's stores");
  // The leg from you to the first stop is drawn straight, in the app, from where.pos.
  assert.match(app, /draw\(\[\[where\.pos\.lat, where\.pos\.lng\], \[stops\[0\]\.lat, stops\[0\]\.lng\]\], false\)/);
});
