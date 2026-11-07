// tools/serve.py behaves like Firebase Hosting for the hub: the same headers, and 404.html for a missing page.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startSite } from "./lib/server.js";
import { read } from "./lib/source.js";

let site;
before(async () => { site = await startSite(); });
after(() => site && site.close());

const CSP = JSON.parse(read("firebase.json")).hosting[0].headers.flatMap((r) => r.headers)
  .find((h) => h.key === "Content-Security-Policy").value;

test("the home page is served with the CSP and no-cache", async () => {
  const r = await fetch(site.url + "/");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("content-security-policy"), CSP);
  assert.equal(r.headers.get("cache-control"), "no-cache");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
});

test("a missing page, at any depth, gets 404.html with status 404 and the same headers", async () => {
  for (const p of ["/nope", "/old/deep/link.html"]) {
    const r = await fetch(site.url + p);
    assert.equal(r.status, 404, p);
    assert.match(await r.text(), /That page isn&rsquo;t here\./, p);
    assert.equal(r.headers.get("content-security-policy"), CSP, p);
  }
});

test("a folder without index.html is a missing page, not a listing", async () => {
  for (const p of ["/oe/", "/shared/", "/img"]) {
    const r = await fetch(site.url + p, { redirect: "manual" });
    assert.equal(r.status, 404, p);
  }
});

test("the shared files are open to other sites (CORS), with long-lived fonts and images", async () => {
  const nav = await fetch(site.url + "/shared/tic-nav.js");
  assert.equal(nav.status, 200);
  assert.equal(nav.headers.get("access-control-allow-origin"), "*");
  const font = await fetch(site.url + "/fonts/newsreader-latin.woff2");
  assert.equal(font.headers.get("cache-control"), "public, max-age=31536000");
  const img = await fetch(site.url + "/img/og-card.png");
  assert.equal(img.headers.get("cache-control"), "public, max-age=86400");
});

test("a HEAD request for a missing page gets the status without a body", async () => {
  const r = await fetch(site.url + "/nope", { method: "HEAD" });
  assert.equal(r.status, 404);
  assert.equal(await r.text(), "");
});
