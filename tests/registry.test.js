// The hub's layer drawing (site/oe/oe.js) and house bar (site/shared/tic-nav.js) against the doctrine kit's program
// registry (vocab/programs.json, kit 0.6.18 and later: `layers` and a `layer` per program). The hub carries no kit, so
// this reads the pinned extract in fixtures/kit-registry-layers.json; `node check-live.js` checks that extract
// against the kit's current file. No browser, no network: `node --test registry.test.js`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { read, ticNav, oe, literal } from "./lib/source.js";
import { readFixture } from "./lib/registry.js";

const REG = readFixture();
const NAV = ticNav();
const NAV_GROUPS = literal(read("site/shared/tic-nav.js"), "GROUPS");
const OE = oe();
const BY_ID = Object.fromEntries(REG.programs.map((p) => [p.id, p]));

// Hub ids that the registry spells differently.
const ALIASES = { deaddrop: "dead-drop" };
const rid = (id) => ALIASES[id] || id;
// On one side only, on purpose. The drawing's working names for planned programs that have no registry entry yet.
// When one gets an entry (or leaves the drawing), take it off this list; the last test below says so.
const HUB_ONLY = { minerals: "planned, working name", fragility: "planned, working name", prolif: "planned, working name" };
// Registry programs the hub does not show anywhere. None today.
const REGISTRY_ONLY = {};

test("the pinned registry extract names its kit version and the commit it was copied from", () => {
  assert.match(REG.kit_version, /^\d+\.\d+\.\d+$/);
  const [maj, min, pat] = REG.kit_version.split(".").map(Number);
  assert.ok(maj > 0 || min > 6 || (min === 6 && pat >= 18), "the registry has layers from kit 0.6.18");
  assert.match(REG.source, /^https:\/\/github\.com\/metacog-osint\/tic-doctrine\/blob\/[0-9a-f]{40}\/vocab\/programs\.json$/);
  assert.equal(REG.layers.length, 7, "seven layers");
});

test("the drawing's layers in oe.js are the registry's layers: same keys, same order, same names", () => {
  assert.deepEqual(OE.LK, REG.layers.map((l) => l.key), "oe.js LAYERS keys and order vs the registry's layers");
  for (const l of REG.layers) {
    const drawn = OE.LAYERS.find((x) => x.k === l.key);
    assert.equal(drawn.name, l.name, `${l.key}: name in oe.js vs the registry`);
    assert.equal(drawn.short, l.short, `${l.key}: short name in oe.js vs the registry`);
  }
});

test("the house bar's layer headings in tic-nav.js are the registry's layers, after Every layer and before Tools", () => {
  assert.deepEqual(NAV_GROUPS[0], ["all", REG.all], "the first heading is the registry's label for programs on every layer");
  assert.deepEqual(NAV_GROUPS.at(-1)[0], "tools", "Tools, outside the drawing, comes last");
  assert.deepEqual(NAV_GROUPS.slice(1, -1), REG.layers.map((l) => [l.key, l.short || l.name]),
    "tic-nav.js GROUPS keys, order and headings (the short name where there is one) vs the registry's layers");
});

test("each program's home layer in oe.js is its layer in the registry (COP and Verdict: all)", () => {
  for (const p of OE.PROGRAMS) {
    if (HUB_ONLY[p.id]) continue;
    const r = BY_ID[rid(p.id)];
    assert.ok(r, `${p.id} is drawn in oe.js but has no registry entry: add it to the kit, or to HUB_ONLY here with why`);
    assert.equal(p.core ? "all" : p.home, r.layer, `${p.id}: home in oe.js vs layer in the registry`);
  }
});

test("each program's layer in tic-nav.js is its layer in the registry (tools outside the drawing: none)", () => {
  for (const p of NAV.programs) {
    const r = BY_ID[rid(p.id)];
    assert.ok(r, `${p.id} is in the house bar but has no registry entry`);
    assert.equal(p.layer === undefined ? null : p.layer, r.layer, `${p.id}: layer in tic-nav.js vs the registry`);
  }
});

test("every registry program appears on the hub, unless it is listed here as registry-only", () => {
  const hub = new Set([...OE.PROGRAMS, ...NAV.programs].map((p) => rid(p.id)));
  for (const r of REG.programs) {
    if (REGISTRY_ONLY[r.id]) continue;
    assert.ok(hub.has(r.id), `${r.id} is in the registry but not in oe.js or tic-nav.js: add it, or to REGISTRY_ONLY here with why`);
  }
});

test("the one-side-only lists are current: each id is still on its side and still missing from the other", () => {
  const drawn = new Set(OE.PROGRAMS.map((p) => p.id));
  for (const id of Object.keys(HUB_ONLY)) {
    assert.ok(drawn.has(id), `${id} is no longer drawn in oe.js: take it off HUB_ONLY`);
    assert.ok(!BY_ID[rid(id)], `${id} now has a registry entry: take it off HUB_ONLY so its layer is checked`);
  }
  const hub = new Set([...OE.PROGRAMS, ...NAV.programs].map((p) => rid(p.id)));
  for (const id of Object.keys(REGISTRY_ONLY)) {
    assert.ok(BY_ID[id], `${id} is no longer in the registry: take it off REGISTRY_ONLY`);
    assert.ok(!hub.has(id), `${id} is now on the hub: take it off REGISTRY_ONLY so its layer is checked`);
  }
  for (const [hubId, regId] of Object.entries(ALIASES)) {
    assert.ok(BY_ID[regId], `alias ${hubId} -> ${regId}: ${regId} is no longer in the registry`);
    assert.ok([...OE.PROGRAMS, ...NAV.programs].some((p) => p.id === hubId), `alias ${hubId}: no longer on the hub`);
  }
});
