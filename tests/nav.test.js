// The house bar (site/shared/tic-nav.js + .css), which every program site carries, tested on a stand-in product page
// served at a program's own address under a strict CSP, as the sites serve it.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { ticNav } from "./lib/source.js";
import { openStandIn } from "./lib/standin.js";

const NAV = ticNav();
let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });
const open = (opts) => openStandIn(browser, opts);
const btn = (page) => page.locator(".tic-house-btn");
const focusedName = (page) => page.evaluate(() => document.activeElement.querySelector(".tic-house-name")?.firstChild.textContent);

test("the bar mounts first in <body>, links home, and finds the program from the host name", async () => {
  const t = await open();
  try {
    assert.equal(await t.page.evaluate(() => document.body.firstElementChild.className), "tic-house");
    assert.equal(await t.page.locator(".tic-house").getAttribute("aria-label"), "The Intelligence Company");
    assert.equal(await t.page.locator(".tic-house-home").getAttribute("href"), "https://theintelligence.company/");
    assert.equal(await btn(t.page).getAttribute("aria-expanded"), "false");
    assert.ok(await t.page.locator("#tic-house-panel").isHidden());
    await btn(t.page).click();
    const here = t.page.locator('.tic-house-item[aria-current="page"]');
    assert.equal(await here.count(), 1);
    assert.equal(await here.getAttribute("href"), "https://vigil.theintelligence.company");
    assert.match(await here.textContent(), /You are here/);
    assert.deepEqual(t.errors, [], "no CSP violations or script errors");
    assert.deepEqual(t.strays, []);
  } finally { await t.close(); }
});

test("the menu lists every program in its group, opens in the same tab, and starts on the current program", async () => {
  const t = await open();
  try {
    await btn(t.page).click();
    assert.equal(await btn(t.page).getAttribute("aria-expanded"), "true");
    assert.deepEqual(await t.page.$$eval(".tic-house-group", (ps) => ps.map((p) => p.textContent)), ["Across the layers", "Other tools"]);
    const items = await t.page.$$eval(".tic-house-item", (as) => as.map((a) => ({ href: a.getAttribute("href"), target: a.target })));
    const order = ["layers", "tools"].flatMap((g) => NAV.programs.filter((p) => p.group === g));
    assert.deepEqual(items.map((i) => i.href), order.map((p) => p.href));
    assert.ok(items.every((i) => i.target === ""), "site navigation stays in the same tab");
    const vigil = NAV.programs.find((p) => p.id === "vigil");
    assert.equal(await t.page.locator(".tic-house-dname").textContent(), "Vigil");
    assert.equal(await t.page.locator(".tic-house-dmeta").textContent(), vigil.label + " · Live · you are here");
    assert.equal(await t.page.locator(".tic-house-dlong").textContent(), vigil.long);
  } finally { await t.close(); }
});

test("hovering or focusing a program shows its long description beside the list", async () => {
  const t = await open();
  try {
    await btn(t.page).click();
    const elements = NAV.programs.find((p) => p.id === "elements");
    await t.page.locator('.tic-house-item[href="https://elements.theintelligence.company"]').hover();
    assert.equal(await t.page.locator(".tic-house-dname").textContent(), "Elements");
    assert.equal(await t.page.locator(".tic-house-dlong").textContent(), elements.long);
    const box = await t.page.locator(".tic-house-detail").boundingBox();
    assert.ok(box && box.width > 150, "the side panel shows on desktop");
  } finally { await t.close(); }
});

test("keyboard: arrows, Home and End move through the programs; Esc closes and returns focus to the button", async () => {
  const t = await open();
  try {
    await btn(t.page).focus();
    await t.page.keyboard.press("Enter");
    await t.page.keyboard.press("ArrowDown");
    assert.equal(await focusedName(t.page), NAV.programs[0].name, "ArrowDown from the button goes to the first program");
    await t.page.keyboard.press("ArrowDown");
    assert.equal(await focusedName(t.page), NAV.programs[1].name);
    await t.page.keyboard.press("End");
    assert.equal(await focusedName(t.page), NAV.programs.at(-1).name);
    await t.page.keyboard.press("ArrowDown");
    assert.equal(await focusedName(t.page), NAV.programs[0].name, "ArrowDown wraps to the top");
    await t.page.keyboard.press("ArrowUp");
    assert.equal(await focusedName(t.page), NAV.programs.at(-1).name, "ArrowUp wraps to the bottom");
    await t.page.keyboard.press("Home");
    assert.equal(await focusedName(t.page), NAV.programs[0].name);
    assert.equal(await t.page.locator(".tic-house-dname").textContent(), NAV.programs[0].name, "focus shows the description too");
    await t.page.keyboard.press("Escape");
    assert.ok(await t.page.locator("#tic-house-panel").isHidden());
    assert.equal(await btn(t.page).getAttribute("aria-expanded"), "false");
    assert.equal(await t.page.evaluate(() => document.activeElement.className), "tic-house-btn");
  } finally { await t.close(); }
});

test("the menu closes on a click outside it, and when focus leaves it", async () => {
  const t = await open();
  try {
    await btn(t.page).click();
    const panel = await t.page.locator("#tic-house-panel").boundingBox();
    await t.page.mouse.click(5, Math.min(895, panel.y + panel.height + 20)); // below the open menu
    assert.ok(await t.page.locator("#tic-house-panel").isHidden(), "a click outside closes it");
    await btn(t.page).click();
    await t.page.locator(".tic-house-all").focus();
    await t.page.keyboard.press("Tab");
    // The bar checks where focus went on the next tick, so wait for it rather than look straight away.
    await t.page.locator("#tic-house-panel").waitFor({ state: "hidden", timeout: 2000 });
    assert.equal(await btn(t.page).getAttribute("aria-expanded"), "false", "tabbing out closes it");
  } finally { await t.close(); }
});

test("data-current names the program when the host name doesn't", async () => {
  const t = await open({ origin: "http://127.0.0.1:9", attrs: ' data-current="elements"' });
  try {
    await btn(t.page).click();
    assert.equal(await t.page.locator('.tic-house-item[aria-current="page"]').getAttribute("href"), "https://elements.theintelligence.company");
  } finally { await t.close(); }
});

test("an unknown host marks no program, and the menu starts on the first one", async () => {
  const t = await open({ origin: "https://example.org" });
  try {
    await btn(t.page).click();
    assert.equal(await t.page.locator('.tic-house-item[aria-current="page"]').count(), 0);
    assert.equal(await t.page.locator(".tic-house-dname").textContent(), NAV.programs[0].name);
  } finally { await t.close(); }
});

test("on a phone each program shows its one-line summary instead of the side panel, without sideways scroll", async () => {
  for (const colorScheme of ["light", "dark"]) {
    const t = await open({ phone: true, colorScheme });
    try {
      await btn(t.page).tap();
      assert.ok(await t.page.locator(".tic-house-detail").isHidden(), "no side panel on phones");
      assert.ok(await t.page.locator(".tic-house-short").first().isVisible(), "one-line summaries show");
      const over = await t.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.equal(over, 0, colorScheme);
      assert.deepEqual(t.errors, []);
    } finally { await t.close(); }
  }
});
