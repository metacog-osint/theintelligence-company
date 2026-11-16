# Hub tests

Checks for the hub site (`../site`), the house bar every program site carries, and `../tools/serve.py`. Built
7 Nov 2026. GitHub runs them on every push that touches the site (`.github/workflows/site-checks.yml`).

| File | What it checks | Needs |
| --- | --- | --- |
| `site.test.js` | House rules from `CLAUDE.md`, read from the files: the four program lists agree (house bar, drawing, product list, 404 page), no inline code or styles (CSP), new-tab links, absolute URLs on the 404 page, `connect-src`, ruled-out wording, footer date vs sitemap, version lines | Node only |
| `serve.test.js` | `serve.py` sends `firebase.json`'s headers, serves `404.html` for missing pages, and accepts many connections at once (a backlog of 5 made Windows refuse a browser's sixth) | Node, Python |
| `browser.test.js` | The home page in Chromium with sample feeds: Latest lines, "Updated … ago", "running late", fallbacks when feeds fail, the guide, keyboard, phone layout, the drawing's labels (no overlaps, inside their plates, 9 px at 1440×900), the 404 page | Playwright |
| `nav.test.js` | The house bar on a stand-in product page: menu, "You are here", keyboard, phone | Playwright |
| `related.test.js` | "Elsewhere today" (`tic-related.js`): the pick rules on a fixture index in Node (48 hours, day and month precision, own program, stale, expired, individuals, order); the card on a stand-in program page under a strict CSP: one per program, labels, links, one read without cookies, a failed read stays hidden, no read until the card nears the screen; axe light and dark | Node, Playwright, axe |
| `tabs.test.js` | The sections row (`tic-tabs.js`): one group at a time on phones, every group on desktop, deep links into a group, keyboard, resize, no script; axe light and dark from the top of the page | Playwright, axe |
| `a11y.test.js` | axe (WCAG 2.2 AA and best practices) in light and dark, desktop and phone; contrast of the drawing's labels | Playwright, axe |
| `feeds.test.js` | `check-live.js` itself, against a stand-in server | Node |
| `veterans.test.js` | The Veterans Day planner's house rules and data: no inline code, CSP, page text (privacy, sources), deals vs stores vs drive tables | Node only |
| `veterans-engine.test.js` | The planner's route engine (`engine.js`) | Node only |
| `veterans-roads.test.js` | The Map's route line (`roads.js`): splitting OSRM's answer into legs, one request a second, legs kept, failures and timeouts stay straight | Node only |
| `veterans-map.test.js` | The planner's Map in Chromium with a stand-in OSRM: only store coordinates are sent (never a start point or GPS position), the road line replaces the straight one, offline fallback, colours in light and dark | Playwright |
| `check-live.js` | The fourteen live feeds have every field the hub reads (not a test; needs the internet) | Node |

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

### On an installed browser instead of Playwright's Chromium

The browser tests launch Playwright's own Chromium (`lib/browser.js`), which GitHub's runner installs. To skip the
download (about 150 MB), set `BROWSER_CHANNEL` to a browser that is already installed: `msedge` (Edge, on every
Windows machine), `chrome`, or another channel Playwright's `chromium.launch` accepts. Without it, a machine with no
Playwright Chromium fails at launch with a message pointing here.

```
$env:BROWSER_CHANNEL = "msedge"; npm test     # PowerShell (stays set in that window)
BROWSER_CHANNEL=msedge npm test               # Git Bash, Linux, macOS
```

Edge and Playwright's Chromium share the Chromium engine, so results match apart from text rendering details; the
drawing's label checks are written to pass on both, and on GitHub's runner (`CLAUDE.md`, "The drawing's labels").

## Sample feeds

`fixtures/*.json` are hand-made, not captures. They hold the fields `site.js` and `oe/oe.js` read, listed in
`lib/feeds.js` (`SHAPES`). Their times are set against a fixed clock, 12:00 PM CST on 7 Nov 2026 (`NOW`). When a
product changes its feed, change `SHAPES`, the sample and the hub's code together; `check-live.js` checks the real
feeds against the same `SHAPES`.

## When a check fails

The message names the rule and the file. Adding or renaming a program fails the list checks until `tic-nav.js`,
`oe/oe.js`, `index.html` and `404.html` agree, and until the footer credits the new program's Sources page.
