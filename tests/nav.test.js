// The house bar (site/shared/tic-nav.js + .css), which every program site carries, tested on a stand-in product page
// served at a program's own address under a strict CSP, as the sites serve it.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { launch } from "./lib/browser.js";
import { ticNav } from "./lib/source.js";
import { openStandIn } from "./lib/standin.js";

const NAV = ticNav();
let browser;
before(async () => { browser = await launch(); });
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

test("v2.5: when <body> opens with a skip link, the bar mounts after it, so the skip link is reached first", async () => {
  const t = await open({ skip: true });
  try {
    const order = await t.page.evaluate(() => [...document.body.children].slice(0, 3).map((e) => e.className));
    assert.deepEqual(order, ["skip", "tic-house", "tic-house-room"], "skip link, then the bar and its room");
    await t.page.keyboard.press("Tab");
    assert.equal(await t.page.evaluate(() => document.activeElement.className), "skip", "the first Tab reaches the skip link");
    await t.page.keyboard.press("Tab");
    assert.equal(await t.page.evaluate(() => document.activeElement.className), "tic-house-home", "the next reaches the bar");
    assert.deepEqual(t.errors, []);
  } finally { await t.close(); }
});

test("the menu lists every program in its group, opens in the same tab, and starts on the current program", async () => {
  const t = await open();
  try {
    await btn(t.page).click();
    assert.equal(await btn(t.page).getAttribute("aria-expanded"), "true");
    assert.deepEqual(await t.page.$$eval(".tic-house-group", (ps) => ps.map((p) => p.textContent)),
      ["Every layer", "Systems", "Human", "Cyberspace", "Spectrum", "Space", "Air", "Land and maritime", "Tools"],
      "v2.0: one heading per layer, in the drawing's order; v2.3: no other projects; v2.4: Tools last");
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
    await t.page.locator(".tic-house-cop").focus(); // v2.0: the menu's last link
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

// ---------------------------------------------------------------- v1.12: fixed to the top, minimize and restore

const toggle = (page) => page.locator(".tic-house-toggle");
const state = (page) => page.evaluate(() => {
  const nav = document.querySelector(".tic-house"), r = nav.getBoundingClientRect();
  const tools = document.querySelector(".tic-house-tools").getBoundingClientRect();
  const head = document.querySelector("header.product").getBoundingClientRect();
  return {
    scrollY: Math.round(scrollY), navTop: r.top, navHeight: r.height, toolsTop: tools.top, headerTop: head.top,
    mini: nav.classList.contains("is-mini"), htmlMini: document.documentElement.classList.contains("tic-house-minimized"),
    on: document.documentElement.classList.contains("tic-house-on"),
    h: getComputedStyle(document.documentElement).getPropertyValue("--tic-house-h").trim(),
    room: document.querySelector(".tic-house-room").getBoundingClientRect().height,
    homeShown: getComputedStyle(document.querySelector(".tic-house-home")).display !== "none",
  };
});
const scrollDown = (page) => page.evaluate(async () => {
  window.scrollTo(0, 1500);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
});
const active = (page) => page.evaluate(() => document.activeElement.className);

test("the bar stays at the top while the page scrolls, and a sticky site header sits below it", async () => {
  const t = await open({ stickyHeader: true });
  try {
    let s = await state(t.page);
    assert.deepEqual([s.navTop, s.navHeight, s.room, s.h, s.on], [0, 34, 34, "34px", true], "at rest");
    assert.equal(s.headerTop, 34, "the page starts below the bar");
    await scrollDown(t.page);
    s = await state(t.page);
    assert.ok(s.scrollY > 1000, "the page scrolled");
    assert.equal(s.navTop, 0, "the bar is still at the top");
    assert.equal(s.headerTop, 34, "the site's sticky header sits under it via --tic-house-h");
    await btn(t.page).click();
    assert.ok(await t.page.locator("#tic-house-panel").isVisible(), "the menu opens from the scrolled page");
    const panel = await t.page.locator("#tic-house-panel").boundingBox();
    assert.ok(panel.y >= 34 && panel.y < 50, "the menu hangs from the bar");
    assert.deepEqual(t.errors, []);
  } finally { await t.close(); }
});

test("mounted in #tic-nav inside a short wrapper, the bar still stays at the top", async () => {
  const t = await open({ slot: true });
  try {
    assert.equal(await t.page.evaluate(() => document.querySelector(".tic-house").parentElement.id), "tic-nav");
    assert.equal(await t.page.evaluate(() => document.querySelector(".tic-house-room").parentElement.id), "tic-nav",
      "the spacer holds the bar's place in the slot");
    await scrollDown(t.page);
    const s = await state(t.page);
    assert.equal(s.navTop, 0);
    assert.equal(s.navHeight, 34);
    assert.deepEqual(t.errors, []);
  } finally { await t.close(); }
});

test("in-page links land clear of the bar", async () => {
  const t = await open();
  try {
    assert.equal(await t.page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingTop), "34px");
    await t.page.click('header.product a[href="#limits"]');
    await t.page.waitForFunction(() => scrollY > 500);
    const y = await t.page.evaluate(() => document.getElementById("limits").getBoundingClientRect().top);
    assert.ok(y >= 33, `the target is below the bar (top ${y}; scrolling rounds to whole pixels)`);
  } finally { await t.close(); }
});

test("minimize: the bar shrinks to a tab with the Programs button, and restores in one click", async () => {
  const t = await open({ stickyHeader: true });
  try {
    assert.equal(await toggle(t.page).getAttribute("title"), "Minimize the house bar");
    assert.equal(await toggle(t.page).textContent(), "Minimize the house bar", "the button's name, for screen readers");
    await scrollDown(t.page);
    await toggle(t.page).click();
    let s = await state(t.page);
    assert.deepEqual([s.mini, s.htmlMini, s.h, s.room, s.homeShown], [true, true, "0px", 0, false], "minimized");
    assert.equal(s.headerTop, 0, "the site's sticky header moves up to the top");
    assert.equal(s.toolsTop, 0, "the tab hangs from the top edge");
    assert.equal(await toggle(t.page).textContent(), "Show the house bar");
    assert.equal(await active(t.page), "tic-house-toggle", "focus stays on the button");
    assert.ok(await btn(t.page).isVisible(), "the Programs button stays in the tab");
    // Only the tab takes clicks: the transparent rest of the bar lets them through to the page.
    const through = await t.page.evaluate(() => document.elementFromPoint(40, 10).closest(".tic-house") === null);
    assert.ok(through, "clicks beside the tab reach the page");
    await btn(t.page).click();
    assert.ok(await t.page.locator("#tic-house-panel").isVisible(), "the menu opens from the tab");
    assert.equal(await t.page.locator('.tic-house-item[aria-current="page"]').count(), 1);
    await t.page.keyboard.press("Escape");
    await toggle(t.page).click();
    s = await state(t.page);
    assert.deepEqual([s.mini, s.htmlMini, s.h, s.room, s.homeShown, s.navTop, s.navHeight, s.headerTop],
      [false, false, "34px", 34, true, 0, 34, 34], "restored");
    assert.deepEqual(t.errors, []);
  } finally { await t.close(); }
});

test("the choice is kept across reloads and follows the visitor to another program, in a domain-wide cookie", async () => {
  const t = await open({ alsoServe: ["https://elements.theintelligence.company"] });
  try {
    const before = await t.page.evaluate(() => ({ cookie: document.cookie, ls: localStorage.getItem("tic-nav-v1") }));
    assert.deepEqual(before, { cookie: "", ls: null }, "nothing is stored until the visitor presses the button");
    await toggle(t.page).click();
    const [cookie] = (await t.context.cookies()).filter((c) => c.name === "tic_nav");
    assert.equal(cookie.value, "min");
    assert.equal(cookie.domain, ".theintelligence.company", "one cookie for every program");
    assert.equal(cookie.sameSite, "Lax");
    assert.ok(cookie.secure);
    assert.equal(await t.page.evaluate(() => localStorage.getItem("tic-nav-v1")), "min");
    await t.page.reload({ waitUntil: "load" });
    assert.ok((await state(t.page)).mini, "minimized after a reload");
    await t.page.goto("https://elements.theintelligence.company/", { waitUntil: "load" });
    assert.ok((await state(t.page)).mini, "minimized on another program's site");
    assert.equal(await t.page.evaluate(() => TicNav.minimized()), true);
    await toggle(t.page).click();
    await t.page.goto("https://vigil.theintelligence.company/", { waitUntil: "load" });
    assert.equal((await state(t.page)).mini, false, "restoring is remembered too");
    assert.deepEqual(t.errors, []);
  } finally { await t.close(); }
});

test("off the theintelligence.company domain the choice is kept in localStorage", async () => {
  const t = await open({ origin: "http://127.0.0.1:9", attrs: ' data-current="vigil"' });
  try {
    await toggle(t.page).click();
    assert.equal(await t.page.evaluate(() => localStorage.getItem("tic-nav-v1")), "min");
    await t.page.evaluate(() => { document.cookie = "tic_nav=; Max-Age=0; Path=/"; });
    await t.page.reload({ waitUntil: "load" });
    assert.ok((await state(t.page)).mini, "read back from localStorage");
  } finally { await t.close(); }
});

test("with cookies and storage blocked the bar still mounts, minimizes and restores", async () => {
  const initScript = () => {
    const no = () => { throw new DOMException("blocked", "SecurityError"); };
    Object.defineProperty(Document.prototype, "cookie", { get: no, set: no, configurable: true });
    Object.defineProperty(window, "localStorage", { get: no, configurable: true });
  };
  const t = await open({ initScript });
  try {
    assert.equal((await state(t.page)).mini, false);
    await toggle(t.page).click();
    assert.equal((await state(t.page)).mini, true);
    await toggle(t.page).click();
    assert.equal((await state(t.page)).mini, false);
    assert.deepEqual(t.errors, []);
  } finally { await t.close(); }
});

test("keyboard: Tab reaches the minimize button after Programs; Enter and Space toggle it; the tab's menu works", async () => {
  const t = await open();
  try {
    await btn(t.page).focus();
    await t.page.keyboard.press("Tab");
    assert.equal(await active(t.page), "tic-house-toggle");
    await t.page.keyboard.press("Enter");
    assert.ok((await state(t.page)).mini);
    await t.page.keyboard.press("Shift+Tab");
    assert.equal(await active(t.page), "tic-house-btn", "the Programs button is next, backwards");
    await t.page.keyboard.press("Enter");
    await t.page.keyboard.press("ArrowDown");
    assert.equal(await focusedName(t.page), NAV.programs[0].name);
    await t.page.keyboard.press("End");
    assert.equal(await focusedName(t.page), NAV.programs.at(-1).name);
    await t.page.keyboard.press("Escape");
    assert.ok(await t.page.locator("#tic-house-panel").isHidden());
    assert.equal(await active(t.page), "tic-house-btn");
    await t.page.keyboard.press("Tab");
    await t.page.keyboard.press("Space");
    assert.equal((await state(t.page)).mini, false, "Space restores it");
  } finally { await t.close(); }
});

test("on phones, both states fit without sideways scroll, and the bar's two ends don't touch", async () => {
  for (const width of [375, 320]) {
    for (const colorScheme of ["light", "dark"]) {
      const t = await open({ phone: true, width, colorScheme });
      try {
        const fit = () => t.page.evaluate(() => {
          const home = document.querySelector(".tic-house-home").getBoundingClientRect();
          const tools = document.querySelector(".tic-house-tools").getBoundingClientRect();
          return { over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            gap: home.width ? tools.left - home.right : null, right: tools.right, vw: innerWidth };
        });
        let f = await fit();
        assert.equal(f.over, 0, `${width} px ${colorScheme}: no sideways scroll`);
        assert.ok(f.gap >= 8, `${width} px: the home link and the buttons keep apart (gap ${f.gap})`);
        assert.ok(f.right <= f.vw, `${width} px: the buttons stay on screen`);
        await toggle(t.page).tap();
        f = await fit();
        assert.equal(f.over, 0, `${width} px minimized`);
        assert.ok(f.right <= f.vw);
        await btn(t.page).tap();
        assert.ok(await t.page.locator(".tic-house-short").first().isVisible(), "the menu opens from the tab on a phone");
        assert.deepEqual(t.errors, []);
      } finally { await t.close(); }
    }
  }
});

test("printing leaves the bar and its room out", async () => {
  const t = await open();
  try {
    await t.page.emulateMedia({ media: "print" });
    const p = await t.page.evaluate(() => ({
      nav: getComputedStyle(document.querySelector(".tic-house")).display,
      room: getComputedStyle(document.querySelector(".tic-house-room")).display,
      h: getComputedStyle(document.documentElement).getPropertyValue("--tic-house-h").trim(),
    }));
    assert.deepEqual(p, { nav: "none", room: "none", h: "0px" });
  } finally { await t.close(); }
});

// ---------------------------------------------------------------- v2.0: freshness dots and "See it on COP"
const HEALTH = { attrs: ' data-health="on"', health: "cop-health-nav.json" };
const dots = (page) => page.$$eval(".tic-house-item", (as) => as.map((a) => ({
  id: new URL(a.href).hostname.split(".")[0],
  dot: (a.querySelector(".tic-house-dot") || {}).className || "",
  sr: (a.querySelector(".tic-house-dot .tic-house-sr") || {}).textContent || "",
  words: (a.querySelector(".tic-house-fw") || {}).textContent || "",
})).filter((x) => x.dot));

test("v2.0: with data-health=\"on\", opening the menu reads COP's health once, without cookies, and marks each program", async () => {
  const t = await open(HEALTH);
  try {
    await t.page.waitForTimeout(300);
    assert.equal(t.healthHits.n, 0, "nothing is fetched until the menu opens");
    await btn(t.page).click();
    await t.page.locator(".tic-house-fnote:not([hidden])").waitFor();
    const d = await dots(t.page);
    const by = Object.fromEntries(d.map((x) => [x.id, x]));
    assert.equal(by.vigil.dot, "tic-house-dot f-fresh");
    assert.equal(by.vigil.sr, "On time.");
    assert.equal(by.vigil.words, "", "on time needs no words after the topic");
    assert.equal(by.blackout.dot, "tic-house-dot f-late");
    assert.equal(by.blackout.words, " · running late", "running late is said in words, not colour alone");
    assert.equal(by.wake.dot, "tic-house-dot f-stale");
    assert.equal(by.wake.words, " · no current data");
    assert.ok(!by.cop && !by.orbit && !by.propertycast, "no dot for a program COP's check doesn't cover");
    assert.equal(d.length, 8, "an id COP knows but the bar doesn't is ignored");
    assert.match(await t.page.locator(".tic-house-dmeta").textContent(), /· Live · on time · you are here$/);
    assert.match(await t.page.locator(".tic-house-fnote").textContent(), /^Dots: on time, running late or no current data, as COP's health check found \d+ (min|h|days) ago\.$/);
    await btn(t.page).click();
    await btn(t.page).click();
    assert.equal(t.healthHits.n, 1, "read once, however often the menu opens");
    assert.deepEqual(t.healthHits.cookie, [""], "no cookies go to COP");
    assert.deepEqual(t.errors, []);
    assert.deepEqual(t.strays, []);
  } finally { await t.close(); }
});

test("v2.0: without data-health the bar asks COP for nothing, and shows no dots", async () => {
  const t = await open({ health: "cop-health-nav.json" });
  try {
    await btn(t.page).click();
    await t.page.waitForTimeout(500);
    assert.equal(t.healthHits.n, 0);
    assert.equal(await t.page.locator(".tic-house-dot").count(), 0);
    assert.ok(await t.page.locator(".tic-house-fnote").isHidden());
  } finally { await t.close(); }
});

test("v2.0: when COP's health check fails, the menu works as before, without dots or the note", async () => {
  const t = await open({ ...HEALTH, health: { status: 503 } });
  try {
    await btn(t.page).click();
    await t.page.waitForTimeout(500);
    assert.equal(t.healthHits.n, 1);
    assert.equal(await t.page.locator(".tic-house-dot").count(), 0);
    assert.ok(await t.page.locator(".tic-house-fnote").isHidden());
    assert.equal(await t.page.locator(".tic-house-item").count(), NAV.programs.length);
    assert.deepEqual(t.errors.filter((e) => e.startsWith("pageerror")), [], "no script errors");
  } finally { await t.close(); }
});

test("v2.0: on COP itself the dots need no attribute, and there is no link to COP", async () => {
  const t = await open({ origin: "https://cop.theintelligence.company", health: "cop-health-nav.json" });
  try {
    await btn(t.page).click();
    await t.page.locator(".tic-house-fnote:not([hidden])").waitFor();
    assert.equal(await t.page.locator(".tic-house-dot").count(), 8);
    assert.equal(await t.page.locator(".tic-house-cop").count(), 0);
  } finally { await t.close(); }
});

test("v2.0: \"See it on COP\" opens COP with every layer, named for the program you are on", async () => {
  let t = await open();
  try {
    await btn(t.page).click();
    const a = t.page.locator(".tic-house-cop");
    assert.equal(await a.textContent(), "See Vigil with the other layers on COP →");
    assert.equal(await a.getAttribute("href"), "https://cop.theintelligence.company");
    assert.equal(await a.getAttribute("target"), null, "site navigation stays in the same tab");
  } finally { await t.close(); }
  t = await open({ origin: "https://activation.theintelligence.company" });
  try {
    await btn(t.page).click();
    assert.equal(await t.page.locator(".tic-house-cop").textContent(), "See every layer together on COP →",
      "a tool outside the layers gets the general link");
  } finally { await t.close(); }
});

test("v2.3: data-menu=\"off\" mounts the home link and the minimize button with no Programs menu", async () => {
  const t = await open({ origin: "https://activation.theintelligence.company", attrs: ' data-menu="off"' });
  try {
    assert.equal(await t.page.locator(".tic-house-home").getAttribute("href"), "https://theintelligence.company/");
    assert.equal(await btn(t.page).count(), 0, "no Programs button");
    assert.equal(await t.page.locator("#tic-house-panel").count(), 0, "no menu panel");
    assert.equal(await t.page.locator(".tic-house-toggle").count(), 1, "the minimize button stays");
  } finally { await t.close(); }
});

test("v2.3: the menu lists only the suite: no PropertyCast, Title 10 or Listening Post", () => {
  for (const id of ["propertycast", "activation", "listeningpost"]) assert.ok(!NAV.programs.some((p) => p.id === id), id);
  assert.ok(NAV.programs.every((p) => p.group === "layers" || p.group === "tools"));
  assert.deepEqual(NAV.programs.filter((p) => p.group === "tools").map((p) => p.id), ["deaddrop"], "v2.4: Dead Drop, under Tools");
  assert.equal(NAV.programs[NAV.programs.length - 1].id, "deaddrop", "v2.4: Tools come last");
});

test("v2.0: under a layer's heading each program shows its topic, not the layer again", async () => {
  const t = await open();
  try {
    await btn(t.page).click();
    const labels = await t.page.$$eval(".tic-house-label", (ls) => ls.map((l) => l.textContent));
    const want = NAV.programs.map((p) => {
      const s = p.label.split(" · ").slice(1).join(" · ");
      return s.charAt(0).toUpperCase() + s.slice(1);
    });
    assert.deepEqual(labels, want);
  } finally { await t.close(); }
});

test("nothing in the bar moves: no transitions or animations, so reduced motion needs nothing more", async () => {
  const t = await open({ reducedMotion: "reduce" });
  try {
    await toggle(t.page).click();
    const moving = await t.page.evaluate(() => [...document.querySelectorAll(".tic-house, .tic-house *")]
      .filter((e) => {
        const cs = getComputedStyle(e);
        return cs.transitionDuration.split(",").some((d) => parseFloat(d) > 0) || cs.animationName !== "none";
      })
      .map((e) => e.className));
    assert.deepEqual(moving, []);
  } finally { await t.close(); }
});
