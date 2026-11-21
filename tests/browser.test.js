// The home page in a real browser (Chromium via Playwright), served by tools/serve.py with the live CSP, and fed the
// sample feeds in tests/fixtures instead of the network. The clock is fixed at NOW (12:00 PM CST, 7 Nov 2026) in
// America/Chicago, so "Updated … ago" and every tooltip are known in advance.
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { launch } from "./lib/browser.js";
import { startSite } from "./lib/server.js";
import { sample, problems, SHAPES } from "./lib/feeds.js";
import { openHub } from "./lib/hub.js";
import { readDrawing, problems as drawingProblems } from "./lib/drawing.js";
import { read, oe, productList } from "./lib/source.js";

const OE = oe();
let browser, site;
before(async () => { site = await startSite(); browser = await launch(); });
after(async () => { await browser?.close(); site?.close(); });

const open = (pathname, opts) => openHub(browser, site, pathname, opts);
const squash = (s) => (s || "").replace(/\s+/g, " ").trim();
const textOf = async (page, sel) => squash(await page.locator(sel).first().textContent());
const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
function clean(t) {
  assert.deepEqual(t.errors, [], "no console errors, script errors or CSP violations");
  assert.deepEqual(t.strays, [], "no requests to sites other than the hub and its six feeds");
}

// The Latest lines as index.html ships them, before any feed arrives.
const STATIC = {};
for (const m of read("site/index.html").matchAll(/<article class="latest-item" id="latest-([a-z]+)">[\s\S]*?<p class="latest-meta">([^<]*)<\/p>[\s\S]*?<span class="latest-body">([^<]*)<\/span>/g)) {
  STATIC[m[1]] = { meta: m[2], body: squash(m[3].replace(/&rsquo;/g, "’")) };
}
async function latest(page, id) {
  return { meta: await textOf(page, `#latest-${id} .latest-meta`), body: await textOf(page, `#latest-${id} .latest-body`),
    topic: await textOf(page, `#latest-${id} .latest-topic`) };
}
async function fresh(page) {
  return page.$$eval(".plist li", (lis) => lis.map((li) => {
    const t = li.querySelector(".p-fresh");
    return { name: li.querySelector(".p-name").textContent, text: t && t.textContent, title: t && t.title,
      late: !!t && t.classList.contains("late"), datetime: t && t.getAttribute("datetime") };
  }));
}

test("the sample feeds have every field the hub reads (the same check check-live.js runs on the real feeds)", () => {
  for (const name of Object.keys(SHAPES)) assert.deepEqual(problems(name, sample(name)), [], name);
});

describe("Latest from the products", () => {
  test("each line shows its feed's newest text and date, under its topic", async () => {
    const t = await open();
    try {
      assert.deepEqual(await latest(t.page, "noisefloor"), { meta: "Noisefloor · 6 Nov 2026",
        body: sample("NOISEFLOOR").brief, topic: "GPS interference:" });
      // The topic T01 has the highest z, but topics never count as zones.
      assert.deepEqual(await latest(t.page, "watchfloor"), { meta: "Watchfloor · 6 Nov 2026",
        body: "Zone Alpha drew 2.40 times its usual news coverage, the furthest above normal of any zone.", topic: "Conflict warning:" });
      assert.deepEqual(await latest(t.page, "vigil"), { meta: "Vigil · 6 Nov 2026", body: sample("VIGIL").brief, topic: "Cyber threats:" });
      assert.deepEqual(await latest(t.page, "cop"), { meta: "COP · 7 Nov 2026",
        body: sample("COP_DIRECTION").summary, topic: "Where concern is moving:" });
      assert.match(await textOf(t.page, "#latest-record"), /^Forecast record: 8 scored, all 8 on the side we called \(3 independent questions; skill is held until 30\)\. Last scored: .+ We said 95%, and it happened\.$/);
      clean(t);
    } finally { await t.close(); }
  });

  test("feed text goes in as text, never as HTML", async () => {
    const hostile = '<img src="x" id="injected">Sample <b>brief</b>';
    const t = await open("/", { feeds: { VIGIL: { json: { ...sample("VIGIL"), brief: hostile } },
      NOISEFLOOR: { json: { ...sample("NOISEFLOOR"), brief: hostile } } } });
    try {
      assert.equal(await textOf(t.page, "#latest-vigil .latest-body"), squash(hostile));
      assert.equal(await textOf(t.page, "#latest-noisefloor .latest-body"), squash(hostile));
      await t.page.locator('#oe-guide [data-g="g2"]').click();
      await t.page.locator('#oe-guide .oe-q[data-p="vigil"]').click();
      assert.match(await textOf(t.page, "#oe-panel .oe-stat"), /Sample <b>brief<\/b>/);
      assert.equal(await t.page.locator("#injected").count(), 0, "no element was created from feed text");
      clean(t);
    } finally { await t.close(); }
  });

  test("with every feed down, the page keeps its static lines, shows no Updated times, and works", async () => {
    const down = Object.fromEntries(["NOISEFLOOR", "WATCHFLOOR", "VIGIL", "COP_HEALTH", "COP_DIRECTION", "ELEMENTS_FEED", "CORDON_FEED", "VIS_FEED", "BLACKOUT_FEED", "HEADWIND_FEED", "ORBIT_FEED", "LAUNCH_FEED", "UNDERTOW_FEED", "WAKE_FEED", "RELIEF_FEED"].map((k) => [k, { abort: true }]));
    const t = await open("/", { feeds: down, allowFailedLoads: true });
    try {
      for (const id of Object.keys(STATIC)) {
        const l = await latest(t.page, id);
        assert.deepEqual({ meta: l.meta, body: l.body }, STATIC[id], id);
      }
      assert.equal(await t.page.locator(".p-fresh").count(), 0);
      assert.equal(await t.page.locator("#oe-guide .oe-gq").count(), 3, "the guide still draws");
      clean(t);
    } finally { await t.close(); }
  });

  test("a 503 from Vigil keeps its static line, and its Updated time comes from COP's health check", async () => {
    const t = await open("/", { feeds: { VIGIL: { status: 503, json: { error: "not sure" } } }, allowFailedLoads: true });
    try {
      const l = await latest(t.page, "vigil");
      assert.deepEqual({ meta: l.meta, body: l.body }, STATIC.vigil);
      const v = (await fresh(t.page)).find((r) => r.name === "Vigil");
      assert.equal(v.text, "Updated 2 h ago", "COP's vigil data_as_of is 16:00 UTC");
      clean(t);
    } finally { await t.close(); }
  });

  test("feeds with missing or broken fields leave the static lines and break nothing", async () => {
    const wf = sample("WATCHFLOOR");
    delete wf.entities.Z01.attention.ratio; // the top zone, which has an alarm, so its ratio is needed
    const t = await open("/", { feeds: {
      NOISEFLOOR: { json: {} }, WATCHFLOOR: { json: wf }, VIGIL: { body: "<html>Bad gateway</html>" },
      COP_HEALTH: { json: { generated_at: "2026-11-07T17:30:00Z", programs: [] } }, COP_DIRECTION: { json: {} },
    } });
    try {
      for (const id of Object.keys(STATIC)) {
        const l = await latest(t.page, id);
        assert.deepEqual({ meta: l.meta, body: l.body }, STATIC[id], id);
      }
      clean(t);
    } finally { await t.close(); }
  });

  test("Watchfloor without an alarm says no zone stood out, and a day still being built says so far", async () => {
    const wf = sample("WATCHFLOOR");
    wf.partial = true;
    for (const z of Object.values(wf.entities)) z.alarms = [];
    const t = await open("/", { feeds: { WATCHFLOOR: { json: wf } } });
    try {
      const l = await latest(t.page, "watchfloor");
      assert.equal(l.meta, "Watchfloor · 6 Nov 2026, so far");
      assert.equal(l.body, "No conflict zone's news coverage stood out from its usual level.");
      clean(t);
    } finally { await t.close(); }
  });
});

describe('"Updated … ago" in the product list', () => {
  test("each live program shows its most direct publish time; programs without a feed show none", async () => {
    const t = await open();
    try {
      const rows = Object.fromEntries((await fresh(t.page)).map((r) => [r.name, r.text]));
      assert.deepEqual(rows, {
        Noisefloor: "Updated 2 h ago", // board built 16:00 UTC
        Watchfloor: "Updated 3 h ago", // built_at 15:00
        Vigil: "Updated 45 min ago", // data_as_of 17:15, not built_at 17:59
        Context: "Updated 5 h ago", // COP's context data_as_of 13:00
        COP: "Updated 30 min ago", // generated_at 17:30
        Elements: "Updated 5 h ago · running late", // Last-Modified 13:00, fresh_hours 2
        Cordon: "Updated 20 min ago", // Last-Modified 17:40, fresh_hours 2
        Vis: "Updated 10 h ago", // its feed's generated_at 08:25; not in the sample COP health, so never late
        Blackout: "Updated 15 min ago", // its feed's generated_at 17:45; not in the sample COP health either
        Headwind: "Updated 4 h ago", // its feed's generated_at 14:00; not in the sample COP health either
        Orbit: "Updated 2 h ago", // its feed's generated_at 16:00; not in the sample COP health either
        Launch: "Updated 2 h ago", // the same
        Undertow: "Updated 1 h ago", // its feed's generated_at 17:00; not in the sample COP health either
        Wake: "Updated 6 h ago", // its feed's generated_at 12:00; not in the sample COP health either
        Relief: "Updated 3 h ago", // its feed's generated_at 15:00; not in the sample COP health either
        PropertyCast: null, "Title 10 Field Guide": null, "Listening Post": null,
      });
      clean(t);
    } finally { await t.close(); }
  });

  test("the tooltip gives the full time in the viewer's zone, and says why a program is late", async () => {
    const t = await open();
    try {
      const rows = Object.fromEntries((await fresh(t.page)).map((r) => [r.name, r]));
      assert.equal(squash(rows.Noisefloor.title), "7 Nov 2026, 10:00 AM CST");
      assert.equal(rows.Noisefloor.datetime, "2026-11-07T16:00:00.000Z");
      assert.equal(squash(rows.Elements.title), "7 Nov 2026, 7:00 AM CST (it usually updates at least every 2 h)");
      assert.equal(rows.Elements.late, true);
      assert.equal(rows.Cordon.late, false);
      clean(t);
    } finally { await t.close(); }
  });

  test("choosing Zulu in the Time settings rewrites the tooltips and the footer date", async () => {
    const t = await open();
    try {
      assert.equal(await textOf(t.page, ".tic-time-btn"), "Time · CST");
      await t.page.locator(".tic-time-btn").click();
      await t.page.locator("#tic-time-zone").selectOption("UTC");
      await t.page.locator(".tic-time-done").click();
      assert.equal(await textOf(t.page, ".tic-time-btn"), "Time · Z");
      const rows = Object.fromEntries((await fresh(t.page)).map((r) => [r.name, r]));
      assert.equal(squash(rows.Noisefloor.title), "7 Nov 2026 16:00Z");
      assert.equal(await textOf(t.page, ".foot time[data-tic]"), /data-tic-year>([^<]+)<\/time>/.exec(read("site/index.html"))[1], "in Zulu the footer shows the UTC date written in the page");
      clean(t);
    } finally { await t.close(); }
  });
});

describe("How the programs fit (the drawing and its guide)", () => {
  const ORDER = OE.GROUPS.flatMap((g) => g.programs);

  test("the guide starts as three closed questions, and opening one closes the others", async () => {
    const t = await open();
    try {
      const qs = t.page.locator("#oe-guide .oe-gq");
      assert.equal(await qs.count(), 3);
      for (let i = 0; i < 3; i++) {
        assert.equal(await qs.nth(i).getAttribute("aria-expanded"), "false");
        assert.equal(await textOf(t.page, `#oe-guide [data-g="${OE.GROUPS[i].id}"] .oe-qt`), OE.GROUPS[i].q);
      }
      await t.page.locator('#oe-guide [data-g="g2"]').click();
      assert.equal(await t.page.locator('[data-g="g2"]').getAttribute("aria-expanded"), "true");
      assert.ok(await t.page.locator("#oe-grp-g2").isVisible());
      assert.deepEqual(await t.page.$$eval("#oe-grp-g2 .oe-q", (bs) => bs.map((b) => b.dataset.p)), OE.GROUPS[1].programs);
      assert.equal(await textOf(t.page, "#oe-panel h3"), OE.GROUPS[1].q);
      // Only programs that are out have an Open link.
      const linked = OE.GROUPS[1].programs.filter((id) => OE.PROGRAMS.find((p) => p.id === id).href);
      assert.equal(await t.page.locator("#oe-grp-g2 .oe-open").count(), linked.length);
      await t.page.locator('#oe-guide [data-g="g1"]').click();
      assert.equal(await t.page.locator('[data-g="g2"]').getAttribute("aria-expanded"), "false");
      assert.ok(await t.page.locator("#oe-grp-g2").isHidden());
      assert.ok(await t.page.locator("#oe-grp-g1").isVisible());
      clean(t);
    } finally { await t.close(); }
  });

  test("a question opens its program's panel, with live counts from the feeds and a new-tab Open link", async () => {
    const t = await open();
    try {
      await t.page.locator('#oe-guide [data-g="g1"]').click();
      assert.equal(await textOf(t.page, '#oe-grp-g1 .oe-q[data-p="watchfloor"] .oe-qm'), "Watchfloor · Beta · 3 zones, 2 topics");
      assert.equal(await textOf(t.page, '#oe-grp-g1 .oe-q[data-p="cop"] .oe-qm'), "COP · Beta · 5/6 feeds up to date");
      await t.page.locator('#oe-grp-g1 .oe-q[data-p="watchfloor"]').click();
      assert.equal(await textOf(t.page, "#oe-panel h3"), "Watchfloor");
      assert.equal(await textOf(t.page, "#oe-panel .oe-stat"),
        "6 Nov 2026: 3 conflict zones and 2 strategic topics, from 12,345 GDELT articles and 678 feed items.");
      const open = t.page.locator("#oe-panel a.oe-btn");
      assert.equal(await open.getAttribute("href"), "https://watchfloor.theintelligence.company");
      assert.equal(await open.getAttribute("target"), "_blank");
      clean(t);
    } finally { await t.close(); }
  });

  test("the keyboard works: Enter opens a question in place, and Enter on a drawing tag pins it", async () => {
    const t = await open();
    try {
      const q = t.page.locator('#oe-guide [data-g="g3"]');
      await q.focus();
      await t.page.keyboard.press("Enter");
      assert.equal(await q.getAttribute("aria-expanded"), "true");
      assert.equal(await t.page.evaluate(() => document.activeElement.getAttribute("data-g")), "g3", "focus stays on the question");
      await t.page.keyboard.press("Enter");
      assert.equal(await q.getAttribute("aria-expanded"), "false");
      await t.page.locator('#oe-svg g.chip[data-p="elements"]').focus();
      await t.page.keyboard.press("Enter");
      assert.equal(await textOf(t.page, "#oe-panel h3"), "Elements");
      await t.page.locator("#oe-panel [data-how]").focus(); // "Back to the guide" (the × is for phones)
      await t.page.keyboard.press("Enter");
      assert.equal(await textOf(t.page, "#oe-panel .oe-k"), "How it works");
      clean(t);
    } finally { await t.close(); }
  });

  test("threads, layers and the full list open their panels", async () => {
    const t = await open();
    try {
      await t.page.locator('#oe-svg .thit[data-thread="t1"]').dispatchEvent("click");
      assert.equal(await textOf(t.page, "#oe-panel h3"), OE.THREADS.t1.name);
      await t.page.locator('#oe-panel [data-layer="ems"]').first().click();
      assert.equal(await textOf(t.page, "#oe-panel h3"), OE.LAYERS.find((l) => l.k === "ems").name);
      await t.page.locator("#oe-guide [data-all]").click();
      assert.equal(await textOf(t.page, "#oe-panel h3"), "Current and planned");
      assert.equal(await t.page.locator("#oe-panel .oe-all button[data-p]").count(), OE.PROGRAMS.length, "every program is listed");
      clean(t);
    } finally { await t.close(); }
  });

  test("on a phone the chips follow the guide's order, and a tapped chip opens the sheet", async () => {
    const t = await open("/", { phone: true });
    try {
      assert.ok(await t.page.locator("#oe-guide").isHidden(), "phones use the chips, not the guide");
      assert.deepEqual(await t.page.$$eval("#oe-chips .oe-chip[data-p]", (bs) => bs.map((b) => b.dataset.p)), ORDER);
      await t.page.locator('#oe-chips .oe-chip[data-p="noisefloor"]').tap();
      assert.ok(await t.page.locator("#layers.sheet").count(), "the panel opens as a sheet");
      assert.equal(await textOf(t.page, "#oe-panel h3"), "Noisefloor");
      assert.equal(await sideways(t.page), 0, "no sideways scroll with the sheet open");
      await t.page.locator("#oe-panel [data-close]").tap();
      assert.equal(await t.page.locator("#layers.sheet").count(), 0);
      clean(t);
    } finally { await t.close(); }
  });

  test("on a phone a sheet opened from the top sits below the house bar, and clears the screen when closed", async () => {
    for (const colorScheme of ["light", "dark"]) {
      const t = await open("/", { phone: true, colorScheme });
      try {
        await t.page.locator('#oe-chips .oe-chip[data-p="noisefloor"]').tap();
        assert.ok(await t.page.locator("#layers.top.sheet").count(), "Noisefloor's sheet opens from the top");
        await t.page.waitForFunction(() => getComputedStyle(document.getElementById("oe-panel")).transform === "none");
        const shown = await t.page.evaluate(() => {
          const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tic-house-h"));
          const panel = document.getElementById("oe-panel"), x = panel.querySelector("[data-close]");
          const r = x.getBoundingClientRect();
          return { bar, top: panel.getBoundingClientRect().top, bottom: panel.getBoundingClientRect().bottom, vh: innerHeight,
            onTop: x.contains(document.elementFromPoint(r.left + r.width / 2, r.top + 1)) };
        });
        assert.equal(shown.bar, 34);
        assert.ok(shown.top >= shown.bar + 8, `the sheet starts below the bar (${shown.top})`);
        assert.ok(shown.bottom <= shown.vh, "the sheet ends on screen");
        assert.ok(shown.onTop, "the close button's top edge is not covered");
        await t.page.locator("#oe-panel [data-close]").tap();
        await t.page.waitForFunction(() => document.getElementById("oe-panel").getBoundingClientRect().top >= innerHeight);
        await t.page.evaluate(() => document.getElementById("layers").classList.add("top"));
        await t.page.waitForFunction(() => document.getElementById("oe-panel").getBoundingClientRect().bottom <= 0);
        clean(t);
      } finally { await t.close(); }
    }
  });

  test("on a phone the closed sheet casts no shadow into view, and the open sheet keeps its shadow", async () => {
    for (const colorScheme of ["light", "dark"]) {
      const t = await open("/", { phone: true, colorScheme });
      const shadow = () => t.page.evaluate(() => getComputedStyle(document.getElementById("oe-panel")).boxShadow);
      const gone = () => t.page.waitForFunction(() => getComputedStyle(document.getElementById("oe-panel")).boxShadow === "none");
      try {
        assert.equal(await shadow(), "none", "closed at load");
        await t.page.locator('#oe-chips .oe-chip[data-p="noisefloor"]').tap();
        assert.match(await shadow(), /0px -?12px 40px/, "open after a tap");
        await t.page.locator("#oe-panel [data-close]").tap();
        await gone();
        await t.page.evaluate(() => { const l = document.getElementById("layers"); l.classList.remove("top"); l.classList.add("sheet"); });
        assert.match(await shadow(), /0px -12px 40px/, "open from the bottom");
        await t.page.evaluate(() => document.getElementById("layers").classList.remove("sheet"));
        await gone();
        await t.page.evaluate(() => document.getElementById("layers").classList.add("top", "sheet"));
        assert.match(await shadow(), /0px 12px 40px/, "open from the top");
        await t.page.evaluate(() => document.getElementById("layers").classList.remove("sheet"));
        await gone();
        clean(t);
      } finally { await t.close(); }
    }
  });
});

describe("the hub design (15 Nov 2026)", () => {
  test("a program's tag glows when COP's snapshot holds something unusual from it, and says how many", async () => {
    const t = await open();
    try {
      const hot = await t.page.$$eval("#oe-svg g.chip.hot", (gs) => gs.map((g) => g.dataset.p).sort());
      assert.deepEqual(hot, ["elements", "noisefloor"]);
      assert.match(await t.page.locator('#oe-svg g.chip[data-p="noisefloor"]').getAttribute("aria-label"), /4 unusual findings today$/);
      assert.match(await t.page.locator('#oe-svg g.chip[data-p="elements"]').getAttribute("aria-label"), /1 unusual finding today$/);
      clean(t);
    } finally { await t.close(); }
  });

  test("How we work and About show in full without a click: no fold (Tom, 18 Nov 2026)", async () => {
    const t = await open();
    try {
      for (const id of ["standards", "about"]) {
        assert.equal(await t.page.locator(`#${id} details`).count(), 0, `#${id} has no fold`);
      }
      assert.ok(await t.page.locator("#standards ol.standards li").first().isVisible(), "the standards list shows");
      const photo = t.page.locator("#about .about-photo img");
      await photo.scrollIntoViewIfNeeded();
      assert.ok(await photo.isVisible(), "the About photo shows");
      assert.ok(await t.page.locator("#about .about-text p").first().isVisible(), "the About text shows");
      clean(t);
    } finally { await t.close(); }
  });
});

describe("the world map under the hero text", () => {
  const marks = (page) => page.locator("#hero-map circle.hv-hit").count();

  test("at desktop width it draws the land and one mark per grid cell, adds no text, and stays beside Latest", async () => {
    for (const width of [1024, 1280, 1440, 1920]) {
      const t = await open("/", { viewport: { width, height: 900 } });
      try {
        await t.page.waitForSelector("#hero-map circle.hv-hit");
        assert.equal(await marks(t.page), 3, "two sample places share a cell");
        assert.equal(await t.page.locator('#hero-map use[href="/img/world-dots.svg#land"]').count(), 1);
        assert.equal(squash(await t.page.locator("#hero-map").textContent()), "");
        assert.equal(await t.page.locator("#hero-map svg").getAttribute("aria-label"), "World map of today's unusual findings");
        const fit = await t.page.evaluate(() => {
          const box = (s) => document.querySelector(s).getBoundingClientRect();
          const m = box("#hero-map"), l = box(".latest"), a = box(".hero-main .actions");
          return { top: m.top - a.bottom, right: l.left - m.right, bottom: Math.abs(l.bottom - m.bottom), height: m.height };
        });
        assert.ok(fit.top >= 0 && fit.right > 0, `${width}: below the button and left of Latest`);
        assert.ok(fit.bottom < 1, `${width}: ends level with the Latest box`);
        assert.ok(fit.height >= 150, `${width}: at least 150 px tall`);
        assert.equal(await sideways(t.page), 0);
        clean(t);
      } finally { await t.close(); }
    }
  });

  test("on a phone it is hidden and fetches nothing", async () => {
    const t = await open("/", { phone: true });
    try {
      assert.equal(await t.page.locator("#hero-map").isVisible(), false);
      assert.equal(await t.page.locator("#hero-map svg").count(), 0);
      const asked = await t.page.evaluate(() => performance.getEntriesByType("resource").map((r) => r.name));
      assert.ok(!asked.some((u) => /world-dots|home-points/.test(u)), "neither map file is requested");
      clean(t);
    } finally { await t.close(); }
  });

  test("with COP's file down or broken it still shows the land, with no errors", async () => {
    for (const spec of [{ abort: true }, { status: 503, body: "" }, { json: { points: "none" } }]) {
      const t = await open("/", { feeds: { COP_POINTS: spec }, allowFailedLoads: true });
      try {
        assert.equal(await t.page.locator("#hero-map use").count(), 1);
        assert.equal(await marks(t.page), 0);
        assert.equal(await t.page.locator("#hero-map svg").getAttribute("aria-label"), "World map");
        clean(t);
      } finally { await t.close(); }
    }
  });

  test("a bad place is skipped, and nothing on the map moves", async () => {
    const t = await open("/", { feeds: { COP_POINTS: { json: { points: [["x", 1], [999, 0], [10, 85], [10, 20]] } } } });
    try {
      await t.page.waitForSelector("#hero-map circle.hv-hit");
      assert.equal(await marks(t.page), 1);
      const moving = await t.page.$$eval("#hero-map, #hero-map *", (els) => els.filter((e) => {
        const c = getComputedStyle(e);
        return c.animationName !== "none" || parseFloat(c.transitionDuration) > 0;
      }).length);
      assert.equal(moving, 0);
      clean(t);
    } finally { await t.close(); }
  });
});

describe("house bar v2.0 on the hub", () => {
  test("the Programs menu marks freshness from the page's own COP health read, and offers every layer on COP", async () => {
    const t = await open();
    let copReads = 0;
    t.page.on("request", (r) => { if (r.url().endsWith("/data/health.json")) copReads++; });
    try {
      await t.page.locator(".tic-house-btn").click();
      await t.page.locator(".tic-house-fnote:not([hidden])").waitFor();
      const late = await t.page.$$eval(".tic-house-item", (as) => as.filter((a) => a.querySelector(".tic-house-dot.f-late"))
        .map((a) => a.querySelector(".tic-house-name").firstChild.textContent));
      assert.deepEqual(late, ["Elements"], "the sample's late program");
      assert.equal(await t.page.locator(".tic-house-dot").count(), 6, "one dot per program in the sample");
      assert.equal(copReads, 0, "the bar reuses the page's read instead of asking COP again");
      assert.equal(await t.page.locator(".tic-house-cop").textContent(), "See every layer together on COP →");
      clean(t);
    } finally { await t.close(); }
  });
});

describe("the drawing's labels", () => {
  // Screens the drawing is sized for (its height follows the window's), from a large desktop to a small phone.
  const SCREENS = [[1920, 1080], [1440, 900], [1366, 768], [1280, 800], [1024, 768], [821, 1000], [820, 1000], [600, 900], [375, 812], [320, 640]];
  async function drawing(width, height) {
    const t = await open("/", { viewport: { width, height }, phone: width <= 820 });
    // Load every font the page declares before measuring: the drawing's monospace face isn't preloaded, and a label
    // measured in a fallback font has a different box.
    await t.page.evaluate(() => Promise.all([...document.fonts].map((f) => f.load().catch(() => {}))).then(() => document.fonts.ready));
    await t.page.waitForTimeout(50);
    return { t, d: await t.page.evaluate(readDrawing) };
  }
  for (const [w, h] of SCREENS) {
    test(`at ${w}×${h} no label or tag overlaps another, leaves its plate, hides under a plate or runs off the edge`, async () => {
      const { t, d } = await drawing(w, h);
      try {
        assert.ok(d.labels.length > 10 && d.tags.length > 15, "found the labels and tags");
        assert.deepEqual(drawingProblems(d), []);
      } finally { await t.close(); }
    });
  }
  test("on a 1440×900 screen or larger every label is at least 9 px tall", async () => {
    for (const [w, h] of [[1440, 900], [1920, 1080]]) {
      const { t, d } = await drawing(w, h);
      try {
        const small = [...d.labels, ...d.tags].filter((l) => l.px && l.px < 9).map((l) => `${l.name} ${l.px.toFixed(1)} px`);
        assert.deepEqual(small, [], `${w}×${h}`);
      } finally { await t.close(); }
    }
  });
  test("on a phone the small labels inside the plates are hidden; layer names, tags and side labels stay", async () => {
    const { t, d } = await drawing(375, 812);
    try {
      assert.equal(await t.page.locator("#oe-svg .ann").evaluateAll((els) => els.filter((e) => getComputedStyle(e).display !== "none").length), 0);
      const names = d.labels.map((l) => l.name);
      for (const n of ["Systems", "Spectrum", "Land andmaritime", "BY KIND", "BY DOCTRINE", "SHARED SEAM"]) assert.ok(names.includes(n), n);
      const small = d.labels.filter((l) => l.px < 7).map((l) => `${l.name} ${l.px.toFixed(1)} px`);
      assert.deepEqual(small, [], "nothing left on the phone drawing is under 7 px");
    } finally { await t.close(); }
  });
});

describe("layout", () => {
  for (const width of [1440, 1280, 1024, 821, 820, 760, 640, 560, 375, 320]) {
    test(`no sideways scroll at ${width} px`, async () => {
      const t = await open("/", { viewport: { width, height: 900 }, phone: width <= 820 });
      try {
        assert.equal(await sideways(t.page), 0);
        clean(t);
      } finally { await t.close(); }
    });
  }

  test("the hero's top line stays on one line at 1280 px", async () => {
    const t = await open("/", { viewport: { width: 1280, height: 900 } });
    try {
      const lines = await t.page.$eval(".hero .kicker", (k) => {
        const lh = parseFloat(getComputedStyle(k).lineHeight) || parseFloat(getComputedStyle(k).fontSize) * 1.2;
        return Math.round(k.getBoundingClientRect().height / lh);
      });
      assert.equal(lines, 1);
    } finally { await t.close(); }
  });
});

describe("the 404 page", () => {
  test("a missing page at any depth gets the styled 404 page with every product", async () => {
    const t = await open("/old/deep/link", { allowFailedLoads: true });
    try {
      assert.equal(t.response.status(), 404);
      assert.equal(await t.page.title(), "Page not found · The Intelligence Company");
      const font = await t.page.$eval("h1", (h) => getComputedStyle(h).fontFamily);
      assert.match(font, /Newsreader/, "the stylesheet and fonts loaded from an absolute path");
      assert.equal(await t.page.locator(".plist li a").count(), productList(read("site/index.html")).length);
      assert.deepEqual(t.errors.filter((e) => !/status of 404/.test(e)), [], "only the page's own 404");
      assert.equal(await sideways(t.page), 0);
    } finally { await t.close(); }
  });

  test("on a phone it doesn't scroll sideways", async () => {
    const t = await open("/missing", { phone: true, allowFailedLoads: true });
    try { assert.equal(await sideways(t.page), 0); } finally { await t.close(); }
  });
});
