// The dispatch logic for tic-dispatch (worker.js is the Cloudflare entry point). Plain JavaScript with no Cloudflare
// imports, so `node --test` can run it.
//
// GitHub starts scheduled runs on this account only every 4 to 9 hours, whatever the cron says (measured on eight
// repos, 4-5 Nov 2026). So tic-dispatch starts each workflow in JOBS itself, through GitHub's workflow_dispatch API.
//
// The clock: the free plan's 5 cron triggers are all in use (PropertyCast 1, Vigil 4), so tic-dispatch has none of
// its own. PropertyCast's trigger Worker, which wakes every 5 minutes and has kept time since October 2026, calls
// tick() on each wake through a service binding (DISPATCH).
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
];

// The jobs due at this minute. The caller passes the cron's slot time, not when it woke, so a late start still
// matches.
export function due(jobs, when) {
  const m = when.getUTCMinutes();
  const h = when.getUTCHours();
  return jobs.filter((j) => j.minutes.includes(m) && (!j.hours || j.hours.includes(h)));
}

// Start every due job. One failure doesn't stop the others; any failure is thrown at the end, so it shows as an
// error in tic-dispatch's metrics and logs.
export async function run(env, when, jobs = JOBS, fetcher = (...a) => fetch(...a)) {
  const list = due(jobs, when);
  if (!list.length) return [];
  if (!env.DISPATCH_TOKEN) throw new Error("DISPATCH_TOKEN is not set");
  const results = await Promise.allSettled(list.map((j) => dispatch(env.DISPATCH_TOKEN, j, fetcher)));
  const failed = [];
  results.forEach((r, i) => {
    const name = `${list[i].repo} ${list[i].workflow}`;
    if (r.status === "fulfilled") console.log(`started ${name}`);
    else failed.push(`${name}: ${r.reason && r.reason.message}`);
  });
  if (failed.length) throw new Error(failed.join("; "));
  return list.map((j) => j.repo);
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
  throw new Error(`HTTP ${r.status}${why ? ` (${why})` : ""}`);
}
