// Accessibility: axe-core (WCAG 2.2 A and AA, plus its best practices) on the hub in its main states, on the 404 page
// and on the house bar, in light and dark, desktop and phone. The drawing's labels sit over artwork, where axe can't
// measure contrast, so a last test measures them from a screenshot.
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startSite } from "./lib/server.js";
import { openHub } from "./lib/hub.js";
import { openStandIn } from "./lib/standin.js";
import { axe, describe as explain } from "./lib/axe.js";

let browser, site;
before(async () => { site = await startSite(); browser = await chromium.launch(); });
after(async () => { await browser?.close(); site?.close(); });

// The layers band's background is a radial gradient, which axe can't read. Its lightest point is the worst case for
// its light text, so flatten the band to that colour (#0A111F under rgba(22, 38, 74, .75)) while axe measures.
const BAND_LIGHTEST = ".oe { background: #13213F !important; }";

const HUB_STATES = {
  "at rest": async () => {},
  "a guide question open, a program pinned": async (p) => {
    await p.click('#oe-guide [data-g="g2"]');
    await p.click('#oe-grp-g2 .oe-q[data-p="noisefloor"]');
  },
  "a layer's panel": async (p) => {
    await p.locator('#oe-svg g.chip[data-p="vigil"]').focus();
    await p.keyboard.press("Enter");
    await p.click('#oe-panel [data-layer="cyber"]');
  },
  "a thread's panel": async (p) => { await p.locator('#oe-svg .thit[data-thread="t2"]').dispatchEvent("click"); },
  "every program": async (p) => { await p.click("#oe-guide [data-all]"); },
  "the Time settings dialog": async (p) => { await p.click(".tic-time-btn"); },
};
const PHONE_STATES = {
  "at rest": async () => {},
  "a program's sheet open": async (p) => { await p.tap('#oe-chips .oe-chip[data-p="cop"]'); },
};

async function audit(t, label) {
  await t.page.addStyleTag({ content: BAND_LIGHTEST });
  const undecided = [];
  const v = await axe(t.page, { undecided });
  assert.deepEqual(v, [], `${label}:\n${explain(v)}`);
  // Outside the drawing, every piece of text must be measurable, by axe or against its solid background
  // (a lone arrow glyph isn't text).
  const missed = undecided.filter((u) => !u.inDrawing && !/only non-text characters/.test(u.why) &&
    !(u.solid && u.solid.ratio >= u.solid.need));
  assert.deepEqual(missed, [], `${label}: contrast axe couldn't check`);
}

for (const colorScheme of ["light", "dark"]) {
  describe(`home page, desktop, ${colorScheme}`, () => {
    for (const [name, act] of Object.entries(HUB_STATES)) {
      test(name, async () => {
        const t = await openHub(browser, site, "/", { colorScheme, bypassCSP: true });
        try { await act(t.page); await audit(t, name); } finally { await t.close(); }
      });
    }
  });
  describe(`home page, phone, ${colorScheme}`, () => {
    for (const [name, act] of Object.entries(PHONE_STATES)) {
      test(name, async () => {
        const t = await openHub(browser, site, "/", { colorScheme, phone: true, bypassCSP: true });
        try { await act(t.page); await audit(t, name); } finally { await t.close(); }
      });
    }
  });
  test(`404 page, ${colorScheme}`, async () => {
    const t = await openHub(browser, site, "/missing", { colorScheme, bypassCSP: true, allowFailedLoads: true });
    try { await audit(t, "404"); } finally { await t.close(); }
  });
  for (const phone of [false, true]) {
    test(`house bar with its menu open, ${phone ? "phone" : "desktop"}, ${colorScheme}`, async () => {
      const t = await openStandIn(browser, { colorScheme, phone, bypassCSP: true });
      try {
        await t.page.click(".tic-house-btn");
        const v = await axe(t.page);
        assert.deepEqual(v, [], explain(v));
      } finally { await t.close(); }
    });
  }
}

// ---------------------------------------------------------------- the drawing's labels

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test("every label in the drawing has enough contrast against the artwork behind it", async () => {
  const t = await openHub(browser, site, "/", { bypassCSP: true });
  try {
    const { page } = t;
    await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
    await page.locator("#oe-svg").scrollIntoViewIfNeeded();
    const labels = await page.$$eval("#oe-svg text", (ts) => ts.map((el) => {
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      let opacity = 1;
      for (let e = el; e && e.tagName !== "svg"; e = e.parentElement) opacity *= Number(getComputedStyle(e).opacity);
      const m = el.getScreenCTM();
      return { text: el.textContent.trim(), fill: cs.fill, opacity: opacity * Number(cs.fillOpacity),
        px: parseFloat(cs.fontSize) * Math.hypot(m.a, m.b), bold: Number(cs.fontWeight) >= 700,
        box: { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }, shown: r.width > 0 && cs.visibility !== "hidden" };
    }).filter((l) => l.shown));
    assert.ok(labels.length > 40, "found the drawing's labels");
    // Hide the labels, photograph what's behind them, and read each label's patch of background.
    await page.addStyleTag({ content: "#oe-svg text { visibility: hidden !important; }" });
    const png = (await page.screenshot({ fullPage: true })).toString("base64");
    const patches = await page.evaluate(async ({ png, boxes }) => {
      const img = new Image();
      img.src = "data:image/png;base64," + png;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0);
      return boxes.map((b) => Array.from(g.getImageData(Math.floor(b.x), Math.floor(b.y), Math.max(1, Math.ceil(b.w)), Math.max(1, Math.ceil(b.h))).data));
    }, { png, boxes: labels.map((l) => l.box) });
    const low = [];
    labels.forEach((l, i) => {
      const d = patches[i], px = [];
      for (let k = 0; k < d.length; k += 4) px.push([d[k], d[k + 1], d[k + 2]]);
      px.sort((a, b) => lum(a) - lum(b));
      const bg = px[Math.floor(px.length / 2)]; // the typical colour behind the label
      const m = /rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?/.exec(l.fill);
      const a = (m[4] ? Number(m[4]) : 1) * l.opacity;
      const fg = [1, 2, 3].map((k, j) => Number(m[k]) * a + bg[j] * (1 - a));
      const need = l.px >= 24 || (l.bold && l.px >= 18.66) ? 3 : 4.5;
      const r = ratio(fg, bg);
      if (r < need) low.push(`"${l.text}" ${r.toFixed(2)}:1 (needs ${need}:1)`);
    });
    assert.deepEqual(low, []);
  } finally { await t.close(); }
});
