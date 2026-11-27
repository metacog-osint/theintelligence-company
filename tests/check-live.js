// Checks the fourteen live feeds the hub reads against the same field list the browser tests use (lib/feeds.js SHAPES),
// so a product changing its feed shows up here before visitors see a static line. Needs the internet:
//   cd tests && npm run check:live
// Exits 1 when a feed is unreachable, refuses other sites (CORS) or is missing a field the hub reads. A 503 from
// Vigil is not a failure: that is Vigil declining to stand behind a number, and the hub keeps its static line.
//
// It also checks the pinned extract of the doctrine kit's program registry (fixtures/kit-registry-layers.json, read
// by registry.test.js) against the kit's current vocab/programs.json, and fails when the layers or a program's layer
// changed there. Refresh the extract with `node check-live.js --update-registry`, then run registry.test.js.
import { pathToFileURL } from "node:url";
import { URLS, SHAPES, HEAD_ONLY, problems } from "./lib/feeds.js";
import { REGISTRY_URL, KIT_VERSION_URL, extract, comparable, readFixture, kitVersion, writeFixture } from "./lib/registry.js";

const HUB = "https://theintelligence.company";
const UA = "theintelligence-company-hub-check";

export async function checkFeed(name, url) {
  const head = HEAD_ONLY.includes(name);
  const r = await fetch(url, { method: head ? "HEAD" : "GET", headers: { Origin: HUB, "User-Agent": UA },
    signal: AbortSignal.timeout(20000) });
  const cors = r.headers.get("access-control-allow-origin");
  const out = [];
  if (cors !== "*" && cors !== HUB) out.push(`no Access-Control-Allow-Origin for the hub (got ${cors || "none"})`);
  if (name === "VIGIL" && r.status === 503) return { note: "503: Vigil is holding back today's number (the hub keeps its static line)", out };
  if (!r.ok) return { out: [...out, `HTTP ${r.status}`] };
  if (head) {
    const lm = r.headers.get("last-modified");
    if (!lm || Number.isNaN(Date.parse(lm))) out.push("no Last-Modified header (the Updated time)");
    return { note: lm ? "last modified " + new Date(lm).toISOString() : "", out };
  }
  let data;
  try { data = await r.json(); } catch { return { out: [...out, "not JSON"] }; }
  return { out: [...out, ...problems(name, data)] };
}

// The kit's registry now (registryUrl, versionUrl) against the pinned extract. Differences are listed one per line:
// the layers, the every-layer label, the registry version, and each program added, removed or moved to another layer.
export async function checkRegistry(registryUrl = REGISTRY_URL, versionUrl = KIT_VERSION_URL, pinned = readFixture()) {
  const get = async (url) => {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`HTTP ${r.status} from ${url}`);
    return r.text();
  };
  let registry;
  const text = await get(registryUrl);
  try { registry = JSON.parse(text); } catch { return { out: ["the registry is not JSON"] }; }
  const now = extract(registry);
  const version = kitVersion(await get(versionUrl));
  const was = comparable(pinned);
  const out = [];
  if (JSON.stringify(now.layers) !== JSON.stringify(was.layers)) out.push("the layers changed (keys, order or names)");
  if (now.all !== was.all) out.push(`the every-layer label changed: "${was.all}" -> "${now.all}"`);
  if (now.registry_version !== was.registry_version) out.push(`registry version ${was.registry_version} -> ${now.registry_version}`);
  const a = Object.fromEntries(was.programs.map((p) => [p.id, p.layer]));
  const b = Object.fromEntries(now.programs.map((p) => [p.id, p.layer]));
  for (const id of Object.keys(b)) if (!(id in a)) out.push(`${id} added (layer ${b[id]})`);
  for (const id of Object.keys(a)) if (!(id in b)) out.push(`${id} removed`);
  for (const id of Object.keys(a)) if (id in b && a[id] !== b[id]) out.push(`${id}: layer ${a[id]} -> ${b[id]}`);
  return { note: `kit ${version || "version unknown"} (pinned extract: kit ${pinned.kit_version})`, out };
}

// Rewrites the pinned extract from the kit's main branch, recording the commit it came from.
async function updateRegistry() {
  const r = await fetch("https://api.github.com/repos/metacog-osint/tic-doctrine/commits/main",
    { headers: { "User-Agent": UA, Accept: "application/vnd.github.sha" }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} reading the kit's main commit`);
  const sha = (await r.text()).trim();
  const at = async (f) => {
    const res = await fetch(`https://raw.githubusercontent.com/metacog-osint/tic-doctrine/${sha}/${f}`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} reading ${f} at ${sha}`);
    return res.text();
  };
  const registry = JSON.parse(await at("vocab/programs.json"));
  const version = kitVersion(await at("python/tic_doctrine/__init__.py"));
  writeFixture(registry, version, sha);
  console.log(`wrote fixtures/kit-registry-layers.json from kit ${version} at ${sha}; now run node --test registry.test.js`);
}

async function main() {
  if (process.argv.includes("--update-registry")) return updateRegistry();
  let failed = 0;
  for (const [name, url] of Object.entries(URLS)) {
    if (!SHAPES[name] && !HEAD_ONLY.includes(name)) continue;
    let res;
    try { res = await checkFeed(name, url); } catch (e) { res = { out: [e.name === "TimeoutError" ? "no answer in 20 s" : e.message] }; }
    if (res.out.length) failed++;
    console.log(`${res.out.length ? "FAIL" : "ok  "} ${name.padEnd(13)} ${url}${res.note ? "\n       " + res.note : ""}`);
    for (const p of res.out) console.log("       - " + p);
  }
  let reg;
  try { reg = await checkRegistry(); } catch (e) { reg = { out: [e.name === "TimeoutError" ? "no answer in 20 s" : e.message] }; }
  if (reg.out.length) failed++;
  console.log(`${reg.out.length ? "FAIL" : "ok  "} ${"KIT_REGISTRY".padEnd(13)} ${REGISTRY_URL}${reg.note ? "\n       " + reg.note : ""}`);
  for (const p of reg.out) console.log("       - " + p);
  if (reg.out.length) console.log("       refresh the extract (node check-live.js --update-registry), then node --test registry.test.js");
  process.exitCode = failed ? 1 : 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
