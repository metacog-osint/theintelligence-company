// The dispatch logic for tic-dispatch (worker.js is the Cloudflare entry point). Plain JavaScript with no Cloudflare
// imports, so `node --test` can run it.
//
// GitHub starts scheduled runs on this account only every 4 to 9 hours, whatever the cron says (measured on eight
// repos, 4-5 Nov 2026). So tic-dispatch starts each workflow in JOBS itself, through GitHub's workflow_dispatch API.
//
// The clock: tic-dispatch's own cron, every 5 minutes, since 14 Nov 2026. From 5 to 14 Nov it borrowed PropertyCast's
// trigger Worker's clock through a service binding, because the free plan's 5 cron triggers were all in use. The
// account is on Workers Paid since 17 Nov 2026 (250 cron triggers, scheduled runs up to 15 minutes).
//
// To add a workflow: give it a `workflow_dispatch:` trigger, add a line to JOBS, add its repo to the token's
// repository access, and push. Minutes are UTC and must be multiples of 5, the clock's step. `hours` is optional:
// without it a job runs every hour; with it, only in those UTC hours.

const EVEN_HOURS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

export const JOBS = [
  // Every 30 minutes, five minutes apart so the two don't start together.
  { repo: "metacog-osint/elements", workflow: "update.yml", ref: "main", minutes: [5, 35] },
  { repo: "metacog-osint/cordon", workflow: "update.yml", ref: "main", minutes: [10, 40] },
  // COP every two hours. Its own "every two hours" cron fired only every 7 to 14 hours (5-6 Nov 2026). COP's repo is
  // private, so each run spends Actions minutes: 12 runs a day is about 600 of the free 2,000 a month.
  { repo: "metacog-osint/cop", workflow: "build.yml", ref: "main", minutes: [20], hours: EVEN_HOURS },
  // Vis twice a day, after the 00Z and 12Z ensembles reach Open-Meteo (8 Nov 2026). Its own cron (08:53 and 20:53)
  // is the fallback; its gate skips a scheduled run within 6 hours of a successful build.
  { repo: "metacog-osint/vis", workflow: "build.yml", ref: "main", minutes: [25], hours: [8, 20] },
  // Blackout every four hours (12 Nov 2026). Private repo: 6 one-job runs a day is about 180 Actions minutes a month.
  // Its own cron (every 6 h) is the fallback.
  { repo: "metacog-osint/blackout", workflow: "update.yml", ref: "main", minutes: [45], hours: [1, 5, 9, 13, 17, 21] },
  // Headwind every six hours (13 Nov 2026): its sources change daily at most. Private repo: 4 one-job runs a day.
  // Its own cron (every 6 h) is the fallback.
  { repo: "metacog-osint/headwind", workflow: "update.yml", ref: "main", minutes: [50], hours: [3, 9, 15, 21] },
  // Orbit every six hours (13 Nov 2026). GCAT republishes about once a day at no fixed time (headers seen 00:21 and
  // 10:18 UTC), so a run reads an update within six hours. Its own cron (:41 every 6 h) is the fallback.
  { repo: "metacog-osint/orbit", workflow: "update.yml", ref: "main", minutes: [55], hours: [0, 6, 12, 18] },
  // Orbit's launch ledger every hour (16 Nov 2026, Tom's "yes, build it"): one Launch Library 2 pull of 14 launches
  // (free limit 15 requests an hour), published on Orbit's public release `ledger`. :45 every hour but Blackout's
  // (01, 05, 09, 13, 17, 21 UTC), where it starts at :55. Public repo, so its minutes are free. Its own cron is the
  // fallback.
  { repo: "metacog-osint/orbit", workflow: "ledger.yml", ref: "main", minutes: [45],
    hours: [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15, 16, 18, 19, 20, 22, 23] },
  { repo: "metacog-osint/orbit", workflow: "ledger.yml", ref: "main", minutes: [55], hours: [1, 5, 9, 13, 17, 21] },
  // Orbit's GEO region twice a day (16 Nov 2026, GEO move step 2): one Space-Track gp query for every object near
  // GEO, on the account Orbit's update run and Noisefloor's daily run also use (gp at most once an hour). 03:15 and
  // 15:15 UTC sit over two hours from Orbit's update starts (:55 past 00, 06, 12, 18), and geo.yml skips while
  // either of the others made a gp query within the hour, or when today's file was pulled under an hour ago, so its
  // own cron (03:17, 15:17) ends in about a minute after a dispatched run. Public repo, so its minutes are free.
  { repo: "metacog-osint/orbit", workflow: "geo.yml", ref: "main", minutes: [15], hours: [3, 15] },
  // Launch every six hours (14 Nov 2026), 20 minutes after Orbit starts, since it reads Orbit's published snapshot.
  // Private repo: 4 short one-job runs a day. Its own cron (:11 every 6 h) is the fallback.
  { repo: "metacog-osint/launch", workflow: "update.yml", ref: "main", minutes: [15], hours: [1, 7, 13, 19] },
  // Undertow every six hours (14 Nov 2026): its publishers disclose monthly to yearly, so four runs a day is plenty.
  // Private repo: 4 one-job runs of under a minute a day. Its own cron (:41 every 6 h) is the fallback.
  { repo: "metacog-osint/undertow", workflow: "update.yml", ref: "main", minutes: [30], hours: [2, 8, 14, 20] },
  // Relief every six hours (15 Nov 2026): IFRC GO appeals and WHO Disease Outbreak News change daily at most. Public repo,
  // so its minutes are free. :00 at 02, 08, 14 and 20 UTC shares no slot with the others. Its own cron is the fallback.
  { repo: "metacog-osint/relief", workflow: "update.yml", ref: "main", minutes: [0], hours: [2, 8, 14, 20] },
  // COP's suite watchdog every three hours (14 Nov 2026): it fails, and GitHub mails the owner, when COP's build or
  // a program has stopped. On its own cron it would fire only every 7 to 14 hours. Private repo: 8 runs a day of
  // well under a minute is about 240 Actions minutes a month. It reads the public snapshot, so it is kept off COP's
  // build slot (:20) and sits 40 minutes after it on the hours they share.
  { repo: "metacog-osint/cop", workflow: "watch.yml", ref: "main", minutes: [0], hours: [1, 4, 7, 10, 13, 16, 19, 22] },
  // Noisefloor's COSMIC-2 day job (15 Nov 2026, Tom's yes): UCAR posts the day's archive at about 04:35 UTC and the
  // day's limb S4 file is due by 14:00 UTC, so :50 from 04 to 13 UTC, skipping 09:50 (Headwind's slot). Public repo,
  // so its minutes are free. Its own crons are the fallback; its gate skips a day already published, so extra starts
  // end in about a minute.
  { repo: "metacog-osint/noise-floor", workflow: "cosmic2.yml", ref: "main", minutes: [50], hours: [4, 5, 6, 7, 8, 10, 11, 12, 13] },
  // Noisefloor's ground ROTI day job: BKG lists most IGS station files for day D by about 09:10 UTC on D+1 (one batch
  // came at 12:45 on 14 Nov 2026) and the day file is due by 14:00 UTC. From 09:00 the job publishes what is in, and a
  // later start remakes a day when a missing station turns up, so :30 from 09 to 13 UTC, then 16:30 and 22:30 for
  // stations that post a day or two late. Public repo, so its minutes are free. Its own crons are the fallback; its
  // gate ends a start in about a minute when nothing new is posted.
  { repo: "metacog-osint/noise-floor", workflow: "ground-roti.yml", ref: "main", minutes: [30], hours: [9, 10, 11, 12, 13, 16, 22] },
  // Noisefloor's ADS-B day job (17 Nov 2026, Tom's yes): adsb.lol posts day D at about 03:30 UTC on D+1, and GitHub's own
  // crons (05:40, 12:40) fired at 12-14 UTC, so the day landed at 12:02-14:28 UTC on 1-16 Nov. :25 from 04 to 07
  // UTC (no minute is free in all of 04-09; 08:25 is Vis's) lands it in the early morning; a start with no new day
  // exits in a few minutes. Its CelesTrak and Space-Track steps run only on its own crons, so these hourly starts
  // don't repeat them. Public repo, so its minutes are free.
  { repo: "metacog-osint/noise-floor", workflow: "daily.yml", ref: "main", minutes: [25], hours: [4, 5, 6, 7] },  // Verdict's two daily jobs (17 Nov 2026). Its own crons (13:40, 14:15 UTC) fired 18:28 to 23:26 UTC on 8-16 Nov, so
  // the "forecasts due" reminder meant for 8:15 AM CST arrived mid-afternoon. The calendar sync goes first, at 13:20
  // (after Cordon's 13:10 run), the due check 55 minutes later. Public repo, so free. Each has a gate job that skips a
  // scheduled run within 12 hours of a successful one (Verdict 7210d45).
  { repo: "metacog-osint/verdict", workflow: "calendar-sync.yml", ref: "main", minutes: [20], hours: [13] },
  { repo: "metacog-osint/verdict", workflow: "due.yml", ref: "main", minutes: [15], hours: [14] },
  // The ESA ionosphere nowcast capture, once an hour (17 Nov 2026). ESA keeps only the current nowcast, and the GitHub
  // cron's gaps of 6 to 10 hours (15-17 Nov) lost the hours between; the PC task that also captures it runs only
  // while the PC is on. :25 every hour but 04-07 (Noisefloor's ADS-B day job) and 08 and 20 (Vis): :15 at 04, 05, 06,
  // 08 and 20, :30 at 07. The script skips an hour it already holds, so a repeat start ends in under a minute and
  // needs no gate. Public repo, so its minutes are free. Its own cron (:11, :41) is the fallback.
  { repo: "metacog-osint/noise-floor-data", workflow: "ism-hourly.yml", ref: "main", minutes: [25],
    hours: [0, 1, 2, 3, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23] },
  { repo: "metacog-osint/noise-floor-data", workflow: "ism-hourly.yml", ref: "main", minutes: [15], hours: [4, 5, 6, 8, 20] },
  { repo: "metacog-osint/noise-floor-data", workflow: "ism-hourly.yml", ref: "main", minutes: [30], hours: [7] },
];

// The jobs due at this minute. The caller passes the cron's slot time, not when it woke, so a late start still
// matches.
export function due(jobs, when) {
  const m = when.getUTCMinutes();
  const h = when.getUTCHours();
  return jobs.filter((j) => j.minutes.includes(m) && (!j.hours || j.hours.includes(h)));
}

// Waits before the second and third tries of a start that failed in a way that can pass: GitHub busy (5xx), rate
// limited (429) or the network. Scheduled runs may take up to 15 minutes on Workers Paid (17 Nov 2026), so a minute's
// wait is safe. A refusal that names a setup fault (401 bad token, 404 no such workflow or no access, 422 no
// workflow_dispatch trigger) is not retried: the same request would fail the same way.
export const RETRY_DELAYS_MS = [15_000, 60_000];

const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Start every due job, then report the tick to Healthchecks.io when HC_PING_URL is set. One failure doesn't stop the
// others; any failure is thrown at the end, so it shows as an error in tic-dispatch's metrics and logs.
//
// The report: every tick pings the check, with or without jobs due, so the check also goes red when the clock itself
// stops (a dead-man). A tick where a start failed after its retries pings /fail with the failures, so Healthchecks
// emails Tom at once rather than nothing at all (the 15 Nov suite review: Vis's starts failed for four days unseen).
// A failed ping never fails the tick.
export async function run(env, when, jobs = JOBS, fetcher = (...a) => fetch(...a), { sleep = sleepMs, delays = RETRY_DELAYS_MS } = {}) {
  const list = due(jobs, when);
  const failed = [];
  if (list.length) {
    if (!env.DISPATCH_TOKEN) {
      failed.push("DISPATCH_TOKEN is not set");
    } else {
      const results = await Promise.allSettled(list.map((j) => withRetries(() => dispatch(env.DISPATCH_TOKEN, j, fetcher), sleep, delays)));
      results.forEach((r, i) => {
        const name = `${list[i].repo} ${list[i].workflow}`;
        if (r.status === "fulfilled") console.log(`started ${name}${r.value > 1 ? ` (try ${r.value})` : ""}`);
        else failed.push(`${name}: ${r.reason && r.reason.message}`);
      });
    }
  }
  await report(env.HC_PING_URL, when, list.length, failed, fetcher);
  if (failed.length) throw new Error(failed.join("; "));
  return list.map((j) => j.repo);
}

// Try fn, then once after each delay while the error is retryable. Resolves with the try that worked (1, 2 or 3).
export async function withRetries(fn, sleep = sleepMs, delays = RETRY_DELAYS_MS) {
  for (let tryNo = 1; ; tryNo++) {
    try {
      await fn();
      return tryNo;
    } catch (e) {
      if (!e.retryable || tryNo > delays.length) {
        if (tryNo > 1) e.message += ` (after ${tryNo} tries)`;
        throw e;
      }
      await sleep(delays[tryNo - 1]);
    }
  }
}

// Ping Healthchecks.io: the check's address on success, /fail with the failures in the body otherwise. The address is
// a secret (it lets anyone ping the check), so it is never logged.
export async function report(url, when, due, failed, fetcher) {
  if (!url) return;
  const ok = !failed.length;
  const body = ok
    ? `${when.toISOString()} ${due} due, all started`
    : `${when.toISOString()} ${failed.length} of ${due} failed to start:\n${failed.join("\n")}`;
  try {
    await fetcher(ok ? url : `${url.replace(/\/+$/, "")}/fail`, { method: "POST", body, headers: { "User-Agent": "tic-dispatch" } });
  } catch (e) {
    console.log(`Healthchecks ping failed: ${e && e.message}`);
  }
}

export async function dispatch(token, job, fetcher) {
  const r = await fetcher(`https://api.github.com/repos/${job.repo}/actions/workflows/${job.workflow}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "tic-dispatch",
    },
    body: JSON.stringify({ ref: job.ref }),
  });
  // 204 is the usual answer; 200 if GitHub returns the run's details.
  if (r.status === 204 || r.status === 200) return;
  // GitHub's error message says what's wrong ("Bad credentials", no workflow_dispatch trigger) and never echoes the
  // token.
  let why = "";
  try {
    why = String((await r.json()).message || "").slice(0, 160);
  } catch {
    // no JSON body
  }
  const e = new Error(`HTTP ${r.status}${why ? ` (${why})` : ""}`);
  e.retryable = r.status === 429 || r.status >= 500;
  throw e;
}
