// Runs axe-core (the standard accessibility checker) in a Playwright page and returns its violations, simplified.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
// WCAG 2.2 A and AA, the usual bar for a public site, plus axe's best practices (landmarks, headings and the like).
export const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

// The page's context needs bypassCSP: true, since axe goes in as an injected script.
// Returns the violations; `undecided` gets the colour-contrast checks axe couldn't settle (text over a gradient or an
// image), so a test can make sure nothing slips through that way.
export async function axe(page, { undecided } = {}) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE });
  const res = await page.evaluate(async (tags) => {
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations", "incomplete"] });
    // For text axe left undecided, measure against the nearest solid background, unless a gradient, an image or a
    // see-through layer is in the way (then it stays undecided).
    const rgba = (c) => { const m = /rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/.exec(c); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
    const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    function solid(el) {
      const cs = getComputedStyle(el), fg = rgba(cs.color);
      for (let e = el; e; e = e.parentElement) {
        const s = getComputedStyle(e), bg = rgba(s.backgroundColor);
        if (s.backgroundImage !== "none" || Number(s.opacity) < 1) return null;
        if (!bg || bg[3] === 0) continue;
        if (bg[3] < 1) return null;
        const f = [0, 1, 2].map((k) => fg[k] * fg[3] + bg[k] * (1 - fg[3]));
        const [x, y] = [lum(f), lum(bg)].sort((p, q) => q - p);
        const px = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
        return { ratio: (x + 0.05) / (y + 0.05), need: px >= 24 || (bold && px >= 18.66) ? 3 : 4.5 };
      }
      return null;
    }
    const cc = r.incomplete.find((v) => v.id === "color-contrast");
    return { violations: r.violations, undecided: cc ? cc.nodes.map((n) => {
      const el = document.querySelector(n.target.join(" "));
      return { target: n.target.join(" "), why: n.any[0] ? n.any[0].message : "", inDrawing: !!el?.closest("#oe-svg"),
        solid: el ? solid(el) : null };
    }) : [] };
  }, TAGS);
  if (undecided) undecided.push(...res.undecided);
  return res.violations.map((v) => ({
    id: v.id, impact: v.impact, help: v.help,
    nodes: v.nodes.map((n) => ({ target: n.target.join(" "), summary: (n.failureSummary || "").replace(/\s+/g, " ").slice(0, 300) })),
  }));
}
export function describe(violations) {
  return violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n` +
    v.nodes.slice(0, 8).map((n) => `    ${n.target}\n      ${n.summary}`).join("\n") +
    (v.nodes.length > 8 ? `\n    … and ${v.nodes.length - 8} more` : "")).join("\n");
}
