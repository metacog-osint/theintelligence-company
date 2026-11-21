# The Intelligence Company hub

The company's home page (`theintelligence.company`, Firebase Hosting) and the canonical home of code shared by every
Intelligence Company site (public repo `metacog-osint/theintelligence-company`, branch `master`).

**Slimmed 18 Nov 2026** (old text: `[local path]`). **State and open items:
[`HANDOFF.md`](./HANDOFF.md)**, read it first. History: `HISTORY.md`. Procedures (Dispatch
checks, signed-in screenshots, link-preview image): [`RUNBOOKS.md`](./RUNBOOKS.md). Under 12 KB; state goes in `HANDOFF.md`. The repo is public: nothing private.

## Commands and deploy
- Static files in `site/`, no build. Deploy (Tom's yes each time), from a clean checkout with HEAD asserted:
  `firebase deploy --only hosting:hub --project context-484804`. Pushing `master` runs the site checks and, for
  `dispatch/**` or `sitecheck/**` (or `tic-nav.js`), deploys those Workers; it doesn't deploy the hub site.
- **Never deploy from `[local path]`** or any `_worktrees\hub-*` copy (one replaced the live hub, 10 Nov
  2026). `GEMINI.md` points Gemini here.
- Preview: `python tools/serve.py 5055` (applies `firebase.json` headers, real 404s). `firebase serve` skips headers.
- Tests: `npm test` in `tests/` (`tests/README.md`; `npm ci` first if `node_modules` is empty, which has happened).
  This machine has no Playwright Chromium: `$env:BROWSER_CHANNEL = "msedge"; npm test` (5 min; rerun timeouts alone). GitHub runs
  `site-checks.yml` on pushes touching `site/`, `tests/`, `serve.py`, `firebase.json`; its `feeds` job checks live
  feeds and doesn't block. **When a rule here changes, change its test.**

## Family and listing rules
- Two houses: **The Intelligence Company** (analysis, warning, professional tools) and **Oddly Specific Studio**
  (`oddlyspecific.studio`: games and family apps).
- Programs live today are those in `PROGRAMS` in `site/shared/tic-nav.js`. **Listing, renaming or changing a program
  touches, in step:** `tic-nav.js` `PROGRAMS` (then rolled out to every site), `site/oe/oe.js` `PROGRAMS` (`home`,
  `reach`, `at`, `ask`, `line`), the product list in `index.html` and `404.html` (layer order), the footer Sources
  link, `setFresh` in `site.js` and its `connect-src` origin, and `sitecheck/sites.js` (a test fails without it).
  Wording needs Tom's yes; describe only what is live.
- Standing wording: Elements separates worldwide, regional and US-only sources (Tom, 5 Nov: global weather is the
  goal); Orbit's manoeuvres and counterspace aren't built; Launch's worldwide NOTAMs wait on FAA access; Blackout's
  night lights wait on Tom accepting LAADS's licence; an Undertow DISARM technique is Undertow's reading of the
  publisher's words. Update drawing lines as lanes arrive (count `properties.sources[].publisher` in live feeds).
- **COP's line** everywhere (Tom, 15 Nov 2026): "The common operational picture: every layer's findings on one map,
  so a place or topic that turns up in more than one layer stands out. Outages are already read against hazards,
  notices and press attention in the same country; convergence scoring, checked by Verdict, is in development."
  Never say COP checks or verifies the programs; keep "in development" until COP ships scoring.
- **Context vs Watchfloor is parked** (Tom, 1 Nov): don't raise it; leave "Watchfloor's predecessor" alone, and
  Watchfloor's noindex and ™ as they are. Wake stays "in development", unlinked, until its collectors are live.
- Intel names come from watching and listening. Each product keeps its colours; every site carries the house
  layer: footer (who, date, code and licence if public, terms, credits, Sources), About, time settings, house bar.
- Licences: Vigil and Noisefloor AGPL-3.0; Title 10, PropertyCast and Watchfloor have none: ask Tom before adding.

## Shared code (`site/shared/`; the hub also serves `/shared/` with open CORS)
| File | Version | What, and rules |
|---|---|---|
| `tic-time.js` / `.css` | 1.4 / 1.3 | Store UTC; show the viewer's zone, always named; menu for zone and 12/24 h; domain cookie on `*.theintelligence.company`; `year` option and `data-tic-year` give "31 Oct 2026". The dialog reads `--panel --bg --line --muted --accent`: a site with other names maps them on `.tic-time-dialog` (hub maps `--card --paper --rule --mut`), or dark mode breaks. Open the dialog in dark mode after colour changes |
| `tic-nav.js` / `.css` | 2.1 / 2.0 | The house bar: "← The Intelligence Company" and Programs ▾ grouped by layer in the drawing's order (COP "Every layer" first, "Other tools" last); `long` equals `oe.js` `line` (tests). Fixed at top; minimizes to a top-centre tab (cookie `tic_nav`). **`--tic-house-h`** (34px, 0 minimized/print): a site's own sticky header uses `top: var(--tic-house-h, 0px)`. Freshness dots from COP health, read once on first open, opt-in `data-health="on"` once `connect-src` allows `https://cop.theintelligence.company`. Never colour alone |
| `tic-area.js` | 1.1 | "My area" (all, US 48, a state, radius); dims, never hides. Elements and Cordon |
| `tic-related.js` / `.css` | 1.0 | "Elsewhere today" from COP's `/data/agent/index.json`, one lazy read without cookies; rules in its header. Element in normal block flow; COP in `connect-src`. Labels: Unusual, Forecast, "<Program>'s judgment", As claimed |
| `tic-tabs.js` / `.css` | 1.0 | Sections row: `<div data-tic-tabs>`, groups `<div id data-tab-label>`; one group at a time at ≤760 px; links, not ARIA tabs; `tic-tabs:show` for map redraws. Blackout and Orbit have their own |
| `tic-fold.js` / `.css` | 2.3 / 2.0 | Long tables/lists: `data-tic-fold` ("10"; "6 12" phone/wide): a scrolling window that many rows tall, sticky `thead`, "Show all N"; rows stay in the page; `data-tic-fold-find` at 25+; `#row` links scroll to the row |
| `tic-shell.css` | 1.0 | Header row: `<html data-tic-layer>`, `.tic-layer` chip in the drawing's colours (a test reads `oe.css`), `.tic-reading`, `.tic-tiles`; markup in its header |

- Copy from a committed blob (`git show <sha>:site/shared/<file>`, LF; the main checkout has CRLF); keep version
  lines. Find copies with `git ls-tree -r origin/<main>` per repo, not a grep of D:.
- Shared headers name no local path and no person: "canonical copy: the hub's site/shared/<file>".
- **Rolling out:** a worktree per repo cut from origin, test locally, Tom's yes, rebase, push by sha, deploy the repo's
  own way, check live (`TicTime.version`, `TicNav.version`, console). Stop preview servers' node/esbuild PIDs, or they
  lock the worktree. Site quirks:
  - Title 10: deploy from a clean worktree (untracked `deploy/public/data/benefits-pack.json` must not ship); bump `sw.js` `VERSION`.
  - Noisefloor: commit with `FORBIDDEN_TERMS="$(cat <main>/private/forbidden_terms.txt)"`; run `python tools/build_site.py` for `?v=` hashes or CI skips the deploy.
  - PropertyCast inlines the bar at its daily publish (check home page HTML; `data-health` in `src/wx/dashboard.py`). A manual `publish` sends push alerts: don't.
  - Context: `npx vercel --prod` with `.vercel/project.json` copied in (retry a first-run error). Vigil: Vercel on push. Watchfloor: `python -I scripts/build_web.py`, then `firebase deploy --only hosting:watchfloor --project context-484804`.
  - Listening Post: no git; back up files first; `firebase deploy --only hosting`.
  - Wake: `update.yml` deploys on push to main.
  - COP's `cop.css` offsets `.bar`/`.app` by `--tic-house-h`. Blackout's tests pin CSP origins and `data-health`.
  - Context and Vigil compile CSS: test by injecting rules into the live page.

## Dispatch Worker (`dispatch/`, `tic-dispatch`)
- GitHub starts this account's scheduled runs only every 4-9 h, so `tic-dispatch` (own `*/5` cron) calls
  workflow_dispatch for each `JOBS` line in `dispatch/dispatch.js`; the reasons for each slot are its comments. Each
  repo's own cron stays as a fallback, with a gate job where it has one. **Only one clock may call `run()`.**
- Add a job: `workflow_dispatch:` in the workflow, a `JOBS` line (minutes multiple of 5, a free hour-minute slot; a
  test forbids clashes; optional `hours`), its repo added to the `DISPATCH_TOKEN` token's repository access (Tom), push.
- Retries 429/5xx after 15 s and 60 s. Healthchecks ping each tick (secret `HC_DISPATCH_PING_URL`), `/fail` on
  failures; Workers Logs on. No public URL.
- Deploy: `dispatch-deploy.yml` on push to `master` touching `dispatch/**` (tests, then `wrangler deploy` and secrets).
  Repo secrets (Tom): `DISPATCH_TOKEN` (fine-grained, named `tic-dispatch`, Actions read/write; **expires 5 Nov 2027**:
  Tom makes a new one, `gh secret set DISPATCH_TOKEN --repo metacog-osint/theintelligence-company`, runs
  dispatch-deploy by hand), `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. The machine's env token can't deploy Workers.

## Site check Worker (`sitecheck/`, `tic-sitecheck`)
- 05:10 and 17:10 UTC: opens the hub and every house-bar program in Cloudflare Browser Run; fails on non-200, an
  uncaught error, no house bar, or a missing `expect` selector (`sites.js`). Results:
  https://tic-sitecheck.metacog.workers.dev/ and `/history` (KV). Healthchecks via `HC_SITECHECK_PING_URL`.
  Deploy: `sitecheck-deploy.yml` on push touching `sitecheck/**` or `tic-nav.js`.

## Veterans Day planner (`site/veterans/veterans-day/`)
- Everything is in `veterans-day/README.md`. Not in the product lists, bar or drawing; shared by link.
- Report Worker `vetday`: deploy with Tom's `wrangler login` and `env -u CLOUDFLARE_API_TOKEN`.
  **Never tap Got it / Turned away / ran out / line report with `?now=` on `localhost:5055`/`5056`**: those origins
  record real reports.
- Privacy promise: location, settings and history stay on the phone; reports carry no ID; OSRM gets store
  coordinates only. Change the page's Privacy text before changing that. Never link fargobites.com.

## Hub page rules (tested)
- Design "The Briefing": Newsreader over IBM Plex Sans/Mono, paper `#F7F5F0`, navy `#14202E`, amber `#E3A83B`, text
  accent `#8F5509`; light and dark. Fonts self-hosted. CSP `'self'`: no inline scripts or styles; every fetch origin
  in `connect-src`.
- `site.js` "Latest" lines start with a bold topic ("GPS interference:"); a failed feed keeps the static line. Say
  "GPS", never "GNSS". Vigil's `brief` goes in as text; its `day` isn't UTC. **No leak-site victim names on the hub.**
- "Updated … ago" from each program's most direct publish time (`setFresh`); "running late" past COP's `fresh_hours`.
- Drawing (`#layers`, `oe/oe.js`): no fixed counts in copy; doctrine column always on; JP citations only in the
  sources line, public documents only; actors described by role, never as hostile; PropertyCast off the drawing;
  every program with an `ask` in exactly one `GROUPS` band. Labels ≥ 9 px at 1440×900, none overlapping: run
  `tests/browser.test.js` after moving a tag or label, and leave a few units of room (CI rounds glyph widths).
- Tags glow on COP-health anomalies. The hero map reads COP's `data/home-points.json`, never `today.geojson`.
- Product lists in layer order (COP first; PropertyCast, Title 10, Listening Post last); `404.html` matches with
  absolute URLs. Product links open a new tab (`target="_blank" rel="noopener" aria-describedby="newtab"`, ending ↗).
- Screenshots (`site/img/`): real site and data, signed in, header included; Tom signs in himself (`RUNBOOKS.md`).
- Location: "Fargo-Moorhead, ND/MN" (prose: "on the North Dakota–Minnesota border"), never "Moorhead, Minnesota".
  Contact support@theintelligence.company. About names Tom only; never "25-year" before a noun; other career detail
  stays on LinkedIn. `Downloads\headshot.jfif` is not Tom. "© 2026 Thomas Brummer" in footers and under the drawing.
- No clock in the top bar, and no selling the time settings in copy (Tom, 15 Nov). Privacy line: "No analytics or
  tracking…": change it before adding anything that tracks.
- Bump the footer date and `sitemap.xml` `lastmod` on material changes. Keep the Google verification CNAMEs in
  Squarespace DNS.
