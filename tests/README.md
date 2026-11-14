# Hub tests

Checks for the hub site (`../site`), the house bar every program site carries, and `../tools/serve.py`. Built
7 Nov 2026. GitHub runs them on every push that touches the site (`.github/workflows/site-checks.yml`).

| File | What it checks | Needs |
| --- | --- | --- |
| `site.test.js` | House rules from `CLAUDE.md`, read from the files: the four program lists agree (house bar, drawing, product list, 404 page), no inline code or styles (CSP), new-tab links, absolute URLs on the 404 page, `connect-src`, ruled-out wording, footer date vs sitemap, version lines | Node only |
| `serve.test.js` | `serve.py` sends `firebase.json`'s headers and serves `404.html` for missing pages | Node, Python |
| `browser.test.js` | The home page in Chromium with sample feeds: Latest lines, "Updated … ago", "running late", fallbacks when feeds fail, the guide, keyboard, phone layout, the drawing's labels (no overlaps, inside their plates, 9 px at 1440×900), the 404 page | Playwright |
| `nav.test.js` | The house bar on a stand-in product page: menu, "You are here", keyboard, phone | Playwright |
| `a11y.test.js` | axe (WCAG 2.2 AA and best practices) in light and dark, desktop and phone; contrast of the drawing's labels | Playwright, axe |
| `feeds.test.js` | `check-live.js` itself, against a stand-in server | Node |
| `veterans.test.js` | The Veterans Day planner's house rules and data: no inline code, CSP, page text (privacy, sources), deals vs stores vs drive tables | Node only |
| `veterans-engine.test.js` | The planner's route engine (`engine.js`) | Node only |
| `veterans-roads.test.js` | The Map's route line (`roads.js`): splitting OSRM's answer into legs, one request a second, legs kept, failures and timeouts stay straight | Node only |
| `veterans-map.test.js` | The planner's Map in Chromium with a stand-in OSRM: only store coordinates are sent (never a start point or GPS position), the road line replaces the straight one, offline fallback, colours in light and dark | Playwright |
| `check-live.js` | The eleven live feeds have every field the hub reads (not a test; needs the internet) | Node |

## Run

```
cd tests
npm ci                              # once
npx playwright install chromium     # once
npm test                            # everything, about 40 s
npm run test:static                 # the rules and serve.py only, no browser
npm run check:live                  # the real feeds
```

`serve.py` is started as `python3` (Linux, macOS) or `python` / `py` (Windows); set `PYTHON` to choose another.

## Sample feeds

`fixtures/*.json` are hand-made, not captures. They hold the fields `site.js` and `oe/oe.js` read, listed in
`lib/feeds.js` (`SHAPES`). Their times are set against a fixed clock, 12:00 PM CST on 7 Nov 2026 (`NOW`). When a
product changes its feed, change `SHAPES`, the sample and the hub's code together; `check-live.js` checks the real
feeds against the same `SHAPES`.

## When a check fails

The message names the rule and the file. Adding or renaming a program fails the list checks until `tic-nav.js`,
`oe/oe.js`, `index.html` and `404.html` agree, and until the footer credits the new program's Sources page.
