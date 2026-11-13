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

test("Vis runs twice a day, at 08:25 and 20:25 UTC", () => {
  const vis = JOBS.find((j) => j.repo === "metacog-osint/vis");
  assert.equal(vis.workflow, "build.yml");
  assert.deepEqual(vis.minutes, [25]);
  assert.deepEqual(vis.hours, [8, 20]);
  assert.deepEqual(due(JOBS, at(25, 8)).map((j) => j.repo), ["metacog-osint/vis"]);
  assert.deepEqual(due(JOBS, at(25, 9)).map((j) => j.repo), []);
});

test("Headwind runs every six hours, at :50 past 03, 09, 15 and 21 UTC", () => {
  const hw = JOBS.find((j) => j.repo === "metacog-osint/headwind");
  assert.equal(hw.workflow, "update.yml");
  assert.equal(hw.ref, "main");
  assert.deepEqual(hw.minutes, [50]);
  assert.deepEqual(hw.hours, [3, 9, 15, 21]);
  assert.deepEqual(due(JOBS, at(50, 9)).map((j) => j.repo), ["metacog-osint/headwind"]);
  assert.deepEqual(due(JOBS, at(50, 10)).map((j) => j.repo), []);
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
  assert.deepEqual(due(JOBS, at(15)), []);
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
