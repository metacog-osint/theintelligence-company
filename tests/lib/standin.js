// A stand-in product page carrying the house bar, served at a program's own address under a strict CSP, the way the
// program sites serve tic-nav.js and tic-nav.css. Used by nav.test.js and a11y.test.js.
// v1.12: the page is long enough to scroll; `stickyHeader` makes its own header sticky below the bar with
// var(--tic-house-h), as a program site with a sticky header does; `slot` mounts the bar in <div id="tic-nav"> inside
// a short wrapper instead of first in <body>; `alsoServe` lists other program origins served the same page, so a test
// can follow the visitor from one program to another in the same browser.
import { read } from "./source.js";

const PAGE = ({ attrs = "", slot = false } = {}) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Stand-in product</title>
<link rel="stylesheet" href="/tic-nav.css"><link rel="stylesheet" href="/page.css"></head><body>
${slot ? '<div class="wrap"><a class="skip" href="#main">Skip to content</a><div id="tic-nav"></div></div>' : ""}
<header class="product">A stand-in product header <a href="#limits">Limits</a></header>
<main id="main"><h1>Stand-in product page</h1><p>Content.</p>
<section><h2>Method</h2><p>More content.</p></section>
<section><h2 id="limits">Limits</h2><p>An anchor target.</p></section>
<section><h2>Sources</h2><p><a href="#main">Back to the top</a></p></section></main>
<script src="/tic-nav.js"${attrs}></script></body></html>`;
const PAGE_CSS = ({ stickyHeader = false } = {}) => `body { margin: 0; font: 16px/1.5 system-ui, sans-serif; }
header.product { display: flex; justify-content: space-between; padding: 16px 24px; background: #fff; color: #111;
  border-bottom: 1px solid #ccc; ${stickyHeader ? "position: sticky; top: var(--tic-house-h, 0px); z-index: 50;" : ""} }
header.product a { color: #1a4fa0; }
main { padding: 0 24px; }
section { min-height: 900px; }
.wrap { padding: 4px 0; }
.skip { position: absolute; left: -9999px; }`;
const CSP = "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:";

export async function openStandIn(browser, { origin = "https://vigil.theintelligence.company", attrs = "", phone = false,
  width = 375, colorScheme = "light", bypassCSP = false, slot = false, stickyHeader = false, alsoServe = [],
  reducedMotion = "no-preference", initScript = null } = {}) {
  const context = await browser.newContext({
    viewport: phone ? { width, height: 812 } : { width: 1440, height: 900 }, hasTouch: phone, isMobile: phone,
    colorScheme, bypassCSP, reducedMotion,
  });
  if (initScript) await context.addInitScript(initScript);
  const strays = [];
  const served = [origin, ...alsoServe];
  await context.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (!served.includes(u.origin)) { strays.push(u.href); return route.abort(); }
    const headers = { "content-security-policy": CSP };
    if (u.pathname === "/") return route.fulfill({ headers, contentType: "text/html", body: PAGE({ attrs, slot }) });
    if (u.pathname === "/page.css") return route.fulfill({ headers, contentType: "text/css", body: PAGE_CSS({ stickyHeader }) });
    if (u.pathname === "/tic-nav.js") return route.fulfill({ headers, contentType: "text/javascript", body: read("site/shared/tic-nav.js") });
    if (u.pathname === "/tic-nav.css") return route.fulfill({ headers, contentType: "text/css", body: read("site/shared/tic-nav.css") });
    return route.fulfill({ status: 404, headers, body: "" });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.goto(origin + "/", { waitUntil: "load" });
  return { page, context, errors, strays, close: () => context.close() };
}
