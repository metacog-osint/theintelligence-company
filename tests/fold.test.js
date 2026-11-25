// The long-table window (site/shared/tic-fold.js + .css, 2.0): a long table or list opens in a scrolling window
// about ten rows tall with its header kept in view and "Show all N" beside it, every row staying in the page; a
// site's redraw, links into a row in the window, a table added later, find (the module's and the browser's), print,
// no script, and axe in light and dark, on a stand-in program page under a strict CSP with the house bar.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { launch } from "./lib/browser.js";
import { openModulePage } from "./lib/modpage.js";
import { axe, describe as explain } from "./lib/axe.js";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const rows = (n, from = 1) => Array.from({ length: n }, (_, i) =>
  `<tr id="r-${i + from}"><td>Row ${i + from}</td><td><a href="https://example.org/${i + from}">Source</a></td></tr>`).join("");
const TABLE = (n, attrs = "", caption = "") => `<div class="scroll"><table id="t" data-tic-fold${attrs}>${caption ? `<caption>${caption}</caption>` : ""}
<thead><tr><th scope="col">Name</th><th scope="col">Link</th></tr></thead><tbody>${rows(n)}</tbody></table></div>`;
const LIST = (n) => `<ul id="l" data-tic-fold="8" data-tic-fold-find>${Array.from({ length: n }, (_, i) =>
  `<li>Item ${i + 1} ${i % 3 ? "Kenya" : "Sudan"}</li>`).join("")}</ul>`;
const open = (body, opts) => openModulePage(browser, { origin: "https://relief.theintelligence.company", body,
  modules: ["tic-fold"], ...opts });
// Rows drawn in the page at all (none is display: none).
const inPage = (page, sel = "#t tbody tr") => page.$$eval(sel, (rs) => rs.filter((r) => r.offsetParent !== null).length);
// Rows wholly inside the window's box as it is scrolled now.
const inView = (page, sel = "#t tbody tr", box = ".tic-fold-box") => page.evaluate(([s, b]) => {
  const B = document.querySelector(b).getBoundingClientRect();
  return [...document.querySelectorAll(s)].filter((r) => {
    const R = r.getBoundingClientRect();
    return R.height > 0 && R.top >= B.top - 1 && R.bottom <= B.bottom + 1;
  }).length;
}, [sel, box]);
const scrolls = (page, box = ".tic-fold-box") => page.$eval(box, (b) => b.scrollHeight > b.clientHeight + 1);

test("desktop: a 40-row table opens in a window about ten rows tall, every row in the page; 'Show all 40' lifts it", async () => {
  const t = await open(`<h1>Page</h1><h2>Breakups</h2>${TABLE(40)}<p>After.</p>`);
  try {
    assert.equal(await inPage(t.page), 40, "no row is cut out of the page");
    assert.equal(await inView(t.page), 10);
    assert.ok(await scrolls(t.page));
    // The window is the site's own sideways-scrolling wrapper, and the bar goes after it.
    const box = await t.page.evaluate(() => {
      const b = document.querySelector(".scroll");
      return { win: b.classList.contains("tic-fold-win"), tab: b.getAttribute("tabindex"), role: b.getAttribute("role"),
        label: b.getAttribute("aria-label"), bar: b.nextElementSibling.classList.contains("tic-fold-bar") };
    });
    assert.deepEqual(box, { win: true, tab: "0", role: "region", label: "Breakups: 40 rows, in a window that scrolls", bar: true });
    const btn = t.page.locator(".tic-fold-more");
    assert.equal(await btn.textContent(), "Show all 40");
    assert.equal(await btn.getAttribute("aria-expanded"), "false");
    assert.equal(await btn.getAttribute("aria-controls"), "t");
    assert.equal(await t.page.locator(".tic-fold-note").textContent(), "About 10 of 40 in view; scroll for the rest");
    assert.ok((await btn.boundingBox()).height >= 44, "target size");
    // The header row stays at the top of the window as it scrolls.
    await t.page.$eval(".scroll", (b) => { b.scrollTop = 400; });
    const gap = await t.page.evaluate(() => document.querySelector("#t thead th").getBoundingClientRect().top
      - document.querySelector(".scroll").getBoundingClientRect().top);
    assert.ok(gap >= 0 && gap <= 2, `header row at the window's top (${gap})`);
    await btn.click();
    assert.equal(await scrolls(t.page), false, "every row shows");
    assert.equal(await btn.textContent(), "Show in a window");
    assert.equal(await btn.getAttribute("aria-expanded"), "true");
    assert.equal(await t.page.getAttribute(".scroll", "role"), null, "no scrolling region while open");
    await btn.click();
    assert.ok(await scrolls(t.page));
    assert.equal(await inView(t.page), 10, "back at the top of the window");
    assert.deepEqual(t.errors, [], "no CSP violations or script errors");
    assert.deepEqual(t.strays, []);
  } finally { await t.close(); }
});

test("a short table that scrolls sideways on a phone is focusable and named; one that fits is not", async () => {
  const wide = `<div class="scroll"><table id="t" data-tic-fold><caption>Wide</caption><thead><tr><th scope="col">Name</th><th scope="col">Detail</th></tr></thead>
<tbody><tr><td>One</td><td>${"longtext".repeat(40)}</td></tr><tr><td>Two</td><td>x</td></tr></tbody></table></div>`;
  const t = await open(wide, { phone: true });
  try {
    const b = await t.page.evaluate(() => { const e = document.querySelector(".scroll");
      return { win: e.classList.contains("tic-fold-win"), tab: e.getAttribute("tabindex"), role: e.getAttribute("role"), label: e.getAttribute("aria-label") }; });
    assert.deepEqual(b, { win: false, tab: "0", role: "region", label: "Wide: 2 rows, scrolls sideways" });
  } finally { await t.close(); }
  const u = await open(`<div class="scroll"><table id="t" data-tic-fold><thead><tr><th scope="col">Name</th></tr></thead><tbody><tr><td>One</td></tr></tbody></table></div>`, { phone: true });
  try {
    assert.equal(await u.page.$eval(".scroll", (e) => e.getAttribute("tabindex")), null);
  } finally { await u.close(); }
});

test("phone: the same ten rows; a count attribute sets its own numbers, one for phones and one wider", async () => {
  const t = await open(TABLE(40), { phone: true });
  try {
    assert.equal(await inView(t.page), 10);
    assert.equal(await t.page.locator(".tic-fold-more").textContent(), "Show all 40");
    const w = await t.page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(w <= 375, `no sideways page scroll (${w})`);
  } finally { await t.close(); }
  const u = await open(TABLE(40, '="5 20"'), { phone: true });
  try { assert.equal(await inView(u.page), 5); } finally { await u.close(); }
  const w = await open(TABLE(40, '="5 20"'));
  try { assert.equal(await inView(w.page), 20); } finally { await w.close(); }
});

test("a table only a few rows over stays whole; three or more over gets the window", async () => {
  const t = await open(TABLE(12));
  try {
    assert.equal(await scrolls(t.page), false);
    assert.equal(await t.page.locator(".tic-fold-bar").isVisible(), false);
    assert.equal(await t.page.getAttribute(".scroll", "tabindex"), null);
  } finally { await t.close(); }
  const u = await open(TABLE(13));
  try { assert.ok(await scrolls(u.page)); } finally { await u.close(); }
});

test("a table or list without a wrapper of its own is wrapped; a list keeps its list role", async () => {
  const t = await open(`<h2>Notices</h2><table id="t" data-tic-fold><tbody>${rows(30)}</tbody></table>
<h2>Items</h2><ul id="u" data-tic-fold>${Array.from({ length: 30 }, (_, i) => `<li>Item ${i + 1}</li>`).join("")}</ul>`);
  try {
    const r = await t.page.evaluate(() => [...document.querySelectorAll(".tic-fold-box")].map((b) =>
      [b.tagName, b.firstElementChild.id, b.getAttribute("role"), b.getAttribute("aria-label")]));
    assert.deepEqual(r, [["DIV", "t", "region", "Notices: 30 rows, in a window that scrolls"],
      ["DIV", "u", "region", "Items: 30 items, in a window that scrolls"]]);
    assert.equal(await t.page.getByRole("list").count(), 1);
    assert.equal(await inView(t.page, "#u li", ".tic-fold-box:has(#u)"), 10);
    const pad = await t.page.evaluate(() => [...document.querySelectorAll(".tic-fold-box")].map((b) => getComputedStyle(b).paddingLeft));
    assert.deepEqual(pad, ["0px", "8px"], "a list stands off the border; a table's cells have their own padding");
  } finally { await t.close(); }
});

test("ten tall cards make a taller window than ten short rows, never past three quarters of the screen", async () => {
  const card = (h) => `<div class="cards" data-tic-fold>${Array.from({ length: 30 }, (_, i) =>
    `<article><h3>Card ${i + 1}</h3>${"<p>Line.</p>".repeat(h)}</article>`).join("")}</div>`;
  const t = await open(`<h2>Short</h2>${card(0)}`);
  const u = await open(`<h2>Tall</h2>${card(6)}`);
  try {
    const short = await t.page.$eval(".tic-fold-box", (b) => b.clientHeight);
    const tall = await u.page.$eval(".tic-fold-box", (b) => b.clientHeight);
    assert.ok(tall > short, `${tall} > ${short}`);
    assert.ok(tall <= 900 * 0.75 + 1, `capped (${tall})`);
  } finally { await t.close(); await u.close(); }
});

test("the site redraws the table: the window re-applies, and one opened in full stays open", async () => {
  const t = await open(TABLE(40));
  try {
    await t.page.evaluate((html) => { document.querySelector("#t tbody").innerHTML = html; }, rows(60));
    await t.page.waitForFunction(() => document.querySelector(".tic-fold-more").textContent === "Show all 60");
    assert.equal(await inPage(t.page), 60);
    assert.equal(await inView(t.page), 10);
    await t.page.click(".tic-fold-more");
    await t.page.evaluate((html) => { document.querySelector("#t tbody").innerHTML = html; }, rows(50));
    await t.page.waitForFunction(() => document.querySelector(".tic-fold-more").textContent === "Show in a window");
    assert.equal(await scrolls(t.page), false);
  } finally { await t.close(); }
});

test("the site draws a new table in place of the old: one opened in full stays open, by its caption", async () => {
  const t = await open('<div id="slot"></div>');
  try {
    const draw = (n) => t.page.evaluate((html) => { document.getElementById("slot").innerHTML = html; },
      TABLE(n, "", `Outages in ${n} countries`).replace(' id="t"', ""));
    await draw(40);
    await t.page.waitForFunction(() => document.querySelector(".tic-fold-more")?.textContent === "Show all 40");
    await t.page.click(".tic-fold-more");
    await draw(45);
    await t.page.waitForFunction(() => document.querySelector(".tic-fold-more")?.textContent === "Show in a window");
    assert.equal(await scrolls(t.page), false);
  } finally { await t.close(); }
});

// The row sits wholly inside the window, just under its header row, and the window is on screen.
const rowShown = (page, id) => page.evaluate((id) => {
  const r = document.getElementById(id).getBoundingClientRect();
  const b = document.querySelector(".tic-fold-box").getBoundingClientRect();
  const head = document.querySelector("#t thead")?.getBoundingClientRect().bottom ?? b.top;
  return { inside: r.top >= head - 1 && r.bottom <= b.bottom + 1, top: r.top };
}, id);

test("a link to a row in the window scrolls the window to it, on load and on a later click", async () => {
  const t = await open(TABLE(40) + '<div class="spacer"></div>', { hash: "#r-30" });
  try {
    await t.page.waitForFunction(() => document.querySelector(".scroll").scrollTop > 0);
    const s = await rowShown(t.page, "r-30");
    assert.ok(s.inside, "row 30 is in the window, not behind the header row");
    assert.ok(s.top >= 0 && s.top < 300, `row 30 is near the top of the screen (${s.top})`);
    assert.ok(await scrolls(t.page), "the window stays a window");
  } finally { await t.close(); }
  const u = await open(TABLE(40) + '<p><a id="go" href="#r-35">Row 35</a></p>');
  try {
    await u.page.click("#go");
    await u.page.waitForFunction(() => document.querySelector(".scroll").scrollTop > 0);
    assert.ok((await rowShown(u.page, "r-35")).inside);
  } finally { await u.close(); }
});

test("phone, with the sections row: a link to a row the site draws later opens its group and scrolls to it, once", async () => {
  const body = `<div data-tic-tabs><div id="sec-a" data-tab-label="First"><h2>First</h2><p>Text.</p></div>
<div id="sec-b" data-tab-label="Second"><h2>Second</h2><div class="scroll"><table id="t" data-tic-fold><thead><tr><th>Name</th>
<th>Link</th></tr></thead><tbody></tbody></table></div><div class="spacer"></div></div></div>`;
  const t = await openModulePage(browser, { origin: "https://relief.theintelligence.company", body,
    modules: ["tic-tabs", "tic-fold"], phone: true, hash: "#r-33" });
  try {
    assert.equal(await t.page.evaluate(() => document.getElementById("sec-b").hidden), true, "second group hidden before the rows arrive");
    await t.page.evaluate((html) => { document.querySelector("#t tbody").innerHTML = html; }, rows(40));
    await t.page.waitForFunction(() => document.querySelector(".scroll").scrollTop > 0);
    assert.equal(await t.page.evaluate(() => document.getElementById("sec-b").hidden), false);
    const s = await rowShown(t.page, "r-33");
    assert.ok(s.inside, "row 33 in the window");
    assert.ok(s.top >= 0 && s.top < 400, `row 33 is near the top (${s.top})`);
    // A later redraw (a filter, a refresh) leaves the reader where they are.
    await t.page.evaluate(() => window.scrollTo(0, 0));
    await t.page.evaluate((html) => { document.querySelector("#t tbody").innerHTML = html; }, rows(40));
    await t.page.waitForTimeout(200);
    assert.equal(await t.page.evaluate(() => window.scrollY), 0);
    assert.deepEqual(t.errors, []);
  } finally { await t.close(); }
});

// tic-fold lands on a linked row, then again one frame later. These act in that gap: the hashchange listener below
// runs after tic-fold's own and before the next frame, so each case is exact rather than a matter of timing.
const inTheGap = (page, hash, act) => page.evaluate(([hash, act]) => new Promise((done) => {
  const row = document.getElementById(hash.slice(1));
  addEventListener("hashchange", () => {
    const landed = row.getBoundingClientRect().top;
    if (act === "page") scrollTo(0, 0);
    if (act === "window") document.querySelector(".tic-fold-box").scrollTop = 0;
    if (act === "layout") {
      document.documentElement.style.overflowAnchor = "none";  // so the browser doesn't hold the row in place itself
      document.getElementById("above").style.height = "300px";
    }
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => done({ landed,
      top: row.getBoundingClientRect().top, y: scrollY, inner: document.querySelector(".tic-fold-box").scrollTop }))));
  }, { once: true });
  location.hash = hash;
}), [hash, act]);

test("after a link lands on a row, a reader who scrolls the page or the window in the next frame stays put", async () => {
  for (const act of ["page", "window"]) {
    const t = await open(`<div id="above"></div>${TABLE(40)}<div class="spacer"></div>`, { phone: true });
    try {
      const r = await inTheGap(t.page, "#r-33", act);
      assert.equal(act === "page" ? r.y : r.inner, 0, `the ${act} stays where the reader put it`);
    } finally { await t.close(); }
  }
});

test("after a link lands on a row, a layout change above it in the next frame still lands on the row", async () => {
  const t = await open(`<div id="above"></div>${TABLE(40)}<div class="spacer"></div>`, { phone: true });
  try {
    const r = await inTheGap(t.page, "#r-33", "layout");
    assert.ok(Math.abs(r.top - r.landed) < 1, `row back at ${r.landed} (${r.top})`);
  } finally { await t.close(); }
});

test("a link to a row inside a closed <details> opens the details and measures the window then", async () => {
  const t = await open(`<details id="lists"><summary>Every list</summary>${TABLE(40)}</details><div class="spacer"></div>`,
    { phone: true, hash: "#r-31" });
  try {
    await t.page.waitForFunction(() => document.getElementById("lists").open && document.querySelector(".scroll").scrollTop > 0);
    assert.ok((await rowShown(t.page, "r-31")).inside);
    await t.page.$eval(".scroll", (b) => { b.scrollTop = 0; });
    assert.equal(await inView(t.page), 10, "measured once drawn");
  } finally { await t.close(); }
});

// A site's own search hides rows with the hidden attribute (Noisefloor's Sources).
test("rows the site marks hidden are left out of the count and the window, which follows them", async () => {
  const t = await open(TABLE(40));
  try {
    const showFirst = (n) => t.page.$$eval("#t tbody tr", (rs, k) => rs.forEach((r, i) => { r.hidden = i >= k; }), n);
    await showFirst(20);
    await t.page.waitForFunction(() => document.querySelector(".tic-fold-more").textContent === "Show all 20");
    assert.equal(await inPage(t.page), 20);
    assert.equal(await inView(t.page), 10);
    assert.match(await t.page.getAttribute(".scroll", "aria-label"), /: 20 rows, in a window/);
    await showFirst(12);
    await t.page.waitForFunction(() => !document.querySelector(".scroll").classList.contains("tic-fold-win"));
    assert.equal(await t.page.locator(".tic-fold-more").isVisible(), false, "two over the window: no window");
    await showFirst(40);
    await t.page.waitForFunction(() => document.querySelector(".tic-fold-more").textContent === "Show all 40");
    assert.equal(await inView(t.page), 10);
    assert.deepEqual(t.errors, []);
  } finally { await t.close(); }
});

test("a table the site adds after load gets the window too", async () => {
  const t = await open('<div id="slot"></div>');
  try {
    await t.page.evaluate((html) => { document.getElementById("slot").innerHTML = html; }, TABLE(30));
    await t.page.waitForFunction(() => document.querySelector(".tic-fold-more")?.textContent === "Show all 30");
    assert.equal(await inView(t.page), 10);
  } finally { await t.close(); }
});

// window.find stands in for Ctrl+F (it finds but, headless, doesn't scroll; the browser's own find bar does). 1.x's
// hidden rows (display: none) were out of its reach.
test("the browser's own find reaches a row deep in the window", async () => {
  const t = await open(TABLE(40));
  try {
    const r = await t.page.evaluate(() => [window.find("Row 37"),
      getSelection().anchorNode?.parentElement?.closest("tr")?.id, document.getElementById("r-37").offsetParent !== null]);
    assert.deepEqual(r, [true, "r-37", true]);
  } finally { await t.close(); }
});

test("find in this list: filters every item and says how many match; few matches need no window", async () => {
  const t = await open(LIST(30));
  try {
    assert.equal(await inPage(t.page, "#l li"), 30);
    assert.equal(await inView(t.page, "#l li"), 8);
    const box = t.page.getByRole("searchbox", { name: "Find in this list" });
    await box.fill("sudan");
    assert.equal(await inPage(t.page, "#l li"), 10);
    assert.equal(await t.page.locator(".tic-fold-note").textContent(), "10 of 30 items match");
    assert.equal(await t.page.locator(".tic-fold-more").isVisible(), false);
    assert.equal(await scrolls(t.page), false);
    await box.fill("");
    assert.equal(await inPage(t.page, "#l li"), 30);
    assert.ok(await scrolls(t.page));
  } finally { await t.close(); }
  const u = await open(LIST(20));
  try {
    assert.equal(await u.page.locator(".tic-fold-find").isVisible(), false, "no find box under 25 items");
  } finally { await u.close(); }
});

test("print shows every row and no buttons; without script every row shows", async () => {
  const t = await open(TABLE(40));
  try {
    await t.page.emulateMedia({ media: "print" });
    assert.equal(await scrolls(t.page), false);
    assert.equal(await t.page.locator(".tic-fold-bar").isVisible(), false);
  } finally { await t.close(); }
  const u = await open(TABLE(40), { javaScriptEnabled: false });
  try {
    assert.equal(await inPage(u.page), 40);
    assert.equal(await u.page.$eval(".scroll", (b) => b.scrollHeight <= b.clientHeight + 1), true);
  } finally { await u.close(); }
});

for (const colorScheme of ["light", "dark"]) {
  for (const phone of [false, true]) {
    test(`axe: no violations, ${colorScheme}, ${phone ? "phone" : "desktop"}, in a window and with find`, async () => {
      const t = await open(`<h1>Page</h1><h2>Table</h2>${TABLE(40)}<h2>List</h2>${LIST(30)}`, { phone, colorScheme, bypassCSP: true });
      try {
        const v = await axe(t.page);
        assert.deepEqual(v, [], explain(v));
      } finally { await t.close(); }
    });
  }
}
