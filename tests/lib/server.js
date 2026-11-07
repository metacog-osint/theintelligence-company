// Starts tools/serve.py (site/ with firebase.json's headers, CSP included) on a free port for one test file.
import { spawn } from "node:child_process";
import path from "node:path";
import { ROOT } from "./source.js";

// Windows usually has `python`, Linux and macOS `python3`; PYTHON overrides both.
const CANDIDATES = process.env.PYTHON ? [process.env.PYTHON] : process.platform === "win32" ? ["python", "py"] : ["python3", "python"];

function tryStart(cmd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, [path.join(ROOT, "tools", "serve.py"), "0"], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    const timer = setTimeout(() => { child.kill(); reject(new Error("serve.py did not start: " + out)); }, 10000);
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.stdout.on("data", (d) => {
      out += d;
      const m = /http:\/\/127\.0\.0\.1:(\d+)/.exec(out);
      if (m) {
        clearTimeout(timer);
        resolve({ url: "http://127.0.0.1:" + m[1], close: () => child.kill() });
      }
    });
    child.stderr.on("data", (d) => { out += d; }); // request log lines; kept for the error message only
  });
}

export async function startSite() {
  let last;
  for (const cmd of CANDIDATES) {
    try { return await tryStart(cmd); } catch (e) { last = e; }
  }
  throw last;
}
