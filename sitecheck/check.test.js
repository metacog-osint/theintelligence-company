// Run with `node --test` in sitecheck/. No network and no browser: worker.js's browser steps are covered by the
// local headless Edge run noted in sites.js and by the first live run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SITES } from "./sites.js";
import { judge, summarize, report, clip } from "./check.js";

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

test("other work on the domain is checked but listed apart from the programs (Tom, 24 Nov 2026)", () => {
  assert.deepEqual(SITES.filter((s) => s.group === "other").map((s) => s.id), ["propertycast", "activation", "listeningpost"]);
  const other = { id: "o", url: "https://o.theintelligence.company/", group: "other" };
  const run = summarize([judge(site, good), judge(other, { ...good, status: 500 })], new Date(0), new Date(1000));
  assert.equal(run.contract, "tic-sitecheck/1.1");
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

test("Verdict is checked for its drawn board and is the only site excused from the house bar", () => {
  const excused = SITES.filter((s) => s.house === false);
  assert.deepEqual(excused.map((s) => s.id), ["verdict"]);
  assert.ok(excused[0].expect, "an excused site must still prove it drew");
  const noBar = { ...good, probe: { ...good.probe, house_bar: false, expect: true } };
  assert.equal(judge(excused[0], noBar).ok, true);
  assert.equal(judge(excused[0], { ...noBar, probe: { ...noBar.probe, expect: false } }).ok, false);
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
  assert.equal(run.contract, "tic-sitecheck/1.1");
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
