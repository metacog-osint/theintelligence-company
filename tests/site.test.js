// House rules for the hub site, checked from its files. No browser, no network, no packages: `node --test site.test.js`.
// Each rule comes from CLAUDE.md; the test names say which.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { ROOT, SITE, read, ticNav, oe, feedUrls, veteransOrigins, productList, links, houseDate } from "./lib/source.js";

const INDEX = read("site/index.html");
const NOT_FOUND = read("site/404.html");
const SITE_JS = read("site/site.js");
const OE_JS = read("site/oe/oe.js");
const NAV = ticNav();
const OE = oe();
const HTML_PAGES = { "index.html": INDEX, "404.html": NOT_FOUND };
const SCRIPTS = Object.fromEntries(["site.js", "oe/oe.js", "shared/tic-nav.js", "shared/tic-time.js",
  "shared/tic-related.js", "shared/tic-tabs.js", "shared/tic-area.js"]
  .map((f) => [f, read("site/" + f)]));
const byHref = (a, b) => a.href.localeCompare(b.href);
const STATUS_WORDS = { live: "Live", beta: "Beta", invite: "Invite only" };

// ---------------------------------------------------------------- the program lists agree

test("the home page's product list and the house bar list the same programs, names, links and statuses", () => {
  const home = productList(INDEX).map((p) => ({ name: p.name, href: p.href, status: p.statusClass })).sort(byHref);
  const bar = NAV.programs.map((p) => ({ name: p.name, href: p.href, status: p.status })).sort(byHref);
  assert.deepEqual(home, bar, "keep PROGRAMS in tic-nav.js in step with the product list in index.html");
});

test("each product list status reads the same as its class (Live · Open, Beta · Open, Invite only · Open)", () => {
  for (const [page, html] of Object.entries(HTML_PAGES)) {
    for (const p of productList(html)) {
      assert.ok(STATUS_WORDS[p.statusClass], `${page}: ${p.name} has an unknown status class st-${p.statusClass}`);
      assert.equal(p.statusText, STATUS_WORDS[p.statusClass] + " · Open", `${page}: ${p.name}'s status text`);
    }
  }
});

test("the product list runs COP first, then programs by home layer from Systems down, then the other tools", () => {
  const order = productList(INDEX).map((p) => p.a);
  const layerOf = (a) => (/data-product="([a-z0-9]+)"/.exec(a) || [])[1];
  const ids = [...INDEX.matchAll(/<li data-product="([a-z0-9]+)" data-layer="([a-z]+)"/g)].map((m) => ({ id: m[1], layer: m[2] }));
  assert.ok(ids.length > 0, "the product list's items carry data-product and data-layer");
  assert.equal(ids[0].id, "cop", "COP comes first");
  assert.equal(ids[0].layer, "all");
  const rank = (l) => (OE.LK.indexOf(l) < 0 ? OE.LK.length : OE.LK.indexOf(l));
  const ranks = ids.slice(1).map((x) => rank(x.layer));
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), "programs follow the drawing's layer order");
  for (const x of ids.slice(1)) {
    const p = OE.PROGRAMS.find((q) => q.id === x.id);
    if (p && p.home) assert.equal(x.layer, p.home, `${x.id}'s data-layer is its home layer on the drawing`);
  }
  assert.ok(order.length >= ids.length && layerOf);
});

test("each name on the sources wall links to a Sources page the footer credits, and names that program", () => {
  const footer = /<footer[\s\S]*?<\/footer>/.exec(INDEX)[0];
  const credited = new Set([...footer.matchAll(/href="(https:\/\/[^"]+)"/g)].map((m) => m[1]));
  const wall = /<div class="wall" id="wall">([\s\S]*?)<\/div>\s*<div class="wrap wall-ctl">/.exec(INDEX);
  assert.ok(wall, "the sources wall is on the page");
  const items = [...wall[1].matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<span class="sw-p">([^<]+)<\/span>/g)];
  assert.ok(items.length > 0);
  const names = new Set();
  for (const [, href, name, prog] of items) {
    assert.ok(credited.has(href), `${name.trim()} links to ${href}, which the footer doesn't credit as a Sources page`);
    const p = NAV.programs.find((q) => q.name === prog);
    assert.ok(p && new URL(href).origin === new URL(p.href).origin, `${name.trim()}: ${prog}'s link goes to ${prog}'s own site`);
    assert.ok(!names.has(name.trim() + prog), `${name.trim()} (${prog}) is listed once`);
    names.add(name.trim() + prog);
  }
});

test("How we work names no time-zone feature (the Time button already says the zone; Tom, 31 Oct and 15 Nov 2026)", () => {
  const std = /<section id="standards"[\s\S]*?<\/section>/.exec(INDEX)[0];
  assert.ok(!/time zone|your clock/i.test(std));
});

test("house bar v2.0: each program's layer is its home layer on the drawing, and the menu runs in the drawing's layer order", () => {
  const order = ["all", ...OE.LK];
  for (const p of NAV.programs.filter((q) => q.group === "layers")) {
    const drawn = OE.PROGRAMS.find((q) => q.id === p.id);
    assert.equal(p.layer, drawn.home || (drawn.core ? "all" : undefined), `${p.name}'s layer in tic-nav.js vs its home in oe.js`);
  }
  const ranks = NAV.programs.map((p) => (p.group === "tools" ? order.length : order.indexOf(p.layer)));
  assert.ok(ranks.every((r) => r >= 0), "every program across the layers names a layer");
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), "PROGRAMS in tic-nav.js runs in the drawing's layer order");
});

test("COP is described the same way in the house bar and on the hub (Tom, 15 Nov 2026: convergence, not checking)", () => {
  const cop = NAV.programs.find((p) => p.id === "cop");
  assert.equal(cop.long, OE.PROGRAMS.find((p) => p.id === "cop").line);
  for (const s of [cop.label, cop.short, cop.long]) assert.ok(!/\b(check|checks|verif)/i.test(s.replace("checked by Verdict", "")), s);
});

test("404.html's product list is the home page's, link for link and in the same order", () => {
  const home = productList(INDEX).map((p) => p.a);
  const nf = productList(NOT_FOUND).map((p) => p.a);
  assert.deepEqual(nf, home, "copy the product list from index.html into 404.html");
});

test("the drawing's linked programs are the house bar's programs across the layers, with the same names, links and statuses", () => {
  const drawn = OE.PROGRAMS.filter((p) => p.href).map((p) => ({ id: p.id, name: p.name, href: p.href, status: p.status }));
  const bar = NAV.programs.filter((p) => p.group === "layers").map((p) => ({ id: p.id, name: p.name, href: p.href, status: p.status }));
  const sort = (a, b) => a.id.localeCompare(b.id);
  assert.deepEqual(drawn.sort(sort), bar.sort(sort), "keep PROGRAMS in oe/oe.js in step with tic-nav.js");
});

test("only live and beta programs are linked on the drawing, and each of them is", () => {
  for (const p of OE.PROGRAMS) {
    const out = p.status === "live" || p.status === "beta";
    assert.equal(Boolean(p.href), out, `${p.name} is ${p.status}${p.href ? " but has a link" : " but has no link"}`);
  }
});

test("PropertyCast stays off the drawing", () => {
  assert.ok(!OE.PROGRAMS.some((p) => p.id === "propertycast"));
});

test("every program with a guide question is in exactly one of the guide's three groups", () => {
  const ids = new Set(OE.PROGRAMS.map((p) => p.id));
  const seen = {};
  for (const g of OE.GROUPS) {
    for (const id of g.programs) {
      assert.ok(ids.has(id), `group ${g.id} lists unknown program ${id}`);
      seen[id] = (seen[id] || 0) + 1;
    }
    for (const k of g.layers) assert.ok(OE.LK.includes(k), `group ${g.id} lists unknown layer ${k}`);
  }
  for (const p of OE.PROGRAMS) {
    if (p.ask) assert.equal(seen[p.id], 1, `${p.name} has a question, so it belongs in exactly one group (found ${seen[p.id] || 0})`);
    else assert.ok(!seen[p.id], `${p.name} is in a group but has no question (ask)`);
  }
});

test("drawing data refers only to layers and programs that exist", () => {
  const ids = new Set(OE.PROGRAMS.map((p) => p.id));
  for (const p of OE.PROGRAMS) {
    assert.ok(["live", "beta", "dev", "planned"].includes(p.status), `${p.name}: unknown status ${p.status}`);
    assert.ok(Array.isArray(p.at) && p.at.length === 2, `${p.name}: needs at: [x, y]`);
    if (p.core) continue;
    assert.ok(OE.LK.includes(p.home), `${p.name}: unknown home layer ${p.home}`);
    for (const k of p.reach) {
      assert.ok(OE.LK.includes(k), `${p.name}: unknown reach layer ${k}`);
      assert.notEqual(k, p.home, `${p.name}: reach repeats its home layer`);
    }
  }
  for (const [key, t] of Object.entries(OE.THREADS)) {
    for (const k of t.layers) assert.ok(OE.LK.includes(k), `thread ${key}: unknown layer ${k}`);
    for (const id of t.programs) assert.ok(ids.has(id), `thread ${key}: unknown program ${id}`);
  }
  for (const z of [...Object.values(OE.ZONES), ...Object.values(OE.DZONES)]) {
    for (const k of z.layers) assert.ok(OE.LK.includes(k), `${z.name}: unknown layer ${k}`);
  }
  const svgThreads = (INDEX.match(/class="th[ "]/g) || []).length;
  assert.equal(svgThreads, Object.keys(OE.THREADS).length, "one THREADS entry per .th thread in the drawing (t0, t1, …)");
});

test('every "Updated … ago" that site.js sets has a row in the product list, and every row with data-product gets one', () => {
  const set = new Set([...SITE_JS.matchAll(/setFresh\("([a-z]+)"/g)].map((m) => m[1]));
  const rows = new Set(productList(INDEX).filter((p) => p.product).map((p) => p.product));
  assert.deepEqual([...set].sort(), [...rows].sort());
});

// ---------------------------------------------------------------- CSP: no inline code or styles

test("pages have no inline scripts, styles or event handlers (the CSP allows only 'self')", () => {
  for (const [page, html] of Object.entries(HTML_PAGES)) {
    for (const m of html.matchAll(/<script\b([^>]*)>/g)) {
      const attrs = m[1];
      assert.ok(/\ssrc="/.test(attrs) || /type="application\/ld\+json"/.test(attrs), `${page}: inline <script${attrs}>`);
    }
    assert.ok(!/<style\b/.test(html), `${page}: <style> element`);
    assert.ok(!/\sstyle="/.test(html), `${page}: style="…" attribute`);
    const handler = /<[^>]*\son[a-z]+="/.exec(html);
    assert.ok(!handler, `${page}: event handler attribute ${handler && handler[0].slice(0, 80)}`);
  }
});

test("the JSON-LD block is valid JSON", () => {
  const m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(INDEX);
  assert.ok(m, "index.html has its JSON-LD block");
  const data = JSON.parse(m[1]);
  assert.equal(data["@context"], "https://schema.org");
});

test("scripts build no inline styles or handlers and use no eval (the CSP blocks both)", () => {
  for (const [file, src] of Object.entries(SCRIPTS)) {
    assert.ok(!/setAttribute\(\s*["']style["']/.test(src), `${file}: setAttribute("style", …)`);
    assert.ok(!/\sstyle=\\?["']/.test(src), `${file}: style="…" in an HTML string`);
    assert.ok(!/<[a-z][^>]*\son[a-z]+=\\?["']/.test(src), `${file}: an on…= handler in an HTML string`);
    assert.ok(!/\beval\(|new Function\(/.test(src), `${file}: eval or new Function`);
  }
});

test("firebase.json's CSP stays strict, and connect-src lists exactly the origins the scripts fetch", () => {
  const fb = JSON.parse(read("firebase.json"));
  const headers = fb.hosting[0].headers.flatMap((r) => r.headers);
  const csp = headers.find((h) => h.key === "Content-Security-Policy").value;
  assert.ok(!/unsafe-inline|unsafe-eval/.test(csp), "no 'unsafe-inline' or 'unsafe-eval'");
  for (const d of ["default-src 'self'", "script-src 'self'", "style-src 'self'", "frame-ancestors 'none'"]) {
    assert.ok(csp.includes(d), `CSP keeps ${d}`);
  }
  const listed = /connect-src ([^;]+)/.exec(csp)[1].split(/\s+/).filter((s) => s !== "'self'").sort();
  const fetched = new Set(Object.values(feedUrls()).map((u) => new URL(u).origin));
  for (const m of OE_JS.matchAll(/fetch\("(https:\/\/[^"]+)"/g)) fetched.add(new URL(m[1]).origin);
  for (const o of veteransOrigins()) fetched.add(o);
  assert.deepEqual(listed, [...fetched].sort());
});

// ---------------------------------------------------------------- links

const NEW_TAB_SOURCES = { "index.html": INDEX, "404.html": NOT_FOUND, "oe/oe.js": OE_JS };
function footerOf(html) { return (/<footer[\s\S]*?<\/footer>/.exec(html) || [""])[0]; }

test('links that open a new tab carry rel="noopener" and the screen-reader note, and the note exists', () => {
  for (const [file, src] of Object.entries(NEW_TAB_SOURCES)) {
    for (const l of links(src.replace(/\\"/g, '"'))) {
      if (l.attrs.target !== "_blank") continue;
      assert.match(l.attrs.rel || "", /\bnoopener\b/, `${file}: ${l.tag.slice(0, 90)} needs rel="noopener"`);
      assert.equal(l.attrs["aria-describedby"], "newtab", `${file}: ${l.tag.slice(0, 90)} needs aria-describedby="newtab"`);
    }
  }
  for (const [page, html] of Object.entries(HTML_PAGES)) {
    if (html.includes('aria-describedby="newtab"')) assert.match(html, /<p id="newtab" hidden>Opens in a new tab<\/p>/, page);
  }
});

test("every link to another site opens in a new tab", () => {
  for (const [page, html] of Object.entries(HTML_PAGES)) {
    for (const l of links(html)) {
      if (!/^https?:/.test(l.attrs.href || "")) continue;
      assert.equal(l.attrs.target, "_blank", `${page}: ${l.attrs.href} should open in a new tab`);
    }
  }
});

test("new-tab links end in ↗, and in-page links never do", () => {
  for (const [file, src] of Object.entries(NEW_TAB_SOURCES)) {
    for (const l of links(src.replace(/\\"/g, '"'))) {
      const text = l.inner.replace(/<span class="oe-sr">[\s\S]*?<\/span>/g, "").replace(/<[^>]+>/g, "").trim();
      if (l.attrs.target === "_blank") assert.ok(text.endsWith("↗"), `${file}: "${text}" opens a new tab, so it ends in ↗`);
      else assert.ok(!text.includes("↗"), `${file}: "${text}" stays on the page, so it has no ↗`);
    }
  }
});

test("the footer credits every program's sources, and says which programs feed the Latest lines", () => {
  const foot = footerOf(INDEX);
  const credited = links(foot).map((l) => new URL(l.attrs.href)).filter((u) => u.hostname.endsWith(".theintelligence.company"));
  const hosts = credited.map((u) => u.hostname).sort();
  assert.deepEqual(hosts, NAV.programs.map((p) => new URL(p.href).hostname).sort(), "one Sources link per program in the house bar");
  const latest = [...INDEX.matchAll(/<article class="latest-item" id="latest-[a-z]+">\s*<p class="latest-meta">([^<]+)<\/p>/g)].map((m) => m[1]);
  const named = /The latest lines come from ([^;]+);/.exec(foot)[1].replace(" and ", ", ").split(", ");
  assert.deepEqual(named, latest, "the footer names the programs behind the Latest lines, in their order");
});

test("404.html uses only absolute URLs (Firebase serves it at any depth)", () => {
  for (const m of NOT_FOUND.matchAll(/\s(href|src)="([^"]*)"/g)) {
    assert.match(m[2], /^(\/|https:\/\/|mailto:|data:|#)/, `404.html: ${m[1]}="${m[2]}" is relative`);
  }
});

test("in-page links on the home page point at ids that exist", () => {
  const ids = new Set([...INDEX.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of INDEX.matchAll(/\shref="#([^"]*)"/g)) assert.ok(ids.has(m[1]), `href="#${m[1]}" has no target`);
});

// ---------------------------------------------------------------- files the pages need

function localRefs() {
  const refs = [];
  const add = (from, ref) => {
    if (/^(https?:|mailto:|data:|#)/.test(ref) || ref === "") return;
    let clean = ref.split(/[?#]/)[0];
    if (clean.endsWith("/")) clean += "index.html";
    const base = clean.startsWith("/") ? SITE : path.dirname(path.join(SITE, from));
    refs.push({ from, ref, file: path.join(base, clean.replace(/^\//, "")) });
  };
  for (const [page, html] of Object.entries(HTML_PAGES)) {
    for (const m of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) add(page, m[1]);
  }
  for (const css of ["style.css", "oe/oe.css", "shared/tic-time.css", "shared/tic-nav.css", "shared/tic-related.css",
    "shared/tic-tabs.css"]) {
    for (const m of read("site/" + css).matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) add(css, m[1]);
  }
  for (const icon of JSON.parse(read("site/site.webmanifest")).icons) add("site.webmanifest", icon.src);
  for (const m of INDEX.matchAll(/"(https:\/\/theintelligence\.company\/[^"]+\.(?:png|webp|jpg))"/g)) {
    add("index.html", new URL(m[1]).pathname);
  }
  return refs;
}

test("every file the pages, stylesheets and manifest refer to exists", () => {
  const refs = localRefs();
  assert.ok(refs.length > 20, "found the references");
  for (const r of refs) assert.ok(existsSync(r.file) && statSync(r.file).isFile(), `${r.from}: ${r.ref} is missing`);
});

function pngSize(file) {
  const b = readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

test("home-screen icons and the link-preview image are the sizes they claim", () => {
  for (const icon of JSON.parse(read("site/site.webmanifest")).icons) {
    const [w, h] = pngSize(path.join(SITE, icon.src));
    assert.equal(`${w}x${h}`, icon.sizes, icon.src);
  }
  assert.deepEqual(pngSize(path.join(SITE, "img/apple-touch-icon.png")), [180, 180]);
  const og = [/og:image:width" content="(\d+)"/, /og:image:height" content="(\d+)"/].map((re) => Number(re.exec(INDEX)[1]));
  assert.deepEqual(pngSize(path.join(SITE, "img/og-card.png")), og);
});

test("fonts each ship with their licence file", () => {
  const files = readdirSync(path.join(SITE, "fonts"));
  assert.ok(files.some((f) => f.endsWith(".woff2")), "fonts are self-hosted");
  assert.ok(files.some((f) => /licen[cs]e|ofl/i.test(f)), "a licence file sits beside them");
});

// ---------------------------------------------------------------- dates, versions, indexing

test("the footer's Updated date matches its datetime and the sitemap's lastmod", () => {
  const m = /Updated <time datetime="([^"]+)" data-tic="date" data-tic-year>([^<]+)<\/time>/.exec(INDEX);
  assert.ok(m, "the footer has its Updated <time>");
  const day = new Date(m[1]).toISOString().slice(0, 10);
  assert.equal(m[2], houseDate(day), "the text shown before the script runs is the same date");
  const lastmod = /<lastmod>([^<]+)<\/lastmod>/.exec(read("site/sitemap.xml"))[1];
  assert.equal(lastmod, day, "bump sitemap.xml's lastmod with the footer date");
});

test("the shared files' version lines match the versions they report", () => {
  const nav = SCRIPTS["shared/tic-nav.js"], time = SCRIPTS["shared/tic-time.js"];
  assert.equal(/tic-nav\.js v([\d.]+)/.exec(nav)[1], NAV.version, "tic-nav.js header vs TicNav.version");
  assert.equal(/tic-time\.js v([\d.]+)/.exec(time)[1], /TicTime = \{ version: "([\d.]+)"/.exec(time)[1], "tic-time.js header vs TicTime.version");
  const related = SCRIPTS["shared/tic-related.js"], tabs = SCRIPTS["shared/tic-tabs.js"];
  assert.equal(/tic-related\.js v([\d.]+)/.exec(related)[1], /TicRelated = \{ version: "([\d.]+)"/.exec(related)[1],
    "tic-related.js header vs TicRelated.version");
  assert.equal(/tic-tabs\.js v([\d.]+)/.exec(tabs)[1], /TicTabs = \{ version: "([\d.]+)"/.exec(tabs)[1],
    "tic-tabs.js header vs TicTabs.version");
  assert.match(SCRIPTS["shared/tic-area.js"], /^\/\*! tic-area\.js v\d+\.\d+ /, "tic-area.js version line");
  for (const css of ["shared/tic-nav.css", "shared/tic-time.css", "shared/tic-related.css", "shared/tic-tabs.css"]) {
    assert.match(read("site/" + css), /^\/\*! tic-[a-z]+\.css v\d+\.\d+/, css);
  }
});

test("the home page is public and canonical on the apex domain; the 404 page is not indexed", () => {
  assert.match(INDEX, /<link rel="canonical" href="https:\/\/theintelligence\.company\/">/);
  assert.match(INDEX, /<meta property="og:url" content="https:\/\/theintelligence\.company\/">/);
  assert.ok(!/noindex/i.test(INDEX), "no noindex on the home page");
  assert.match(NOT_FOUND, /<meta name="robots" content="noindex">/);
  assert.ok(!/^Disallow:\s*\/\s*$/m.test(read("site/robots.txt")), "robots.txt doesn't block the site");
  assert.match(read("site/sitemap.xml"), /<loc>https:\/\/theintelligence\.company\/<\/loc>/);
  const fb = JSON.parse(read("firebase.json"));
  assert.ok(!JSON.stringify(fb).includes("X-Robots-Tag"), "no X-Robots-Tag header");
});

// ---------------------------------------------------------------- wording

test("wording the notes rule out stays out (GNSS, Moorhead, Minnesota, 25-year)", () => {
  const files = { ...HTML_PAGES, ...SCRIPTS, "site.webmanifest": read("site/site.webmanifest") };
  for (const [file, src] of Object.entries(files)) {
    assert.ok(!/\bGNSS\b/.test(src), `${file}: say GPS, not GNSS`);
    assert.ok(!/contested radio spectrum/i.test(src), `${file}: "the contested radio spectrum"`);
    assert.ok(!/Moorhead,\s+Minnesota/i.test(src), `${file}: the label is "Fargo-Moorhead, ND/MN"`);
    assert.ok(!/\b25-year\b/i.test(src), `${file}: "25-year" before a noun reads as an age`);
  }
});

test('"Fargo-Moorhead, ND/MN" is in the top bar and in both footers', () => {
  assert.match(/<div class="util">[\s\S]*?<\/div>/.exec(INDEX)[0], /Fargo-Moorhead, ND\/MN/);
  for (const [page, html] of Object.entries(HTML_PAGES)) assert.match(footerOf(html), /Fargo-Moorhead, ND\/MN/, page);
});

test("each Latest item keeps its bold topic and a body for the feed to fill", () => {
  const items = [...INDEX.matchAll(/<article class="latest-item" id="(latest-[a-z]+)">([\s\S]*?)<\/article>/g)];
  assert.deepEqual(items.map((m) => m[1]), ["latest-noisefloor", "latest-watchfloor", "latest-vigil", "latest-cop"]);
  for (const [, id, body] of items) {
    assert.match(body, /<p class="latest-meta">[^<]+<\/p>/, id);
    assert.match(body, /<b class="latest-topic">[^<]+:<\/b> <span class="latest-body">[^<]+<\/span>/, id);
  }
});

test("no site file is left over from editing (backups, notes, scratch)", () => {
  const walk = (dir) => readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [path.relative(SITE, p)];
  });
  for (const f of walk(SITE)) {
    assert.ok(!/(\.bak|\.orig|\.tmp|~|\.md|\.log)$/i.test(f) && !/(^|[\\/])\./.test(f), `site/${f} would be deployed`);
  }
  assert.ok(existsSync(path.join(ROOT, "firebase.json")));
});
