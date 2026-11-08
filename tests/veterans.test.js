// House rules and data checks for the Veterans Day planner (site/veterans/veterans-day/). No browser, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { SITE, read } from "./lib/source.js";

const DIR = "site/veterans/veterans-day/";
const HTML = read(DIR + "index.html");
const SCRIPTS = { "app.js": read(DIR + "app.js"), "engine.js": read(DIR + "engine.js") };
const DEALS = JSON.parse(read(DIR + "data/deals.json"));
const DRIVE = JSON.parse(read(DIR + "data/drive.json"));
const DAY_START = Date.parse(DEALS.meta.day_start);

test("the page has no inline scripts, styles or event handlers (the CSP allows only 'self')", () => {
  for (const m of HTML.matchAll(/<script\b([^>]*)>/g)) assert.match(m[1], /\ssrc="/, "inline <script>");
  assert.ok(!/<style\b/.test(HTML), "<style> element");
  assert.ok(!/\sstyle="/.test(HTML), 'style="…" attribute');
  assert.ok(!/<[^>]*\son[a-z]+="/.test(HTML), "event handler attribute");
});

test("its scripts build no inline styles or handlers and use no eval", () => {
  for (const [file, src] of Object.entries(SCRIPTS)) {
    assert.ok(!/setAttribute\(\s*["']style["']/.test(src), `${file}: setAttribute("style", …)`);
    assert.ok(!/\sstyle=\\?["']/.test(src), `${file}: style="…" in an HTML string`);
    assert.ok(!/<[a-z][^>]*\son[a-z]+=\\?["']/.test(src), `${file}: an on…= handler in an HTML string`);
    assert.ok(!/\beval\(|new Function\(/.test(src), `${file}: eval or new Function`);
    assert.ok(!/\.innerHTML\s*=/.test(src), `${file}: innerHTML (text from the data must stay text)`);
  }
});

test("every file the page refers to exists", () => {
  const refs = [...HTML.matchAll(/\s(?:href|src)="([^"#][^"]*)"/g)].map((m) => m[1]).filter((r) => !/^(https?:|mailto:|tel:)/.test(r));
  refs.push("vendor/leaflet/leaflet.js", "vendor/leaflet/leaflet.css", "data/deals.json", "data/drive.json");
  for (let r of refs) {
    if (r.endsWith("/")) r += "index.html";
    const file = r.startsWith("/") ? path.join(SITE, r) : path.join(SITE, "veterans", "veterans-day", r);
    assert.ok(existsSync(file) && statSync(file).isFile(), `${r} is missing`);
  }
});

test("the house layer: location label, footer, About structure, time settings, privacy line", () => {
  assert.match(HTML, /Fargo-Moorhead, ND\/MN/);
  assert.match(HTML, /<footer[\s\S]*©[\s\S]*Thomas Brummer[\s\S]*<\/footer>/);
  for (const h of ["What it is", "Method", "Limits", "Sources"]) assert.match(HTML, new RegExp(`<h3 class="h3">${h}</h3>`));
  assert.match(HTML, /id="time-settings"/);
  assert.match(SCRIPTS["app.js"], /T\.mountSettings\(/);
  assert.match(HTML, /No analytics or tracking/);
});

test("the CSP lets the map tiles in", () => {
  const fb = JSON.parse(read("firebase.json"));
  const csp = fb.hosting[0].headers.flatMap((r) => r.headers).find((h) => h.key === "Content-Security-Policy").value;
  assert.match(csp, /img-src [^;]*https:\/\/tile\.openstreetmap\.org/);
});

test("the data: every offer has a store, every store an offer, all inside the metro and the day", () => {
  const offers = new Map(DEALS.offers.map((o) => [o.id, o]));
  const ids = new Set();
  for (const p of DEALS.places) {
    assert.ok(offers.has(p.offer), `${p.id}: unknown offer ${p.offer}`);
    assert.match(p.id, /^[a-z0-9][a-z0-9-]{0,79}$/, "place ids fit the report service's pattern");
    assert.ok(!ids.has(p.id), `duplicate place id ${p.id}`);
    ids.add(p.id);
    assert.ok(p.lat > 46.72 && p.lat < 47.0 && p.lng > -97.0 && p.lng < -96.64, `${p.id} is outside the metro`);
    const open = Date.parse(p.open), close = Date.parse(p.close);
    assert.ok(open >= DAY_START && close <= DAY_START + 30 * 3600e3 && close > open, `${p.id}: hours`);
  }
  for (const o of DEALS.offers) {
    assert.ok(DEALS.places.some((p) => p.offer === o.id), `${o.id} has no store`);
    assert.match(o.id, /^[a-z0-9][a-z0-9-]{0,79}$/);
    assert.ok(["A", "B", "C"].includes(o.grade), `${o.id}: grade`);
    if (o.grade !== "C") assert.ok(o.sources.length > 0, `${o.id}: an A or B grade needs a source`);
    assert.ok(o.minutes > 0 && o.value >= 0);
    if (o.start) assert.ok(Date.parse(o.start) >= DAY_START - 6 * 3600e3, `${o.id}: start`);
    assert.ok(!/\bMonday|\bTuesday/.test(o.offer), `${o.id}: a weekday from another year`);
  }
});

test("the drive tables match the stores, in the same order", () => {
  assert.deepEqual(DRIVE.place_ids, DEALS.places.map((p) => p.id), "rebuild drive.json after deals.json");
  const n = DEALS.places.length;
  assert.equal(DRIVE.places.length, n);
  for (const row of DRIVE.places) assert.equal(row.length, n);
  assert.equal(DRIVE.anchors.length, DRIVE.fromAnchor.length);
  for (const row of DRIVE.fromAnchor) assert.equal(row.length, n);
  assert.ok(DRIVE.anchors.length > 200, "a grid across the metro");
});
