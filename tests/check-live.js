// Checks the eleven live feeds the hub reads against the same field list the browser tests use (lib/feeds.js SHAPES),
// so a product changing its feed shows up here before visitors see a static line. Needs the internet:
//   cd tests && npm run check:live
// Exits 1 when a feed is unreachable, refuses other sites (CORS) or is missing a field the hub reads. A 503 from
// Vigil is not a failure: that is Vigil declining to stand behind a number, and the hub keeps its static line.
import { pathToFileURL } from "node:url";
import { URLS, SHAPES, HEAD_ONLY, problems } from "./lib/feeds.js";

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

async function main() {
  let failed = 0;
  for (const [name, url] of Object.entries(URLS)) {
    if (!SHAPES[name] && !HEAD_ONLY.includes(name)) continue;
    let res;
    try { res = await checkFeed(name, url); } catch (e) { res = { out: [e.name === "TimeoutError" ? "no answer in 20 s" : e.message] }; }
    if (res.out.length) failed++;
    console.log(`${res.out.length ? "FAIL" : "ok  "} ${name.padEnd(13)} ${url}${res.note ? "\n       " + res.note : ""}`);
    for (const p of res.out) console.log("       - " + p);
  }
  process.exitCode = failed ? 1 : 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
