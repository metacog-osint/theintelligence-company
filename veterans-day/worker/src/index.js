// Field reports for the Veterans Day 2026 planner (https://theintelligence.company/veterans/veterans-day/).
//
// Anonymous by design: a report is a place id, an offer id, an outcome, an optional line length or value, and a
// time. No accounts, no names, no locations. To stop floods, each caller is counted by a salted hash of their IP
// address; the salt is random for each UTC day and deleted after two days, and the hash is wiped from reports after
// two days, so nothing old can be tied to anyone.
//
// Reads are cheap on purpose (D1's free tier allows 5 million rows read a day): GET /v1/state returns one stored
// summary row, rebuilt after every write and at most every five minutes otherwise (so an override set by hand
// shows within five minutes).

export const ORIGINS = [
  "https://theintelligence.company", "https://www.theintelligence.company", "https://theintelligencecompany.web.app",
  "http://127.0.0.1:5055", "http://localhost:5055", "http://127.0.0.1:5056", "http://localhost:5056",
];
export const KINDS = ["worked", "away", "out", "line"];
const ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
const HOUR = 3600e3, DAY = 24 * HOUR;
export const LIMITS = { reportsPerDay: 60, tipsPerDay: 5, repeatMs: 10 * 60e3, eventsMs: 12 * HOUR, staleMs: 5 * 60e3 };

export function validReport(b) {
  if (!b || typeof b !== "object") return null;
  const { p, o, k } = b;
  if (typeof p !== "string" || !ID.test(p) || typeof o !== "string" || !ID.test(o) || !KINDS.includes(k)) return null;
  const out = { p, o, k, m: null, v: null };
  if (k === "line") {
    const m = Number(b.m);
    if (!Number.isFinite(m) || m < 0 || m > 180) return null;
    out.m = Math.round(m);
  }
  if (k === "worked" && b.v !== undefined && b.v !== null) {
    const v = Number(b.v);
    if (!Number.isFinite(v) || v < 0) return null;
    out.v = Math.min(100, Math.round(v));
  }
  return out;
}

const clip = (s, n) => (typeof s === "string" ? s.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, n) : "");
export function validTip(b) {
  if (!b || typeof b !== "object") return null;
  const t = { name: clip(b.name, 80), address: clip(b.address, 120), offer: clip(b.offer, 200), when: clip(b.when, 80), source: clip(b.source, 300) };
  if (!t.name || !t.offer) return null;
  if (t.source && !/^https?:\/\//i.test(t.source)) t.source = "";
  return t;
}

export function corsHeaders(origin) {
  const h = { "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400", Vary: "Origin" };
  if (ORIGINS.includes(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}
function json(body, status, cors, extra) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors, ...(extra || {}) } });
}

const utcDay = (t) => new Date(t).toISOString().slice(0, 10);
async function saltFor(env, t) {
  const day = utcDay(t);
  let row = await env.DB.prepare("SELECT s FROM salt WHERE day = ?").bind(day).first();
  if (!row) {
    const s = [...crypto.getRandomValues(new Uint8Array(24))].map((x) => x.toString(16).padStart(2, "0")).join("");
    await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO salt (day, s) VALUES (?, ?)").bind(day, s),
      env.DB.prepare("DELETE FROM salt WHERE day < ?").bind(utcDay(t - 2 * DAY)),
      env.DB.prepare("UPDATE reports SET h = NULL WHERE ts < ? AND h IS NOT NULL").bind(t - 2 * DAY),
      env.DB.prepare("UPDATE tips SET h = NULL WHERE ts < ? AND h IS NOT NULL").bind(t - 2 * DAY),
      env.DB.prepare("DELETE FROM rl WHERE day < ?").bind(utcDay(t - 2 * DAY)),
    ]);
    row = await env.DB.prepare("SELECT s FROM salt WHERE day = ?").bind(day).first();
  }
  return { day, s: row.s };
}
async function callerHash(env, req, t) {
  const ip = req.headers.get("CF-Connecting-IP") || "0.0.0.0";
  const { day, s } = await saltFor(env, t);
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s + "|" + ip));
  return { day, h: [...new Uint8Array(d)].slice(0, 16).map((x) => x.toString(16).padStart(2, "0")).join("") };
}
async function bump(env, h, day, kind) {
  const row = await env.DB.prepare(
    "INSERT INTO rl (h, day, kind, n) VALUES (?, ?, ?, 1) ON CONFLICT (h, day, kind) DO UPDATE SET n = n + 1 RETURNING n"
  ).bind(h, day, kind).first();
  return row ? row.n : 1;
}

export async function rebuild(env, t) {
  const ev = await env.DB.prepare("SELECT p, o, k, ts AS t, m FROM reports WHERE ts >= ? ORDER BY ts").bind(t - LIMITS.eventsMs).all();
  const ov = await env.DB.prepare("SELECT id, status, note FROM overrides").all();
  const com = await env.DB.prepare("SELECT COUNT(*) AS worked, COALESCE(SUM(v), 0) AS value FROM reports WHERE k = 'worked' AND ts >= ?").bind(t - DAY).first();
  const events = (ev.results || []).map((e) => (e.m === null ? { p: e.p, o: e.o, k: e.k, t: e.t } : e));
  const overrides = Object.fromEntries((ov.results || []).map((r) => [r.id, { status: r.status, note: r.note || "" }]));
  const body = JSON.stringify({ now: t, events, overrides, community: { worked: com.worked, value: com.value } });
  await env.DB.prepare("INSERT INTO blob (k, v, ts) VALUES ('state', ?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v, ts = excluded.ts").bind(body, t).run();
  return body;
}

async function state(env, cors, t) {
  const row = await env.DB.prepare("SELECT v, ts FROM blob WHERE k = 'state'").first();
  const body = row && t - row.ts < LIMITS.staleMs ? row.v : await rebuild(env, t);
  return new Response(body, { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors } });
}

async function report(req, env, cors, t) {
  const r = validReport(await req.json().catch(() => null));
  if (!r) return json({ error: "bad report" }, 400, cors);
  const { day, h } = await callerHash(env, req, t);
  if ((await bump(env, h, day, "report")) > LIMITS.reportsPerDay) return json({ error: "too many reports today" }, 429, cors);
  const dup = await env.DB.prepare("SELECT 1 AS x FROM reports WHERE h = ? AND p = ? AND k = ? AND ts > ? LIMIT 1")
    .bind(h, r.p, r.k, t - LIMITS.repeatMs).first();
  if (dup) return json({ ok: true, duplicate: true }, 200, cors);
  await env.DB.prepare("INSERT INTO reports (ts, p, o, k, m, v, h) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(t, r.p, r.o, r.k, r.m, r.v, h).run();
  await rebuild(env, t);
  return json({ ok: true }, 200, cors);
}

async function tip(req, env, cors, t) {
  const tp = validTip(await req.json().catch(() => null));
  if (!tp) return json({ error: "bad tip" }, 400, cors);
  const { day, h } = await callerHash(env, req, t);
  if ((await bump(env, h, day, "tip")) > LIMITS.tipsPerDay) return json({ error: "too many tips today" }, 429, cors);
  await env.DB.prepare("INSERT INTO tips (ts, name, address, offer, when_, source, h) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(t, tp.name, tp.address, tp.offer, tp.when, tp.source, h).run();
  return json({ ok: true }, 200, cors);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), cors = corsHeaders(req.headers.get("Origin") || ""), t = Date.now();
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      if (url.pathname === "/v1/state" && req.method === "GET") return await state(env, cors, t);
      if (url.pathname === "/v1/report" && req.method === "POST") return await report(req, env, cors, t);
      if (url.pathname === "/v1/tip" && req.method === "POST") return await tip(req, env, cors, t);
      if (url.pathname === "/") return json({ service: "Veterans Day 2026 field reports", ok: true }, 200, cors);
      return json({ error: "not found" }, 404, cors);
    } catch (e) {
      console.error(e && e.stack || e);
      return json({ error: "server error" }, 500, cors);
    }
  },
};
