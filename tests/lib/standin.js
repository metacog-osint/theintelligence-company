// A stand-in product page carrying the house bar, served at a program's own address under a strict CSP, the way the
// program sites serve tic-nav.js and tic-nav.css. Used by nav.test.js and a11y.test.js.
import { read } from "./source.js";

const PAGE = (attrs = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Stand-in product</title>
<link rel="stylesheet" href="/tic-nav.css"></head><body>
<header class="product">A stand-in product header</header>
<main><h1>Stand-in product page</h1><p>Content.</p></main>
<script src="/tic-nav.js"${attrs}></script></body></html>`;
const CSP = "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:";

export async function openStandIn(browser, { origin = "https://vigil.theintelligence.company", attrs = "", phone = false,
  colorScheme = "light", bypassCSP = false } = {}) {
  const context = await browser.newContext({
    viewport: phone ? { width: 375, height: 812 } : { width: 1440, height: 900 }, hasTouch: phone, isMobile: phone, colorScheme, bypassCSP,
  });
  const strays = [];
  await context.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.origin !== origin) { strays.push(u.href); return route.abort(); }
    const headers = { "content-security-policy": CSP };
    if (u.pathname === "/") return route.fulfill({ headers, contentType: "text/html", body: PAGE(attrs) });
    if (u.pathname === "/tic-nav.js") return route.fulfill({ headers, contentType: "text/javascript", body: read("site/shared/tic-nav.js") });
    if (u.pathname === "/tic-nav.css") return route.fulfill({ headers, contentType: "text/css", body: read("site/shared/tic-nav.css") });
    return route.fulfill({ status: 404, headers, body: "" });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.goto(origin + "/", { waitUntil: "load" });
  return { page, errors, strays, close: () => context.close() };
}
