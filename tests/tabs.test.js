// The sections row (site/shared/tic-tabs.js + .css): one group at a time on phones, every group with a jumping row on
// wider screens, deep links into a group, the keyboard, no script, and axe in light and dark, on a stand-in program
// page under a strict CSP with the house bar.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { launch } from "./lib/browser.js";
import { openModulePage } from "./lib/modpage.js";
import { axe, describe as explain } from "./lib/axe.js";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const GROUP = (id, label, inner) => `<div id="${id}" class="grp" data-tab-label="${label}">${inner}</div>`;
const BODY = `<h1>Stand-in program page</h1><p>The map and the summary.</p>
<div data-tic-tabs>
${GROUP("sec-changes", "Changes", '<h2>Changes</h2><p>What changed. <a href="#sec-sources">See the sources</a></p>')}
${GROUP("sec-travel", "Travel", '<h2>Travel</h2><p>Advice by country. <a href="https://example.org/">A source</a></p>')}
${GROUP("sec-sources", "Sources", '<h2 id="health-h">Sources and freshness</h2><p>Every source.</p>')}
</div><p>After the sections.</p>`;
const open = (opts) => openModulePage(browser, { origin: "https://cordon.theintelligence.company", body: BODY,
  modules: ["tic-tabs"], ...opts });
const shown = (page) => page.$$eval("[data-tab-label]", (gs) => gs.filter((g) => !g.hidden).map((g) => g.id));
const current = (page) => page.$$eval(".tic-tabs-nav a", (as) => as.filter((a) => a.getAttribute("aria-current") === "true").map((a) => a.textContent));

test("the row: a labelled nav of links to the groups, before the groups, sticky under the house bar", async () => {
  const t = await open();
  try {
    const nav = t.page.locator("nav.tic-tabs-nav");
    assert.equal(await nav.getAttribute("aria-label"), "Sections on this page");
    assert.deepEqual(await nav.locator("a").evaluateAll((as) => as.map((a) => [a.textContent, a.getAttribute("href")])),
      [["Changes", "#sec-changes"], ["Travel", "#sec-travel"], ["Sources", "#sec-sources"]]);
    assert.ok(await nav.evaluate((n) => n.nextElementSibling.hasAttribute("data-tic-tabs")));
    assert.equal(await nav.evaluate((n) => getComputedStyle(n).position), "sticky");
    await t.page.evaluate(() => window.scrollTo(0, 1200));
    const gap = await t.page.evaluate(() => document.querySelector(".tic-tabs-nav").getBoundingClientRect().top -
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tic-house-h")));
    assert.ok(Math.abs(gap) < 1, `the row sits just under the house bar (${gap} px)`);
    assert.deepEqual(t.errors, [], "no CSP violations or script errors");
    assert.deepEqual(t.strays, []);
  } finally { await t.close(); }
});

test("desktop: every group shows, nothing is marked current, and a link jumps to its group", async () => {
  const t = await open();
  try {
    assert.deepEqual(await shown(t.page), ["sec-changes", "sec-travel", "sec-sources"]);
    assert.deepEqual(await current(t.page), []);
    await t.page.click('.tic-tabs-nav a[href="#sec-sources"]');
    await t.page.waitForFunction(() => location.hash === "#sec-sources");
    const top = await t.page.locator("#sec-sources").evaluate((g) => g.getBoundingClientRect().top);
    assert.ok(top >= 0 && top < 200, `the group is at the top of the screen (${top} px)`);
    assert.deepEqual(await shown(t.page), ["sec-changes", "sec-travel", "sec-sources"]);
  } finally { await t.close(); }
});

test("phone: one group at a time; a link opens its group under the row, marks it, and keeps the address", async () => {
  const t = await open({ phone: true });
  try {
    assert.deepEqual(await shown(t.page), ["sec-changes"]);
    assert.deepEqual(await current(t.page), ["Changes"]);
    await t.page.evaluate(() => {
      window.shownEvents = [];
      document.addEventListener("tic-tabs:show", (e) => window.shownEvents.push(e.target.id));
    });
    await t.page.click('.tic-tabs-nav a[href="#sec-travel"]');
    assert.deepEqual(await shown(t.page), ["sec-travel"]);
    assert.deepEqual(await current(t.page), ["Travel"]);
    assert.equal(await t.page.evaluate(() => location.hash), "#sec-travel");
    assert.deepEqual(await t.page.evaluate(() => window.shownEvents), ["sec-travel"], "tic-tabs:show for a map to redraw");
    // A link inside one group to another opens that group.
    await t.page.click('.tic-tabs-nav a[href="#sec-changes"]');
    await t.page.click('#sec-changes a[href="#sec-sources"]');
    await t.page.waitForFunction(() => !document.getElementById("sec-sources").hidden);
    assert.deepEqual(await shown(t.page), ["sec-sources"]);
    const wide = await t.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(wide <= 0, `no sideways scroll (${wide} px)`);
    assert.deepEqual(t.errors, []);
  } finally { await t.close(); }
});

test("a deep link to something inside a group (#health-h) opens that group, on a phone and on desktop", async () => {
  const t = await open({ phone: true, hash: "#health-h" });
  try {
    assert.deepEqual(await shown(t.page), ["sec-sources"]);
    assert.deepEqual(await current(t.page), ["Sources"]);
    assert.ok(await t.page.locator("#health-h").isVisible());
  } finally { await t.close(); }
  const d = await open({ hash: "#health-h" });
  try {
    assert.deepEqual(await shown(d.page), ["sec-changes", "sec-travel", "sec-sources"]);
    const top = await d.page.locator("#health-h").evaluate((h) => h.getBoundingClientRect().top);
    assert.ok(top >= 0 && top < 200, `the heading is on screen (${top} px)`);
  } finally { await d.close(); }
});

test("phone, keyboard: Tab reaches the row, Enter opens a group and keeps focus, hidden groups are skipped", async () => {
  const t = await open({ phone: true });
  try {
    await t.page.locator('.tic-tabs-nav a[href="#sec-travel"]').focus();
    await t.page.keyboard.press("Enter");
    assert.deepEqual(await shown(t.page), ["sec-travel"]);
    assert.equal(await t.page.evaluate(() => document.activeElement.getAttribute("href")), "#sec-travel");
    // Tab from the row's last link goes into the open group, never into a hidden one.
    await t.page.locator('.tic-tabs-nav a[href="#sec-sources"]').focus();
    await t.page.keyboard.press("Tab");
    assert.equal(await t.page.evaluate(() => document.activeElement.closest("[data-tab-label]")?.id), "sec-travel");
    assert.ok(await t.page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle !== "none" ||
      document.activeElement.matches(":focus-visible")));
  } finally { await t.close(); }
});

test("a resize between phone and desktop switches modes and keeps the current group", async () => {
  const t = await open({ phone: true });
  try {
    await t.page.click('.tic-tabs-nav a[href="#sec-sources"]');
    await t.page.setViewportSize({ width: 1200, height: 900 });
    await t.page.waitForFunction(() => document.querySelectorAll("[data-tab-label][hidden]").length === 0);
    assert.deepEqual(await current(t.page), []);
    await t.page.setViewportSize({ width: 375, height: 812 });
    await t.page.waitForFunction(() => document.querySelectorAll("[data-tab-label][hidden]").length === 2);
    assert.deepEqual(await shown(t.page), ["sec-sources"]);
  } finally { await t.close(); }
});

test("without script every group shows and there is no row", async () => {
  const t = await open({ phone: true, javaScriptEnabled: false });
  try {
    assert.deepEqual(await t.page.$$eval("[data-tab-label]", (gs) => gs.filter((g) => g.getClientRects().length).map((g) => g.id)),
      ["sec-changes", "sec-travel", "sec-sources"]);
    assert.equal(await t.page.locator("nav.tic-tabs-nav").count(), 0);
  } finally { await t.close(); }
});

for (const colorScheme of ["light", "dark"]) {
  for (const phone of [false, true]) {
    test(`axe: the row and groups, ${colorScheme}, ${phone ? "phone" : "desktop"}, from the top of the page`, async () => {
      const t = await open({ phone, colorScheme, bypassCSP: true });
      try {
        // From the top: once the sticky row has scrolled over a link, axe reads that link as obscured.
        await t.page.evaluate(() => window.scrollTo(0, 0));
        const v = await axe(t.page);
        assert.deepEqual(v, [], explain(v));
        if (phone) {
          await t.page.click('.tic-tabs-nav a[href="#sec-travel"]');
          await t.page.evaluate(() => window.scrollTo(0, 0));
          const w = await axe(t.page);
          assert.deepEqual(w, [], explain(w));
        }
      } finally { await t.close(); }
    });
  }
}
