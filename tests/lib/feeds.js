// The fourteen feeds the hub reads, what it needs from each, and sample copies for the browser tests.
// SHAPES lists exactly the fields site.js and oe/oe.js read, so the samples and the live feeds are checked against the
// same thing: check-live.js runs these on the real feeds, and the browser tests run them on the samples.
import { readFileSync } from "node:fs";
import path from "node:path";
import { ROOT, feedUrls } from "./source.js";

export const URLS = feedUrls(); // NOISEFLOOR, WATCHFLOOR, VIGIL, COP_HEALTH, ELEMENTS_FEED, CORDON_FEED, VIS_FEED, BLACKOUT_FEED,
// HEADWIND_FEED, ORBIT_FEED, LAUNCH_FEED, UNDERTOW_FEED, WAKE_FEED, RELIEF_FEED, READOUT_FEED
// The samples' clock: every time in tests/fixtures is set relative to this moment (12:00 PM CST, 7 Nov 2026).
export const NOW = new Date("2026-11-07T18:00:00Z");

const isDay = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v);
const isTime = (v) => typeof v === "string" && !Number.isNaN(Date.parse(v));
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const text = (v) => typeof v === "string" && v.trim() !== "";
// Each check returns true or the problem in words.
const need = (ok, problem) => (ok ? true : problem);

export const SHAPES = {
  NOISEFLOOR: (b) => [
    need(text(b.brief), "brief: the Latest line's text"),
    need(isDay(b.freshness && b.freshness.aircraft_day), "freshness.aircraft_day: the Latest line's date (YYYY-MM-DD)"),
    need(isTime(b.built_utc) || isTime(b.freshness && b.freshness.board_built), "built_utc or freshness.board_built: the Updated time"),
  ],
  WATCHFLOOR: (s) => {
    const ents = s.entities && typeof s.entities === "object" ? s.entities : null;
    const zones = ents ? Object.keys(ents).filter((k) => !/^T\d/.test(k)) : [];
    return [
      need(isTime(s.built_at), "built_at: the Updated time"),
      need(isDay(s.day), "day: the Latest line's date (YYYY-MM-DD)"),
      need(ents, "entities: an object of zones and topics (topic keys start with T)"),
      need(zones.length > 0, "entities: at least one conflict zone"),
      ...zones.map((k) => {
        const z = ents[k];
        return need(z && text(z.name) && z.attention && isNum(z.attention.z) && isNum(z.attention.ratio) &&
          (z.alarms === undefined || Array.isArray(z.alarms)), `entities.${k}: name, attention.z, attention.ratio and alarms[]`);
      }),
      need(s.partial === undefined || typeof s.partial === "boolean", "partial: true or false"),
      need(s.gdelt_articles === undefined || isNum(s.gdelt_articles), "gdelt_articles: a number"),
      need(s.rss_items === undefined || isNum(s.rss_items), "rss_items: a number"),
    ];
  },
  VIGIL: (v) => [
    need(text(v.brief), "brief: the Latest line's text"),
    need(isDay(v.day), "day: the Latest line's date (YYYY-MM-DD)"),
    need(isTime(v.data_as_of) || isTime(v.built_at), "data_as_of (or built_at): the Updated time"),
  ],
  COP_HEALTH: (h) => {
    const progs = Array.isArray(h.programs) ? h.programs : null;
    const find = (id) => (progs || []).find((p) => p && p.id === id);
    return [
      need(isTime(h.generated_at), "generated_at: COP's Updated time and the Latest line's date"),
      need(progs && progs.length > 0, "programs: a list of every program's feed check"),
      ...(progs || []).map((p, i) => need(p && text(p.id) && ["fresh", "late", "stale"].includes(p.state) &&
        (p.placed === undefined || isNum(p.placed)) && (p.fresh_hours === undefined || isNum(p.fresh_hours)),
      `programs[${i}]: id, state (fresh, late or stale), placed and fresh_hours as numbers`)),
      need(find("context") && isTime(find("context").data_as_of), "programs: context with data_as_of (Context's Updated time)"),
      need(find("vigil") && isTime(find("vigil").data_as_of), "programs: vigil with data_as_of (used when Vigil's summary is down)"),
    ];
  },
  // Vis's feed is read whole (about 8 KB compressed), because Cloudflare Pages sends no Last-Modified.
  VIS_FEED: (f) => [need(isTime(f.generated_at), "generated_at: the Updated time")],
  // Blackout's too (Cloudflare Pages as well; about 40 KB, about 5 KB compressed).
  BLACKOUT_FEED: (f) => [need(isTime(f.generated_at), "generated_at: the Updated time")],
  // And Headwind's (Cloudflare Pages; about 150 KB, about 8 KB compressed).
  HEADWIND_FEED: (f) => [need(isTime(f.generated_at), "generated_at: the Updated time")],
  // And Orbit's (Cloudflare Pages; about 50 KB, about 5 KB compressed).
  ORBIT_FEED: (f) => [need(isTime(f.generated_at), "generated_at: the Updated time")],
  // And Launch's (Cloudflare Pages; about 10 KB).
  LAUNCH_FEED: (f) => [need(isTime(f.generated_at), "generated_at: the Updated time")],
  // And Undertow's (Cloudflare Pages; about 1.9 MB, about 65 KB compressed).
  UNDERTOW_FEED: (f) => [need(isTime(f.generated_at), "generated_at: the Updated time")],
  // And Wake's (Cloudflare Pages; about 100 KB; built by hand once a week).
  WAKE_FEED: (f) => [need(isTime(f.generated_at), "generated_at: the Updated time")],
  // And Relief's (Cloudflare Pages; rebuilt every six hours).
  RELIEF_FEED: (f) => [need(isTime(f.generated_at), "generated_at: the Updated time")],
  // And Readout's (Cloudflare Pages; rebuilt every six hours).
  READOUT_FEED: (f) => [need(isTime(f.generated_at), "generated_at: the Updated time")],
  // COP's small file of places for the home page's world map (about 1.5 KB).
  COP_DIRECTION: (d) => [
    need(isTime(d.generated_at), "generated_at: the COP card's date"),
    need(text(d.summary), "summary: the sentence on the COP card"),
    need(d.record === null || (d.record && isNum(d.record.resolved) && isNum(d.record.called) && isNum(d.record.on_called_side)),
      "record: Verdict's counts, or null"),
  ],
  COP_POINTS: (d) => [
    need(isTime(d.generated_at), "generated_at: when COP built the places"),
    need(Array.isArray(d.points) && d.points.every((p) => Array.isArray(p) && isNum(p[0]) && isNum(p[1])),
      "points: a list of [longitude, latitude]"),
  ],
  // Verdict's ledger counts, for the Today band's Verdict tile (GitHub Pages, about 3 KB).
  VERDICT_SCORES: (v) => [
    need(Number.isInteger(v.registered) && v.registered >= 0, "registered: forecasts on the ledger, a whole number"),
    need(Number.isInteger(v.resolved) && v.resolved >= 0, "resolved: forecasts settled, a whole number"),
  ],
};
// The two GeoJSON feeds and Verdict's scores are read with HEAD only, for their Last-Modified header.
export const HEAD_ONLY = ["ELEMENTS_FEED", "CORDON_FEED", "VERDICT_SCORES"];

export function problems(name, data) {
  return SHAPES[name](data || {}).filter((r) => r !== true);
}

// ---------------------------------------------------------------- samples

const FILES = { NOISEFLOOR: "noisefloor-board.json", WATCHFLOOR: "watchfloor-summary.json", VIGIL: "vigil-summary.json",
  COP_HEALTH: "cop-health.json", COP_POINTS: "cop-home-points.json", COP_DIRECTION: "cop-direction.json", VIS_FEED: "vis-feed.json",
  BLACKOUT_FEED: "blackout-feed.json", HEADWIND_FEED: "headwind-feed.json",
  ORBIT_FEED: "orbit-feed.json", LAUNCH_FEED: "launch-feed.json", UNDERTOW_FEED: "undertow-feed.json", WAKE_FEED: "wake-feed.json", RELIEF_FEED: "relief-feed.json", READOUT_FEED: "readout-feed.json",
  VERDICT_SCORES: "verdict-scores.json" };
export function sample(name) {
  return JSON.parse(readFileSync(path.join(ROOT, "tests", "fixtures", FILES[name]), "utf8"));
}
// When the samples say Elements, Cordon and Verdict last published.
export const SAMPLE_MODIFIED = { ELEMENTS_FEED: "2026-11-07T13:00:00Z", CORDON_FEED: "2026-11-07T17:40:00Z",
  VERDICT_SCORES: "2026-11-07T17:00:00Z" };

// Answer the hub's feed requests in a Playwright context. `feeds` overrides any feed by name with one of:
//   { json }         a body to send as JSON          { body, status }  a raw body and status
//   { abort: true }  a network failure               { lastModified }  a HEAD answer for the GeoJSON feeds
// Requests to the local site go straight through; anything else is refused and recorded in the returned list.
export async function routeFeeds(context, siteUrl, feeds = {}) {
  const strays = [];
  const byUrl = Object.fromEntries(Object.entries(URLS).map(([k, u]) => [u, k]));
  await context.route(offSite(siteUrl), async (route) => {
    const url = route.request().url();
    const name = byUrl[url.split("?")[0]];
    if (!name) { strays.push(url); return route.abort(); }
    const spec = feeds[name] || (HEAD_ONLY.includes(name)
      ? { lastModified: SAMPLE_MODIFIED[name] } : { json: sample(name) });
    if (spec.abort) return route.abort();
    const headers = { "access-control-allow-origin": "*" };
    if (spec.lastModified) {
      headers["last-modified"] = new Date(spec.lastModified).toUTCString();
      return route.fulfill({ status: 200, headers, body: "" });
    }
    if (spec.json !== undefined) {
      return route.fulfill({ status: spec.status || 200, headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify(spec.json) });
    }
    return route.fulfill({ status: spec.status || 200, headers, body: spec.body || "" });
  });
  return strays;
}

// Every URL except the local site's, for context.route. Playwright matches a pattern itself, so the page's own
// requests (scripts, styles, fonts, data) never wait on the test process; under a full run, on a busy machine, that
// wait made the Veterans Day map's router request outlast the planner's 8-second timeout.
export function offSite(siteUrl) {
  const esc = siteUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("^(?!" + esc + "(?:[/?#]|$))");
}
