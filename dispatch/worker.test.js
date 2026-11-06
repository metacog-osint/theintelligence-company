// Run with `node --test` in dispatch/. No network: fetch is replaced by a recorder.
import { test } from "node:test";
import assert from "node:assert/strict";
import { JOBS, due, run, dispatch } from "./worker.js";

const at = (min) => new Date(Date.UTC(2026, 10, 6, 3, min));

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

test("Elements and Cordon each run twice an hour, never in the same slot", () => {
  const slots = (repo) => JOBS.find((j) => j.repo === repo).minutes;
  assert.deepEqual(slots("metacog-osint/elements"), [5, 35]);
  assert.deepEqual(slots("metacog-osint/cordon"), [10, 40]);
  const all = JOBS.flatMap((j) => j.minutes);
  assert.equal(new Set(all).size, all.length);
});

test("due picks only the jobs for this minute", () => {
  assert.deepEqual(due(JOBS, at(5)).map((j) => j.repo), ["metacog-osint/elements"]);
  assert.deepEqual(due(JOBS, at(40)).map((j) => j.repo), ["metacog-osint/cordon"]);
  assert.deepEqual(due(JOBS, at(0)), []);
  assert.deepEqual(due(JOBS, at(15)), []);
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
