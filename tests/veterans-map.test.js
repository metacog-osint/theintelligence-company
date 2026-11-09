// The planner's Map tab in a real browser (Chromium via Playwright), served by tools/serve.py with the live CSP. OSRM's
// public server, the map tiles, the field-report service and the NWS are stand-ins, so this checks what the page would
// send and what it draws, without the network. The clock is fixed on Tue 10 Nov 2026, so the planner is in preview,
// planning Wednesday from 10:00 AM.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startSite } from "./lib/server.js";
import { read } from "./lib/source.js";
import { PHONE } from "./lib/hub.js";

const DEALS = JSON.parse(read("site/veterans/veterans-day/data/deals.json"));
const STORES = new Set(DEALS.places.map((p) => p.lng + "," + p.lat));
const HOME = { lat: 46.87412, lng: -96.83377 };   // a made-up start point: someone's home
const HERE = { latitude: 46.84217, longitude: -96.79153 }; // a made-up live location
const NOW = new Date("2026-11-10T18:00:00Z");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const CORS = { "access-control-allow-origin": "*" };

let browser, site;
before(async () => { site = await startSite(); browser = await chromium.launch(); });
after(async () => { await browser?.close(); site?.close(); });

// An answer shaped like OSRM's for whatever stops were asked for: each leg bends once, joining points are shared,
// and each leg has one annotation distance per segment.
function answerFor(u) {
  const pts = new URL(u).pathname.split("/").pop().split(";").map((p) => p.split(",").map(Number));
  const coords = [pts[0]], legs = [];
  for (let i = 1; i < pts.length; i++) {
    coords.push([pts[i - 1][0], pts[i][1]], pts[i]);
    legs.push({ annotation: { distance: [100, 100] } });
  }
  return { code: "Ok", routes: [{ geometry: { coordinates: coords }, legs }] };
}

// state: what the planner finds in this phone's storage. router: "answer" or "fail" (no connection).
async function openMap({ state = {}, router = "answer", colorScheme = "light", gps = false } = {}) {
  const context = await browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true, timezoneId: "America/Chicago",
    locale: "en-US", colorScheme, ...(gps ? { permissions: ["geolocation"], geolocation: HERE } : {}) });
  await context.addInitScript((s) => { localStorage.setItem("vd2026-v1", JSON.stringify(s)); },
    { previewMin: 600, ...state, gps });
  const sent = [], strays = [], errors = [];
  await context.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.origin === site.url) return route.continue();
    if (u.origin === "https://router.project-osrm.org") {
      sent.push(u.href);
      if (router === "fail") return route.abort("internetdisconnected");
      return route.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: JSON.stringify(answerFor(u.href)) });
    }
    if (u.hostname === "tile.openstreetmap.org") return route.fulfill({ status: 200, contentType: "image/png", body: PNG });
    if (u.origin === "https://vetday.metacog.workers.dev") return route.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: '{"events":[],"overrides":{}}' });
    if (u.origin === "https://api.weather.gov") return route.fulfill({ status: 200, contentType: "application/geo+json", headers: CORS, body: '{"properties":{"periods":[]}}' });
    strays.push(u.href);
    return route.abort();
  });
  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    if (router === "fail" && /Failed to load resource: net::ERR_INTERNET_DISCONNECTED/.test(m.text())) return;
    errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.clock.setFixedTime(NOW);
  await page.goto(site.url + "/veterans/veterans-day/#map");
  await page.waitForSelector("path.vd-line");
  return { page, sent, strays, errors, close: () => context.close() };
}
const count = (page, sel) => page.locator(sel).count();
// Every point a request carries, as "lng,lat".
const pointsOf = (sent) => sent.flatMap((u) => new URL(u).pathname.split("/").pop().split(";"));

test("the route line follows the roads between stores, and only stores are sent: never your start point or location", async () => {
  assert.ok(!STORES.has(HOME.lng + "," + HOME.lat) && !STORES.has(HERE.longitude + "," + HERE.latitude), "the made-up places aren't stores");
  for (const kind of ["start", "gps"]) {
    const t = await openMap(kind === "gps" ? { gps: true } : { state: { start: HOME } });
    try {
      await t.page.waitForSelector("path.vd-line.vd-road");
      assert.equal(t.sent.length, 1, `${kind}: one request for the whole route`);
      const pts = pointsOf(t.sent);
      assert.ok(pts.length >= 2, `${kind}: a route of at least two stops`);
      for (const p of pts) assert.ok(STORES.has(p), `${kind}: ${p} is not a store`);
      for (const u of t.sent) {
        for (const v of [HOME.lat, HOME.lng, HERE.latitude, HERE.longitude]) assert.ok(!u.includes(String(v)), `${kind}: ${v} was sent`);
      }
      // The leg from you to the first stop is a straight line drawn on the phone; the rest follow the roads.
      assert.equal(await count(t.page, "path.vd-line.vd-straight"), 1, `${kind}: one straight leg, from you`);
      assert.ok(await count(t.page, "path.vd-line.vd-road") >= 1);
      assert.equal(await count(t.page, "path.vd-halo"), await count(t.page, "path.vd-line"), "every line has its halo");
      // Back to the Route tab and to the Map again: the road shapes are kept, nothing more is asked.
      await t.page.evaluate(() => { location.hash = "#route"; });
      await t.page.waitForSelector("#tab-route:not([hidden])");
      await t.page.evaluate(() => { location.hash = "#map"; });
      await t.page.waitForSelector("#tab-map:not([hidden]) path.vd-line.vd-road");
      await t.page.waitForTimeout(1500);
      assert.equal(t.sent.length, 1, `${kind}: the road shapes are kept for the visit`);
      assert.deepEqual(t.errors, [], "no console errors or CSP violations");
      assert.deepEqual(t.strays, [], "no requests to other sites");
    } finally { await t.close(); }
  }
});

test("with no location or start point, the line runs between stores only", async () => {
  const t = await openMap();
  try {
    await t.page.waitForSelector("path.vd-line.vd-road");
    assert.equal(await count(t.page, "path.vd-line.vd-straight"), 0, "no leg from the middle of Fargo");
    for (const p of pointsOf(t.sent)) assert.ok(STORES.has(p), p);
    assert.deepEqual(t.errors, []);
  } finally { await t.close(); }
});

test("offline, the route is drawn straight through the stops, and the router isn't asked again at once", async () => {
  const t = await openMap({ state: { start: HOME }, router: "fail" });
  try {
    await t.page.waitForTimeout(1500);
    assert.equal(t.sent.length, 1);
    assert.equal(await count(t.page, "path.vd-line.vd-road"), 0);
    assert.equal(await count(t.page, "path.vd-line.vd-straight"), 2, "you to stop 1, then the stops in order");
    await t.page.evaluate(() => { location.hash = "#route"; });
    await t.page.evaluate(() => { location.hash = "#map"; });
    await t.page.waitForTimeout(1500);
    assert.equal(t.sent.length, 1, "a failed leg waits a minute");
    assert.deepEqual(t.errors, []);
    assert.deepEqual(t.strays, []);
  } finally { await t.close(); }
});

test("the line is ink on a paper halo in light and dark mode, dashed where straight, over the dots and under the numbered stops", async () => {
  const want = { light: { line: "rgb(20, 32, 46)", halo: "rgb(247, 245, 240)" }, dark: { line: "rgb(232, 236, 242)", halo: "rgb(15, 21, 30)" } };
  for (const colorScheme of ["light", "dark"]) {
    const t = await openMap({ state: { start: HOME }, colorScheme });
    try {
      await t.page.waitForSelector("path.vd-line.vd-road");
      const s = await t.page.evaluate(() => {
        const st = (sel) => getComputedStyle(document.querySelector(sel));
        return { line: st("path.vd-line.vd-road").stroke, halo: st("path.vd-halo.vd-road").stroke,
          width: st("path.vd-line.vd-road").strokeWidth, roadDash: st("path.vd-line.vd-road").strokeDasharray,
          straightDash: st("path.vd-line.vd-straight").strokeDasharray,
          pane: Number(st(".leaflet-vdroute-pane").zIndex), dots: Number(st(".leaflet-overlay-pane").zIndex),
          stops: Number(st(".leaflet-marker-pane").zIndex), events: st("path.vd-line.vd-road").pointerEvents };
      });
      assert.equal(s.line, want[colorScheme].line, colorScheme);
      assert.equal(s.halo, want[colorScheme].halo, colorScheme);
      assert.equal(s.width, "4.5px");
      assert.equal(s.roadDash, "none", "solid by road");
      assert.notEqual(s.straightDash, "none", "dashed where straight");
      assert.ok(s.dots < s.pane && s.pane < s.stops, "over the store dots, under the numbered stops");
      assert.equal(s.events, "none", "taps go through the line to the dots");
      assert.deepEqual(t.errors, []);
    } finally { await t.close(); }
  }
});
