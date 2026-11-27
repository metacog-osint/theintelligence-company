// Whole runs of worker.js's runChecks() with stand-ins: a scripted browser in place of @cloudflare/puppeteer, a mock
// clock, KV in memory, and a fetcher that records the Healthchecks ping. No network, no browser, no Cloudflare.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SITES } from "./sites.js";
import { runChecks } from "./worker.js";
import { checkAll, judge, LOAD_TIMEOUT_MS, OPEN_BY_MS, TRY_CAP_MS } from "./check.js";

const MIN = 60_000;
// The sites served from Cloudflare Pages (CNAMEs to *.pages.dev, read 26 Nov 2026): one host stalling hangs them all.
const PAGES = ["cop", "headwind", "undertow", "relief", "blackout", "noisefloor", "orbit", "launch", "vis", "wake", "propertycast"];

// Timers fire in time order, and time jumps to the next one whenever everything else is waiting, so a 13-minute run
// takes milliseconds. drive(promise) runs the clock until promise settles.
function mockClock(start = Date.UTC(2026, 10, 26, 17, 10)) {
  let t = start;
  let seq = 0;
  let timers = [];
  return {
    start,
    now: () => t,
    timer(ms) {
      let entry;
      const done = new Promise((resolve) => { entry = { at: t + ms, seq: seq++, resolve }; timers.push(entry); });
      return { done, cancel: () => { timers = timers.filter((x) => x !== entry); } };
    },
    async drive(promise) {
      let settled = false;
      promise.then(() => { settled = true; }, () => { settled = true; });
      for (let steps = 0; steps < 100_000; steps++) {
        await new Promise((r) => setImmediate(r));
        if (settled) return promise;
        if (!timers.length) throw new Error("the run is waiting on nothing");
        timers.sort((a, b) => a.at - b.at || a.seq - b.seq);
        const next = timers.shift();
        t = next.at;
        next.resolve();
      }
      throw new Error("the run did not end");
    },
  };
}

// A stand-in for @cloudflare/puppeteer's browser. how(site id, try number) says how a page load goes: "hang" waits
// out the load timeout and throws as puppeteer does; "stall" never answers at all; a number answers with that HTTP
// status; { probe } answers 200 with those page readings; anything else answers 200 with the house bar and the map.
// A load that answers takes 2 s. opened lists every load with its site id, try number and clock time.
function scriptedBrowser(clock, how = () => "ok") {
  const byUrl = new Map(SITES.map((s) => [s.url, s.id]));
  const tries = new Map();
  const opened = [];
  const browser = {
    opened,
    closed: false,
    userAgent: async () => "Mozilla/5.0 HeadlessChrome/131",
    close: async () => { browser.closed = true; },
    newPage: async () => {
      let step = null;
      return {
        setViewport: async () => {},
        setUserAgent: async () => {},
        on: () => {},
        goto: async (url, { timeout }) => {
          const id = byUrl.get(url);
          const n = (tries.get(id) || 0) + 1;
          tries.set(id, n);
          opened.push({ id, n, at: clock.now() });
          step = how(id, n);
          if (step === "hang") {
            await clock.timer(timeout).done;
            throw new Error(`Navigation timeout of ${timeout} ms exceeded`);
          }
          if (step === "stall") return new Promise(() => {});
          await clock.timer(2_000).done;
          return { status: () => (typeof step === "number" ? step : 200) };
        },
        waitForSelector: async () => {},
        evaluate: async () => ({
          title: "T", house_bar: true, map: { selector: ".maplibregl-map", width: 1366, height: 800 }, expect: true,
          text_chars: 900, load_ms: 1200, ...(step && step.probe),
        }),
        close: async () => {},
      };
    },
  };
  return browser;
}

function memoryKV(store = {}) {
  return {
    store,
    get: async (key, type) => (key in store ? (type === "json" ? JSON.parse(store[key]) : store[key]) : null),
    put: async (key, value) => { store[key] = value; },
  };
}

// One scheduled run, start to finish, on the mock clock.
async function runOnce(how, kv = memoryKV()) {
  const clock = mockClock();
  const browser = scriptedBrowser(clock, how);
  const pings = [];
  const logs = [];
  const env = { BROWSER: {}, RESULTS: kv, HC_PING_URL: "https://hc.example/p" };
  const run = await clock.drive(runChecks(env, {
    launch: async () => browser,
    clock,
    fetcher: async (url, init) => { pings.push({ url, body: init.body }); },
    log: (line) => logs.push(line),
  }));
  return { run, kv, pings, logs, browser, elapsed: clock.now() - clock.start };
}

const hangAll = () => "hang";

test("every site hanging on every try: the run ends inside 13 minutes with its record and one /fail naming them all", async () => {
  const { run, kv, pings, logs, browser, elapsed } = await runOnce(hangAll);
  assert.ok(elapsed < 13 * MIN, `the run took ${elapsed / 1000} s`);
  assert.ok(browser.opened.every((o) => o.at - Date.parse(run.started_at) <= OPEN_BY_MS), "no page opened after minute 12");
  assert.equal(run.sites, SITES.length);
  assert.deepEqual(run.failed, SITES.map((s) => s.id));
  const latest = JSON.parse(kv.store.latest);
  assert.equal(latest.finished_at, run.finished_at);
  assert.deepEqual(latest.failed, run.failed);
  const history = JSON.parse(kv.store.history);
  assert.equal(history.length, 1);
  assert.deepEqual(history[0].failed, run.failed);
  assert.equal(pings.length, 1);
  assert.equal(pings[0].url, "https://hc.example/p/fail");
  for (const s of SITES) assert.ok(pings[0].body.includes(`\n${s.id} ${s.url}: did not load`), `${s.id} is named in the ping`);
  // The time ran out before every failed site could be opened again: those still fail, marked not retried.
  assert.ok(run.not_retried.length > 0);
  assert.match(pings[0].body, /\(not retried: the run was out of time\)/);
  assert.match(pings[0].body, /\(on both tries\)/);
  const all = [...run.results, ...run.other_work];
  for (const r of all) assert.ok(r.tries === 2 || r.not_retried, `${r.id} was retried or marked not retried`);
  assert.equal(logs.length, 1);
  assert.match(logs[0], new RegExp(`^sitecheck: 0 of ${SITES.length} passed in \\d+ s; failed: hub, `));
  assert.match(logs[0], /; not retried: /);
  assert.ok(browser.closed);
});

test("the 11 sites on Cloudflare Pages hanging: every one is opened twice and the run ends inside 13 minutes", async () => {
  assert.equal(PAGES.length, 11);
  for (const id of PAGES) assert.ok(SITES.some((s) => s.id === id), `${id} is checked`);
  const { run, pings, browser, elapsed } = await runOnce((id) => (PAGES.includes(id) ? "hang" : "ok"));
  assert.ok(elapsed < 13 * MIN, `the run took ${elapsed / 1000} s`);
  assert.deepEqual([...run.failed].sort(), [...PAGES].sort());
  assert.deepEqual(run.not_retried, [], "time enough to open each of them again");
  for (const id of PAGES) assert.equal(browser.opened.filter((o) => o.id === id).length, 2, `${id} opened twice`);
  assert.equal(pings.length, 1);
  assert.equal(pings[0].url, "https://hc.example/p/fail");
  assert.match(pings[0].body, new RegExp(`^\\S+ 11 of ${SITES.length} sites failed:\n`));
});

test("a try that never answers is cut off, and sites the run had no time to open fail as not checked", async () => {
  const { run, pings, browser, elapsed } = await runOnce(() => "stall");
  assert.ok(elapsed < 13 * MIN, `the run took ${elapsed / 1000} s`);
  assert.ok(browser.opened.every((o) => o.at - Date.parse(run.started_at) <= OPEN_BY_MS));
  const all = [...run.results, ...run.other_work];
  assert.match(all[0].problems[0], new RegExp(`the check did not finish in ${TRY_CAP_MS / 1000} s`));
  const unchecked = all.filter((r) => r.tries === 0);
  assert.ok(unchecked.length > 0);
  for (const r of unchecked) assert.deepEqual(r.problems, ["not checked: the run ran out of time"]);
  assert.deepEqual(run.failed, SITES.map((s) => s.id));
  assert.equal(pings[0].url, "https://hc.example/p/fail");
  for (const s of SITES) assert.ok(pings[0].body.includes(`\n${s.id} ${s.url}: `), `${s.id} is named in the ping`);
});

test("a site that passed on its second try is kept in the record, history, ping and log; three runs in a row send /fail", async () => {
  const kv = memoryKV();
  const flakyCop = (id, n) => (id === "cop" && n === 1 ? "hang" : "ok");
  for (let i = 1; i <= 3; i++) {
    const { run, pings, logs } = await runOnce(flakyCop, kv);
    assert.deepEqual(run.failed, []);
    assert.deepEqual(run.retried, ["cop"]);
    const cop = run.results.find((r) => r.id === "cop");
    assert.equal(cop.tries, 2);
    assert.match(cop.first_try[0], /did not load: Navigation timeout of 30000 ms exceeded/);
    const history = JSON.parse(kv.store.history);
    assert.equal(history.length, i);
    assert.deepEqual(history[0].retried, ["cop"]);
    assert.match(pings[0].body, /Passed on the second try:\ncop https:\/\/cop\.theintelligence\.company\/: first try: did not load/);
    assert.match(logs[0], /passed on the second try: cop/);
    if (i < 3) {
      assert.equal(pings[0].url, "https://hc.example/p", `run ${i}: one site needing two tries is not an alert yet`);
      assert.deepEqual(run.repeated, []);
    } else {
      assert.equal(pings[0].url, "https://hc.example/p/fail", "run 3: the third in a row is");
      assert.deepEqual(run.repeated.map((x) => x.id), ["cop"]);
      assert.match(pings[0].body, /but 1 has not passed cleanly on 3 runs in a row:\ncop https:\/\/cop\.theintelligence\.company\/: not clean on 3 runs in a row \(newest first: two tries, two tries, two tries\)/);
      assert.deepEqual(history[0].repeated, ["cop"]);
      assert.match(logs[0], /not clean on 3 runs in a row: cop/);
    }
  }
  const clean = await runOnce(() => "ok", kv);
  assert.equal(clean.pings[0].url, "https://hc.example/p", "a clean run clears it");
  assert.deepEqual(clean.run.retried, []);
});

test("a stale map selector on three runs in a row sends /fail too, and its warning is in history and the log", async () => {
  const kv = memoryKV();
  const globe = { probe: { expect: false, map: { selector: ".cesium-widget", width: 1366, height: 800 } } };
  let last;
  for (let i = 1; i <= 3; i++) {
    last = await runOnce((id) => (id === "launch" ? globe : "ok"), kv);
    assert.deepEqual(last.run.failed, []);
    assert.deepEqual(JSON.parse(kv.store.history)[0].warnings, ["launch"]);
    assert.match(last.logs[0], /warnings: launch/);
  }
  assert.equal(last.pings[0].url, "https://hc.example/p/fail");
  assert.match(last.pings[0].body, /launch https:\/\/launch\.theintelligence\.company\/: not clean on 3 runs in a row \(newest first: warning, warning, warning\); this run: check may be out of date/);
});

test("checkAll: a failed site is opened once more at least 20 s after its first try, and only the second result counts", async () => {
  const sites = [{ id: "a", url: "https://a/" }, { id: "b", url: "https://b/" }];
  const good = { status: 200, probe: { house_bar: true, expect: null } };
  const clock = mockClock(0);
  const opened = [];
  const plan = { a: [{ error: "net::ERR_CONNECTION_RESET" }, good], b: [{ ...good, status: 502 }, { ...good, status: 502 }] };
  const check = async (s) => {
    opened.push([s.id, clock.now()]);
    await clock.timer(1_000).done;
    return judge(s, plan[s.id].shift());
  };
  const [a, b] = await clock.drive(checkAll(sites, check, clock));
  assert.equal(a.ok, true);
  assert.equal(a.tries, 2);
  assert.match(a.first_try[0], /ERR_CONNECTION_RESET/);
  assert.equal(b.ok, false);
  assert.equal(b.tries, 2);
  assert.match(b.problems[0], /HTTP 502/);
  // a's first try ended at 1 s and b's at 2 s, so a reopens at 21 s and b at 22 s.
  assert.deepEqual(opened, [["a", 0], ["b", 1_000], ["a", 21_000], ["b", 22_000]]);
  let calls = 0;
  const [fine] = await clock.drive(checkAll([sites[0]], async (s) => (calls++, judge(s, good)), clock));
  assert.equal(calls, 1, "a pass is not opened twice");
  assert.equal(fine.tries, 1);
  assert.equal(fine.first_try, undefined);
});

test("checkAll: a check that throws fails that site with the reason and the run goes on", async () => {
  const clock = mockClock(0);
  const sites = [{ id: "a", url: "https://a/" }, { id: "b", url: "https://b/" }];
  const results = await clock.drive(checkAll(sites, async (s) => {
    if (s.id === "a") throw new Error("Protocol error: Target closed");
    return judge(s, { status: 200, probe: { house_bar: true } });
  }, clock));
  assert.deepEqual(results[0].problems, ["the check stopped: Protocol error: Target closed"]);
  assert.equal(results[1].ok, true);
});

test("the scripted browser hangs the way the Worker's load timeout does", () => {
  assert.equal(LOAD_TIMEOUT_MS, 30_000);
  assert.ok(TRY_CAP_MS > LOAD_TIMEOUT_MS + 15_000, "the cap leaves room for the load, the expected element and the probe");
  assert.ok(OPEN_BY_MS + TRY_CAP_MS <= 13 * MIN, "the last try ends by minute 13");
});
