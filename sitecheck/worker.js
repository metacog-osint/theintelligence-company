// tic-sitecheck: opens every Intelligence Company site in a real headless browser twice a day (Cloudflare Browser
// Run, included in Workers Paid since 17 Nov 2026) and checks what a visitor would see: the page answers, its
// scripts run (the house bar mounts), no uncaught script error, and, where a site has one, its map draws.
//
// The latest run is public JSON at the Worker's address (/; /history for the last runs), and a Healthchecks.io
// check (secret HC_PING_URL) gets a ping each run, or /fail, which emails the check's owner, when a site failed or
// has not passed cleanly on several runs in a row (check.js STREAK_RUNS). COP's watchdog checks that feeds are fresh;
// this checks that the pages work.
import puppeteer from "@cloudflare/puppeteer";
import { SITES } from "./sites.js";
import { probe } from "./probe.js";
import {
  judge, summarize, brief, report, logLine, clip, checkAll, within,
  REAL_CLOCK, LOAD_TIMEOUT_MS, EXPECT_TIMEOUT_MS, SETTLE_MS, HISTORY_RUNS, MIN_MAP_PX,
} from "./check.js";

const UA_SUFFIX = " tic-sitecheck (+https://theintelligence.company)";

async function checkSite(browser, site, clock) {
  const seen = { console_errors: [], page_errors: [], failed_requests: [] };
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1366, height: 900 });
    await page.setUserAgent((await browser.userAgent()) + UA_SUFFIX);
    page.on("console", (m) => m.type() === "error" && seen.console_errors.push(clip(m.text())));
    page.on("pageerror", (e) => seen.page_errors.push(clip(e && e.message)));
    page.on("response", (r) => r.status() >= 400 && seen.failed_requests.push(clip(`${r.status()} ${r.url()}`)));
    const t0 = clock.now();
    const resp = await page.goto(site.url, { waitUntil: "load", timeout: LOAD_TIMEOUT_MS });
    seen.status = resp ? resp.status() : null;
    if (site.expect) {
      await page.waitForSelector(site.expect, { timeout: EXPECT_TIMEOUT_MS }).catch(() => {});
    } else {
      await clock.timer(SETTLE_MS).done;
    }
    seen.probe = await page.evaluate(probe, site.expect || null, MIN_MAP_PX);
    seen.ms = clock.now() - t0;
  } catch (e) {
    seen.error = clip(e && e.message);
  } finally {
    await page.close().catch(() => {});
  }
  return judge(site, seen);
}

// One run: every site through checkAll, then the record in KV, the Healthchecks ping and one log line. deps lets the
// tests run it with a scripted browser and a mock clock; the Worker passes none.
export async function runChecks(env, deps = {}) {
  const {
    launch = (binding) => puppeteer.launch(binding),
    clock = REAL_CLOCK,
    fetcher = (...a) => fetch(...a),
    log = (line) => console.log(line),
  } = deps;
  const started = clock.now();
  const browser = await launch(env.BROWSER);
  let results;
  try {
    // One page at a time: browser time is what's billed, and it keeps one slow site from crowding another.
    results = await checkAll(SITES, (s) => checkSite(browser, s, clock), clock, { start: started });
  } finally {
    await within(clock, 10_000, browser.close().catch(() => {}), () => {});
  }
  const stored = await env.RESULTS.get("history", "json").catch(() => null);
  const history = Array.isArray(stored) ? stored : [];
  const run = summarize(results, new Date(started), new Date(clock.now()), history);
  await env.RESULTS.put("latest", JSON.stringify(run));
  await env.RESULTS.put("history", JSON.stringify([brief(run), ...history].slice(0, HISTORY_RUNS)));
  await report(env.HC_PING_URL, run, fetcher);
  log(logLine(run));
  return run;
}

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=300",
  "X-Content-Type-Options": "nosniff",
};

export default {
  // Awaited, not waitUntil. Cloudflare ends a scheduled run at 15 minutes of wall time. A run takes about a minute
  // (58 s on 26 Nov 2026), and checkAll opens no page after minute 12 and cuts a try off at 60 s, so even a run in
  // which every site hangs writes its record and pings by about minute 13.
  async scheduled(controller, env) {
    await runChecks(env);
  },

  // Read-only: the latest run and the short history. Nothing here starts a browser.
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
    const path = new URL(request.url).pathname;
    const key = path === "/" ? "latest" : path === "/history" ? "history" : null;
    if (!key) return new Response("Not found", { status: 404 });
    const body = await env.RESULTS.get(key);
    if (!body) return new Response(JSON.stringify({ contract: "tic-sitecheck/1", note: "no run yet" }), { status: 503, headers: HEADERS });
    return new Response(body, { headers: HEADERS });
  },
};
