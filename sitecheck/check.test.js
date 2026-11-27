// Run with `node --test` in sitecheck/. No network and no browser: worker.js's browser steps are covered by the
// local headless Edge run noted in sites.js and by the first live run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SITES } from "./sites.js";
import { judge, summarize, brief, logLine, report, clip, MIN_MAP_PX, STREAK_RUNS } from "./check.js";
import { probe } from "./probe.js";

const good = { status: 200, ms: 4000, console_errors: [], page_errors: [], failed_requests: [],
  probe: { title: "X", house_bar: true, map: null, expect: null, text_chars: 900, load_ms: 1200 } };
const site = { id: "a", url: "https://a.theintelligence.company/" };
const mapSite = { ...site, expect: ".maplibregl-map" };

test("every program in the house bar, and the hub, is checked, once", () => {
  const nav = readFileSync(new URL("../site/shared/tic-nav.js", import.meta.url), "utf8");
  const hrefs = [...nav.matchAll(/href: "(https:\/\/[a-z0-9.-]+)"/g)].map((m) => m[1] + "/");
  hrefs.push("https://cop.theintelligence.company/"); // PROGRAMS gives COP's address through the COP constant
  const urls = SITES.map((s) => s.url);
  assert.equal(new Set(urls).size, urls.length, "no site twice");
  for (const h of hrefs) assert.ok(urls.includes(h), `${h} is in the house bar but not checked`);
  assert.ok(urls.includes("https://theintelligence.company/"));
  for (const s of SITES.filter((x) => x.house !== false)) {
    assert.match(s.url, /^https:\/\/([a-z0-9-]+\.)?theintelligence\.company\/$/);
  }
});

test("other work on the domain is checked but listed apart from the programs (24 Nov 2026)", () => {
  assert.deepEqual(SITES.filter((s) => s.group === "other").map((s) => s.id), ["propertycast", "activation", "listeningpost"]);
  const other = { id: "o", url: "https://o.theintelligence.company/", group: "other" };
  const run = summarize([judge(site, good), judge(other, { ...good, status: 500 })], new Date(0), new Date(1000));
  assert.equal(run.contract, "tic-sitecheck/1.2");
  assert.deepEqual(run.results.map((r) => r.id), ["a"], "results holds the programs only");
  assert.deepEqual(run.other_work.map((r) => r.id), ["o"]);
  assert.equal(run.sites, 2);
  assert.deepEqual(run.failed, ["o"], "a failed other page still fails the run");
});

test("Healthchecks hears about a failed other page too", async () => {
  const calls = [];
  const other = { id: "o", url: "https://o.theintelligence.company/", group: "other" };
  await report("https://hc.example/p", summarize([judge(other, { ...good, status: 503 })], new Date(0), new Date(0)),
    async (u, o) => calls.push([u, o.body]));
  assert.equal(calls[0][0], "https://hc.example/p/fail");
  assert.match(calls[0][1], /o https:\/\/o\.theintelligence\.company\/: HTTP 503/);
});

test("every site must mount the house bar; Verdict joined it on its own domain (25 Nov 2026)", () => {
  assert.deepEqual(SITES.filter((s) => s.house === false).map((s) => s.id), []);
  const verdict = SITES.find((s) => s.id === "verdict");
  assert.equal(verdict.url, "https://verdict.theintelligence.company/");
  assert.ok(verdict.expect, "Verdict must still prove it drew its board");
  const noBar = { ...good, probe: { ...good.probe, house_bar: false, expect: true } };
  assert.equal(judge(verdict, noBar).ok, false);
  assert.equal(judge(site, noBar).ok, false);
});

test("a page that loads, runs its scripts and has no script error passes", () => {
  const r = judge(site, good);
  assert.equal(r.ok, true);
  assert.deepEqual(r.problems, []);
});

test("console errors and failed requests are evidence, not failures", () => {
  const r = judge(site, { ...good, console_errors: ["Failed to load resource: 404"], failed_requests: ["404 https://a/x"] });
  assert.equal(r.ok, true);
  assert.equal(r.console_errors.length, 1);
});

test("each way a visitor sees a broken page fails it, with the reason", () => {
  assert.match(judge(site, { ...good, status: 502 }).problems[0], /HTTP 502/);
  assert.match(judge(site, { error: "Navigation timeout of 30000 ms exceeded" }).problems[0], /did not load/);
  assert.match(judge(site, { ...good, page_errors: ["x is not defined"] }).problems[0], /script error: x is not defined/);
  assert.match(judge(site, { ...good, probe: { ...good.probe, house_bar: false } }).problems[0], /house bar missing/);
  assert.match(judge(mapSite, { ...good, probe: { ...good.probe, expect: false } }).problems[0], /no \.maplibregl-map/);
  assert.equal(judge(mapSite, { ...good, probe: { ...good.probe, expect: true } }).ok, true);
});

test("Orbit's home page is checked for its Cesium globe, not the MapLibre map it moved to /launches", () => {
  const orbit = SITES.find((s) => s.id === "orbit");
  assert.equal(orbit.url, "https://orbit.theintelligence.company/");
  assert.match(orbit.expect, /cesium-widget/);
  assert.doesNotMatch(orbit.expect, /maplibregl/);
});

test("a page that never loaded reports only that, not a missing house bar", () => {
  const r = judge(mapSite, { error: "net::ERR_NAME_NOT_RESOLVED" });
  assert.equal(r.problems.length, 1);
});

test("the run record names the failed sites", () => {
  const run = summarize([judge(site, good), judge(mapSite, { ...good, status: 500 })], new Date(0), new Date(1000));
  assert.equal(run.contract, "tic-sitecheck/1.2");
  assert.equal(run.ok, 1);
  assert.deepEqual(run.failed, ["a"]);
  assert.equal(run.finished_at, "1970-01-01T00:00:01.000Z");
});

test("Healthchecks gets a plain ping when all pass and /fail with the reasons otherwise", async () => {
  const calls = [];
  const fetcher = async (url, init) => calls.push({ url, body: init.body });
  await report("https://hc.example/p", summarize([judge(site, good)], new Date(0), new Date(0)), fetcher);
  await report("https://hc.example/p/", summarize([judge(site, { ...good, status: 404 })], new Date(0), new Date(0)), fetcher);
  assert.equal(calls[0].url, "https://hc.example/p");
  assert.match(calls[0].body, /all 1 sites passed/);
  assert.equal(calls[1].url, "https://hc.example/p/fail");
  assert.match(calls[1].body, /1 of 1 sites failed:\na https:\/\/a\.theintelligence\.company\/: HTTP 404/);
});

test("no ping without the secret, and a Healthchecks outage never fails the run", async () => {
  let n = 0;
  await report(undefined, summarize([], new Date(0), new Date(0)), async () => n++);
  assert.equal(n, 0);
  await report("https://hc.example/p", summarize([], new Date(0), new Date(0)), async () => { throw new Error("down"); });
});

test("evidence drops query strings and stays on one short line", () => {
  assert.equal(clip("404 https://api.example/x?key=SECRET&b=1"), "404 https://api.example/x?…");
  assert.equal(clip("a\n  b"), "a b");
  assert.equal(clip("x".repeat(500)).length, 160);
});

test("a missing map selector on a page whose map drew is a warning that the check may be out of date, not a failure", () => {
  const drew = { ...good, probe: { ...good.probe, expect: false, map: { selector: ".cesium-widget", width: 1366, height: 800 } } };
  const r = judge(mapSite, drew);
  assert.equal(r.ok, true);
  assert.match(r.warnings[0], /check may be out of date: no \.maplibregl-map, but a map drew \(\.cesium-widget\)/);
  assert.equal(judge(mapSite, { ...good, probe: { ...good.probe, expect: false, map: null } }).ok, false, "no map at all still fails");
  const verdict = SITES.find((s) => s.id === "verdict");
  assert.equal(judge(verdict, drew).ok, false, "a board that is not a map is never excused");
  assert.match(judge(verdict, drew).problems[0], /no #tiles > \*/);
  const run = summarize([r], new Date(0), new Date(0));
  assert.deepEqual(run.failed, []);
  assert.deepEqual(run.warnings, ["a"]);
});

test("Healthchecks gets a plain ping with the warnings listed when the only issue is an out-of-date check", async () => {
  const calls = [];
  const drew = { ...good, probe: { ...good.probe, expect: false, map: { selector: "canvas", width: 800, height: 600 } } };
  await report("https://hc.example/p", summarize([judge(mapSite, drew)], new Date(0), new Date(0)), async (u, o) => calls.push([u, o.body]));
  assert.equal(calls[0][0], "https://hc.example/p");
  assert.match(calls[0][1], /all 1 sites passed\nWarnings \(passed\):\na https/);
});

test("a map drew only when it has a visible size: an empty or tiny canvas does not excuse a missing map", () => {
  const withMap = (map) => ({ ...good, probe: { ...good.probe, expect: false, map } });
  for (const size of [[0, 0], [10, 10], [1366, 0], [MIN_MAP_PX - 1, 600]]) {
    const r = judge(mapSite, withMap({ selector: "canvas", width: size[0], height: size[1] }));
    assert.equal(r.ok, false, `a ${size.join(" x ")} canvas is not a map that drew`);
    assert.match(r.problems[0], /no \.maplibregl-map/);
  }
  const r = judge(mapSite, withMap({ selector: "canvas", width: MIN_MAP_PX, height: MIN_MAP_PX }));
  assert.equal(r.ok, true);
  assert.equal(r.warnings.length, 1);
});

// A stand-in page for probe(): elements are [selector, width, height].
function withPage(elements, fn) {
  const el = ([sel, width, height]) => ({ sel, getBoundingClientRect: () => ({ width, height }) });
  const all = elements.map(el);
  const saved = globalThis.document;
  globalThis.document = {
    title: "T",
    body: { innerText: "text" },
    querySelector: (s) => all.find((e) => e.sel === s) || null,
    querySelectorAll: (s) => all.filter((e) => e.sel === s),
  };
  try {
    return fn();
  } finally {
    if (saved === undefined) delete globalThis.document;
    else globalThis.document = saved;
  }
}

test("probe() reports the first map element with a visible size, else the first it found and its size", () => {
  assert.deepEqual(withPage([[".tic-house", 1366, 34], ["canvas", 0, 0]], () => probe(".maplibregl-map", MIN_MAP_PX)).map,
    { selector: "canvas", width: 0, height: 0 });
  assert.deepEqual(withPage([["canvas", 0, 0], ["canvas", 900, 500]], () => probe(null, MIN_MAP_PX)).map,
    { selector: "canvas", width: 900, height: 500 }, "a hidden canvas before a drawn one");
  assert.deepEqual(withPage([[".maplibregl-map", 0, 0], ["canvas", 1366, 800]], () => probe(null, MIN_MAP_PX)).map,
    { selector: "canvas", width: 1366, height: 800 }, "an empty map container before a drawn canvas");
  assert.equal(withPage([[".tic-house", 1366, 34]], () => probe(null, MIN_MAP_PX)).map, null);
  const seen = withPage([[".tic-house", 1366, 34], ["canvas", 0, 0]], () => probe(".maplibregl-map", MIN_MAP_PX));
  assert.equal(seen.house_bar, true);
  assert.equal(judge(mapSite, { ...good, probe: seen }).ok, false, "the real probe() and judge(): a 0 x 0 canvas fails");
});

// A passing result that needed two tries, as checkAll returns it.
const twice = (s = site) => ({ ...judge(s, good), tries: 2, first_try: ["did not load: Navigation timeout of 30000 ms exceeded"] });
const once = (s = site, seen = good) => ({ ...judge(s, seen), tries: 1 });
const row = (fields) => ({ finished_at: "x", ok: 1, sites: 1, failed: [], retried: [], warnings: [], ...fields });

test("a site that passed on its second try is in the record, its history row, the ping body and the log line", async () => {
  const run = summarize([twice(), once({ id: "b", url: "https://b.theintelligence.company/" })], new Date(0), new Date(58_000));
  assert.deepEqual(run.retried, ["a"]);
  assert.deepEqual(run.failed, []);
  assert.deepEqual(brief(run).retried, ["a"]);
  assert.match(logLine(run), /^sitecheck: 2 of 2 passed in 58 s; passed on the second try: a$/);
  const calls = [];
  await report("https://hc.example/p", run, async (u, o) => calls.push([u, o.body]));
  assert.equal(calls[0][0], "https://hc.example/p", "one second try alone is not an alert");
  assert.match(calls[0][1], /all 2 sites passed\nPassed on the second try:\na https:\/\/a\.theintelligence\.company\/: first try: did not load: Navigation timeout/);
});

test("warnings are in the history row and the log line too", () => {
  const drew = { ...good, probe: { ...good.probe, expect: false, map: { selector: ".cesium-widget", width: 1366, height: 800 } } };
  const run = summarize([once(mapSite, drew)], new Date(0), new Date(1000));
  assert.deepEqual(brief(run).warnings, ["a"]);
  assert.match(logLine(run), /warnings: a/);
});

test(`a site not clean on ${STREAK_RUNS} runs in a row sends /fail with the reason`, async () => {
  assert.equal(STREAK_RUNS, 3);
  const ping = async (run) => {
    const calls = [];
    await report("https://hc.example/p", run, async (u, o) => calls.push([u, o.body]));
    return calls[0];
  };
  // Needed two tries on this run and on the two before it.
  let run = summarize([twice()], new Date(0), new Date(0), [row({ retried: ["a"] }), row({ retried: ["a"] })]);
  assert.deepEqual(run.failed, [], "the site still passed");
  assert.deepEqual(run.repeated.map((x) => x.id), ["a"]);
  assert.match(run.repeated[0].reason, /not clean on 3 runs in a row \(newest first: two tries, two tries, two tries\); this run: first try: did not load/);
  let [url, body] = await ping(run);
  assert.equal(url, "https://hc.example/p/fail");
  assert.match(body, /all 1 sites passed, but 1 has not passed cleanly on 3 runs in a row:\na https:\/\/a\.theintelligence\.company\/: not clean on 3 runs/);
  assert.deepEqual(brief(run).repeated, ["a"]);
  assert.match(logLine(run), /not clean on 3 runs in a row: a/);
  // A warning, a failure and a second try count alike.
  const drew = { ...good, probe: { ...good.probe, expect: false, map: { selector: ".cesium-widget", width: 1366, height: 800 } } };
  run = summarize([once(mapSite, drew)], new Date(0), new Date(0), [row({ failed: ["a"] }), row({ retried: ["a"] })]);
  assert.match(run.repeated[0].reason, /newest first: warning, failed, two tries\); this run: check may be out of date/);
  // A clean run among the three, or too short a history, is no streak.
  assert.deepEqual(summarize([twice()], new Date(0), new Date(0), [row({ retried: ["a"] }), row({})]).repeated, []);
  assert.deepEqual(summarize([twice()], new Date(0), new Date(0), [row({ retried: ["a"] })]).repeated, []);
  assert.deepEqual(summarize([once()], new Date(0), new Date(0), [row({ retried: ["a"] }), row({ retried: ["a"] })]).repeated, [],
    "a clean pass ends the streak");
  // Rows from before retried and warnings were kept count through failed only.
  assert.deepEqual(summarize([twice()], new Date(0), new Date(0), [{ failed: ["a"] }, { failed: [] }]).repeated, []);
  assert.deepEqual(summarize([twice()], new Date(0), new Date(0), [{ failed: ["a"] }, { failed: ["a"] }]).repeated.map((x) => x.id), ["a"]);
  // Failing sites are named first, and the streak after them.
  const b = { id: "b", url: "https://b.theintelligence.company/" };
  run = summarize([twice(), { ...judge(b, { ...good, status: 503 }), tries: 2, first_try: ["HTTP 503"] }],
    new Date(0), new Date(0), [row({ retried: ["a"] }), row({ warnings: ["a"] })]);
  [url, body] = await ping(run);
  assert.equal(url, "https://hc.example/p/fail");
  assert.match(body, /1 of 2 sites failed:\nb https:\/\/b\.theintelligence\.company\/: HTTP 503 \(on both tries\)\nNot clean on 3 runs in a row:\na /);
});
