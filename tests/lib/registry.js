// The doctrine kit's program registry (tic-doctrine `vocab/programs.json`), reduced to the parts the hub draws: the
// seven layers in order and each program's one home layer. The hub carries no copy of the kit, so a pinned extract
// lives in fixtures/kit-registry-layers.json; registry.test.js checks the hub's lists against it, and check-live.js
// checks the extract against the kit's current file.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const FIXTURE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/kit-registry-layers.json");
export const KIT_RAW = "https://raw.githubusercontent.com/metacog-osint/tic-doctrine/main/";
export const REGISTRY_URL = KIT_RAW + "vocab/programs.json";
export const KIT_VERSION_URL = KIT_RAW + "python/tic_doctrine/__init__.py";

// What the hub compares: the layers (key, name, short), the "every layer" label, and each program's id and layer.
export function extract(registry) {
  return {
    registry_version: registry.version,
    layers: registry.layers.values.map((l) => (l.short ? { key: l.key, name: l.name, short: l.short } : { key: l.key, name: l.name })),
    all: registry.layers.all,
    programs: registry.programs.map((p) => ({ id: p.id, layer: p.layer === undefined ? null : p.layer })),
  };
}

export function readFixture() { return JSON.parse(readFileSync(FIXTURE, "utf8")); }

// The extract's own fields, without the fixture's provenance (kit version, source, note).
export function comparable(x) {
  return { registry_version: x.registry_version, layers: x.layers, all: x.all, programs: x.programs };
}

export function kitVersion(initPy) {
  const m = /__version__\s*=\s*"([^"]+)"/.exec(initPy);
  return m ? m[1] : null;
}

// Rewrites the fixture from the kit's file at a given commit (check-live.js --update-registry).
export function writeFixture(registry, version, sha) {
  const out = {
    note: "Extract of the doctrine kit's vocab/programs.json: layers and each program's home layer. Copied, not edited: refresh with `node check-live.js --update-registry`.",
    kit_version: version,
    source: `https://github.com/metacog-osint/tic-doctrine/blob/${sha}/vocab/programs.json`,
    ...extract(registry),
  };
  writeFileSync(FIXTURE, JSON.stringify(out, null, 2) + "\n");
  return out;
}
