// Reads the hub's own files so the tests compare what the site really ships, not a copy kept here.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const SITE = path.join(ROOT, "site");
export function read(rel) { return readFileSync(path.join(ROOT, rel), "utf8"); }

// The house bar publishes its list as window.TicNav.programs; run it with just enough of a page to load.
export function ticNav() {
  const window = {};
  const document = { currentScript: null, body: null, addEventListener() {} };
  vm.runInNewContext(read("site/shared/tic-nav.js"), { window, document, location: { hostname: "" } });
  return { version: window.TicNav.version, programs: plain(window.TicNav.programs) };
}

// The source text of the literal assigned by `var NAME = …;` in a script, found by matching brackets
// (skipping strings and comments). oe.js keeps its tables inside a closure, so this is how a test reaches them.
export function literalSource(src, name) {
  const start = src.indexOf("var " + name + " = ");
  if (start < 0) throw new Error("no `var " + name + " =` found");
  let i = start + ("var " + name + " = ").length;
  const open = src[i];
  if (open !== "[" && open !== "{") throw new Error(name + " is not an array or object literal");
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === '"' || c === "'") { // skip a string
      for (j++; j < src.length && src[j] !== c; j++) if (src[j] === "\\") j++;
    } else if (c === "/" && src[j + 1] === "/") {
      j = src.indexOf("\n", j);
    } else if (c === "[" || c === "{") depth++;
    else if (c === "]" || c === "}") {
      depth--;
      if (depth === 0) return src.slice(i, j + 1);
    }
  }
  throw new Error("unclosed literal for " + name);
}
export function literal(src, name, scope = {}) {
  return plain(vm.runInNewContext("(" + literalSource(src, name) + ")", scope));
}
// Objects made in a vm context have that context's prototypes, which strict comparisons treat as different.
function plain(x) { return JSON.parse(JSON.stringify(x)); }

// oe.js's data tables, evaluated the way the page builds them (PROGRAMS refers to LK, the layer keys).
export function oe() {
  const src = read("site/oe/oe.js");
  const LAYERS = literal(src, "LAYERS");
  const LK = LAYERS.map((l) => l.k);
  return {
    LAYERS, LK,
    PROGRAMS: literal(src, "PROGRAMS", { LK }),
    GROUPS: literal(src, "GROUPS"),
    THREADS: literal(src, "THREADS"),
    ZONES: literal(src, "ZONES"),
    DZONES: literal(src, "DZONES"),
  };
}

// The feed addresses site.js reads, by constant name (NOISEFLOOR, WATCHFLOOR, VIGIL, COP_HEALTH, ELEMENTS_FEED, …).
// Origins the Veterans Day planner fetches from: its report service (API in app.js, empty until deployed) and the
// NWS forecast link its data file carries.
export function veteransOrigins() {
  const out = new Set();
  const api = /const API = "([^"]*)"/.exec(read("site/veterans/veterans-day/app.js"));
  if (api && api[1]) out.add(new URL(api[1]).origin);
  const router = /var ROUTER = "([^"]*)"/.exec(read("site/veterans/veterans-day/roads.js"));
  if (router && router[1]) out.add(new URL(router[1]).origin);
  const meta = JSON.parse(read("site/veterans/veterans-day/data/deals.json")).meta;
  if (meta.forecast_url) out.add(new URL(meta.forecast_url).origin);
  return [...out];
}

export function feedUrls() {
  const out = {};
  for (const m of read("site/site.js").matchAll(/var ([A-Z_]+) = "(https:\/\/[^"]+)"/g)) out[m[1]] = m[2];
  return out;
}

// The "Every product" list (ul.plist) of a page: one entry per <li>.
export function productList(html) {
  const uls = [...html.matchAll(/<ul class="plist(?: plist-other)?">([\s\S]*?)<\/ul>/g)];
  if (!uls.length) throw new Error("no <ul class=\"plist\"> found");
  return [...uls.map((u) => u[1]).join("").matchAll(/<li([^>]*)>([\s\S]*?)<\/li>/g)].map((m) => {
    const a = m[2];
    const attr = (re) => (re.exec(a) || [])[1];
    const st = /<span class="p-st st-([a-z]+)">([^<]*)/.exec(a) || [];
    return {
      li: m[1],
      a,
      product: (/data-product="([^"]+)"/.exec(m[1]) || [])[1],
      href: attr(/<a href="([^"]+)"/),
      name: attr(/<span class="p-name">([^<]+)<\/span>/),
      what: attr(/<span class="p-what">([^<]+)<\/span>/),
      statusClass: st[1],
      statusText: (st[2] || "").trim(),
    };
  });
}

// Every <a …>…</a> in some markup, with its attributes parsed.
export function links(html) {
  return [...html.matchAll(/<a\s([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => {
    const attrs = {};
    for (const a of m[1].matchAll(/([a-z-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    return { attrs, inner: m[2], tag: m[0] };
  });
}

// "2026-11-05" -> "5 Nov 2026", the house date style.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function houseDate(iso) {
  const p = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return Number(p[3]) + " " + MONTHS[Number(p[2]) - 1] + " " + p[1];
}
