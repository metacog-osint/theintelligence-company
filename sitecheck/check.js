// sitecheck's judgement and reporting, in plain JavaScript with no Cloudflare imports so `node --test` can run it.
// worker.js drives the browser and hands each page's raw readings to judge().

// How long a page may take to answer and fire its load event, and how long its expected element may take after
// that. Measured 17 Nov 2026 in headless Edge from Fargo-Moorhead: every site loaded in under 4 s.
export const LOAD_TIMEOUT_MS = 30_000;
export const EXPECT_TIMEOUT_MS = 15_000;
// A page with no expected element gets this long after load for its scripts to mount the house bar.
export const SETTLE_MS = 3_000;
// Runs kept in KV under "history", newest first.
export const HISTORY_RUNS = 28;

// The longest selector a page may declare in data-sitecheck.
export const DECLARED_MAX = 200;

// What the page must have drawn: the selector the page declares in its own data-sitecheck attribute (so a redesign
// that moves the map moves the check with it), else the site's `expect` in sites.js, else nothing. `declared` is the
// attribute's value as probe.js's declared() read it, or null when the page has none.
export function wanted(site, declared) {
  const d = typeof declared === "string" ? declared.trim() : "";
  if (d && d.length <= DECLARED_MAX) return { selector: d, from: "page" };
  if (site.expect) return { selector: site.expect, from: "sites.js" };
  return null;
}

// One site's verdict from what the browser saw. A site fails when a visitor would see it broken: no page (status
// not 200 or the load timed out), an uncaught script error, no house bar (its scripts didn't run) or, where the site
// has a map, no map. Console errors and failed requests are kept as evidence but don't fail it on their own: three
// sites log a harmless 404 today (17 Nov 2026), and a check that is always red gets ignored.
export function judge(site, seen) {
  const problems = [];
  const want = seen.wanted || wanted(site, null);
  if (seen.error) problems.push(`did not load: ${seen.error}`);
  else if (seen.status !== 200) problems.push(`HTTP ${seen.status}`);
  if (!seen.error) {
    if (seen.page_errors && seen.page_errors.length) problems.push(`script error: ${seen.page_errors[0]}`);
    if (site.house !== false && seen.probe && !seen.probe.house_bar) problems.push("house bar missing (its scripts may not have run)");
    if (want && seen.probe && seen.probe.expect_invalid) problems.push(`data-sitecheck is not a valid selector: ${clip(want.selector)}`);
    else if (want && seen.probe && !seen.probe.expect) problems.push(`no ${want.selector} (the map or chart did not draw${want.from === "page" ? "; the page's own data-sitecheck" : ""})`);
  }
  return {
    id: site.id,
    url: site.url,
    group: site.group === "other" ? "other" : "suite",
    ok: problems.length === 0,
    problems,
    expect_from: want ? want.from : null,
    status: seen.status ?? null,
    ms: seen.ms ?? null,
    load_ms: seen.probe ? seen.probe.load_ms : null,
    title: seen.probe ? seen.probe.title : null,
    map: seen.probe ? seen.probe.map : null,
    console_errors: (seen.console_errors || []).slice(0, 5),
    failed_requests: (seen.failed_requests || []).slice(0, 5),
  };
}

// The run's record: what is stored in KV and served at /. results holds the hub and the suite programs;
// other_work (tic-sitecheck/1.1, 24 Nov 2026) holds the other pages on the domain. The counts and failed cover both.
export function summarize(results, startedAt, finishedAt) {
  const failed = results.filter((r) => !r.ok);
  return {
    contract: "tic-sitecheck/1.1",
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    sites: results.length,
    ok: results.length - failed.length,
    failed: failed.map((r) => r.id),
    results: results.filter((r) => r.group !== "other"),
    other_work: results.filter((r) => r.group === "other"),
  };
}

// Ping Healthchecks.io: the check's address when every site passed, /fail with the failures otherwise. The address
// is a secret, so it is never logged. A failed ping never fails the run.
export async function report(url, run, fetcher) {
  if (!url) return;
  const ok = run.failed.length === 0;
  const lines = [...run.results, ...(run.other_work || [])].filter((r) => !r.ok).map((r) => `${r.id} ${r.url}: ${r.problems.join("; ")}`);
  const body = ok
    ? `${run.finished_at} all ${run.sites} sites passed`
    : `${run.finished_at} ${run.failed.length} of ${run.sites} sites failed:\n${lines.join("\n")}`;
  try {
    await fetcher(ok ? url : `${url.replace(/\/+$/, "")}/fail`, { method: "POST", body, headers: { "User-Agent": "tic-sitecheck" } });
  } catch (e) {
    console.log(`Healthchecks ping failed: ${e && e.message}`);
  }
}

// Short, single-line evidence: no query strings (a request URL can carry a key a site passes to a data provider).
export function clip(text, n = 160) {
  return String(text).replace(/\?[^\s)"']*/g, "?…").replace(/\s+/g, " ").slice(0, n);
}
