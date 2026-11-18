// The long-table fold (site/shared/tic-fold.js + .css): first rows and "Show all N" at every width, a site's redraw,
// links into a folded row, a table added later, find, print, no script, and axe in light and dark, on a stand-in
// program page under a strict CSP with the house bar.
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
const TABLE = (n, attrs = "") => `<div class="scroll"><table id="t" data-tic-fold${attrs}><thead><tr><th scope="col">Name</th>
<th scope="col">Link</th></tr></thead><tbody>${rows(n)}</tbody></table></div>`;
const LIST = (n) => `<ul id="l" data-tic-fold="8" data-tic-fold-find>${Array.from({ length: n }, (_, i) =>
  `<li>Item ${i + 1} ${i % 3 ? "Kenya" : "Sudan"}</li>`).join("")}</ul>`;
const open = (body, opts) => openModulePage(browser, { origin: "https://relief.theintelligence.company", body,
  modules: ["tic-fold"], ...opts });
const visible = (page, sel = "#t tbody tr") => page.$$eval(sel, (rs) => rs.filter((r) => r.offsetParent !== null).length);

test("desktop: a 40-row table shows its first 15 and 'Show all 40'; the button opens and closes it", async () => {
  const t = await open(`<h1>Page</h1>${TABLE(40)}<p>After.</p>`);
  try {
    assert.equal(await visible(t.page), 15);
    const btn = t.page.locator(".tic-fold-more");
    assert.equal(await btn.textContent(), "Show all 40");
    assert.equal(await btn.getAttribute("aria-expanded"), "false");
    assert.equal(await btn.getAttribute("aria-controls"), "t");
    assert.equal(await t.page.locator(".tic-fold-note").textContent(), "Showing 15 of 40");
    // The bar goes after the sideways-scrolling wrapper, not inside it.
    assert.ok(await t.page.evaluate(() => document.querySelector(".scroll").nextElementSibling.classList.contains("tic-fold-bar")));
    assert.ok((await btn.boundingBox()).height >= 44, "target size");
    await btn.click();
    assert.equal(await visible(t.page), 40);
    assert.equal(await btn.textContent(), "Show the first 15");
    assert.equal(await btn.getAttribute("aria-expanded"), "true");
    await btn.click();
    assert.equal(await visible(t.page), 15);
    assert.deepEqual(t.errors, [], "no CSP violations or script errors");
    assert.deepEqual(t.strays, []);
  } finally { await t.close(); }
});

test("phone: the first 10; a count attribute sets its own numbers", async () => {
  const t = await open(TABLE(40), { phone: true });
  try {
    assert.equal(await visible(t.page), 10);
    assert.equal(await t.page.locator(".tic-fold-more").textContent(), "Show all 40");
  } finally { await t.close(); }
  const u = await open(TABLE(40, '="5 20"'), { phone: true });
  try { assert.equal(await visible(u.page), 5); } finally { await u.close(); }
  const w = await open(TABLE(40, '="5 20"'));
  try { assert.equal(await visible(w.page), 20); } finally { await w.close(); }
});

test("a table only a few rows over stays whole: it never hides one or two rows", async () => {
  const t = await open(TABLE(17));
  try {
    assert.equal(await visible(t.page), 17);
    assert.equal(await t.page.locator(".tic-fold-bar").isVisible(), false);
  } finally { await t.close(); }
});

test("the site redraws the table: it folds again, and an opened fold stays open", async () => {
  const t = await open(TABLE(40));
  try {
    await t.page.evaluate((html) => { document.querySelector("#t tbody").innerHTML = html; }, rows(60));
    await t.page.waitForFunction(() => document.querySelector(".tic-fold-more").textContent === "Show all 60");
    assert.equal(await visible(t.page), 15);
    await t.page.click(".tic-fold-more");
    await t.page.evaluate((html) => { document.querySelector("#t tbody").innerHTML = html; }, rows(50));
    await t.page.waitForFunction(() => document.querySelector(".tic-fold-more").textContent === "Show the first 15");
    assert.equal(await visible(t.page), 50);
  } finally { await t.close(); }
});

test("a link to a folded row opens the fold and lands on the row, on load and on a later click", async () => {
  const t = await open(TABLE(40) + '<div class="spacer"></div>', { hash: "#r-30" });
  try {
    await t.page.waitForFunction(() => document.getElementById("r-30").offsetParent !== null);
    assert.equal(await visible(t.page), 40);
    const top = await t.page.evaluate(() => document.getElementById("r-30").getBoundingClientRect().top);
    assert.ok(top >= 0 && top < 300, `row 30 is near the top of the screen (${top})`);
  } finally { await t.close(); }
  const u = await open(TABLE(40) + '<p><a id="go" href="#r-35">Row 35</a></p>');
  try {
    assert.equal(await visible(u.page), 15);
    await u.page.click("#go");
    await u.page.waitForFunction(() => document.getElementById("r-35").offsetParent !== null);
  } finally { await u.close(); }
});

test("phone, with the sections row: a link to a row the site draws later opens its group and fold, once", async () => {
  const body = `<div data-tic-tabs><div id="sec-a" data-tab-label="First"><h2>First</h2><p>Text.</p></div>
<div id="sec-b" data-tab-label="Second"><h2>Second</h2><div class="scroll"><table id="t" data-tic-fold><tbody></tbody></table></div>
<div class="spacer"></div></div></div>`;
  const t = await openModulePage(browser, { origin: "https://relief.theintelligence.company", body,
    modules: ["tic-tabs", "tic-fold"], phone: true, hash: "#r-33" });
  try {
    assert.equal(await t.page.evaluate(() => document.getElementById("sec-b").hidden), true, "second group hidden before the rows arrive");
    await t.page.evaluate((html) => { document.querySelector("#t tbody").innerHTML = html; }, rows(40));
    await t.page.waitForFunction(() => document.getElementById("r-33").offsetParent !== null);
    assert.equal(await t.page.evaluate(() => document.getElementById("sec-b").hidden), false);
    const top = await t.page.evaluate(() => document.getElementById("r-33").getBoundingClientRect().top);
    assert.ok(top >= 0 && top < 300, `row 33 is near the top (${top})`);
    // A later redraw (a filter, a refresh) leaves the reader where they are.
    await t.page.evaluate(() => window.scrollTo(0, 0));
    await t.page.evaluate((html) => { document.querySelector("#t tbody").innerHTML = html; }, rows(40));
    await t.page.waitForTimeout(200);
    assert.equal(await t.page.evaluate(() => window.scrollY), 0);
    assert.deepEqual(t.errors, []);
  } finally { await t.close(); }
});

test("a table the site adds after load is folded too", async () => {
  const t = await open('<div id="slot"></div>');
  try {
    await t.page.evaluate((html) => { document.getElementById("slot").innerHTML = html; }, TABLE(30));
    await t.page.waitForFunction(() => document.querySelector(".tic-fold-more")?.textContent === "Show all 30");
    assert.equal(await visible(t.page), 15);
  } finally { await t.close(); }
});

test("find: searches every item, folded or not, and says how many match", async () => {
  const t = await open(LIST(30));
  try {
    assert.equal(await visible(t.page, "#l li"), 8);
    const box = t.page.getByRole("searchbox", { name: "Find in this list" });
    await box.fill("sudan");
    assert.equal(await visible(t.page, "#l li"), 10);
    assert.equal(await t.page.locator(".tic-fold-note").textContent(), "10 of 30 items match");
    assert.equal(await t.page.locator(".tic-fold-more").isVisible(), false);
    await box.fill("");
    assert.equal(await visible(t.page, "#l li"), 8);
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
    assert.equal(await visible(t.page), 40);
    assert.equal(await t.page.locator(".tic-fold-bar").isVisible(), false);
  } finally { await t.close(); }
  const u = await open(TABLE(40), { javaScriptEnabled: false });
  try { assert.equal(await visible(u.page), 40); } finally { await u.close(); }
});

for (const colorScheme of ["light", "dark"]) {
  for (const phone of [false, true]) {
    test(`axe: no violations, ${colorScheme}, ${phone ? "phone" : "desktop"}, folded and with find`, async () => {
      const t = await open(`<h1>Page</h1><h2>Table</h2>${TABLE(40)}<h2>List</h2>${LIST(30)}`, { phone, colorScheme, bypassCSP: true });
      try {
        const v = await axe(t.page);
        assert.deepEqual(v, [], explain(v));
      } finally { await t.close(); }
    });
  }
}
