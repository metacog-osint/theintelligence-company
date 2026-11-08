// The field-report Worker against a real SQLite database (Node's built-in node:sqlite) behind a small D1 stand-in.
// `node --test test/` from veterans-day/worker. No network, no Cloudflare account.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker, { validReport, validTip, corsHeaders, LIMITS } from "../src/index.js";

const SCHEMA = readFileSync(new URL("../migrations/0001_init.sql", import.meta.url), "utf8");
const ORIGIN = "https://theintelligence.company";

function d1() {
  const db = new DatabaseSync(":memory:");
  db.exec(SCHEMA);
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => { db.prepare(sql).run(...args); return { success: true }; },
  });
  return { db, DB: { prepare: (sql) => stmt(sql), batch: async (list) => { for (const s of list) await s.run(); return []; } } };
}
function req(path, { method = "GET", body, ip = "203.0.113.7", origin = ORIGIN } = {}) {
  return new Request("https://vetday.example.workers.dev" + path, {
    method, body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json", Origin: origin, "CF-Connecting-IP": ip },
  });
}

test("reports are validated: ids, kinds, line minutes and value caps", () => {
  assert.equal(validReport({ p: "p-12", o: "texas-roadhouse", k: "worked", v: 18 }).v, 18);
  assert.equal(validReport({ p: "p-12", o: "x", k: "worked", v: 5000 }).v, 100);
  assert.equal(validReport({ p: "p-12", o: "x", k: "line", m: 25 }).m, 25);
  assert.equal(validReport({ p: "p-12", o: "x", k: "line", m: 999 }), null);
  assert.equal(validReport({ p: "P 12", o: "x", k: "worked" }), null);
  assert.equal(validReport({ p: "p-12", o: "x", k: "hacked" }), null);
  assert.equal(validReport(null), null);
});

test("tips are trimmed, need a name and an offer, and drop non-web links", () => {
  const t = validTip({ name: " Joe's \u0007Diner ", offer: "free pie", source: "javascript:alert(1)" });
  assert.equal(t.name, "Joe's  Diner");
  assert.equal(t.source, "");
  assert.equal(validTip({ name: "x" }), null);
});

test("CORS allows the hub and the local preview only", () => {
  assert.equal(corsHeaders(ORIGIN)["Access-Control-Allow-Origin"], ORIGIN);
  assert.equal(corsHeaders("https://evil.example")["Access-Control-Allow-Origin"], undefined);
});

test("a report shows up in the state at once, with the community total", async () => {
  const { DB } = d1();
  const env = { DB };
  let r = await worker.fetch(req("/v1/report", { method: "POST", body: { p: "p-1", o: "applebees", k: "worked", v: 14 } }), env);
  assert.equal(r.status, 200);
  r = await worker.fetch(req("/v1/report", { method: "POST", body: { p: "p-1", o: "applebees", k: "line", m: 30 } }), env);
  assert.equal(r.status, 200);
  const s = await (await worker.fetch(req("/v1/state"), env)).json();
  assert.equal(s.events.length, 2);
  assert.deepEqual(Object.keys(s.events[0]).sort(), ["k", "o", "p", "t"], "no hash or id leaves the server");
  assert.equal(s.events[1].m, 30);
  assert.deepEqual(s.community, { worked: 1, value: 14 });
});

test("the same report from the same caller within 10 minutes counts once", async () => {
  const { DB, db } = d1();
  const env = { DB };
  for (let i = 0; i < 3; i++) await worker.fetch(req("/v1/report", { method: "POST", body: { p: "p-1", o: "a", k: "away" } }), env);
  await worker.fetch(req("/v1/report", { method: "POST", body: { p: "p-1", o: "a", k: "away" }, ip: "198.51.100.9" }), env);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM reports").get().n, 2);
});

test("a caller is cut off after the daily report limit", async () => {
  const { DB } = d1();
  const env = { DB };
  let last;
  for (let i = 0; i <= LIMITS.reportsPerDay; i++) {
    last = await worker.fetch(req("/v1/report", { method: "POST", body: { p: "p-" + i, o: "a", k: "worked" } }), env);
  }
  assert.equal(last.status, 429);
});

test("the IP address is never stored, only a salted hash, and the salt is per day", async () => {
  const { DB, db } = d1();
  await worker.fetch(req("/v1/report", { method: "POST", body: { p: "p-1", o: "a", k: "worked" } }), { DB });
  const row = db.prepare("SELECT * FROM reports").get();
  assert.ok(row.h && !String(row.h).includes("203.0.113.7"));
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM salt").get().n, 1);
});

test("an override set by hand reaches the state within five minutes", async () => {
  const { DB, db } = d1();
  const env = { DB };
  await worker.fetch(req("/v1/state"), env); // builds the summary
  db.prepare("INSERT INTO overrides (id, status, note, ts) VALUES ('golden-corral', 'dead', 'no FM store', 0)").run();
  db.prepare("UPDATE blob SET ts = ts - ?").run(LIMITS.staleMs + 1000);
  const s = await (await worker.fetch(req("/v1/state"), env)).json();
  assert.deepEqual(s.overrides["golden-corral"], { status: "dead", note: "no FM store" });
});

test("tips are stored and limited per caller", async () => {
  const { DB, db } = d1();
  const env = { DB };
  for (let i = 0; i < LIMITS.tipsPerDay; i++) {
    const r = await worker.fetch(req("/v1/tip", { method: "POST", body: { name: "Diner " + i, offer: "free pie" } }), env);
    assert.equal(r.status, 200);
  }
  const r = await worker.fetch(req("/v1/tip", { method: "POST", body: { name: "One more", offer: "free pie" } }), env);
  assert.equal(r.status, 429);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM tips").get().n, LIMITS.tipsPerDay);
});

test("bad input gets a 400, unknown paths a 404, preflight a 204", async () => {
  const { DB } = d1();
  const env = { DB };
  assert.equal((await worker.fetch(req("/v1/report", { method: "POST", body: { p: "x" } }), env)).status, 400);
  assert.equal((await worker.fetch(req("/nope"), env)).status, 404);
  assert.equal((await worker.fetch(req("/v1/report", { method: "OPTIONS" }), env)).status, 204);
});
