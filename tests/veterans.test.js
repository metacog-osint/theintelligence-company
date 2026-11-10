// House rules and data checks for the Veterans Day planner (site/veterans/veterans-day/). No browser, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { SITE, read } from "./lib/source.js";

const DIR = "site/veterans/veterans-day/";
const HTML = read(DIR + "index.html");
const SCRIPTS = { "app.js": read(DIR + "app.js"), "engine.js": read(DIR + "engine.js"), "roads.js": read(DIR + "roads.js") };
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

test("the route line: OSRM is let in, and the page says what it sees and that your location never leaves the phone", () => {
  const fb = JSON.parse(read("firebase.json"));
  const csp = fb.hosting[0].headers.flatMap((r) => r.headers).find((h) => h.key === "Content-Security-Policy").value;
  assert.match(csp, /connect-src [^;]*https:\/\/router\.project-osrm\.org/);
  assert.match(SCRIPTS["roads.js"], /var ROUTER = "https:\/\/router\.project-osrm\.org"/);
  assert.ok(HTML.indexOf('<script src="roads.js">') > HTML.indexOf('<script src="engine.js">') &&
    HTML.indexOf('<script src="roads.js">') < HTML.indexOf('<script src="app.js">'), "roads.js loads before app.js");
  const squash = (s) => s.replace(/\s+/g, " ");
  const privacy = squash(/<h3 class="h3">Your privacy<\/h3>([\s\S]*?)<h3/.exec(HTML)[1]);
  assert.match(privacy, /Your location, settings and history stay on your phone\./);
  assert.match(privacy, /the Map sends the stores on your route, in order, to OSRM's public routing server \(run by FOSSGIS/);
  assert.match(privacy, /It never sends your location or your start point: the line from you to your first stop is drawn straight, on this phone\./);
  assert.match(privacy, /the store list hints at your part of town/);
  assert.match(squash(HTML), /Drive times and route lines: OSRM, on OpenStreetMap data \(route lines from the public server run by FOSSGIS\)/);
  assert.match(HTML, /Everything here stays on this phone\. None of it is sent anywhere\./);
  assert.ok(!/Nothing about you is sent anywhere/.test(HTML), "the old, broader promise is gone");
  for (const k of ["key-road", "key-straight"]) assert.match(HTML, new RegExp(`class="key ${k}"`), k);
  assert.match(HTML, /<a href="https:\/\/www\.openstreetmap\.org\/fixthemap" target="_blank" rel="noopener" aria-describedby="newtab">Fix the map ↗<\/a>/);
});

test("the data files are revalidated on every load, so a rebuild reaches phones at once and the two never mismatch", () => {
  const fb = JSON.parse(read("firebase.json"));
  const rule = fb.hosting[0].headers.find((r) => r.source === "/veterans/**/*.json");
  assert.ok(rule, "a header rule for the planner's JSON");
  assert.equal(rule.headers.find((h) => h.key === "Cache-Control").value, "no-cache");
});

test("the route builder is the first tab: goals, likes, times and the route's parts are on the page", () => {
  assert.match(HTML, /<a href="#route" class="tab" data-tab="route" aria-current="page">Route<\/a>/);
  assert.ok(!/data-tab="(next|plan)"/.test(HTML), "the old Next and Plan tabs are gone");
  for (const id of ["rb", "rb-leave", "rb-end", "goal-kind", "goal-max", "likes", "rb-togo", "route-sum", "next-card", "route-list", "soon", "alts"]) {
    assert.match(HTML, new RegExp(`id="${id}"`), id);
  }
  for (const g of ["stops", "savings", "both"]) assert.match(HTML, new RegExp(`data-goal="${g}"`));
});

test("tickets for later are tagged, and deals that need a purchase are marked", () => {
  const byId = Object.fromEntries(DEALS.offers.map((o) => [o.id, o]));
  for (const id of ["great-clips", "texas-roadhouse", "freddys"]) {
    assert.equal(byId[id].ticket, true, `${id} is a ticket`);
    assert.ok(byId[id].minutes <= 10, `${id} is a quick stop`);
    assert.ok(!byId[id].group, `${id} doesn't use up a one-a-day slot`);
  }
  for (const id of ["firehouse-subs", "chipotle", "jiffy-lube"]) assert.equal(byId[id].purchase, true, `${id} needs a purchase`);
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

test("every category in the data has a label in the app; deals that need a purchase start Off, bars On with a drive-safe line", () => {
  const app = SCRIPTS["app.js"];
  for (const c of new Set(DEALS.offers.map((o) => o.category))) assert.ok(app.includes(`["${c}", "`), `category ${c} has no label`);
  assert.match(app, /OFF_BY_DEFAULT = \{ purchase: true \}/, "only purchase deals are Off until turned on");
  assert.ok(DEALS.offers.filter((o) => o.category === "bar").length >= 10, "the bars are on the route");
  assert.match(HTML, /id="drive-safe"[^>]*hidden/, "a drive-safe line, shown when a route has a bar");
  assert.match(app, /DRIVE_SAFE = "21 and over\. If you drink, don't drive/);
});

test("no source links to fargobites.com, which redirects every page to an unrelated 'verify' site (Nov 2026)", () => {
  const urls = [...DEALS.offers.flatMap((o) => o.sources), ...(DEALS.other || []).flatMap((x) => x.sources),
    ...(DEALS.leads || []).map((l) => l.source).filter(Boolean)].map((s) => s.url || "");
  assert.ok(urls.length > 50);
  for (const u of urls) assert.ok(!/fargobites\.com/i.test(u), u);
  for (const s of DEALS.offers.flatMap((o) => o.sources)) assert.ok(s.url || s.publisher, "a source needs a link or a name");
});

test("other days and earlier-year leads are listed under Deals, off the route", () => {
  assert.ok(DEALS.other.length >= 4 && DEALS.leads.length >= 10);
  for (const x of DEALS.other) {
    for (const k of ["id", "day", "name", "where", "offer"]) assert.ok(x[k], `${x.id}: ${k}`);
    assert.ok(["A", "B", "C"].includes(x.grade), `${x.id}: grade`);
    if (x.grade !== "C") assert.ok(x.sources.some((s) => s.url), `${x.id}: an A or B grade needs a linked source`);
    if (x.at) assert.ok(!Number.isNaN(Date.parse(x.at)), `${x.id}: at`);
  }
  const offerIds = new Set(DEALS.offers.map((o) => o.id));
  for (const l of DEALS.leads) {
    for (const k of ["name", "offer", "last_seen", "q"]) assert.ok(l[k], `${l.name}: ${k}`);
    assert.ok(!offerIds.has(l.name.toLowerCase()), `${l.name} is both a lead and a deal`);
  }
  for (const id of ["other-wrap", "other", "leads-wrap", "leads", "leads-n"]) assert.match(HTML, new RegExp(`id="${id}"`), id);
});

// ---------------------------------------------------------------- areas (10 Nov 2026)
const AREAS = [...SCRIPTS["app.js"].matchAll(/\{ id: "([a-z-]+)", dir: "([a-z/-]+)" \}/g)].map((m) => ({ id: m[1], dir: m[2] }));
const AREA_DATA = Object.fromEntries(AREAS.map((a) => [a.id, {
  deals: JSON.parse(read(DIR + a.dir + "deals.json")), drive: JSON.parse(read(DIR + a.dir + "drive.json")) }]));
const kmApart = (a, b) => {
  const p = Math.PI / 180, s = Math.sin((b[0] - a[0]) * p / 2) ** 2 + Math.cos(a[0] * p) * Math.cos(b[0] * p) * Math.sin((b[1] - a[1]) * p / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(s));
};

test("the area picker: Fargo-Moorhead first and the default, and its options match the app's areas and data folders", () => {
  const opts = [...HTML.matchAll(/<option value="([a-z-]+)">([^<]+)<\/option>/g)].filter((m) => AREAS.some((a) => a.id === m[1]));
  assert.deepEqual(opts.map((m) => m[1]), AREAS.map((a) => a.id), "the <select> lists the areas in app.js's order");
  assert.equal(AREAS[0].id, "fargo-moorhead");
  assert.equal(AREAS[0].dir, "data/", "Fargo-Moorhead keeps its original paths");
  assert.match(SCRIPTS["app.js"], /const DEFAULT_AREA = "fargo-moorhead";/);
  assert.match(opts[0][2], /^Fargo-Moorhead, ND\/MN$/);
  assert.match(HTML, /<select id="area"/);
  assert.match(SCRIPTS["app.js"], /URLSearchParams\(location\.search\)\.get\("area"\)/, "a link with ?area= opens an area");
  for (const a of AREAS) {
    const m = AREA_DATA[a.id].deals.meta.region;
    assert.ok(m, `${a.id}: meta.region`);
    assert.equal(m.id, a.id);
    for (const k of ["name", "center", "center_label", "zoom", "wx_name"]) assert.ok(m[k], `${a.id}: meta.region.${k}`);
    assert.equal(AREA_DATA[a.id].deals.meta.tz, "America/Chicago", `${a.id}: Central time`);
    assert.ok(AREA_DATA[a.id].deals.meta.forecast_url, `${a.id}: an NWS forecast link`);
  }
});

test("every other area: each offer has a store, each store an offer, inside the area's circles and the day", () => {
  for (const a of AREAS.slice(1)) {
    const { deals } = AREA_DATA[a.id], areas = deals.meta.region.areas;
    assert.ok(areas && areas.length, `${a.id}: circles`);
    const offers = new Map(deals.offers.map((o) => [o.id, o]));
    assert.ok(deals.offers.length >= 20 && deals.places.length >= 40, `${a.id}: a usable number of deals`);
    for (const p of deals.places) {
      assert.ok(offers.has(p.offer), `${a.id} ${p.id}: unknown offer`);
      assert.match(p.id, /^[a-z0-9][a-z0-9-]{0,79}$/);
      assert.ok(areas.some(([, lat, lng, r]) => kmApart([p.lat, p.lng], [lat, lng]) <= r), `${a.id} ${p.id} is outside the area`);
      const open = Date.parse(p.open), close = Date.parse(p.close);
      assert.ok(open >= DAY_START && close <= DAY_START + 30 * 3600e3 && close > open, `${a.id} ${p.id}: hours`);
    }
    for (const o of deals.offers) {
      assert.ok(deals.places.some((p) => p.offer === o.id), `${a.id} ${o.id} has no store`);
      assert.ok(["A", "B", "C"].includes(o.grade));
      if (o.grade !== "C") assert.ok(o.sources.length > 0, `${a.id} ${o.id}: an A or B grade needs a source`);
      // Fargo-Moorhead's own notes stay there: Kwik Star, the Petro truck stop, MATBUS, a Fargo store.
      assert.ok(!/Kwik Star|Petro|Popeyes|MATBUS|Fargo|\bFM\b|Moorhead/.test([o.caution, o.notes, o.offer, o.limits].join(" ").replace(/Fargo-Moorhead/g, "")), `${a.id} ${o.id}: a Fargo-only note`);
    }
    for (const x of deals.other || []) {
      for (const k of ["id", "day", "name", "where", "offer"]) assert.ok(x[k], `${a.id} ${x.id}: ${k}`);
      if (x.grade !== "C") assert.ok(x.sources.some((s) => s.url), `${a.id} ${x.id}: an A or B grade needs a linked source`);
    }
    assert.ok(!deals.offers.some((o) => o.id === "hardees"), `${a.id}: Hardee's is Fargo-Moorhead only (a recollection of a Fargo store)`);
    // Researchers' working notes ("I could not read…", "the research report") stay in research/<area>/notes.md, off the page.
    const shown = deals.offers.flatMap((o) => [o.offer, o.notes, o.limits, o.caution])
      .concat((deals.other || []).flatMap((x) => [x.name, x.where, x.offer, x.note]), (deals.leads || []).map((l) => l.offer));
    for (const t of shown) assert.ok(!/Tom's|\bTom\b|\bI (could|did|found|read|used|put|saw)\b|\bmy estimate/.test(t || ""), `${a.id}: internal wording on the page: ${t}`);
  }
});

test("every area's drive tables match its stores, and its grid covers each of its circles", () => {
  for (const a of AREAS) {
    const { deals, drive } = AREA_DATA[a.id];
    assert.deepEqual(drive.place_ids, deals.places.map((p) => p.id), `${a.id}: rebuild drive.json after deals.json`);
    const n = deals.places.length;
    assert.equal(drive.places.length, n);
    for (const row of drive.places) assert.equal(row.length, n);
    assert.equal(drive.anchors.length, drive.fromAnchor.length);
    for (const row of drive.fromAnchor) assert.equal(row.length, n);
    for (const [name, lat, lng] of deals.meta.region.areas || []) {
      assert.ok(drive.anchors.some((g) => kmApart(g, [lat, lng]) < 1.5), `${a.id}: start points in ${name}`);
    }
  }
});

test("place ids never repeat across areas, so field reports can't mix them up", () => {
  const seen = new Map();
  for (const a of AREAS) for (const p of AREA_DATA[a.id].deals.places) {
    assert.ok(!seen.has(p.id), `${p.id} is in ${seen.get(p.id)} and ${a.id}`);
    seen.set(p.id, a.id);
  }
});

test("the page names the area where it used to say Fargo-Moorhead, and keeps the house location in the footer", () => {
  assert.match(HTML, /<h1>Veterans Day in <span class="area-name">Fargo-Moorhead<\/span><\/h1>/);
  assert.match(HTML, /<span id="drive-safe-transit">/);
  assert.match(/<footer[\s\S]*<\/footer>/.exec(HTML)[0], /Fargo-Moorhead, ND\/MN/);
  assert.match(SCRIPTS["app.js"], /AREA\.center_label/, "the location line names the area's centre");
});

test("closed or absent stores stay out (Smashburger closed Oct 2026, per the publisher; no metro Hy-Vee, Red Robin, Golden Corral, Hooters, Famous Dave's)", () => {
  const ids = new Set(DEALS.offers.map((o) => o.id));
  for (const id of ["smashburger", "hy-vee", "red-robin", "golden-corral", "hooters", "famous-daves"]) assert.ok(!ids.has(id), id);
});
