// "Elsewhere today" (site/shared/tic-related.js + .css), the card each program page carries with the other layers'
// findings in its countries from COP's agent index. The pick rules are tested in Node on a fixture index; the card,
// its lazy read and its failure in a browser on a stand-in program page under a strict CSP; axe in light and dark.
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { launch } from "./lib/browser.js";
import { read } from "./lib/source.js";
import { openModulePage } from "./lib/modpage.js";
import { axe, describe as explain } from "./lib/axe.js";

const SRC = read("site/shared/tic-related.js");
const H = 36e5;

// The module in a bare window, for its pick rules (TicRelated._pick, _decode).
function loadModule() {
  const window = {};
  const document = { readyState: "complete", querySelectorAll: () => [] };
  vm.runInNewContext(SRC, { window, document, Date, Intl, Math, Number, String, Array, JSON, Promise });
  return window.TicRelated;
}
const R = loadModule();

// COP's agent index is columnar: `fields` names the columns, and repeated labels are numbers into `codes`.
const FIELDS = ["id", "program", "title", "countries", "tier", "kind", "status_class", "data_as_of",
  "data_as_of_precision", "valid_until", "stale", "us_person_data", "link"];
const CODES = { program: ["elements", "cordon", "headwind", "blackout", "noisefloor", "vis"],
  tier: ["routine", "anomaly", "warning"] };
function index(items, at) {
  const rows = items.map((it) => FIELDS.map((f) => {
    const v = it[f] ?? (f === "tier" ? "routine" : f === "kind" ? "observation" : f === "stale" ? false : null);
    return CODES[f] && v != null ? CODES[f].indexOf(v) : v;
  }));
  return { fields: FIELDS, codes: CODES, rows, programs: {}, bus_generated_at: at };
}
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
const day = (ms, back = 0) => { const d = new Date(ms); return iso(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back)); };
const ids = (hits) => hits.map((r) => r.id);
const pick = (items, opts, now) => R._pick(R._decode(index(items, iso(now))), opts, now);

// A fixed clock mid-afternoon UTC, so "two days back" and "48 hours" differ.
const NOW = Date.UTC(2026, 10, 16, 15, 0, 0);
const at = (h) => iso(NOW - h * H);

describe("the pick rules, on a fixture index", () => {
  test("the index decodes: coded labels become their names", () => {
    const d = R._decode(index([{ id: "a", program: "cordon", tier: "anomaly", countries: ["IR"], data_as_of: at(1) }], iso(NOW)));
    assert.equal(d.rows[0].program, "cordon");
    assert.equal(d.rows[0].tier, "anomaly");
    assert.deepEqual(d.rows[0].countries, ["IR"]);
    assert.equal(d.at, iso(NOW));
    assert.throws(() => R._decode({ rows: [] }), /unexpected shape/);
  });

  test("only other programs' current items in the page's countries; never the page's own, stale, expired or individuals", () => {
    const items = [
      { id: "ok", program: "elements", countries: ["IR"], data_as_of: at(2) },
      { id: "own", program: "blackout", countries: ["IR"], data_as_of: at(1) },
      { id: "elsewhere", program: "cordon", countries: ["FR"], data_as_of: at(1) },
      { id: "stale", program: "cordon", countries: ["IR"], data_as_of: at(1), stale: true },
      { id: "expired", program: "cordon", countries: ["IR"], data_as_of: at(3), valid_until: at(1) },
      { id: "valid", program: "cordon", countries: ["IR"], data_as_of: at(3), valid_until: iso(NOW + H) },
      { id: "people", program: "headwind", countries: ["IR"], data_as_of: at(1), us_person_data: "individuals" },
      { id: "orgs", program: "headwind", countries: ["IR"], data_as_of: at(4), us_person_data: "organizations" },
      { id: "lower", program: "vis", countries: ["ir"], data_as_of: at(1) },
    ];
    assert.deepEqual(ids(pick(items, { countries: ["ir"], here: "blackout" }, NOW)).sort(), ["ok", "orgs", "valid"]);
  });

  test("unusual first, then the page's country order, then newest", () => {
    const items = [
      { id: "ru-new", program: "cordon", countries: ["RU"], data_as_of: at(1) },
      { id: "ir-old", program: "elements", countries: ["IR"], data_as_of: at(20) },
      { id: "ir-new", program: "headwind", countries: ["IR"], data_as_of: at(5) },
      { id: "ru-unusual", program: "noisefloor", countries: ["RU"], tier: "anomaly", data_as_of: at(30) },
      { id: "both", program: "vis", countries: ["RU", "IR"], data_as_of: at(10) },
    ];
    assert.deepEqual(ids(pick(items, { countries: ["IR", "RU"], here: "blackout" }, NOW)),
      ["ru-unusual", "ir-new", "both", "ir-old", "ru-new"]);
  });

  test("timed items: the last 48 hours, and nothing more than an hour ahead", () => {
    const items = [
      { id: "47h", program: "elements", countries: ["IR"], data_as_of: at(47) },
      { id: "49h", program: "elements", countries: ["IR"], data_as_of: at(49) },
      { id: "soon", program: "elements", countries: ["IR"], data_as_of: at(-0.5) },
      { id: "ahead", program: "elements", countries: ["IR"], data_as_of: at(-2) },
      { id: "undated", program: "elements", countries: ["IR"], data_as_of: "not a date" },
    ];
    assert.deepEqual(ids(pick(items, { countries: ["IR"] }, NOW)).sort(), ["47h", "soon"]);
  });

  test("day precision: today and the two UTC days before count; three back and tomorrow don't", () => {
    const items = [0, 1, 2, 3, -1].map((b) => ({ id: "d" + b, program: "noisefloor", countries: ["IR"],
      data_as_of: day(NOW, b), data_as_of_precision: "day" }));
    assert.deepEqual(ids(pick(items, { countries: ["IR"] }, NOW)).sort(), ["d0", "d1", "d2"]);
    // Two days back at midnight is 63 hours before NOW: a timed item that old would be out.
    assert.deepEqual(ids(pick([{ id: "t", program: "noisefloor", countries: ["IR"], data_as_of: day(NOW, 2) }],
      { countries: ["IR"] }, NOW)), []);
  });

  test("month precision never shows, even this month", () => {
    const items = [{ id: "m", program: "headwind", countries: ["IR"], data_as_of: day(NOW, 15).slice(0, 8) + "01T00:00:00Z",
      data_as_of_precision: "month" }];
    assert.deepEqual(pick(items, { countries: ["IR"] }, NOW), []);
  });
});

// ---------------------------------------------------------------- in a browser

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

// A live index for the browser tests, dated from the real clock.
function liveIndex() {
  const now = Date.now(), ago = (h) => iso(now - h * H);
  return index([
    { id: "e1", program: "elements", title: "M5.1 earthquake, southern Iran", countries: ["IR"], tier: "anomaly",
      data_as_of: ago(2), link: "https://elements.theintelligence.company/#e1" },
    { id: "e2", program: "elements", title: "M4.0 earthquake, northern Iran", countries: ["IR"], data_as_of: ago(3) },
    { id: "h1", program: "headwind", title: "Rial at its lowest in a year", countries: ["IR"], data_as_of: day(now),
      data_as_of_precision: "day" },
    { id: "c1", program: "cordon", title: "Travel advice updated", countries: ["RU"], data_as_of: ago(5),
      link: "https://elsewhere.example/c1" },
    { id: "b1", program: "blackout", title: "Our own outage", countries: ["IR"], tier: "anomaly", data_as_of: ago(1) },
  ], ago(1));
}
const CARD = '<section id="tic-related" data-tic-related data-countries="IR RU" data-here="blackout" data-level="2" hidden></section>';
const NEAR = `<h1>Stand-in program page</h1><p>Overview.</p>${CARD}`;
const FAR = `<h1>Stand-in program page</h1><p>Overview.</p><div class="spacer"></div>${CARD}<p>After the card.</p>`;
const notLoadErrors = (errors) => errors.filter((e) => !/Failed to load resource/.test(e));
async function waitHits(t, n) {
  for (let i = 0; i < 100 && t.copHits.n < n; i++) await t.page.waitForTimeout(50);
}

test("the card: three items, one per program first, labels, links, the rest on COP, read once without cookies", async () => {
  const t = await openModulePage(browser, { body: NEAR, modules: ["tic-related"], index: liveIndex(), cookie: true });
  try {
    const card = t.page.locator("#tic-related");
    await card.waitFor({ state: "visible" });
    assert.equal(t.copHits.n, 1);
    assert.deepEqual(t.copHits.cookie, [""], "the COP read carries no cookies");
    assert.equal(await card.locator("h2").textContent(), "Elsewhere today");
    assert.equal(await card.getAttribute("aria-labelledby"), "tic-related-h");
    const who = await card.locator(".tic-rel-who strong").allTextContents();
    assert.deepEqual(who, ["Elements", "Headwind", "Cordon"], "one per program before any repeats; never the page's own");
    const items = card.locator(".tic-rel-item");
    assert.match(await items.nth(0).locator(".tic-rel-tag").textContent(), /^Unusual$/);
    assert.ok((await items.nth(0).getAttribute("class")).includes("tic-rel-l-"), "the layer's dot colour");
    // A day-precision item gives its date, never a time or another zone.
    const when = await items.nth(1).locator(".tic-rel-when").textContent();
    assert.match(when, /^\d{1,2} [A-Z][a-z]{2} \d{4}$/);
    // A link into the program's own site is kept; one elsewhere falls back to the program's home page.
    const links = await card.locator(".tic-rel-open").evaluateAll((as) => as.map((a) => [a.href, a.target, a.rel]));
    assert.equal(links[0][0], "https://elements.theintelligence.company/#e1");
    assert.equal(links[2][0], "https://cordon.theintelligence.company/");
    assert.ok(links.every(([, target, rel]) => target === "_blank" && rel === "noopener"));
    const foot = await card.locator(".tic-rel-foot").textContent();
    assert.match(foot, /^1 more on COP\. /);
    assert.match(foot, /Unusual means unusual against that program's own baseline; it is not a warning\./);
    assert.ok(!/\b(check|verif)/i.test(await card.textContent()), "COP is never said to check or verify");
    assert.equal(await card.locator(".tic-rel-cop").getAttribute("href"), "https://cop.theintelligence.company/");
    // Calling render again with other countries redraws from the same read.
    await t.page.evaluate(() => window.TicRelated.render(document.getElementById("tic-related"), { countries: ["RU"], here: "blackout" }));
    assert.deepEqual(await card.locator(".tic-rel-who strong").allTextContents(), ["Cordon"]);
    assert.equal(t.copHits.n, 1, "still one read");
    assert.deepEqual(t.errors, [], "no CSP violations or script errors");
    assert.deepEqual(t.strays, []);
  } finally { await t.close(); }
});

test("nothing there: the card says so", async () => {
  const t = await openModulePage(browser, { body: NEAR.replace("IR RU", "IS"), modules: ["tic-related"], index: liveIndex() });
  try {
    await t.page.locator("#tic-related").waitFor({ state: "visible" });
    assert.match(await t.page.locator(".tic-rel-sub").textContent(), / in Iceland /);
    assert.equal(await t.page.locator(".tic-rel-empty").count(), 1);
    assert.equal(await t.page.locator(".tic-rel-item").count(), 0);
  } finally { await t.close(); }
});

test("a failed read leaves the card hidden, with no script errors", async () => {
  for (const index of [{ status: 503 }, { fields: "not columns" }]) {
    const t = await openModulePage(browser, { body: NEAR, modules: ["tic-related"], index });
    try {
      await waitHits(t, 1);
      await t.page.waitForTimeout(300);
      assert.equal(t.copHits.n, 1);
      assert.ok(await t.page.locator("#tic-related").isHidden());
      assert.equal(await t.page.locator("#tic-related").evaluate((e) => e.childElementCount), 0);
      assert.deepEqual(notLoadErrors(t.errors), []);
    } finally { await t.close(); }
  }
});

test("no read until the card comes near the screen (card well below the fold)", async () => {
  for (const phone of [false, true]) {
    const t = await openModulePage(browser, { body: FAR, modules: ["tic-related"], index: liveIndex(), phone });
    try {
      await t.page.waitForTimeout(800);
      assert.equal(t.copHits.n, 0, "no read at load");
      assert.equal(await t.page.locator(".tic-rel-near").count(), 1, "the marker before the card is watched");
      await t.page.evaluate(() => window.scrollTo(0, 1500));
      await t.page.waitForTimeout(500);
      assert.equal(t.copHits.n, 0, "no read while the card is still far below");
      await t.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await t.page.locator("#tic-related").waitFor({ state: "visible" });
      assert.equal(t.copHits.n, 1);
      assert.equal(await t.page.locator(".tic-rel-near").count(), 0, "the marker goes once the read starts");
      assert.deepEqual(t.errors, []);
    } finally { await t.close(); }
  }
});

for (const colorScheme of ["light", "dark"]) {
  for (const phone of [false, true]) {
    test(`axe: the card, ${colorScheme}, ${phone ? "phone" : "desktop"}`, async () => {
      const t = await openModulePage(browser, { body: NEAR, modules: ["tic-related"], index: liveIndex(), phone,
        colorScheme, bypassCSP: true });
      try {
        await t.page.locator("#tic-related").waitFor({ state: "visible" });
        await t.page.evaluate(() => window.scrollTo(0, 0));
        const v = await axe(t.page);
        assert.deepEqual(v, [], explain(v));
        const wide = await t.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert.ok(wide <= 0, `no sideways scroll (${wide} px)`);
      } finally { await t.close(); }
    });
  }
}
