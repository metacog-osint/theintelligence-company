// tic-sitecheck: opens every Intelligence Company site in a real headless browser twice a day (Cloudflare Browser
// Run, included in Workers Paid since 17 Nov 2026) and checks what a visitor would see: the page answers, its
// scripts run (the house bar mounts), no uncaught script error, and, where a site has one, its map draws.
//
// The latest run is public JSON at the Worker's address (/; /history for the last runs), and a Healthchecks.io
// check (secret HC_PING_URL) gets a ping each run, or /fail with the failures so Tom is emailed. COP's watchdog
// checks that feeds are fresh; this checks that the pages work.
import puppeteer from "@cloudflare/puppeteer";
import { SITES } from "./sites.js";
import { probe } from "./probe.js";
import { judge, summarize, report, clip, checkWithRetry, LOAD_TIMEOUT_MS, EXPECT_TIMEOUT_MS, SETTLE_MS, HISTORY_RUNS } from "./check.js";

const UA_SUFFIX = " tic-sitecheck (+https://theintelligence.company)";

async function checkSite(browser, site) {
  const seen = { console_errors: [], page_errors: [], failed_requests: [] };
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1366, height: 900 });
    await page.setUserAgent((await browser.userAgent()) + UA_SUFFIX);
    page.on("console", (m) => m.type() === "error" && seen.console_errors.push(clip(m.text())));
    page.on("pageerror", (e) => seen.page_errors.push(clip(e && e.message)));
    page.on("response", (r) => r.status() >= 400 && seen.failed_requests.push(clip(`${r.status()} ${r.url()}`)));
    const t0 = Date.now();
    const resp = await page.goto(site.url, { waitUntil: "load", timeout: LOAD_TIMEOUT_MS });
    seen.status = resp ? resp.status() : null;
    if (site.expect) {
      await page.waitForSelector(site.expect, { timeout: EXPECT_TIMEOUT_MS }).catch(() => {});
    } else {
      await new Promise((r) => setTimeout(r, SETTLE_MS));
    }
    seen.probe = await page.evaluate(probe, site.expect || null);
    seen.ms = Date.now() - t0;
  } catch (e) {
    seen.error = clip(e && e.message);
  } finally {
    await page.close().catch(() => {});
  }
  return judge(site, seen);
}

export async function runChecks(env) {
  const started = new Date();
  const browser = await puppeteer.launch(env.BROWSER);
  const results = [];
  try {
    // One page at a time: browser time is what's billed, and it keeps one slow site from crowding another. A site
    // that fails is opened once more before it counts (checkWithRetry).
    for (const site of SITES) results.push(await checkWithRetry((s) => checkSite(browser, s), site));
  } finally {
    await browser.close().catch(() => {});
  }
  const run = summarize(results, started, new Date());
  const history = (await env.RESULTS.get("history", "json").catch(() => null)) || [];
  const brief = { finished_at: run.finished_at, ok: run.ok, sites: run.sites, failed: run.failed };
  await env.RESULTS.put("latest", JSON.stringify(run));
  await env.RESULTS.put("history", JSON.stringify([brief, ...history].slice(0, HISTORY_RUNS)));
  await report(env.HC_PING_URL, run, (...a) => fetch(...a));
  console.log(`sitecheck: ${run.ok} of ${run.sites} passed${run.failed.length ? `; failed: ${run.failed.join(", ")}` : ""}`);
  return run;
}

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=300",
  "X-Content-Type-Options": "nosniff",
};

export default {
  // Awaited, not waitUntil: a scheduled run may last up to 15 minutes on Workers Paid; a run takes about 2.
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
