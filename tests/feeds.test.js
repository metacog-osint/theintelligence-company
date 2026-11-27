// check-live.js, run against a stand-in server instead of the real feeds (which these tests never touch).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { checkFeed, checkRegistry } from "./check-live.js";
import { sample } from "./lib/feeds.js";
import { readFixture } from "./lib/registry.js";

let server, base;
// A registry file rebuilt from the pinned extract, and the same with one program moved and one added.
const PINNED = readFixture();
const asRegistry = (x) => ({ version: x.registry_version, layers: { values: x.layers, all: x.all }, programs: x.programs });
const MOVED = asRegistry(PINNED);
MOVED.programs = MOVED.programs.map((p) => (p.id === "vis" ? { ...p, layer: "land" } : p)).concat([{ id: "newprog", layer: "space" }]);
const ROUTES = {
  "/programs.json": { json: asRegistry(PINNED) },
  "/programs-moved.json": { json: MOVED },
  "/init.py": { body: `__version__ = "${PINNED.kit_version}"\n` },
  "/board.json": { json: sample("NOISEFLOOR") },
  "/summary": { json: sample("WATCHFLOOR") },
  "/vigil-503": { status: 503, json: { error: "unsure" } },
  "/cop-broken": { json: { generated_at: "2026-11-07T17:30:00Z", programs: [{ id: "context", state: "fine" }] } },
  "/no-cors": { json: sample("VIGIL"), cors: false },
  "/feed.geojson": { lastModified: "Sat, 07 Nov 2026 13:00:00 GMT" },
  "/feed-no-date.geojson": {},
  "/not-json": { body: "<html>Bad gateway</html>" },
};
before(async () => {
  server = http.createServer((req, res) => {
    const r = ROUTES[req.url];
    if (!r) { res.writeHead(404); return res.end(); }
    const headers = r.cors === false ? {} : { "access-control-allow-origin": "*" };
    if (r.lastModified) headers["last-modified"] = r.lastModified;
    res.writeHead(r.status || 200, { ...headers, "content-type": r.json ? "application/json" : "text/plain" });
    res.end(req.method === "HEAD" ? undefined : r.json ? JSON.stringify(r.json) : r.body || "");
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  base = "http://127.0.0.1:" + server.address().port;
});
after(() => server.close());

test("feeds with every field the hub reads pass", async () => {
  assert.deepEqual((await checkFeed("NOISEFLOOR", base + "/board.json")).out, []);
  assert.deepEqual((await checkFeed("WATCHFLOOR", base + "/summary")).out, []);
  assert.deepEqual((await checkFeed("ELEMENTS_FEED", base + "/feed.geojson")).out, []);
});

test("a 503 from Vigil is a note, not a failure", async () => {
  const r = await checkFeed("VIGIL", base + "/vigil-503");
  assert.deepEqual(r.out, []);
  assert.match(r.note, /^503/);
});

test("missing fields, missing CORS, a missing Last-Modified and a non-JSON body each fail with a reason", async () => {
  const cop = await checkFeed("COP_HEALTH", base + "/cop-broken");
  assert.ok(cop.out.some((p) => /programs\[0\]/.test(p)), cop.out.join("; "));
  assert.ok(cop.out.some((p) => /vigil with data_as_of/.test(p)));
  assert.ok((await checkFeed("VIGIL", base + "/no-cors")).out.some((p) => /Access-Control-Allow-Origin/.test(p)));
  assert.ok((await checkFeed("CORDON_FEED", base + "/feed-no-date.geojson")).out.some((p) => /Last-Modified/.test(p)));
  assert.deepEqual((await checkFeed("VIGIL", base + "/not-json")).out, ["not JSON"]);
});

test("the kit registry check passes when the layers match the pinned extract and lists each change when they don't", async () => {
  const same = await checkRegistry(base + "/programs.json", base + "/init.py");
  assert.deepEqual(same.out, []);
  assert.ok(same.note.startsWith("kit " + PINNED.kit_version + " "), same.note);
  const moved = await checkRegistry(base + "/programs-moved.json", base + "/init.py");
  assert.deepEqual(moved.out, ["newprog added (layer space)", "vis: layer air -> land"]);
  await assert.rejects(checkRegistry(base + "/missing.json", base + "/init.py"), /HTTP 404/);
});
