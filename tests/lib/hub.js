// Opens a hub page in its own browser context: served by tools/serve.py (live CSP), fed the sample feeds, with the
// clock fixed at NOW in America/Chicago. Used by browser.test.js and a11y.test.js.
import { NOW, routeFeeds } from "./feeds.js";

export const DESKTOP = { width: 1440, height: 900 };
export const PHONE = { width: 375, height: 812 };

// opts: phone, viewport, colorScheme, feeds (see routeFeeds), allowFailedLoads (a feed is meant to fail),
// bypassCSP (only for injecting axe).
export async function openHub(browser, site, pathname = "/", opts = {}) {
  const phone = opts.phone === true;
  const context = await browser.newContext({
    viewport: opts.viewport || (phone ? PHONE : DESKTOP), hasTouch: phone, isMobile: phone,
    timezoneId: "America/Chicago", locale: "en-US", colorScheme: opts.colorScheme || "light", bypassCSP: !!opts.bypassCSP,
  });
  const strays = await routeFeeds(context, site.url, opts.feeds);
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    if (opts.allowFailedLoads && /Failed to load resource/.test(m.text())) return;
    errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.clock.setFixedTime(NOW);
  const response = await page.goto(site.url + pathname, { waitUntil: "networkidle" });
  return { page, errors, strays, response, close: () => context.close() };
}
