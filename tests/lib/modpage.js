// A stand-in program page for the shared page modules (tic-related.js, tic-tabs.js, tic-fold.js), served at a program's own address
// under a strict CSP with the house bar, the way the program sites serve them. Used by related.test.js and
// tabs.test.js.
// `body` is the page's <main> content; `modules` names the shared files to load after tic-nav.js ("tic-related",
// "tic-tabs"). `index` serves COP's agent index at https://cop.theintelligence.company/data/agent/index.json (an
// object, sent as JSON, or { status } for a failure) with open CORS, and lets the page's CSP connect to COP, as a
// site carrying "Elsewhere today" does. Requests to COP are counted in `copHits`, with the cookie header each carried.
import { read } from "./source.js";

const COP = "https://cop.theintelligence.company";
const CSP = "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:";

const PAGE = ({ body, modules }) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Stand-in program</title>
<link rel="stylesheet" href="/tic-nav.css">${modules.map((m) => `<link rel="stylesheet" href="/${m}.css">`).join("")}
<link rel="stylesheet" href="/page.css"></head><body>
<header class="product"><p>A stand-in program</p></header>
<main id="main">${body}</main>
<footer class="product"><p>Footer</p></footer>
<script src="/tic-nav.js"></script>${modules.map((m) => `<script src="/${m}.js"></script>`).join("")}</body></html>`;

// A program's own colours, light and dark, named the way the modules read them (--line, --muted, --panel, --link).
const PAGE_CSS = `:root { --bg: #ffffff; --panel: #ffffff; --line: #c9ced6; --muted: #4a5260; --link: #1a4fa0;
  color-scheme: light dark; }
@media (prefers-color-scheme: dark) { :root { --bg: #11151b; --panel: #171c24; --line: #3a4352; --muted: #b6bfcc;
  --link: #8ab4ff; } }
body { margin: 0; font: 16px/1.5 system-ui, sans-serif; background: var(--bg); color: var(--muted); }
h1, h2, h3, strong, .tic-rel-t { color: CanvasText; }
a { color: var(--link); }
header.product, footer.product { padding: 8px 24px; border-bottom: 1px solid var(--line); }
main { padding: 0 24px 40px; }
.spacer { height: 4200px; }
.grp { min-height: 700px; }`;

export async function openModulePage(browser, { origin = "https://blackout.theintelligence.company", body = "",
  modules = [], index = null, phone = false, width = 375, colorScheme = "light", bypassCSP = false,
  javaScriptEnabled = true, hash = "", cookie = false } = {}) {
  const context = await browser.newContext({
    viewport: phone ? { width, height: 812 } : { width: 1440, height: 900 }, hasTouch: phone, isMobile: phone,
    colorScheme, bypassCSP, javaScriptEnabled,
  });
  // A cookie on the whole domain, as the house bar's and time settings' choices are kept: the COP read must not send it.
  if (cookie) await context.addCookies([{ name: "tic_nav", value: "full", domain: ".theintelligence.company", path: "/" }]);
  const strays = [];
  const copHits = { n: 0, cookie: [] };
  const csp = index ? CSP + "; connect-src 'self' " + COP : CSP;
  await context.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (index && u.origin === COP && u.pathname === "/data/agent/index.json") {
      copHits.n++;
      copHits.cookie.push(route.request().headers().cookie || "");
      const cors = { "access-control-allow-origin": "*", "content-type": "application/json" };
      if (typeof index.status === "number") return route.fulfill({ status: index.status, headers: cors, body: "" });
      return route.fulfill({ status: 200, headers: cors, body: JSON.stringify(index) });
    }
    if (u.origin !== origin) { strays.push(u.href); return route.abort(); }
    const headers = { "content-security-policy": csp };
    const file = { "/tic-nav.js": "tic-nav.js", "/tic-nav.css": "tic-nav.css", "/tic-related.js": "tic-related.js",
      "/tic-related.css": "tic-related.css", "/tic-tabs.js": "tic-tabs.js", "/tic-tabs.css": "tic-tabs.css",
      "/tic-fold.js": "tic-fold.js", "/tic-fold.css": "tic-fold.css" }[u.pathname];
    if (u.pathname === "/") return route.fulfill({ headers, contentType: "text/html", body: PAGE({ body, modules }) });
    if (u.pathname === "/page.css") return route.fulfill({ headers, contentType: "text/css", body: PAGE_CSS });
    if (file) {
      return route.fulfill({ headers, contentType: file.endsWith(".js") ? "text/javascript" : "text/css",
        body: read("site/shared/" + file) });
    }
    return route.fulfill({ status: 404, headers, body: "" });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.goto(origin + "/" + hash, { waitUntil: "load" });
  return { page, context, errors, strays, copHits, close: () => context.close() };
}
