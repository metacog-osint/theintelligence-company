// Run with `node --test` in dispatch/. No network: fetch is replaced by a recorder.
import { test } from "node:test";
import assert from "node:assert/strict";
import { JOBS, due, run, dispatch } from "./dispatch.js";

const at = (min, hour = 3) => new Date(Date.UTC(2026, 10, 6, hour, min));

function recorder(status = 204, body = null) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, init });
    return {
      status,
      json: async () => {
        if (body === null) throw new Error("no body");
        return body;
      },
    };
  };
  return { calls, fetcher };
}

test("every job's minutes are whole 5-minute slots inside the hour", () => {
  for (const j of JOBS) {
    assert.ok(j.minutes.length > 0, j.repo);
    for (const m of j.minutes) assert.ok(Number.isInteger(m) && m >= 0 && m < 60 && m % 5 === 0, `${j.repo} ${m}`);
  }
});

test("every job's hours, when given, are UTC hours 0-23", () => {
  for (const j of JOBS.filter((j) => j.hours)) {
    assert.ok(j.hours.length > 0, j.repo);
    for (const h of j.hours) assert.ok(Number.isInteger(h) && h >= 0 && h < 24, `${j.repo} ${h}`);
  }
});

test("Elements and Cordon each run twice an hour, never in the same slot", () => {
  const slots = (repo) => JOBS.find((j) => j.repo === repo).minutes;
  assert.deepEqual(slots("metacog-osint/elements"), [5, 35]);
  assert.deepEqual(slots("metacog-osint/cordon"), [10, 40]);
});

test("COP runs every two hours, at :20 on even UTC hours", () => {
  const cop = JOBS.find((j) => j.repo === "metacog-osint/cop");
  assert.equal(cop.workflow, "build.yml");
  assert.deepEqual(cop.minutes, [20]);
  assert.deepEqual(cop.hours, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);
});

test("COP's watchdog runs every three hours at :00, apart from COP's build", () => {
  const watch = JOBS.find((j) => j.repo === "metacog-osint/cop" && j.workflow === "watch.yml");
  assert.deepEqual(watch.minutes, [0]);
  assert.deepEqual(watch.hours, [1, 4, 7, 10, 13, 16, 19, 22]);
  assert.deepEqual(due(JOBS, at(0, 4)).map((j) => `${j.repo} ${j.workflow}`), ["metacog-osint/cop watch.yml"]);
  assert.deepEqual(due(JOBS, at(0, 6)).map((j) => j.repo), []);
  assert.deepEqual(due(JOBS, at(20, 4)).map((j) => j.workflow), ["build.yml"]);
});

test("Vis runs twice a day, at 08:25 and 20:25 UTC", () => {
  const vis = JOBS.find((j) => j.repo === "metacog-osint/vis");
  assert.equal(vis.workflow, "build.yml");
  assert.deepEqual(vis.minutes, [25]);
  assert.deepEqual(vis.hours, [8, 20]);
  assert.deepEqual(due(JOBS, at(25, 8)).map((j) => j.repo), ["metacog-osint/vis"]);
  assert.ok(!due(JOBS, at(25, 9)).some((j) => j.repo === "metacog-osint/vis"));
});

test("Headwind runs every six hours, at :50 past 03, 09, 15 and 21 UTC", () => {
  const hw = JOBS.find((j) => j.repo === "metacog-osint/headwind");
  assert.equal(hw.workflow, "update.yml");
  assert.equal(hw.ref, "main");
  assert.deepEqual(hw.minutes, [50]);
  assert.deepEqual(hw.hours, [3, 9, 15, 21]);
  assert.deepEqual(due(JOBS, at(50, 9)).map((j) => j.repo), ["metacog-osint/headwind"]);
  assert.deepEqual(due(JOBS, at(50, 14)).map((j) => j.repo), []);   // 10:50 is Noisefloor's since 15 Nov
});

test("Orbit runs every six hours, at :55 past 00, 06, 12 and 18 UTC", () => {
  const ob = JOBS.find((j) => j.repo === "metacog-osint/orbit");
  assert.equal(ob.workflow, "update.yml");
  assert.equal(ob.ref, "main");
  assert.deepEqual(ob.minutes, [55]);
  assert.deepEqual(ob.hours, [0, 6, 12, 18]);
  assert.deepEqual(due(JOBS, at(55, 6)).map((j) => j.repo), ["metacog-osint/orbit"]);
  assert.deepEqual(due(JOBS, at(55, 7)).map((j) => j.repo), []);
});

test("Orbit's launch ledger starts once every UTC hour, at :45, or :55 in Blackout's hours", () => {
  const lg = JOBS.filter((j) => j.repo === "metacog-osint/orbit" && j.workflow === "ledger.yml");
  for (let h = 0; h < 24; h++) {
    const starts = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].filter((m) =>
      due(lg, at(m, h)).length > 0);
    assert.deepEqual(starts, [1, 5, 9, 13, 17, 21].includes(h) ? [55] : [45], `hour ${h}`);
  }
  assert.ok(lg.every((j) => j.ref === "main"));
  assert.deepEqual(due(JOBS, at(45, 3)).map((j) => j.workflow), ["ledger.yml"]);
});

test("no two jobs ever start in the same 5-minute slot", () => {
  const seen = new Set();
  for (const j of JOBS) {
    for (const h of j.hours || [...Array(24).keys()]) {
      for (const m of j.minutes) {
        const slot = `${h}:${m}`;
        assert.ok(!seen.has(slot), `${j.repo} shares ${slot}`);
        seen.add(slot);
      }
    }
  }
});

test("due picks only the jobs for this minute", () => {
  assert.deepEqual(due(JOBS, at(5)).map((j) => j.repo), ["metacog-osint/elements"]);
  assert.deepEqual(due(JOBS, at(40)).map((j) => j.repo), ["metacog-osint/cordon"]);
  assert.deepEqual(due(JOBS, at(0)), []);
  assert.deepEqual(due(JOBS, at(15, 9)), []);   // 03:15 is Orbit's GEO region since 16 Nov
});

test("Orbit's GEO region starts at 03:15 and 15:15 UTC, over two hours from Orbit's update runs", () => {
  const geo = JOBS.filter((j) => j.workflow === "geo.yml");
  assert.equal(geo.length, 1);
  assert.equal(geo[0].repo, "metacog-osint/orbit");
  assert.equal(geo[0].ref, "main");
  assert.deepEqual(due(JOBS, at(15, 3)).map((j) => j.workflow), ["geo.yml"]);
  assert.deepEqual(due(JOBS, at(15, 15)).map((j) => j.workflow), ["geo.yml"]);
  const up = JOBS.find((j) => j.repo === "metacog-osint/orbit" && j.workflow === "update.yml");
  for (const gh of geo[0].hours) {
    for (const uh of up.hours) {
      const gap = Math.abs((gh * 60 + geo[0].minutes[0]) - (uh * 60 + up.minutes[0]));
      assert.ok(Math.min(gap, 1440 - gap) > 120, `geo ${gh}h vs update ${uh}h`);
    }
  }
});

test("due respects a job's hours", () => {
  assert.deepEqual(due(JOBS, at(20, 4)).map((j) => j.repo), ["metacog-osint/cop"]);
  assert.deepEqual(due(JOBS, at(20, 0)).map((j) => j.repo), ["metacog-osint/cop"]);
  assert.deepEqual(due(JOBS, at(20, 3)), []);
  assert.deepEqual(due(JOBS, at(20, 23)), []);
  // A job without hours still runs every hour.
  assert.deepEqual(due(JOBS, at(5, 23)).map((j) => j.repo), ["metacog-osint/elements"]);
});

test("COP is dispatched to its build workflow on main", async () => {
  const { calls, fetcher } = recorder(204);
  assert.deepEqual(await run({ DISPATCH_TOKEN: "t" }, at(20, 14), JOBS, fetcher), ["metacog-osint/cop"]);
  assert.equal(calls[0].url, "https://api.github.com/repos/metacog-osint/cop/actions/workflows/build.yml/dispatches");
  assert.deepEqual(JSON.parse(calls[0].init.body), { ref: "main" });
});

test("a minute with nothing due makes no request, even without a token", async () => {
  const { calls, fetcher } = recorder();
  assert.deepEqual(await run({}, at(20), JOBS, fetcher), []);
  assert.equal(calls.length, 0);
});

test("a due minute without the token fails loudly", async () => {
  const { calls, fetcher } = recorder();
  await assert.rejects(run({}, at(5), JOBS, fetcher), /DISPATCH_TOKEN is not set/);
  assert.equal(calls.length, 0);
});

test("dispatch posts to the workflow's dispatches endpoint with the ref", async () => {
  const { calls, fetcher } = recorder(204);
  const started = await run({ DISPATCH_TOKEN: "t0ken" }, at(35), JOBS, fetcher);
  assert.deepEqual(started, ["metacog-osint/elements"]);
  assert.equal(calls.length, 1);
  const { url, init } = calls[0];
  assert.equal(url, "https://api.github.com/repos/metacog-osint/elements/actions/workflows/update.yml/dispatches");
  assert.equal(init.method, "POST");
  assert.equal(init.headers.Authorization, "Bearer t0ken");
  assert.equal(init.headers.Accept, "application/vnd.github+json");
  assert.equal(init.headers["User-Agent"], "tic-dispatch");
  assert.deepEqual(JSON.parse(init.body), { ref: "main" });
});

test("a 200 with run details also counts as started", async () => {
  const { fetcher } = recorder(200, { workflow_run_id: 1 });
  await dispatch("t", JOBS[0], fetcher);
});

test("GitHub's error message is reported, the token never is", async () => {
  const { fetcher } = recorder(401, { message: "Bad credentials" });
  await assert.rejects(run({ DISPATCH_TOKEN: "s3cret" }, at(10), JOBS, fetcher), (e) => {
    assert.match(e.message, /metacog-osint\/cordon update\.yml: HTTP 401 \(Bad credentials\)/);
    assert.doesNotMatch(e.message, /s3cret/);
    return true;
  });
});

test("an error without a JSON body still names the status", async () => {
  const { fetcher } = recorder(502, null);
  await assert.rejects(dispatch("t", JOBS[0], fetcher), /^Error: HTTP 502$/);
});

test("one failing job doesn't stop another due at the same minute", async () => {
  const jobs = [
    { repo: "o/a", workflow: "x.yml", ref: "main", minutes: [5] },
    { repo: "o/b", workflow: "y.yml", ref: "main", minutes: [5] },
  ];
  const calls = [];
  const fetcher = async (url) => {
    calls.push(url);
    return { status: url.includes("/o/a/") ? 404 : 204, json: async () => ({ message: "Not Found" }) };
  };
  await assert.rejects(run({ DISPATCH_TOKEN: "t" }, at(5), jobs, fetcher), /o\/a x\.yml: HTTP 404 \(Not Found\)/);
  assert.equal(calls.length, 2);
});

test("Launch runs every six hours, at :15 past 01, 07, 13 and 19 UTC, after Orbit", () => {
  const la = JOBS.find((j) => j.repo === "metacog-osint/launch");
  assert.equal(la.workflow, "update.yml");
  assert.equal(la.ref, "main");
  assert.deepEqual(la.minutes, [15]);
  assert.deepEqual(la.hours, [1, 7, 13, 19]);
  assert.deepEqual(due(JOBS, at(15, 7)).map((j) => j.repo), ["metacog-osint/launch"]);
  assert.ok(!due(JOBS, at(15, 8)).some((j) => j.repo === "metacog-osint/launch"));
});

test("Noisefloor's COSMIC-2 day job runs at :50 from 04 to 13 UTC, except Headwind's 09:50", () => {
  const nf = JOBS.find((j) => j.repo === "metacog-osint/noise-floor");
  assert.equal(nf.workflow, "cosmic2.yml");
  assert.equal(nf.ref, "main");
  assert.deepEqual(nf.minutes, [50]);
  assert.deepEqual(nf.hours, [4, 5, 6, 7, 8, 10, 11, 12, 13]);
  assert.deepEqual(due(JOBS, at(50, 4)).map((j) => j.repo), ["metacog-osint/noise-floor"]);
  assert.deepEqual(due(JOBS, at(50, 9)).map((j) => j.repo), ["metacog-osint/headwind"]);
  assert.deepEqual(due(JOBS, at(50, 14)).map((j) => j.repo), []);
});

test("Relief runs every six hours, at :00 past 02, 08, 14 and 20 UTC", () => {
  const r = JOBS.find((j) => j.repo === "metacog-osint/relief");
  assert.equal(r.workflow, "update.yml");
  assert.equal(r.ref, "main");
  assert.deepEqual(r.minutes, [0]);
  assert.deepEqual(r.hours, [2, 8, 14, 20]);
  assert.deepEqual(due(JOBS, at(0, 8)).map((j) => j.repo), ["metacog-osint/relief"]);
  assert.deepEqual(due(JOBS, at(0, 9)).map((j) => j.repo), []);
});

test("Noisefloor's ground ROTI day job runs at :30 from 09 to 13 UTC and at 16:30 and 22:30", () => {
  const gr = JOBS.find((j) => j.repo === "metacog-osint/noise-floor" && j.workflow === "ground-roti.yml");
  assert.equal(gr.ref, "main");
  assert.deepEqual(gr.minutes, [30]);
  assert.deepEqual(gr.hours, [9, 10, 11, 12, 13, 16, 22]);
  assert.deepEqual(due(JOBS, at(30, 9)).map((j) => j.workflow), ["ground-roti.yml"]);
  assert.deepEqual(due(JOBS, at(30, 8)).map((j) => j.repo), ["metacog-osint/undertow"]);
  assert.deepEqual(due(JOBS, at(30, 15)).map((j) => j.repo), []);
});

test("Noisefloor's ADS-B day job runs at :25 from 04 to 07 UTC", () => {
  const dj = JOBS.find((j) => j.repo === "metacog-osint/noise-floor" && j.workflow === "daily.yml");
  assert.equal(dj.ref, "main");
  assert.deepEqual(dj.minutes, [25]);
  assert.deepEqual(dj.hours, [4, 5, 6, 7]);
  assert.deepEqual(due(JOBS, at(25, 4)).map((j) => j.workflow), ["daily.yml"]);
  assert.ok(!due(JOBS, at(25, 8)).some((j) => j.workflow === "daily.yml"));
});

test("Verdict's calendar sync starts at 13:20 UTC and its due check at 14:15", () => {
  const sync = JOBS.find((j) => j.repo === "metacog-osint/verdict" && j.workflow === "calendar-sync.yml");
  const dueJob = JOBS.find((j) => j.repo === "metacog-osint/verdict" && j.workflow === "due.yml");
  assert.deepEqual([sync.ref, sync.minutes, sync.hours], ["main", [20], [13]]);
  assert.deepEqual([dueJob.ref, dueJob.minutes, dueJob.hours], ["main", [15], [14]]);
  assert.deepEqual(due(JOBS, at(20, 13)).map((j) => j.workflow), ["calendar-sync.yml"]);
  assert.deepEqual(due(JOBS, at(15, 14)).map((j) => j.workflow), ["due.yml"]);
});

test("the ESA ionosphere capture starts once every UTC hour, in a slot no other job has", () => {
  const ism = JOBS.filter((j) => j.repo === "metacog-osint/noise-floor-data");
  assert.ok(ism.every((j) => j.workflow === "ism-hourly.yml" && j.ref === "main"));
  const odd = { 4: 15, 5: 15, 6: 15, 7: 30, 8: 15, 20: 15 };
  for (let h = 0; h < 24; h++) {
    const starts = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].filter((m) => due(ism, at(m, h)).length > 0);
    assert.deepEqual(starts, [odd[h] ?? 25], `hour ${h}`);
  }
});
