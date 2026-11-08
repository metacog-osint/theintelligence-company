# The Intelligence Company hub - Claude Context

The company's home page (to serve `theintelligence.company`) and the canonical home of code shared by every
Intelligence Company site. Started 27 Oct 2026 at Tom's request after a review of all his projects.

> **Current state: read [`HANDOFF.md`](./HANDOFF.md) first.** It is the 7 Nov 2026 handoff: what is live, what
> shipped last (tests, the house bar's v1.2 stylesheet, Time dialog fixes, the drawing's labels), next steps, and the
> Vigil summary-feed work.

Dated history (version-by-version changes to the shared files, rollout commits, one-off fixes, superseded details)
is in [`HISTORY.md`](./HISTORY.md). Procedures needed now and then (the Dispatch Worker's checks and local test,
signed-in product screenshots, the link-preview image) are in [`RUNBOOKS.md`](./RUNBOOKS.md). Both were moved there
verbatim on 6 Nov 2026 and aren't auto-loaded.

## Family (decided with Tom, 27 Oct 2026)
- Two houses. **The Intelligence Company** (`theintelligence.company`): analysis, warning and professional tools.
  **Oddly Specific Studio** (`oddlyspecific.studio`): games and family apps (Whiteout, Mole Hunt, Tres Casas,
  Mission Control).
- Intelligence Company products: Watchfloor (beta; CONTEXT's rebuild, `D:\Projects\more-context`), Noisefloor
  (one word since 27 Oct; `D:\Projects\noise-floor`), Vigil, CONTEXT (`D:\Projects\geo-context`), PropertyCast
  (stays here for now), Title 10 Field Guide (`activation.`), Listening Post (invite-only job-search app; listed on the hub
  as "Invite only" since 27 Oct), COP (`cop.`, `D:\Projects\cop`; the common operational picture, beta since 31 Oct
  2026, public and non-commercial for now), Elements (natural hazards) and Cordon (where authorities warn people
  away), both beta on the hub since 31 Oct 2026 (Tom's yes). Since 31 Oct 2026 they are at
  `elements.theintelligence.company` and `cordon.theintelligence.company`: GitHub Pages (Actions builds, repos
  `metacog-osint/elements` and `/cordon`) with custom domains set through the Pages API (no CNAME file needed for
  Actions builds), HTTPS enforced, and Squarespace `CNAME elements|cordon → metacog-osint.github.io`. The old
  `metacog-osint.github.io/elements/` and `/cordon/` addresses 301 to the subdomains. Their drawing lines say what v0
  covers and what is planned (Elements: radiation, since NASA FIRMS fires and USGS volcano alert levels arrived
  by 1 Nov 2026 and EMSC earthquakes and NIFC wildfires by 6 Nov, and global weather: Tom, 5 Nov 2026, "US-based
  weather content is just a small slice of what I need Elements to be; I need global weather data", so Elements'
  text separates worldwide, regional and US-only sources;
  Cordon: NOTAMs, launch hazard areas); update the lines as those arrive (Tom asked for this
  upkeep, 1 Nov 2026). Check by counting `properties.sources[].publisher` in each `data/feed.geojson`.
- **Vis** (operational weather and illumination for Watchfloor's conflict zones; `D:\Projects\vis`, public repo
  `metacog-osint/vis`, Cloudflare Pages) went live at `vis.theintelligence.company` on 8 Nov 2026 and is **beta** on
  the hub, in the house bar (v1.5) and in COP since the same day (Tom's yes, including the wording). Its drawing line
  ends "A thunderstorm hazard and scoring against station reports are planned"; update it as those arrive.
- **Context vs Watchfloor is parked** (Tom, 1 Nov 2026: "stop it, i'm not deciding on this yet"). Both may stay with
  different scopes. Leave Context's "Watchfloor's predecessor" line alone, and don't raise the question again until
  Tom does. Watchfloor's noindex and copyright registration or ™ are also left as they are for now.
- Names for new intel products come from the vocabulary of watching and listening.
- Each product keeps its own colours. Every site carries the house layer: the footer pattern (who, updated date,
  source code and licence if public, terms, data credits, Sources page), the same About structure (what it is,
  method, limits, sources), and the shared time settings.
- Folders from other work belong to neither house.
- Licences: products that may earn money stay on public GitHub under GNU AGPL-3.0 (Vigil, `4b6bc35`; Noisefloor,
  `cf0aa94`; Tom, 27 Oct 2026). Title 10, PropertyCast and Watchfloor have no licence file yet; ask Tom before
  adding one.

## Shared code
- `site/shared/tic-time.js` + `tic-time.css` (v1.3): time display. House rule: store UTC; show the viewer's own
  zone by default, always naming it; a settings menu for zone (automatic, Zulu/UTC, major zones, any IANA zone) and
  12/24-hour clock. On `*.theintelligence.company` the choice is kept in a domain-wide cookie so it follows the
  visitor across sites. The `year` option gives a full date in the house style, "31 Oct 2026", in every zone and
  clock, Zulu included, and `renderAll` reads `data-tic-year`. Copy the files into each site and keep the version
  line; the hub also serves them at `/shared/` (CORS open; live, checked 6 Nov 2026). Every copy is v1.3 on its
  repo's main branch (checked 5 Nov 2026; some local trees lag): Watchfloor `web/`, Title 10 `deploy/public/`,
  Noisefloor `site_src/`, PropertyCast `src/wx/static/`, CONTEXT `public/`, Vigil `public/`, Listening Post
  `web/public/`, and COP, Elements and Cordon.
- `site/shared/tic-nav.js` (v1.5, 8 Nov 2026: Vis added) + `tic-nav.css` (v1.2, 7 Nov 2026; rollout status in `HANDOFF.md`): **the house bar** on every program site (Tom: "I need a
  link back to the home page on each subsite… a dropdown menu of all programs with their primary layer area or topic
  labeled (and a more in-depth description upon mouse-over)"). It is a slim navy bar with "← The Intelligence Company"
  and a **Programs ▾** disclosure menu. That menu lists every live program grouped "Across the layers" and "Other
  tools", each with its layer and topic label, its status (Live, Beta or Invite only) and "You are here", and a side
  panel with the long description on hover or focus. Phones show the label and a one-line summary instead.
  Keyboard: arrows, Home and End move; Esc closes. It is CSP-safe, with no inline styles and no HTML strings, mounts
  first in `<body>` or into `#tic-nav`, finds the current program from the host name (or `data-current`), and opens
  program links in the same tab, since it is site navigation. **Keep its `PROGRAMS` in step with `oe/oe.js` and the
  product list** when a program is added, renamed or goes live. Test page: `tools/tic-nav-demo.html` (serve the
  project root). The hub itself doesn't use the bar; it has its own masthead.
  - Its z-index is 10000 so its menu covers headers with their own stacking, such as Noisefloor's z-index 1100, and it
    resets `display`, margins, padding and borders so a site's generic `nav` rules can't reshape it, such as
    Watchfloor's flex `nav`.
  - `tic-nav.css` v1.2 (7 Nov 2026): "You are here" uses the text accent `#8F5509` on the light panel (`--tn-here`);
    the amber it used read 1.9:1, under WCAG's 4.5:1. Dark mode keeps the amber.
  - `tests/nav.test.js` and `tests/a11y.test.js` test the bar on a stand-in product page (menu, keyboard, phone, axe).
  - Elements' `long` text is the v1.4 wording Tom approved on 6 Nov 2026: "Worldwide: earthquakes from USGS (with
    impact alerts) and EMSC, …", weather warnings "Regional: … for the US and Europe", "US only for now: wildfire
    incidents, …" and "Weather for more of the world is planned". `oe.js` names EMSC ("EMSC's independent
    catalogue"), NOAA, MeteoAlarm (38 European countries and Israel) and NIFC.
  - PropertyCast builds the bar into its page at its daily publish, so check its home page's HTML, not `/tic-nav.js`.
- **Rolling out a shared file** (all ten program sites carry both, and Vis since 8 Nov 2026). When a program is added or renamed, update
  `PROGRAMS` in `tic-nav.js` and copy it to every site. Method: a git worktree per repo, test locally, Tom's yes, push
  to main, deploy the repo's own way. **Stop local preview servers with Stop-Process on their node or esbuild PIDs:**
  stopping the task only kills the shell, and the leftover processes lock the worktree folder. Per site (each
  rollout's commits are in `HISTORY.md` and `HANDOFF.md`):
  - Title 10: deploy from a clean worktree, because its main folder holds an untracked
    `deploy/public/data/benefits-pack.json` that must not ship.
  - Noisefloor: its pre-commit hook needs the private term list, so commit from a worktree with
    `FORBIDDEN_TERMS="$(cat <main>/private/forbidden_terms.txt)"`; after copying, run `python tools/build_site.py` so
    the `site/` pages carry the new file's `?v=` hash, or CI fails and the deploy is skipped.
  - PropertyCast goes live with the next daily publish. Vigil: Vercel deploys on push to main.
  - Context deploys only with `npx vercel --prod`, so copy `.vercel/project.json` into the worktree.
  - Listening Post has **no git**: back up files before editing; `firebase deploy --only hosting`.
  - COP is a fixed full-screen layout, so `cop.css` pins the bar and moves `.bar` and `.app` down 34px, under
    `body:has(> .tic-house)`.
  - Elements and Cordon copy `site_src/` to `site/` at build and deploy to GitHub Pages on push.

## Dispatch Worker (`dispatch/`, Cloudflare Worker `tic-dispatch`)
- Built 5 Nov 2026 at Tom's request ("Yes, build it"). GitHub starts scheduled runs on this account only every 4 to 9
  hours, whatever the cron says: Elements' and Cordon's scheduled runs came 4.4 to 8.3 hours apart on 4–5 Nov.
  `tic-dispatch` calls GitHub's workflow_dispatch API for each line of `JOBS` in `dispatch/dispatch.js`: Elements
  `update.yml` at :05 and :35 UTC, Cordon `update.yml` at :10 and :40. Their gate job skips only scheduled runs, so
  their own crons stay as a fallback and skip whenever a dispatched run deployed in the last 45 minutes.
- **COP joins (6 Nov 2026, Tom's yes; pushed that day):** COP `build.yml` at :20 past every even UTC
  hour. COP's own "every two hours" cron had fired only every 7 to 14 hours (16:29, 23:38 and 06:47 UTC on 5–6 Nov),
  which also left its MCP server's answers stale. A JOBS line can now carry `hours` (UTC hours it may run in; without
  it, every hour). COP's repo is private, so 12 runs a day spend about 600 of the free 2,000 Actions minutes a month;
  COP's gate skips a scheduled run when a build succeeded in the last 45 minutes, so the fallback cron doesn't double
  that. Tom added `cop` to the `DISPATCH_TOKEN` token's repository access the same day (no new token). If that
  access is ever lost, COP's start fails with GitHub's 404 every two hours and Elements and Cordon carry on.
- **Vis joins (8 Nov 2026, Tom's yes):** Vis `build.yml` at 08:25 and 20:25 UTC, after the 00Z and 12Z ensembles
  reach Open-Meteo. Vis's own cron moved to 08:53 and 20:53 as the fallback, and its gate skips a scheduled run within
  6 hours of a successful build (the models only change twice a day). Vis's repo is public, so its minutes are free.
  Tom adds `vis` to the `DISPATCH_TOKEN` token's repository access; until then Vis's start fails with GitHub's 404
  twice a day and the others carry on.
- **Its clock is PropertyCast's.** The free plan allows 5 cron triggers per account, and on 5 Nov all 5 were in use:
  PropertyCast's trigger 1 (`*/5`), Vigil's ingestion Worker 4. The first deploy, with a cron of its own, was refused
  (code 10072). So `tic-dispatch` has `crons = []`, and
  `propertycast-trigger` calls its `tick(scheduledTime)` on every 5-minute wake through the service binding `DISPATCH`
  (`PropertyCast/trigger/wrangler.toml`; `lend()` in its `worker.js` logs tic-dispatch's failures and never throws).
  Tom chose this over Workers Paid ($5/month: 250 cron triggers per the docs, the error said 1,000) and over merging
  Vigil's crons, 5 Nov 2026. If PropertyCast's trigger is ever removed, the dispatcher stops: give it a cron of its
  own first (its `scheduled()` handler is ready).
- **Vigil's crons merged, 6 Nov 2026** (Tom asked, 5 Nov; Vigil PR #92, merge `a2383f5`; Worker deployed by hand
  about 3:20 PM CST): one trigger, `15,45 * * * *`, so 2 of the account's 5 are in use and 3 are free. Vigil's four
  triggers were only ticks (its scheduler runs whatever is overdue), but one hourly trigger would have overloaded it:
  its registry declares about 900 subrequests a day, and 24 ticks admit 768. Vigil's
  `workers/src/lib/__tests__/capacity.test.js` fails if that stops fitting. `tic-dispatch` still runs on PropertyCast's
  clock; a cron of its own is now possible (Tom's call).
- Deploy: `.github/workflows/dispatch-deploy.yml` runs on a push to `master` that touches `dispatch/**` (or by hand),
  tests first (`node --test` in `dispatch/`, no network), then `wrangler deploy` and the secret upload, in
  PropertyCast's order. Deploy `tic-dispatch` before any PropertyCast trigger deploy that adds the binding: a binding
  to a missing Worker fails. Hub repo secrets, set by Tom: `DISPATCH_TOKEN` (fine-grained; elements, cordon, cop and, once Tom adds it, vis;
  Actions: read and write), `CLOUDFLARE_API_TOKEN` ("Edit Cloudflare Workers" template), `CLOUDFLARE_ACCOUNT_ID`. The
  `CLOUDFLARE_API_TOKEN` in this machine's environment sees Pages projects but not Workers, so it can't deploy this.
- **`DISPATCH_TOKEN` expires 5 Nov 2027** (Tom, 5 Nov 2026). Before then Tom makes a new one the same way, runs
  `gh secret set DISPATCH_TOKEN --repo metacog-osint/theintelligence-company`, and runs `dispatch-deploy` by hand to
  upload it. The Cloudflare token doesn't expire.
- No public URL (`workers_dev = false`, `preview_urls = false`); only the binding reaches it. How a failed start
  shows up, the 5 Nov checks on GitHub's limits, and a local test without deploying: [`RUNBOOKS.md`](./RUNBOOKS.md).
- To add a workflow: give it `workflow_dispatch:`, add a `JOBS` line (minutes are multiples of 5, in a slot of its
  own; optional `hours` for less than hourly; a test checks no two jobs share an hour and minute), add its repo to
  the token's repository access, push.

## Site
- Static files in `site/`, no build step. Firebase Hosting site `theintelligencecompany` in project
  context-484804: https://theintelligencecompany.web.app. Deploy (needs Tom's yes):
  `firebase deploy --only hosting:hub --project context-484804`.
- **Public since 29 Oct 2026 UTC** (Tom's go-ahead, evening of 28 Oct CDT): the noindex meta, X-Robots-Tag header and
  robots.txt block are gone, and the page names `https://theintelligence.company/` as canonical so the `web.app` copy
  isn't indexed separately. Watchfloor's noindex is a separate decision. The root `/` has its own `no-cache` rule because
  the `**/*.@(html|js|css)` pattern doesn't match it.
- **Google Search Console** (set up 29 Oct 2026 UTC, account metacog@): Domain property `theintelligence.company`, so it
  covers every subdomain. Google auto-verified it ("Domain name provider") through the existing Google verification
  CNAMEs in Squarespace DNS (`l6g3iae2wlli` and `pgso2rwhxeyj` → `gv-….dv.googlehosted.com`); don't delete them.
- Contact shown on the hub: support@theintelligence.company (Tom, 27 Oct). The About names Tom only (his choice).
- Apex domain: `theintelligence.company` and `www.` (redirects to the apex) are Firebase custom domains on the
  theintelligencecompany site since 28 Oct 2026. Squarespace DNS holds `A @ 199.36.158.100`,
  `TXT @ hosting-site=theintelligencecompany` and `CNAME www → theintelligencecompany.web.app`; the Google Workspace
  MX/SPF/DKIM/DMARC records are untouched. Claude set it up at Tom's request; method in
  `D:\Projects\CLAUDE_HANDOVER.md` §3.11.
- **Design "The Briefing"** (Tom picked it from three mockups, 29 Oct 2026; canvas
  https://claude.ai/artifact/6fJpchGrjgQAgLEXKBWBfh): Newsreader headlines over IBM Plex Sans/Mono, paper `#F7F5F0`, navy
  `#14202E`, amber mark `#E3A83B`, text accent `#8F5509`; light and dark. Fonts are self-hosted in `site/fonts/` (SIL OFL,
  licence files beside them; Newsreader from Google Fonts, Plex copied from Noisefloor) because the CSP allows only
  'self'. No inline styles or scripts (CSP).
- **"Latest from the products"** (`site.js`): Noisefloor's `data/board.json` (`brief`, `freshness.aircraft_day`) and
  Watchfloor's public API `/summary` (the conflict zone with the highest attention z, named only when Watchfloor raised an
  alarm; keys starting `T` are topics). Both send `Access-Control-Allow-Origin: *`; `firebase.json`'s `connect-src`
  lists the two origins. A feed that fails leaves the static line. PropertyCast has no JSON feed yet. Vigil's line is
  below. Since 5 Nov 2026 a fourth line, "All layers:", comes from COP's `data/health.json`: feeds in state `fresh`
  out of all, and the sum of `placed` findings. `site.js` shares the Noisefloor, Vigil and COP fetches with `oe.js`
  (`window.ticNoisefloor`, `ticVigil`, `ticCopHealth`).
- **"How the programs fit"** (`#layers`, built 31 Oct 2026 from Tom's interactive draft and his 14 review points):
  a dark band after the hero. The artwork is inline SVG in `index.html` (seven plates adapted from JP 2-01.3 Fig I-1);
  `site/oe/oe.js` draws everything that changes from one data table: program tags on each home layer (live, beta or
  in development, planned, core), the reach line through every layer a program touches, the question-led guide
  ("Find your way in", no numbered start), the panels, and the live zone and topic counts from Watchfloor's
  `/summary` (shared with `site.js` through `window.ticWatchfloor`). **The guide** (Tom, 4 Nov 2026, instead of
  trimming 14 questions) starts as three questions, one per band of the drawing (`GROUPS` in `oe.js`: conflict and
  pressure; networks, signals and satellites; ground, sea and air), each opening to its programs' own `ask` lines.
  One opens at a time, lights its layers and programs, and shows a group panel. Every program with an `ask` must be
  in exactly one group. Phones keep the row of program chips, in group order. **To add or move a program, edit `PROGRAMS`**
  (`home`, `reach`, `at`). Rules from Tom: no fixed counts in copy (zones change); the right column is doctrine's
  grouping, always on, with JP citations only in the sources line under the figure, and only publicly released
  documents cited; actors are described by role as sources describe them, never as hostile; PropertyCast stays off the
  drawing (it's in the product list). On phones, planned programs show as rings only.
- Product screenshots in `site/img/` (WebP, 2x, captions dated): retake with headless Edge when a product changes.
  **They must show the real site with real data, as a signed-in user sees it, header included** (Tom, 31 Oct 2026),
  never a signed-out landing page, demo mode (Vigil's demo is mock data) or a bare map. Current:
  `noisefloor-today.webp`, `watchfloor-zones.webp` and `vigil-actors.webp` (31 Oct 2026; the signed-in Threat Actors
  view: real data, group names only. The signed-in dashboard's AI summary names victims, so it isn't used). For
  signed-in captures Tom signs in himself in a separate Edge profile, which is deleted afterwards; Claude never sees
  the password or the session. Edge flags, the Playwright script and Vigil's tour key: [`RUNBOOKS.md`](./RUNBOOKS.md).
- Local preview: `python tools/serve.py 5055` (applies the `firebase.json` headers; since 7 Nov 2026 a missing page or a
  folder gets `404.html` with status 404, as live). `firebase serve --only hosting:hub --port 5055 --project
  context-484804` also works but skips the headers, so a CSP problem only shows up live.
- **Tests** (`tests/`, since 7 Nov 2026; how to run them: `tests/README.md`). `npm test` in `tests/` runs everything in
  about 40 s; GitHub runs it on every push that touches `site/`, `tests/`, `serve.py` or `firebase.json`
  (`.github/workflows/site-checks.yml`). They encode the rules in this file: the four program lists agree, no inline
  code or styles, new-tab links, absolute URLs on the 404 page, `connect-src`, ruled-out wording, footer date vs
  sitemap; the page with sample feeds (`tests/fixtures`), its fallbacks, guide, keyboard and phone layout; and axe
  (WCAG 2.2 AA) in light and dark. When a rule here changes, change its test too. The workflow's `feeds` job checks
  the seven live feeds (`tests/check-live.js`) and doesn't block: a product being down turns only that job red.
  This machine has no Playwright Chromium; run the browser tests on the installed Edge with a preload that wraps
  `chromium.launch` in `{ channel: "msedge" }` (`NODE_OPTIONS="--import=file:///<helper>.mjs" node --test`), or
  run `npx playwright install chromium` once (a download of about 150 MB).
- The shared time dialog (`tic-time.css`) reads `--panel`, `--bg`, `--line`, `--muted` and `--accent` (white text on
  it), and falls back to white and grey. A site whose own variables have other names must map them on
  `.tic-time-dialog`, or dark mode breaks. The hub maps `--card`, `--paper`, `--rule` and `--mut` in `style.css`
  (7 Nov 2026). Every site's dialog was checked live in light and dark on 7 Nov 2026 (axe): Title 10, Watchfloor and
  COP were fixed in their own CSS the same way; Listening Post's Done button still fails in dark mode (`HANDOFF.md`).
  When a site changes its colours, open its Time dialog in dark mode.
- **The drawing's labels** (7 Nov 2026, Tom: "make sure everything is clean, nothing overlaps"): every label is at
  least 9 px tall on a 1440×900 screen (the drawing's size follows the window's height, so about 7.8 px at 1366×768).
  Flat labels are 12.5 drawing units, labels lying on a plate 20 (the plate's tilt shrinks them), plate titles 24.
  Labels inside the plates carry `class="ann"` and are hidden on phones, where they would render 3 to 5 px. Moved that
  day so nothing collides: Economic, Social and Infrastructure sit left of their node clusters; Third party a step
  up-left; SPECTRUM at its plate's left corner like CYBERSPACE (it was under the cyberspace plate); GEO BELT beside the
  visible stretch of the belt line (it was under the spectrum plate); near space in the strip of its band below the
  space plate (it was cut off); SUBSURFACE · SEABED further left; SHARED SEAM 3 units in from the edge; Temper's tag
  8 units right (its ring touched Context's tag on phones); on phones the column headings are 20.5 px and BY KIND
  shifts right (`.colh-l`). The test loads every font before measuring (the monospace face isn't preloaded).
  GitHub's runner rounds letter widths to whole pixels, which draws phone labels up to 14% wider than a local run, so
  the drawing has to pass both: locally (subpixel text) and in `site-checks` (rounded). It did on 7 Nov 2026, and
  also with every label widened half a pixel per letter locally. Leave a few units of room when moving a label. `tests/browser.test.js` ("the drawing's labels", `tests/lib/drawing.js`) fails if
  any label or tag overlaps another, leaves its plate, sits under a later plate or runs off the drawing at ten screen
  sizes, or drops under 9 px at 1440×900. Run it after moving a tag (`at` in `oe.js`) or a label.
- The header landmark holds the top bar too (`<header>` wraps `.util` and `.mast`, 7 Nov 2026), so the location line
  and the Time button aren't outside every landmark. Nothing styles `header` itself; screenshots were unchanged.
- About bio, reworded 31 Oct 2026 because "In 25 years of service he began…" read clunkily (Tom): "…and run by Thomas
  Brummer. He has served in the Air National Guard for 25 years. He started as an F-16 crew chief and an Air Force
  weather forecaster, and has spent more than half his career as a signals intelligence (SIGINT) analyst." Under the
  About sits a "Thomas Brummer on LinkedIn" link (https://www.linkedin.com/in/tom-brummer/, also `sameAs` on the
  founder in the JSON-LD). LinkedIn shows signed-out visitors a sign-in wall, so his photo can't be fetched from there.
- The About bio (short version, Tom approved 30 Oct 2026, so it doesn't read as a résumé): 25 years of service (all
  Air National Guard: "25 years of service" and "25 years in the ANG" are the same thing), starting as an F-16 crew
  chief and Air Force weather forecaster, more than half his career a SIGINT analyst, today in the Guard. Second
  paragraph: every job means judging the state of a complex system under pressure and saying how sure you are, which
  leads into the products' standards. The longer credentials (builds programs and leads analysts, research team, 100+
  analysts trained, AI-assisted analysis standards) live in his LinkedIn About, not here; nor do other career details. Never "25-year ..." before a noun: readers took it as his age. The
  headshot is in (see Headshot below).
- **Location on every public page: "Fargo-Moorhead, ND/MN"** in labels, or "Fargo-Moorhead, on the North
  Dakota–Minnesota border" in prose (anchor added 31 Oct 2026 so readers outside the region can place it); never
  "Moorhead, Minnesota" (the LLC is registered in Fargo; Tom, 30 Oct 2026). PropertyCast's forecast point is the
  Moorhead yard itself, which stays as it is. On the hub it appears in the top bar, the About and the footer; the contact
  block no longer repeats it.
- **Links to the products open in a new tab** (Tom, 31 Oct 2026): `target="_blank" rel="noopener"
  aria-describedby="newtab"`, where `#newtab` is a hidden "Opens in a new tab" note for screen readers. `oe/oe.js`
  builds its "Open" links the same way; keep both in step when adding a product.
  Links that open a new tab end in **↗**; arrows on in-page controls stay →.
- **No clock in the top bar** since 31 Oct 2026: the Time button already names the viewer's zone, and Tom found the
  zone repeated (clock, button, and "Central time" in the contact block, all removed except the button).
- **Seven improvements, 31 Oct 2026 (Tom asked for all seven):**
  - **Link preview:** Open Graph and Twitter card tags in `<head>`, image `site/img/og-card.png` (1200×630). Its source
    is `tools/og-card.html` (site fonts and colours); `site/img/logo-512.png` comes from `tools/logo.html`. Neither
    source is deployed; how to regenerate both is in `RUNBOOKS.md`. LinkedIn caches previews; its Post Inspector
    refreshes one.
  - **Hero top line:** "Conflict · GPS interference · Cyber threats · Forecasting" since 31 Oct 2026. Keep it to one
    line at 1280 px.
  - **Say what each line measures** (Tom, 31 Oct 2026: readers must know Noisefloor is about GPS interference, and
    the same goes for every summary). Each "Latest" item starts with a bold topic (`.latest-topic`: "GPS
    interference:", "Conflict warning:", "Cyber threats:"), and `setItem` fills only `.latest-body`, so the topic
    stays whatever the feed says. The hub says "GPS" for Noisefloor and FieldCast, never "GNSS" or "the contested
    radio spectrum". Noisefloor's own brief still says "degraded aircraft", which is Noisefloor's wording to fix.
  - **Footer date** uses `data-tic-year`: "Updated 31 Oct 2026" in the viewer's zone.
  - **Footer Sources links:** Noisefloor `/sources`, Watchfloor `/#/sources`, Vigil `/sources`, PropertyCast
    `/#sources`, Title 10 `/#contacts` ("Contacts & sources"), Context `/sources` and Listening Post `/sources.html`
    (both linked since `4d05cf2`); since 7 Nov 2026 also Elements and Cordon `/#health-h` (each page's Sources card), since 8 Nov Vis `/#sources`,
    and COP's home page (its Sources sit in its side panel, and its address after `#` holds the map view, so a
    `#sources` link wouldn't hold). Each ends in ↗ joined by `&nbsp;`, so the arrow never starts a line. A test checks
    there is one link per program in the house bar.
  - **Privacy line:** "No analytics or tracking. Time settings, if you change them, stay in your browser." True as
    of 31 Oct 2026: no analytics or third-party scripts, and `tic-time.js` writes its cookie and local storage only
    when the visitor changes a setting. Change the line before adding anything that tracks.
  - **Search markup:** JSON-LD in `<head>` (Organization with logo, email, founder Thomas Brummer, address Fargo, ND,
    the LLC's registered city; plus WebSite). A JSON-LD block isn't executed, so the `script-src 'self'` CSP allows it
    (checked: no console violation).
  - **Contact note:** "Corrections, data questions and collaboration." under the email.
- **Second batch, 31 Oct 2026 (Tom approved items 1–9):**
  - **Search title** "The Intelligence Company · OSINT from Fargo-Moorhead, ND/MN"; the description and
    `og:description` name Fargo-Moorhead, ND/MN.
  - **`site/404.html`**: Firebase serves it for any missing path at any depth, so every URL in it is absolute. Its
    product list is a copy of the home page's; keep the two in step.
  - **Home-screen icons**: `img/apple-touch-icon.png` (180), `img/icon-192.png`, `img/logo-512.png`, `site.webmanifest`,
    and `theme-color` for light and dark. Headless Edge won't render a window narrower than about 500 px, so the 180
    and 192 are downscaled from the 512 render (System.Drawing, high-quality bicubic).
  - **`sitemap.xml`** (apex only) and a `Sitemap:` line in `robots.txt`. Bump `<lastmod>` when the page changes
    materially.
  - **"Updated … ago"** under every live program in the product list (`site.js` `setFresh`, keyed by
    `li[data-product]`; one line per program, updated in place). Since 1 Nov 2026 UTC each time comes from the most
    direct source: Noisefloor `board.json` `built_utc`, Watchfloor `/summary` `built_at`, Vigil `/api/summary`
    `data_as_of` (its last successful RansomLook run, since Vigil PR #86, 5 Nov 2026 UTC; falls back to `built_at`, which is
    only when the summary was assembled and always read "just now"), COP `data/health.json` `generated_at`, Context
    from COP's health entry (`data_as_of`; Context has no
    small file of its own), and Elements and Cordon from a HEAD request's `Last-Modified` on their `data/feed.geojson`
    (400–500 KB, so it is never downloaded). Vis (8 Nov 2026) is on Cloudflare Pages, which sends an ETag but no
    `Last-Modified`, so the hub reads its whole `data/feed.geojson` (168 KB, about 8 KB as served, brotli) for
    `generated_at`. Since 5 Nov 2026 the line adds "· running late" in amber when its own
    "Updated … ago" is older than that program's `fresh_hours` in COP's health (COP's own `state` judges the newest
    data, not publication, so it isn't used); the reason is in the tooltip. If Vigil's `/api/summary` 503s, Vigil's
    time falls back to COP's `data_as_of`. The
    tooltip gives the full time in the viewer's zone. `connect-src` lists the cop., elements., cordon. and vis. origins.
    Add a program by giving its row `data-product` and calling `setFresh` with its most direct publish time.
  - **Vigil feature block:** the signed-in `img/vigil-actors.webp` (see Product screenshots); its three points are
    from Vigil's README, and Vigil's other pages need an account. The rule: **don't put leak-site victim names on the
    hub.**
  - **Vigil "Latest" line** from `https://vigil.theintelligence.company/api/summary` (`method: "vigil-summary-2"`).
    It returns `brief`, `day`, `data_as_of` and `built_at` with open CORS and an hour of CDN cache, or a 503 whenever
    Vigil can't stand behind a number, including a zero day. Then the hub keeps the static line. Rules from that
    session: insert `brief` as text only (group names come from criminal leak sites); `day` is RansomLook's calendar
    day, one to two hours ahead of UTC, so never label it UTC; credit RansomLook (CC BY 4.0) in the footer, which the
    hub does. Vigil's origin is in `connect-src`, and `setFresh("vigil", data_as_of || built_at)` drives "Updated …
    ago" in the product list.
  - **"Work with us"** (`#services`, between Products and How we work; in the menu, and the hero's second button):
    custom monitoring, briefings, analyst training, tools and consulting (Tom confirmed all four, 31 Oct 2026). The
    button opens a mail to support@ with a subject line. Career details stay off the page, as with the About.
  - **COP on the hub** (asked by the COP session for Tom, 31 Oct 2026): `PROGRAMS` entry `cop` is `status: "beta"`
    with `href` and a guide question, and its line now says what v0 does (the old line promised cross-layer
    scoring, which COP doesn't do). `kind()` and `statusWords()` now follow status for core programs too: a planned
    core program (Verdict) keeps the dashed "core" mark, while a core program that is out draws as live or beta and
    reads "Beta, core". COP is also in "Every product" and `404.html`, after Context.
  - **Headshot** (31 Oct 2026): Tom sent his photo in chat; it is `img/thomas-brummer.webp` (480 px square), beside
    the bio (200 px; above it on phones, 140 px) and as the founder's `image` in the JSON-LD.
    `Downloads\headshot.jfif` is not Tom (it carries a Gemini watermark); never use it.
  - **Copyright notice** (Tom, 31 Oct 2026: "use the copyright symbol, and my name"): "Drawing © 2026 Thomas Brummer,
    adapted from JP 2-01.3…" under the drawing, and "© 2026 Thomas Brummer" first in the footer of `index.html` and
    `404.html`. Registration was discussed and not done (fees and what is protectable: `HISTORY.md`).
- Times: store UTC; display per the shared module. Messages to Tom use Central time.
