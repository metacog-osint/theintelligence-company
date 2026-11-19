// The light-page header row (site/shared/tic-shell.css): the layer chip in the drawing's own colours, the reading
// line and the figure-first tiles, on a stand-in program page under a strict CSP with the house bar, with axe in
// light and dark on a phone and a desktop.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { launch } from "./lib/browser.js";
import { openModulePage } from "./lib/modpage.js";
import { axe, describe as explain } from "./lib/axe.js";
import { read } from "./lib/source.js";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

// The drawing's layer colours, read from the drawing's own stylesheet: the chips must match them.
const DRAWING = Object.fromEntries([...read("site/oe/oe.css").matchAll(/\.c-([a-z]+) \{ color: (#[0-9A-Fa-f]{6})/g)]
  .map((m) => [m[1], m[2].toUpperCase()]));
const LAYERS = ["systems", "human", "cyber", "ems", "space", "air", "land"];

const BODY = (reading = "") => `<div class="brand"><strong>Stand-in</strong><a class="tic-layer"
  href="https://theintelligence.company/#layers">Human layer</a><span>The Intelligence Company</span></div>
<h1>A statement headline</h1>
<p class="tic-reading" id="reading">${reading}</p>
<div class="tiles tic-tiles" id="tiles">${["Networks", "Publishers", "Countries", "Operations"].map((k, i) =>
  `<div class="tile"><span class="k">${k}</span><span class="v">${(i + 1) * 7}</span></div>`).join("")}</div>
<p>The lede.</p>`;
const READING = '<span class="tic-reading-k">Today’s reading</span><b>9</b> of the 16 records had a report.';
const open = (opts) => openModulePage(browser, { origin: "https://undertow.theintelligence.company", body: BODY(READING),
  modules: ["tic-shell"], ...opts });
const hex = (rgb) => "#" + rgb.match(/\d+/g).slice(0, 3).map((n) => (+n).toString(16).padStart(2, "0")).join("").toUpperCase();

test("the drawing's stylesheet names all seven layers", () => {
  assert.deepEqual(Object.keys(DRAWING).filter((k) => LAYERS.includes(k)).sort(), LAYERS.slice().sort());
});

test("each layer's chip and reading edge take the drawing's colour, with dark ink at 4.5:1 or better", async () => {
  const t = await open();
  try {
    for (const k of LAYERS) {
      const got = await t.page.evaluate((k) => {
        document.documentElement.dataset.ticLayer = k;
        const c = getComputedStyle(document.querySelector(".tic-layer"));
        return { bg: c.backgroundColor, ink: c.color, edge: getComputedStyle(document.getElementById("reading")).borderLeftColor };
      }, k);
      assert.equal(hex(got.bg), DRAWING[k], k + " chip");
      assert.equal(hex(got.edge), DRAWING[k], k + " reading edge");
      const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      const lum = (s) => { const [r, g, b] = s.match(/\d+/g).map(Number); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
      const [hi, lo] = [lum(got.bg), lum(got.ink)].sort((a, b) => b - a);
      assert.ok((hi + 0.05) / (lo + 0.05) >= 4.5, k + " contrast");
    }
    assert.ok((await t.page.locator(".tic-layer").boundingBox()).height >= 24, "target size");
    assert.deepEqual(t.errors, [], "no CSP violations or script errors");
    assert.deepEqual(t.strays, []);
  } finally { await t.close(); }
});

test("tiles show the figure above its label, label first in the markup; two across on a phone", async () => {
  for (const phone of [false, true]) {
    const t = await open({ phone });
    try {
      const r = await t.page.evaluate(() => {
        const tile = document.querySelector(".tile"), k = tile.querySelector(".k"), v = tile.querySelector(".v");
        return { vAbove: v.getBoundingClientRect().top < k.getBoundingClientRect().top, labelFirst: tile.firstElementChild === k,
          cols: getComputedStyle(document.getElementById("tiles")).gridTemplateColumns.split(" ").length,
          sideways: document.documentElement.scrollWidth > window.innerWidth };
      });
      assert.ok(r.vAbove, "figure above label");
      assert.ok(r.labelFirst, "label first in the markup");
      if (phone) assert.equal(r.cols, 2);
      assert.equal(r.sideways, false);
    } finally { await t.close(); }
  }
});

test("an empty reading takes no space", async () => {
  const t = await openModulePage(browser, { origin: "https://undertow.theintelligence.company", body: BODY(""), modules: ["tic-shell"] });
  try {
    assert.equal(await t.page.evaluate(() => document.getElementById("reading").getBoundingClientRect().height), 0);
  } finally { await t.close(); }
});

for (const colorScheme of ["light", "dark"]) {
  for (const phone of [false, true]) {
    test(`axe: no violations, ${colorScheme}, ${phone ? "phone" : "desktop"}`, async () => {
      const t = await open({ colorScheme, phone, bypassCSP: true });
      try {
        await t.page.evaluate(() => { document.documentElement.dataset.ticLayer = "human"; });
        const v = await axe(t.page);
        assert.deepEqual(v, [], explain(v));
      } finally { await t.close(); }
    });
  }
}
