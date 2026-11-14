// Launches the browser for the browser tests (browser, nav, a11y, veterans-map). By default that is Playwright's own
// Chromium, which GitHub's runner installs (`npx playwright install chromium`). Set BROWSER_CHANNEL to use a browser
// that is already installed instead: `msedge` (every Windows machine has Edge), `chrome`, or any other channel
// Playwright's chromium.launch accepts. tests/README.md says how to set it.
import { chromium } from "playwright";

export const CHANNEL = (process.env.BROWSER_CHANNEL || "").trim() || undefined;

export async function launch(opts = {}) {
  try {
    return await chromium.launch(CHANNEL ? { ...opts, channel: CHANNEL } : opts);
  } catch (e) {
    if (!CHANNEL && /Executable doesn't exist/i.test(e.message)) {
      throw new Error("Playwright's Chromium isn't installed. Run `npx playwright install chromium` once, or test on " +
        "an installed browser with BROWSER_CHANNEL=msedge (or chrome); see tests/README.md.", { cause: e });
    }
    throw e;
  }
}
