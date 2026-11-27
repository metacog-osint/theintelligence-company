// Retake the hub's product screenshots from the live public sites and date their captions.
// Usage, from the repo root (needs `npm ci` in tests/, Microsoft Edge, and Python with Pillow):
//   node tools/shots.js              all pages below
//   node tools/shots.js cop-map      one page
// Look at each image before committing it, and rewrite its alt text in site/index.html to match.
// The alt text names the data day shown, so it changes with every capture.
// Pages behind a sign-in (vigil-actors) are not captured here.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require(path.join(__dirname, "..", "tests", "node_modules", "playwright-core"));

const PAGES = {
  "cop-map": "https://cop.theintelligence.company/",
  "noisefloor-today": "https://noisefloor.theintelligence.company/",
  "watchfloor-zones": "https://watchfloor.theintelligence.company/",
};

(async () => {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(PAGES);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shots-"));
  const browser = await chromium.launch({ channel: "msedge", args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
  const index = path.join(__dirname, "..", "site", "index.html");
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  try {
    for (const name of names) {
      if (!PAGES[name]) throw new Error(`unknown page: ${name}`);
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, colorScheme: "light" });
      await page.goto(PAGES[name], { waitUntil: "load", timeout: 90000 });
      await page.waitForTimeout(25000);
      const png = path.join(dir, `${name}.png`);
      await page.screenshot({ path: png });
      await page.close();
      execFileSync("python", [path.join(__dirname, "shots.py"), png], { stdio: "inherit" });
      const html = fs.readFileSync(index, "utf8");
      const re = new RegExp(String.raw`(src="img/${name}\.webp"[\s\S]*?\(screenshot, )[^)]+\)`);
      if (!re.test(html)) console.warn(`no dated caption found for ${name}`);
      else fs.writeFileSync(index, html.replace(re, `$1${today})`));
      console.log(`captured ${name}: ${png}`);
    }
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
