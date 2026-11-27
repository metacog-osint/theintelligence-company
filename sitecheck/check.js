// sitecheck's judgement, timing and reporting, in plain JavaScript with no Cloudflare imports so `node --test` can run
// it. worker.js drives the browser and hands each page's raw readings to judge().

// How long a page may take to answer and fire its load event, and how long its expected element may take after
// that. Measured 17 Nov 2026 in headless Edge from Fargo-Moorhead: every site loaded in under 4 s.
export const LOAD_TIMEOUT_MS = 30_000;
export const EXPECT_TIMEOUT_MS = 15_000;
// A page with no expected element gets this long after load for its scripts to mount the house bar.
export const SETTLE_MS = 3_000;
// Runs kept in KV under "history", newest first.
export const HISTORY_RUNS = 28;
// A site that fails is opened once more, at least this long after its first try ended, and only a second failure
// counts: one slow answer or a page caught mid-deploy should not raise an alert, and a site that is really down fails
// both times.
export const RETRY_WAIT_MS = 20_000;
// Cloudflare ends a scheduled run at 15 minutes of wall time ("Cron Trigger 15 min" in the Workers limits), and the
// record and the Healthchecks ping come last. So no page is opened later than OPEN_BY_MS into the run, and one try
// is cut off at TRY_CAP_MS whatever it is waiting on (the load timeout, the expected element and the probe fit inside
// it): the last try ends by minute 13 and the record and ping follow. A normal run takes about a minute.
export const OPEN_BY_MS = 12 * 60_000;
export const TRY_CAP_MS = 60_000;
// A map that drew has a visible size: width and height of at least this many CSS pixels. An empty or hidden canvas
// measures 0.
export const MIN_MAP_PX = 50;
// A site that passes but not cleanly (it needed two tries or carries a warning), after trouble on each run before it
// (failed, two tries or a warning), this many runs in a row, sends /fail, so a site that keeps needing a second try
// or a check that stays out of date reaches someone.
export const STREAK_RUNS = 3;
// What probe() counts as a drawn map. When a site's expected element is missing but one of these drew, the page works
// and the check is what fell behind (Orbit, 21-22 Nov 2026: its map became a Cesium globe and the check failed every
// run for a day while the site was fine).
const MAP_SELECTOR = /maplibregl|leaflet|ol-viewport|cesium|canvas/;

// The clock a run keeps time by; the tests pass a mock one. timer(ms).cancel() drops a wait that is no longer needed.
export const REAL_CLOCK = {
  now: () => Date.now(),
  timer(ms) {
    let id;
    const done = new Promise((resolve) => { id = setTimeout(resolve, ms); });
    return { done, cancel: () => clearTimeout(id) };
  },
};

// promise's result, or fallback()'s if promise has not settled within ms.
export async function within(clock, ms, promise, fallback) {
  const t = clock.timer(ms);
  try {
    return await Promise.race([promise, t.done.then(fallback)]);
  } finally {
    t.cancel();
  }
}

const drew = (map) => !!map && map.width >= MIN_MAP_PX && map.height >= MIN_MAP_PX;

// One site's verdict from what the browser saw. A site fails when a visitor would see it broken: no page (status
// not 200 or the load timed out), an uncaught script error, no house bar (its scripts didn't run) or, where the site
// has a map, no map. Console errors and failed requests are kept as evidence but don't fail it on their own: three
// sites log a harmless 404 today (17 Nov 2026), and a check that is always red gets ignored.
export function judge(site, seen) {
  const problems = [];
  const warnings = [];
  if (seen.error) problems.push(`did not load: ${seen.error}`);
  else if (seen.status !== 200) problems.push(`HTTP ${seen.status}`);
  if (!seen.error) {
    if (seen.page_errors && seen.page_errors.length) problems.push(`script error: ${seen.page_errors[0]}`);
    if (site.house !== false && seen.probe && !seen.probe.house_bar) problems.push("house bar missing (its scripts may not have run)");
    if (site.expect && seen.probe && !seen.probe.expect) {
      if (MAP_SELECTOR.test(site.expect) && drew(seen.probe.map)) {
        warnings.push(`check may be out of date: no ${site.expect}, but a map drew (${seen.probe.map.selector}); update sites.js`);
      } else {
        problems.push(`no ${site.expect} (the map or chart did not draw)`);
      }
    }
  }
  return {
    id: site.id,
    url: site.url,
    group: site.group === "other" ? "other" : "suite",
    ok: problems.length === 0,
    problems,
    warnings,
    status: seen.status ?? null,
    ms: seen.ms ?? null,
    load_ms: seen.probe ? seen.probe.load_ms : null,
    title: seen.probe ? seen.probe.title : null,
    map: seen.probe ? seen.probe.map : null,
    console_errors: (seen.console_errors || []).slice(0, 5),
    failed_requests: (seen.failed_requests || []).slice(0, 5),
  };
}

// A failed result with no page reading: the site was never opened, or its try stopped. The reason is its one problem.
function unfinished(site, reason) {
  return { ...judge(site, { error: reason }), problems: [reason] };
}

// Checks every site, one page at a time, inside the run's time budget. Each site gets its first try, in order; then
// each failed site is opened once more, at least RETRY_WAIT_MS after its first try ended, and the second result stands
// (first_try keeps the first one's problems). A failed site that could not be opened again before OPEN_BY_MS still
// fails, marked not_retried; a site that could not be opened at all fails as not checked. A try that throws or runs
// past TRY_CAP_MS fails with that reason. tries on each result: 0, 1 or 2.
export async function checkAll(sites, check, clock = REAL_CLOCK, { start = clock.now(), openBy = OPEN_BY_MS, retryWait = RETRY_WAIT_MS, tryCap = TRY_CAP_MS } = {}) {
  const deadline = start + openBy;
  const once = async (site) => {
    try {
      return await within(clock, tryCap, Promise.resolve().then(() => check(site)),
        () => unfinished(site, `the check did not finish in ${Math.round(tryCap / 1000)} s`));
    } catch (e) {
      return unfinished(site, clip(`the check stopped: ${e && e.message}`));
    }
  };
  const results = [];
  const ended = [];
  for (const site of sites) {
    if (clock.now() >= deadline) {
      results.push({ ...unfinished(site, "not checked: the run ran out of time"), tries: 0 });
    } else {
      results.push({ ...(await once(site)), tries: 1 });
    }
    ended.push(clock.now());
  }
  for (let i = 0; i < sites.length; i++) {
    const first = results[i];
    if (first.ok || first.tries === 0) continue;
    const wait = Math.max(0, ended[i] + retryWait - clock.now());
    if (clock.now() + wait >= deadline) {
      results[i] = { ...first, not_retried: true };
      continue;
    }
    if (wait) await clock.timer(wait).done;
    results[i] = { ...(await once(sites[i])), tries: 2, first_try: first.problems };
  }
  return results;
}

// For each site that passed this run but not cleanly, and had trouble on each of the STREAK_RUNS - 1 runs before it
// (history is newest first; a run's row counts when it lists the site under failed, retried or warnings), the reason
// to send /fail. Rows written before retried and warnings were kept count only through failed.
function repeatedTrouble(results, history) {
  const before = history.slice(0, STREAK_RUNS - 1);
  if (before.length < STREAK_RUNS - 1) return [];
  const has = (row, key, id) => !!row && Array.isArray(row[key]) && row[key].includes(id);
  const label = (row, id) => (has(row, "failed", id) ? "failed" : has(row, "retried", id) ? "two tries" : has(row, "warnings", id) ? "warning" : null);
  const out = [];
  for (const r of results) {
    if (!r.ok) continue;
    const twice = r.tries === 2;
    const warned = !!(r.warnings && r.warnings.length);
    if (!twice && !warned) continue;
    const past = before.map((row) => label(row, r.id));
    if (past.includes(null)) continue;
    const detail = [twice ? `first try: ${(r.first_try || []).join("; ")}` : null, warned ? r.warnings.join("; ") : null].filter(Boolean).join("; ");
    out.push({ id: r.id, url: r.url, reason: `not clean on ${STREAK_RUNS} runs in a row (newest first: ${[twice ? "two tries" : "warning", ...past].join(", ")}); this run: ${detail}` });
  }
  return out;
}

// The run's record: what is stored in KV and served at /. results holds the hub and the suite programs;
// other_work (tic-sitecheck/1.1, 24 Nov 2026) holds the other pages on the domain. The counts and failed cover both.
// tic-sitecheck/1.2 adds, for sites that passed: retried (on the second try) and warnings (the check may be out of
// date); not_retried (failed sites the run had no time to open again); repeated (sites not clean on STREAK_RUNS runs in
// a row, with the reason); and on each result warnings, tries, first_try and not_retried. Readers that go by failed
// and results[].ok are unchanged. history is the stored history, newest first, for repeated.
export function summarize(results, startedAt, finishedAt, history = []) {
  const failed = results.filter((r) => !r.ok);
  const passed = results.filter((r) => r.ok);
  return {
    contract: "tic-sitecheck/1.2",
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    sites: results.length,
    ok: passed.length,
    failed: failed.map((r) => r.id),
    retried: passed.filter((r) => r.tries === 2).map((r) => r.id),
    not_retried: failed.filter((r) => r.not_retried).map((r) => r.id),
    warnings: passed.filter((r) => r.warnings && r.warnings.length).map((r) => r.id),
    repeated: repeatedTrouble(results, history),
    results: results.filter((r) => r.group !== "other"),
    other_work: results.filter((r) => r.group === "other"),
  };
}

// The run's row in history: each site's trouble, kept for HISTORY_RUNS runs and read for STREAK_RUNS.
export function brief(run) {
  return {
    finished_at: run.finished_at,
    ok: run.ok,
    sites: run.sites,
    failed: run.failed,
    retried: run.retried || [],
    warnings: run.warnings || [],
    repeated: (run.repeated || []).map((x) => x.id),
  };
}

// The run's one line in Workers Logs.
export function logLine(run) {
  const secs = Math.round((Date.parse(run.finished_at) - Date.parse(run.started_at)) / 1000);
  const parts = [`sitecheck: ${run.ok} of ${run.sites} passed in ${secs} s`];
  const add = (label, ids) => { if (ids && ids.length) parts.push(`${label}: ${ids.join(", ")}`); };
  add("failed", run.failed);
  add("not retried", run.not_retried);
  add("passed on the second try", run.retried);
  add("warnings", run.warnings);
  add(`not clean on ${STREAK_RUNS} runs in a row`, (run.repeated || []).map((x) => x.id));
  return parts.join("; ");
}

// Ping Healthchecks.io: the check's address when no site failed and none is in repeated, /fail otherwise. The body
// names every failed site with its reasons, then the sites not clean on STREAK_RUNS runs in a row, the sites that
// passed on the second try and the warnings. The address is a secret, so it is never logged. A failed ping never
// fails the run.
export async function report(url, run, fetcher) {
  if (!url) return;
  const all = [...run.results, ...(run.other_work || [])];
  const repeated = run.repeated || [];
  const ok = run.failed.length === 0 && repeated.length === 0;
  const line = (r, text) => `${r.id} ${r.url}: ${text}`;
  const failedLines = all.filter((r) => !r.ok).map((r) => line(r, r.problems.join("; ")
    + (r.not_retried ? " (not retried: the run was out of time)" : r.tries === 2 ? " (on both tries)" : "")));
  const repeatedLines = repeated.map((x) => line(x, x.reason));
  const retriedLines = all.filter((r) => r.ok && r.tries === 2).map((r) => line(r, `first try: ${(r.first_try || []).join("; ")}`));
  const notes = all.filter((r) => r.ok && r.warnings && r.warnings.length).map((r) => line(r, r.warnings.join("; ")));
  const section = (title, lines) => (lines.length ? `\n${title}:\n${lines.join("\n")}` : "");
  let body;
  if (run.failed.length) {
    body = `${run.finished_at} ${run.failed.length} of ${run.sites} sites failed:\n${failedLines.join("\n")}`
      + section(`Not clean on ${STREAK_RUNS} runs in a row`, repeatedLines);
  } else if (repeated.length) {
    body = `${run.finished_at} all ${run.sites} sites passed, but ${repeated.length} ${repeated.length === 1 ? "has" : "have"} not passed cleanly on ${STREAK_RUNS} runs in a row:\n${repeatedLines.join("\n")}`;
  } else {
    body = `${run.finished_at} all ${run.sites} sites passed`;
  }
  body += section("Passed on the second try", retriedLines) + section("Warnings (passed)", notes);
  try {
    await fetcher(ok ? url : `${url.replace(/\/+$/, "")}/fail`, {
      method: "POST", body, headers: { "User-Agent": "tic-sitecheck" }, signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    console.log(`Healthchecks ping failed: ${e && e.message}`);
  }
}

// Short, single-line evidence: no query strings (a request URL can carry a key a site passes to a data provider).
export function clip(text, n = 160) {
  return String(text).replace(/\?[^\s)"']*/g, "?…").replace(/\s+/g, " ").slice(0, n);
}
