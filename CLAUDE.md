# The Intelligence Company hub - Claude Context

The company's home page (to serve `theintelligence.company`) and the canonical home of code shared by every
Intelligence Company site. Started 27 Oct 2026 at Tom's request after a review of all his projects.

> **Current state: read [`HANDOFF.md`](./HANDOFF.md) first.** It holds the current state, measured, and the open
> next steps only. Finished dated sections move verbatim to `HISTORY.md` (last done 14 Nov 2026).

Dated history (version-by-version changes to the shared files, rollout commits, one-off fixes, superseded details)
is in [`HISTORY.md`](./HISTORY.md). Procedures needed now and then (the Dispatch Worker's checks and local test,
signed-in product screenshots, the link-preview image) are in [`RUNBOOKS.md`](./RUNBOOKS.md). Both were moved there
verbatim on 6 Nov 2026 and aren't auto-loaded.

## Family (decided with Tom, 27 Oct 2026)
- Two houses. **The Intelligence Company** (`theintelligence.company`): analysis, warning and professional tools.
  **Oddly Specific Studio** (`oddlyspecific.studio`): games and family apps (Whiteout, Mole Hunt, Tres Casas,
  Mission Control).
- Intelligence Company products: Watchfloor (beta; CONTEXT's rebuild, `[local path]`), Noisefloor
  (one word since 27 Oct; `[local path]`), Vigil, CONTEXT (`[local path]`), PropertyCast
  (stays here for now), Title 10 Field Guide (`activation.`), Listening Post (invite-only job-search app; listed on the hub
  as "Invite only" since 27 Oct), COP (`cop.`, `[local path]`; the common operational picture, beta since 31 Oct
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
- **Vis** (operational weather and illumination for Watchfloor's conflict zones; `[local path]`, public repo
  `metacog-osint/vis`, Cloudflare Pages) went live at `vis.theintelligence.company` on 8 Nov 2026 and is **beta** on
  the hub, in the house bar (v1.5) and in COP since the same day (Tom's yes, including the wording). Its drawing line
  ends "A thunderstorm hazard and scoring against station reports are planned"; update it as those arrive.
- **Blackout** (internet outages, censorship measurements, and cloud and satellite providers' own incident reports;
  `[local path]`, private repo `metacog-osint/blackout`, Cloudflare Pages) went live at
  `blackout.theintelligence.company` on 12 Nov 2026 and joined COP the same day. Since 13 Nov 2026 UTC it is **beta**
  on the hub, in the house bar (v1.6) and on the drawing. On 13 Nov 2026 Blackout added BGP routing and power lanes
  and Tom's headline "Where the lights go out and the internet goes dark."; the hub's wording for them (house bar v1.7,
  product lists, drawing) was written by a Blackout side session and went live on every site the same day. Its drawing line now ends "Night lights from NASA's Black Marble are built and start
  once NASA's data access is in place" (they wait on Tom accepting LAADS's data licence on his Earthdata account);
  update it when night lights read. Its footer credit links its home page, whose Method tab lists every source; point
  it there if that becomes its own page.
- **Headwind** (economic stress: currencies, energy and food prices against their own range, sanctions and
  screening-list changes, BIS and OFAC rules, US mineral import reliance; `[local path]`, private repo
  `metacog-osint/headwind`, Cloudflare Pages) went live at `headwind.theintelligence.company` on 13 Nov 2026. The
  hub's listing was prepared the same day with the wording Tom approved: **beta** in the house bar (v1.8, after
  Blackout, "Systems · economic stress"), in the product lists after Blackout, and on the drawing (its `line` is the
  bar's long text; the Systems layer's sanctions, price and mineral-reliance rows are "now"). Pushed, deployed and rolled out the same day
  (`HANDOFF.md`). Its footer credit links its home page (its Sources card has
  no anchor). "Critical minerals" stays a separate planned tag on the drawing.
- **Orbit** (space: orbital launches of the last 7 and 30 days, launches scheduled in the next 14 days, reentries,
  satellite catalog changes and objects in orbit by owner code, from GCAT and Launch Library 2;
  `[local path]`, private repo `metacog-osint/orbit`, Cloudflare Pages `orbit-q2t.pages.dev`) went live at
  `orbit.theintelligence.company` on 13 Nov 2026. The hub's listing was prepared the same day (side session "Orbit
  listing"; wording Tom approved; live that day): **beta** in the house bar (v1.9, after Noisefloor, "Space · orbital
  activity"), in the product lists after Headwind, and on the drawing (its `line` is the bar's long text; the Space
  layer's launch and catalog-change rows are "now", manoeuvres and counterspace stay "dev"). Describe it only from
  what is live: manoeuvres and counterspace are not built. Its footer credit links `/#src-h` (its Sources heading).
- **Launch** (launch and reentry closure areas: FAA space-operations TFRs, scheduled launches that coincide with a
  closure area, Tom's closure history since 2023 with per-pad corridors and recurring drop zones; `[local path]`,
  private repo `metacog-osint/launch`, Cloudflare Pages `launch-ey0.pages.dev`) went live at
  `launch.theintelligence.company` on 14 Nov 2026. Listed the same day (Tom's "list it", then "push and deploy"; hub deployed about 11:20 AM CST after Tom re-signed in to Firebase): **beta** in the
  house bar (v1.10, after Orbit, "Space · launch closures"), in the product lists after Orbit, on the drawing in the
  Space layer at [736, 930] (its row "Launch and reentry closure areas" is "now"; the old "Launch hazard areas,
  planned, Cordon" row became it), and in the second guide question. Worldwide NOTAMs wait on FAA access: say so.
  Footer credit links `/#src-h`.
- **Undertow** (covert influence operations as the platforms and governments that disrupted them report them: Meta,
  Google, OpenAI's RSS feed, TikTok via the EU Code of Conduct Transparency Centre, and the EEAS; origin, targets,
  DISARM techniques, STIX 2.1 export; operation level only; `[local path]`, private repo
  `metacog-osint/undertow`, Cloudflare Pages `undertow-cm3.pages.dev`) went live at
  `undertow.theintelligence.company` on 14 Nov 2026. Listed the same day (Tom approved the wording, "Yes, go"):
  **beta** in the house bar (added in v1.11, after Context, "Human · influence operations"), in the product lists after
  Launch, on the drawing at [780, 426] (the planned "Influence operations" node became it; the Human row
  "Attributed influence operations and platform takedowns" is "now"), and in the first guide question after
  Context. Its DISARM rule table was reviewed by Tom on 14 Nov 2026 CST (two rules narrowed; Undertow `d18db9a`):
  a technique is still Undertow's reading of the publisher's words, not the publisher's claim. Its EEAS register had
  a second machine reading on 15 Nov 2026 (Undertow `e70194d`), not a person's check. Since kit 0.5.6 (15 Nov
  2026) its date-only and month-only items carry `data_as_of_precision`.
  Footer credit links `/#method`. Its feed is about 1.9 MB (about 65 KB compressed) and the hub reads it whole.
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
- `site/shared/tic-time.js` (v1.4) + `tic-time.css` (v1.3): time display. House rule: store UTC; show the viewer's own
  zone by default, always naming it; a settings menu for zone (automatic, Zulu/UTC, major zones, any IANA zone) and
  12/24-hour clock. On `*.theintelligence.company` the choice is kept in a domain-wide cookie so it follows the
  visitor across sites. The `year` option gives a full date in the house style, "31 Oct 2026", in every zone and
  clock, Zulu included, and `renderAll` reads `data-tic-year`. Copy the files into each site and keep the version
  line; the hub also serves them at `/shared/` (CORS open; live, checked 6 Nov 2026). Every copy is v1.3 on its
  repo's main branch (checked 5 Nov 2026; some local trees lag): Watchfloor `web/`, Title 10 `deploy/public/`,
  Noisefloor `site_src/`, PropertyCast `src/wx/static/`, CONTEXT `public/`, Vigil `public/`, Listening Post
  `web/public/`, and COP, Elements and Cordon.
  - **v1.4 (16 Nov 2026):** formatters are built once per zone and option set and reused, and the device's zone and
    clock are read once per page. v1.3 built a new `Intl.DateTimeFormat` on every call, about 1 ms each, which held
    Elements' first draw for seconds (~5,700 fire tooltips) and cost Cordon ~0.25 s. Output unchanged: v1.3 and v1.4
    gave identical text for 160,056 cases (24 zones including an invalid one, 3 clocks, 9 option sets, dates across
    both DST changes, bad input); 6,000 calls 4,940 ms -> 880 ms in Node on a loaded machine. Not yet copied to the
    program sites, which carry v1.3; roll out like any shared file (Tom's yes per site).
- `site/shared/tic-area.js` (v1.1): **"My area"**, the viewer's chosen part of the world (all, the US 48, a US state,
  or within a distance of a point), saved in this browser only; items outside it are dimmed, never hidden. API:
  `TicArea.mountSettings(el, states, opts)` (an "Area" button; `opts.note` replaces the dialog's closing note),
  `get()`, `contains(item)` (`item = {subdivisions, countries, geometry}`; countries without "US" put an item outside
  any US area), `label()`, `onChange(fn)`. Its dialog uses `tic-time.css`. Built in Cordon (v1.0, 15 Nov 2026);
  v1.1 from Elements (16 Nov 2026, `e2585e8`) is the canonical copy here, moved 16 Nov 2026 once two sites used it.
  Carried by Elements and Cordon (`site_src/`). Tests: `site.test.js` checks its version line and CSP rules; its
  behaviour is tested in each site.
- `site/shared/tic-nav.js` (v1.12, 14-15 Nov 2026: the bar stays at the top of the window and minimizes to a tab,
  below; v1.11, 14 Nov 2026: Undertow added after Context, and the hub's own home page carries
  the bar (Tom: the Programs menu on theintelligence.company too) with `data-home="here"`, which shows the home
  link as plain text; rolled out to the program sites by a side session; v1.10, 14 Nov 2026: Launch added after Orbit, pushed and deployed to the program sites about 2:20 PM CST that day (Tom's "Ship house bar v1.10"), COP followed about 2:55 PM CST (`bfad57b`, build run 43639997763), live everywhere except PropertyCast (goes live at its next daily publish); v1.9, 13 Nov 2026: Orbit added after Noisefloor, live on every site that day; v1.8,
  13 Nov 2026: Headwind added after Blackout, live on every site that day; v1.7, 13 Nov
  2026: Blackout's power and routing wording, live on every site that day; v1.6, 13 Nov 2026 UTC: Blackout added; v1.5, 8 Nov: Vis) + `tic-nav.css` (v1.3 with v1.12; v1.2, 7 Nov 2026; rollout status in `HANDOFF.md`): **the house bar** on every program site (Tom: "I need a
  link back to the home page on each subsite… a dropdown menu of all programs with their primary layer area or topic
  labeled (and a more in-depth description upon mouse-over)"). It is a slim navy bar with "← The Intelligence Company"
  and a **Programs ▾** disclosure menu. That menu lists every live program grouped by home layer since v2.0 (it was
  "Across the layers" and "Other tools" until v1.13), each with its layer and topic label, its status (Live, Beta or Invite only) and "You are here", and a side
  panel with the long description on hover or focus. Phones show the label and a one-line summary instead.
  Keyboard: arrows, Home and End move; Esc closes. It is CSP-safe, with no inline styles and no HTML strings, mounts
  first in `<body>` or into `#tic-nav`, finds the current program from the host name (or `data-current`), and opens
  program links in the same tab, since it is site navigation. **Keep its `PROGRAMS` in step with `oe/oe.js` and the
  product list** when a program is added, renamed or goes live. Test page: `tools/tic-nav-demo.html` (serve the
  project root). The hub's home page carries it too since v1.11 (mounted in `#tic-nav` after the skip link, above its own
  masthead, with `data-home="here"`); the 404 and planner pages don't.
  - Its z-index is 10000 so its menu covers headers with their own stacking, such as Noisefloor's z-index 1100, and it
    resets `display`, margins, padding and borders so a site's generic `nav` rules can't reshape it, such as
    Watchfloor's flex `nav`.
  - **v1.12 and `tic-nav.css` v1.3** (Tom, 14 Nov 2026: "each page's header should freeze as the page scrolls
    down… If the user chooses to minimize the header bar, we should have a button for that, too, on the header"; Tom
    approved the look from screenshots; live on 16 sites 15 Nov 2026, `HANDOFF.md`). The bar is `position: fixed` at
    the top and an empty `.tic-house-room` after it holds its place, so it stays put whether it is first in `<body>` or
    in `#tic-nav`. A chevron button (`.tic-house-toggle`, "Minimize the house bar" / "Show the house bar") folds it
    to a tab at the **top centre** holding Programs and the restore button; the menu opens centred under it. The top
    right was tried first and covered the Time button on about ten sites. The choice is kept like the time
    settings: cookie `tic_nav` (`min` or `full`, Domain theintelligence.company) else localStorage `tic-nav-v1`,
    written only when pressed, every access in try/catch. While mounted, `<html>` has `tic-house-on` (and
    `tic-house-minimized`), and **`--tic-house-h`** is 34px, 0px minimized or printed: **a site whose own header or
    tab row is sticky or fixed at the top uses `top: var(--tic-house-h, 0px)`**, and one that sets its own
    `scroll-padding-top` adds it (the bar's default `scroll-padding-top` is inside `:where()`, so any site rule wins).
    At 360 px or less the row tightens so 320 px fits. Nothing moves, so reduced motion needs nothing. Known
    trade-off: minimized and scrolled, the centred tab covers one or two links in the middle of a site's sticky tab
    row (Orbit's section bar, Title 10's and PropertyCast's phone tabs, COP's header text); one click restores the
    bar. `TicNav.minimized()` and `TicNav.minimize(bool)`. The hub's skip link sits above the bar (`z-index: 10001`;
    it was under it from v1.11) and the drawing's sticky `top` adds the bar's height.
  - **v2.0 and `tic-nav.css` v2.0** (15 Nov 2026, from the suite design review; branch `design/house-bar-v2`):
    - **Grouped by layer:** headings "Every layer" (COP), then Systems, Human, Cyberspace, Spectrum, Space, Air, Land
      and maritime in the drawing's order, then "Other tools". Each program carries `layer` (its `home` in `oe.js`;
      COP `all`); `PROGRAMS` runs in that order, and a test checks both against `oe.js`. Under a heading each item
      shows only its topic ("Conflict warning"), capitalised; the side panel keeps the full label. The layer groups
      flow down two columns on desktop (`columns`, a group never splits); one column on phones.
    - **COP's text** is the hub's convergence line (Tom, 15 Nov 2026); a test keeps `long` equal to `oe.js`'s `line`
      and keeps "check" and "verify" out of it, apart from "checked by Verdict".
    - **Freshness dots** from COP's `data/health.json` (`state`: fresh, late, stale), read **once, when the menu
      first opens**, without cookies: a filled green dot "On time", a filled amber dot "Running late", a grey ring
      "No current data" (COP's own legend calls stale "no current data"). Never colour alone: each dot has
      screen-reader text, late and stale also show their words after the topic, the side panel adds them, and a
      note under the links says what the dots mean and when COP checked ("… as COP's health check found 5 h ago").
      No dot for a program COP doesn't cover (COP itself, the tools); a failed read leaves no dots and no note.
      **Opt-in per site:** `<script src="tic-nav.js" data-health="on">`, only after the site's CSP `connect-src`
      allows `https://cop.theintelligence.company`; without both, nothing is fetched. COP gets it without the
      attribute (same origin), and so does the hub, whose bar reuses `window.ticCopHealth` (no second request).
      `data-health="off"` turns it off.
    - **"See it on COP"** at the panel's foot, right of "How the programs fit together…": "See Vigil with the other
      layers on COP →" on a program site, "See every layer together on COP →" on the hub and the tools, nothing on
      COP. It opens COP with every layer showing (not a family preset): the point is the program beside the others.
    - Tests: `nav.test.js` (headings, topics, dots and words, one read without cookies, no read without the
      attribute, a failed read, COP itself, the COP link; the stand-in's `health` option serves the
      `cop-health-nav.json` fixture with open CORS and adds COP to its CSP), `a11y.test.js` (axe on the menu with
      dots, desktop and phone, light and dark), `browser.test.js` (the hub reuses its own read), `site.test.js`
      (layer order, COP's text).
    - **Rollout per site:** copy both files, add `https://cop.theintelligence.company` to `connect-src` where the
      site sets one, add `data-health="on"`, and check the menu's dots and the browser console live.
      Rolled out 15-16 Nov 2026 (`HANDOFF.md`). Copy from the committed blob (`git show <sha>:site/shared/tic-nav.js`),
      not the hub's working copy, which has CRLF endings. Blackout's `tests/test_blackout.py` pins its CSP origins
      and checks `data-health`. PropertyCast inlines the bar, so its attribute is on `<script data-health="on">` in
      `src/wx/dashboard.py`. Wake has no deploy workflow: it deploys by hand with wrangler (Wake's `CLAUDE.md`).
  - `tic-nav.css` v1.2 (7 Nov 2026): "You are here" uses the text accent `#8F5509` on the light panel (`--tn-here`);
    the amber it used read 1.9:1, under WCAG's 4.5:1. Dark mode keeps the amber.
  - `tests/nav.test.js` and `tests/a11y.test.js` test the bar on a stand-in product page (menu, keyboard, phone, axe);
    since v1.12 also fixed after scrolling, in a short `#tic-nav` slot, in-page links, minimize and restore, the
    cookie across two program origins, localStorage off the domain, blocked storage, 320 px, print, and axe on
    both states (`tests/lib/standin.js`: `stickyHeader`, `slot`, `alsoServe`).
  - Elements' `long` text is the v1.4 wording Tom approved on 6 Nov 2026: "Worldwide: earthquakes from USGS (with
    impact alerts) and EMSC, …", weather warnings "Regional: … for the US and Europe", "US only for now: wildfire
    incidents, …" and "Weather for more of the world is planned". `oe.js` names EMSC ("EMSC's independent
    catalogue"), NOAA, MeteoAlarm (38 European countries and Israel) and NIFC.
  - PropertyCast builds the bar into its page at its daily publish, so check its home page's HTML, not `/tic-nav.js`.
- `site/shared/tic-related.js` + `tic-related.css` (v1.0, 16 Nov 2026; built on Blackout, canonical copy from Blackout
  `bcdb010`): **"Elsewhere today"**, a card on a program page with the other programs' findings in that page's
  countries, from COP's agent index (`/data/agent/index.json`), read once when the card nears the screen, without
  cookies. Rules (48 hours; day precision today and the two UTC days before; month precision never; the page's own
  program, stale, expired and `us_person_data` "individuals" left out; unusual first, then the page's country order,
  then newest; three, one per program first) and the API are in the module's header. Per site: copy both files, add
  `https://cop.theintelligence.company` to `connect-src`, put the hidden element in normal block flow (not straight
  in a grid or flex row). Labels: Unusual (with the baseline note), Forecast, "<Program>'s judgment", As claimed;
  never say COP checks or verifies. Tests: `tests/related.test.js` (pick rules in Node on a fixture index; the card,
  its lazy read and a failed read on a stand-in page, `tests/lib/modpage.js`; axe light and dark). Check lazy
  loading in headless Edge (Playwright), never with `eager`: a hidden Browser pane never reports intersection.
- `site/shared/tic-tabs.js` + `tic-tabs.css` (v1.0, 16 Nov 2026; built on Cordon, canonical copy from Cordon
  `f17f551`): **the sections row** from the design review's "C · Shell". Wrap the sections below the map in
  `<div data-tic-tabs>`, each group `<div id data-tab-label>`; a sticky "Sections on this page" row under the house
  bar; one group at a time at 760 px or less, every group with a jumping row wider; links and `aria-current`, not ARIA
  tabs; a link into a group (`#health-h`) opens it; `tic-tabs:show` on a group for a map to redraw. The row takes the
  page's `--panel`, `--line`, `--muted` and `--link`. Tests: `tests/tabs.test.js` (phone, desktop, deep link,
  keyboard, resize, no script, axe light and dark run from the top of the page, since a sticky row over a link reads
  as "obscured"). Blackout and Orbit have tabs of their own.
- Copy every shared file from a committed blob (`git show <sha>:site/shared/<file>`), with LF endings.
- **Rolling out a shared file** (all ten program sites carry both, Vis since 8 Nov 2026, and Blackout's own session
  copies them into its page). When a program is added or renamed, update
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
  - COP is a fixed full-screen layout, so `cop.css` moves `.bar` and `.app` down by `var(--tic-house-h, 34px)` (the
    map by that plus 56px), under `body:has(> .tic-house)`; since v1.12 the bar fixes itself.
  - Elements and Cordon copy `site_src/` to `site/` at build and deploy to GitHub Pages on push.
  - **Each site's own sticky chrome sits below the bar (v1.12):** Title 10 `.tabs` (inline CSS in `index.html` and
    `print.html`; bump `sw.js`'s `VERSION`), Noisefloor's table `th` (`site_src/style.css`), Orbit's `.secbar` and
    `scroll-padding-top` (`site_src/style.css`; its build copies `site_src` into `site`), PropertyCast's `.tabs`
    (`src/wx/dashboard.py`), Context's sidebar, phone header, drawer and refresh notice (`src/styles/index.css`),
    Vigil's `--house-bar-h: var(--tic-house-h, 34px)` (`src/index.css`; its own sticky pin of the bar is gone, as it
    overrode the fixed bar), Listening Post's `.nav` and `.sheet-bg` (`web/src/app.css`; its hosting deploy rebuilds
    `web/dist`). Cordon's tables scroll in their own box (`div.tbl` in `app.js`): they made its phone page 597 px wide,
    which put the bar's buttons off screen. A site that adds a sticky header or a full-height overlay gives it the
    variable. Context and Vigil compile their CSS, so test them by injecting the rules into the live page.

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
  twice a day and the others carry on. (It wasn't added until 12 Nov 2026, so Vis's dispatches 404'd 8-12 Nov.)
- **Blackout joins (12 Nov 2026, Tom asked for all steps to get Blackout online):** Blackout `update.yml` at :45
  past 01, 05, 09, 13, 17 and 21 UTC. Private repo, one job of about a minute per run: about 180 Actions minutes a
  month. Its own cron moved to every 6 hours as the fallback. Tom added `blackout` (and `vis`) to the `DISPATCH_TOKEN` token
  (named `tic-dispatch` on GitHub) the same evening; it now covers cop, cordon, elements, vis and blackout.
- **Headwind joins (13 Nov 2026):** Headwind `update.yml` at :50 past 03, 09, 15 and 21 UTC (its sources change
  daily at most). Private repo, one job a run. Its own cron (`23 */6`) is the fallback; it has no gate job yet, so
  a late scheduled run repeats a dispatched one. `headwind` was missing from the `tic-dispatch` token until about
  6:50 PM CST 13 Nov (its 21:50 UTC start 404'd); it was added then, with `orbit` (no new token).
- **Orbit joins (13 Nov 2026):** Orbit `update.yml` at :55 past 00, 06, 12 and 18 UTC, the first about 35 minutes
  after GCAT republishes (about 00:20 UTC). Private repo, one job a run. Its own cron (`41 */6`) is the fallback; it
  has no gate job, so a late scheduled run repeats a dispatched one (GCAT is only asked for Last-Modified, and
  Launch Library 2 gets one request a run). `orbit` was added to the `tic-dispatch` token's repository access on
  13 Nov (no new token); the first dispatched run, 00:55 UTC 14 Nov (6:55 PM CST 13 Nov), passed. The token now
  covers cop, cordon, elements, vis, blackout, headwind and orbit.
- **Launch joins (14 Nov 2026):** Launch `update.yml` at :15 past 01, 07, 13 and 19 UTC, 20 minutes after Orbit
  starts, because it reads Orbit's published snapshot. Private repo, one short job a run; its own cron (`11 */6`) is
  the fallback. `launch` was added to the `tic-dispatch` token's repository access about 2:30 PM CST 14 Nov (Claude in
  Tom's signed-in GitHub, at his request); the token now covers cop, cordon, elements, vis, blackout, headwind, orbit
  and launch.
- **Undertow joins (14 Nov 2026):** Undertow `update.yml` at :30 past 02, 08, 14 and 20 UTC. Private repo, one job of
  well under a minute a run. Its own cron (`41 */6`) is the fallback; it has no gate job, so a late scheduled run
  repeats a dispatched one. `undertow` was added to the `tic-dispatch` token's repository access at 8:42 AM CST 15 Nov
  (Claude in Tom's signed-in GitHub, at his request; no new token). Until then its dispatched starts failed with
  GitHub's 404, the last at 14:30 UTC 15 Nov, and the others carried on; the first that should pass is 20:30 UTC 15 Nov.
- **Orbit's launch ledger joins (16 Nov 2026, Tom's "yes, build it"):** Orbit `ledger.yml` every hour, at :45, or
  :55 in Blackout's hours (01, 05, 09, 13, 17, 21 UTC): one Launch Library 2 pull of 14 launches (LL2 allows 15
  requests an hour without a key), published on Orbit's public release `ledger`. Orbit's repo is public since
  15 Nov, so its minutes are free; its own cron (`45 * * * *`) is the fallback. No token change: `orbit` is already in
  the `tic-dispatch` token's repository access. (Orbit's update run: GCAT republishes about once a day at no fixed
  time, not "about 00:20 UTC" as written above; headers seen 00:21 and 10:18 UTC.)
- **COP's watchdog joins (14 Nov 2026):** COP `watch.yml` at :00 past 01, 04, 07, 10, 13, 16, 19 and 22 UTC. It
  fails, and GitHub mails the owner, when COP's build or a program has stopped (COP `tools/suite_watch.py`). Private
  repo, one job of well under a minute; its own cron (`47 */3`) is the fallback. No token change: `cop` is already
  in the `tic-dispatch` token's repository access.
- **Noisefloor joins (15 Nov 2026, Tom's yes):** noise-floor `cosmic2.yml` at :50 past 04-08 and 10-13 UTC (09:50 is
  Headwind's). UCAR posts the COSMIC-2 day archive at about 04:35 UTC and Noisefloor's limb S4 day file is due by
  14:00 UTC; the job waits up to 45 minutes for a late archive. Public repo, so its minutes are free. Its own crons
  (01:15, 03:15, 05:15, 08:15 UTC) are the fallback, and its gate skips a day already in the release, so extra starts
  end in about a minute. `noise-floor` was added to the `tic-dispatch` token's repository access at 8:15 AM CST
  15 Nov (Claude in Tom's signed-in GitHub, at his request; no new token; times from GitHub's security log). The
  first dispatched start is 04:50 UTC 16 Nov.
- **Its own clock since 14 Nov 2026** ("Yes, build it"): `crons = ["*/5 * * * *"]`, and `scheduled()` runs it.
  From 5 to 14 Nov it ran on PropertyCast's: the free plan allows 5 cron triggers per account, all 5 were in use on
  5 Nov (PropertyCast's trigger 1, Vigil's ingestion Worker 4) and the first deploy with a cron was refused (code
  10072), so `propertycast-trigger` called its `tick(scheduledTime)` on every wake through a service binding
  `DISPATCH`. the publisher chose that over Workers Paid ($5/month) on 5 Nov; Vigil's crons merged the next day (below), which
  freed the slots. PropertyCast's binding and `lend()` were removed the same day as the cron was added (its
  `trigger/`, deployed first, so the two clocks never overlapped). The account now uses 3 of its 5 cron triggers:
  PropertyCast `*/5`, Vigil `15,45`, `tic-dispatch` `*/5` (read from the five Workers' configs, 14 Nov; the account's
  Workers are `propertycast-trigger`, `vigil-ingestion`, `tic-dispatch`, `vetday` and `molehunt`, the last two
  without crons). **Nothing stops a job starting twice in one slot**, so only one clock may call `run()`: never bind
  `tick()` while the cron runs.
- **Vigil's crons merged, 6 Nov 2026** (Tom asked, 5 Nov; Vigil PR #92, merge `a2383f5`; Worker deployed by hand
  about 3:20 PM CST): one trigger, `15,45 * * * *`, so 2 of the account's 5 are in use and 3 are free. Vigil's four
  triggers were only ticks (its scheduler runs whatever is overdue), but one hourly trigger would have overloaded it:
  its registry declares about 900 subrequests a day, and 24 ticks admit 768. Vigil's
  `workers/src/lib/__tests__/capacity.test.js` fails if that stops fitting. `tic-dispatch` took one of the free slots on
  14 Nov 2026 (above).
- Deploy: `.github/workflows/dispatch-deploy.yml` runs on a push to `master` that touches `dispatch/**` (or by hand),
  tests first (`node --test` in `dispatch/`, no network), then `wrangler deploy` and the secret upload, in
  PropertyCast's order. Hub repo secrets, set by Tom: `DISPATCH_TOKEN` (fine-grained, `tic-dispatch`; elements, cordon, cop, vis, blackout,
  headwind, orbit, launch, noise-floor, undertow;
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

## Veterans Day planner (`site/veterans/veterans-day/`, live since 8 Nov 2026)
- **Live** at https://theintelligence.company/veterans/veterans-day/ (deployed about 4:45 PM CST 8 Nov 2026 from
  `2104157`, approved). Field reports: Worker `vetday` at https://vetday.metacog.workers.dev with D1 `vetday`
  (`aa3c8206-bcaf-4c90-b108-a6d29d0cd46d`), deployed with the publisher's `wrangler login` (OAuth); run wrangler with
  `env -u CLOUDFLARE_API_TOKEN` so it uses that sign-in. Smashburger is out (its Fargo store closed, October 2026;
  the publisher). Still to do: re-check local offers and VFW/Legion posts on Tue 10 Nov and rebuild.
- **Review against the consolidated report (8 Nov 2026 night):** 66 deals at 161 stores, `research/extras-2026.json`
  (other days; earlier-years-only leads), bars on with a drive-safe line and no per-route cap, engine v1.2 keeps
  a ticket for later from opening a route, fargobites.com never linked (it redirects to a "verify" lure). Details in
  `veterans-day/README.md`.
- **9 Nov 2026 evening (live from `2e8f9c5` about 6:20 PM CST, approved; not pushed):** Marcus Theatres' free large popcorn added at West Acres and
  Century (69 deals at 168 stores; ticket question open), and the phone layout tightened: sticky tabs, About folded, Route settings and
  later stops folded, 20 deals then "Show all", Me reordered. Details in `veterans-day/README.md` ("Phone layout").
- **Optimal (10 Nov 2026; live since about 12:15 PM CST that day from `0b12a0d`, approved; not pushed):** Plan for
  reads Optimal · Best for me · Maximize, Optimal first and the default: the best deal of each kind, never two stops of
  the same kind (`kinds` on each offer: meal, coffee, bar, haircut...) within 3 hours; tickets for later don't count; a
  pin or "Go here first" may repeat a kind. Engine v1.4 also fixed events open to the public being "not eligible".
  Same deploy: the Tuesday re-checks (Nativity Mass, Scheels flag exchange, Sickies A, University of Mary's 10:00 Mass).
  Details in `veterans-day/README.md` ("Optimal").
- **Areas (9 Nov 2026; live since about 9:40 AM CST 10 Nov 2026 from `62c984c`, approved; pushed):** an Area select in the top bar's right
  corner: Fargo-Moorhead, ND/MN (the default and where a first visit lands), Bismarck-Mandan & New Salem, ND, and
  Twin Cities: Plymouth, Maple Grove, Roseville. The pick is saved on the phone; `?area=<id>` opens and saves an area
  (for links to friends). Fargo-Moorhead keeps `data/deals.json`; other areas have `data/<id>/`. REGIONS in
  `build_data.py`; chain stores for new areas from All the Places plus OpenStreetMap (`build/stores_region.py`); engine
  v1.3 adds `arriveBy` for ceremonies; Fargo-only notes stay out of other areas (`fm=`, `strip_fm`). An override on an
  offer id now applies in every area. Details in `veterans-day/README.md` ("Areas").
- **Reston & Northern Virginia (10 Nov 2026 evening; a fourth area for a colleague):** `reston-va`,
  `?area=reston-va`, the first area on Eastern time (`tz`, `tz_offset_min`, `tz_abbr`, `day_start` in REGIONS). First
  pass made in Antigravity (Gemini), which stopped before building; checked, corrected and built by Claude the same
  night (44 deals at 178 stops; live since about 10:35 PM CST from `fe2187a`, approved; pushed with `870fb2b`).
  11 Nov 2026 about midnight: Silver Diner, The Melting Pot, Grace for Vets, Paisano's and Frying Pan Farm Park's
  wagon rides added (49 at 199), and each area's own search examples; see `HANDOFF.md` for whether it is live.
  Practice marks made in the preview now clear when the day starts. **Never tap Got it, Turned away, They ran out or
  the line report with `?now=` set inside the day on `localhost:5055`/`5056`:** those origins are allowed by the
  report Worker, so it records a real report (it happened once, 11 Nov 2026; the row was deleted).
- **Denver metro, CO (11 Nov 2026 overnight, the publisher asleep; his instruction covered research, build, merge and deploy):** `denver`, the first area on Mountain time, 101 deals at 397 stops. A big metro thins a chain's stores (`thin` in REGIONS) and spaces the drive grid (`grid_km`); the Colorado chains (shared with Colorado Springs) are commit `ffba0e3`. Details in `veterans-day/README.md` ("Denver metro, CO") and `research/denver/notes.md`; live status in `HANDOFF.md`.
- **Colorado Springs, Monument & Falcon, CO (11 Nov 2026 overnight, the publisher asleep; same instruction):** `colorado-springs`, the second Mountain area, 71 deals at 280 stops in eight circles (the whole city plus Monument, Palmer Lake and Falcon). Few local businesses posted 2026 offers; the shared Colorado chains carry it. Details in `veterans-day/README.md` ("Colorado Springs, Monument & Falcon, CO") and `research/colorado-springs/notes.md`; live status in `HANDOFF.md`.
- **After the day (12 Nov 2026):** nine improvement points, the field data and the 2027 plan are in
  `veterans-day/README.md` ("After the day"). Nothing is built. The `vetday` Worker's invocation logs (callers' IP
  addresses and locations, 3 days) were turned off 12 Nov 2026; its hash and salt wipe needs traffic to run, so
  2026's were wiped by hand the same day (`HANDOFF.md`).
- **Never deploy from `[local path]`** (branch `veterans-day`, 8 Nov): Antigravity did on 10 Nov and its 46
  files most likely replaced the live hub for a while. `GEMINI.md` points Gemini at this file and `HANDOFF.md`. Details and the corrections in `veterans-day/README.md` ("Reston & Northern
  Virginia") and `research/reston-va/notes.md`. Antigravity also deployed two unnoted commits that evening,
  `59c4f9e` and `3373f4f` (start presets, smart search, quick-add, Stop 1 controls; live, checked 10 Nov). `59c4f9e`
  called an engine function that didn't exist, which blanked the live Deals tab; fixed the same night, and a test now
  checks every engine name `app.js` uses.
- 8 Nov 2026: a usable Veterans Day giveaway program his Guard colleagues can use on Wed 11 Nov 2026, with
  live location, timing against each deal's window, preferences, vetoes and strikes, and got-it / turned-away
  marks; the first piece of a planned "For veterans" section here (Title 10 and future military programs to follow).
  Not in the product lists, the house bar or the drawing (no program-list change); shared by direct link.
- Everything is in `veterans-day/README.md`: data build, engine rules, the field-report Worker `vetday` (needs the publisher's
  `wrangler login` to deploy; then set `API` in `app.js` and add its origin to `connect-src`), and on-the-day
  operations (overrides, tips).
- Same house rules as the hub page, tested in `tests/veterans.test.js` and `tests/veterans-engine.test.js`: no inline
  code or styles, the location label, footer, About structure (what it is, method, limits, sources) and Time
  button. `firebase.json`'s CSP gained `https://api.weather.gov` (connect) and `https://tile.openstreetmap.org` (img)
  for it, and `https://router.project-osrm.org` (connect) for the Map's route line (9 Nov 2026); `site.test.js` counts
  the planner's fetch origins (`veteransOrigins()` in `tests/lib/source.js`, which reads `API` in `app.js` and
  `ROUTER` in `roads.js`).
- Privacy promise on the page: location, settings and history stay on the phone; reports carry no ID. Change the
  page's Privacy text before changing that. **Route line (9 Nov 2026, "Build it as written"; live from `8db32a6`
  about 12:30 PM CST that day):** the Map sends the
  stores on the route, in order, to OSRM's public server (FOSSGIS) for road shapes, never the position or start point;
  the leg from you to stop 1 is drawn straight on the phone. The Privacy text says so, including that stop 1 hints at
  the user's part of town; the Me tab reads "Everything here stays on this phone. None of it is sent anywhere."
  `roads.js`, `tests/veterans-roads.test.js` and `tests/veterans-map.test.js` (a browser check that only store
  coordinates are ever sent); details in `veterans-day/README.md`.
- **Route builder (8 Nov 2026; live since about 6:55 PM CST that day from `87ccead`, approved; not pushed):** the Route tab
  replaced Next and Plan as the main page: start, leave and done-by times, Best for me or Maximize (most stops, most
  savings, both), What I'm after chips (Love/Fine/Off, plus "Deals that need a purchase", Off by default), take food
  home; one route with each stop's arrival against its deal's end. Engine v1.1: tickets for later (Great Clips, Texas
  Roadhouse, Freddy's: quick, nothing eaten), appetite, Maximize goals, filling waits. Chain hours for Kwik Trip,
  Casey's and Circle K; planner JSON `no-cache`. Details in `veterans-day/README.md`. The first build lived in the
  worktree `[local path]` (branch `veterans-day`, same commit as master); preview the main checkout with the
  `hub-main` config in `[local path]` (port 5055), not `vetday` (5056, the worktree).

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
  `[local path]` §3.11.
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
  the eight live feeds (`tests/check-live.js`) and doesn't block: a product being down turns only that job red.
  This machine has no Playwright Chromium: run the tests on the installed Edge with `BROWSER_CHANNEL=msedge`
  (`tests/lib/browser.js`; PowerShell `$env:BROWSER_CHANNEL = "msedge"; npm test`), since 14 Nov 2026. It replaced
  an uncommitted preload. A full run here takes 2 to 3 minutes (4 cores, 7 test files at once).
  Three fixes the same day for tests that failed only in full runs (each measured, then 5 of 5 full runs passed):
  `tools/serve.py` listens with a backlog of 128, since Python's default of 5 made Windows refuse a page's sixth
  connection (`ERR_CONNECTION_REFUSED`; most likely also the "drawing not yet rendered" failures);
  the tests route only off-site requests through the test process (`offSite` in `tests/lib/feeds.js`); and the
  planner's `roads.js` v1.1 starts its 8-second router timeout when the request is sent, not when it is queued
  (a 14 s render on the busy machine had used it up). `serve.test.js` and `veterans-roads.test.js` guard the first
  and last.
- The shared time dialog (`tic-time.css`) reads `--panel`, `--bg`, `--line`, `--muted` and `--accent` (white text on
  it), and falls back to white and grey. A site whose own variables have other names must map them on
  `.tic-time-dialog`, or dark mode breaks. The hub maps `--card`, `--paper`, `--rule` and `--mut` in `style.css`
  (7 Nov 2026). Every site's dialog was checked live in light and dark on 7 Nov 2026 (axe): Title 10, Watchfloor and
  COP were fixed in their own CSS the same way, and Listening Post's Done button by `--acc-ink` in its `app.css`
  (7 Nov; live 8 Nov, axe clean in light and dark).
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
  zone repeated (clock, button, and "Central time" in the contact block, all removed except the button). **Don't sell
  the time settings in copy either** (Tom, 15 Nov 2026: drop the "your timezone" nonsense): How we work's fourth item,
  "Your clock", is gone, and a test keeps time-zone wording out of How we work. Noisefloor's Methods page carried the
  same selling sentence; it went with house bar v2.0 (16 Nov 2026).
- **Hub design (Tom's yes on the preview, 15 Nov 2026; branch `design/hub-preview`):**
  - **Hero lede:** "Monitoring tools built from publicly available information, from the seabed to orbit. Each reads
    its own layer against its own baseline; COP lays the layers over one another to show where more than one is
    moving. Every product credits its sources, dates its claims and publishes its methods." First button "Explore the
    layers" (`#layers`).
  - **What COP is** (Tom, 15 Nov 2026: COP doesn't exist to check other programs; it shows every layer together to
    find areas of potential convergence, a region or topic with more than one layer reporting, and Verdict is how
    that gets checked). Its line everywhere on the hub: "The common operational picture: every layer's findings on one
    map, so a place or topic that turns up in more than one layer stands out. Outages are already read against
    hazards, notices and press attention in the same country; convergence scoring, checked by Verdict, is in
    development." Say convergence scoring is in development until COP v1 ships it (COP's `CLAUDE.md`, "Not in v0";
    its convergence flags need a mosaic-effect review first). Never describe COP as checking or verifying the
    programs. `tic-nav.js` carries the same line since house bar v2.0.
  - **Glow:** a program's tag on the drawing glows (`hot`) when COP health's `anomalies` for it is above 0; its
    aria-label and panel give the count. A drop-shadow only, so tag geometry is unchanged.
  - **Today band** (`#today`, after the drawing): "Every layer, one picture." Four numbers from COP health (feeds
    fresh of all, `placed` summed, `anomalies` summed, programs with anomalies), hidden until they load, counting up
    unless reduced motion. A fifth tile, Verdict's ledger (`registered`, with `resolved` as "N settled"), from
    `https://metacog-osint.github.io/verdict/data/scores.json` (open CORS; in `connect-src`); it shows only with the
    COP numbers and only when Verdict answers. No Brier score on the hub: a handful of settled forecasts says little.
  - **How it works** (`#oe-steps`): four steps (Collect, Compare, Combine, Check) scroll beside the drawing, which is
    already sticky; the step at the middle of the screen lights the drawing (`stepLights` in `oe.js`: Collect every
    out program's tag, Compare the tags that glow and their layers, Combine every layer and COP, Check COP and
    Verdict). A pinned selection wins. Phones show the steps as a list after the drawing, unlit. The panel's
    default is now "How to read".
  - **Folds:** Work with us (the offer list; the mail button stays out), How we work and About open from a summary
    line (`details.fold`). The content stays in the page.
  - **Product lists in layer order:** COP first (full width), then programs by home layer from Systems down, then
    PropertyCast, Title 10 and Listening Post. Each `li` carries `data-layer` (its home layer on the drawing) and
    `data-layer-name`, coloured by the plates' `--l-*` tokens. `404.html` matches. A test checks the order.
  - **Sources wall** (`#sources`): publishers from each program's `attribution` in COP health, each linking to that
    program's Sources page as the footer credits it. A test checks every link is a footer Sources link on that
    program's own site. Add a publisher when a program adds a source.
- **Seven improvements, 31 Oct 2026 (Tom asked for all seven):**
  - **Link preview:** Open Graph and Twitter card tags in `<head>`, image `site/img/og-card.png` (1200×630). Its source
    is `tools/og-card.html` (site fonts and colours); `site/img/logo-512.png` comes from `tools/logo.html`. Neither
    source is deployed; how to regenerate both is in `RUNBOOKS.md`. LinkedIn caches previews; its Post Inspector
    refreshes one.
  - **Hero top line:** "Conflict · Influence · Cyber · Outages · GPS · Space · Hazards · Economics · Shipping" since
    15 Nov 2026 (Tom's pick; it was "Conflict · GPS interference · Cyber threats · Forecasting" from 31 Oct). It spans
    both hero columns (`.hero .kicker`, `grid-column: 1 / -1`). Keep it to one line at 1280 px (a test checks).
  - **Say what each line measures** (Tom, 31 Oct 2026: readers must know Noisefloor is about GPS interference, and
    the same goes for every summary). Each "Latest" item starts with a bold topic (`.latest-topic`: "GPS
    interference:", "Conflict warning:", "Cyber threats:"), and `setItem` fills only `.latest-body`, so the topic
    stays whatever the feed says. The hub says "GPS" for Noisefloor and FieldCast, never "GNSS" or "the contested
    radio spectrum". Noisefloor's own brief still says "degraded aircraft", which is Noisefloor's wording to fix.
  - **Footer date** uses `data-tic-year`: "Updated 31 Oct 2026" in the viewer's zone.
  - **Footer Sources links:** Noisefloor `/sources`, Watchfloor `/#/sources`, Vigil `/sources`, PropertyCast
    `/#sources`, Title 10 `/#contacts` ("Contacts & sources"), Context `/sources` and Listening Post `/sources.html`
    (both linked since `4d05cf2`); since 7 Nov 2026 also Elements and Cordon `/#health-h` (each page's Sources card), since 8 Nov Vis `/#sources`,
    since 13 Nov Blackout's home page (it has no Sources section yet) and Headwind's (its Sources card has no anchor),
    Orbit `/#src-h` (its "Sources and freshness" heading),
    and COP's home page (its Sources sit in its side panel, and its address after `#` holds the map view, so a
    `#sources` link wouldn't hold). Each ends in ↗ joined by `&nbsp;`, so the arrow never starts a line. A test checks
    there is one link per program in the house bar.
  - **Privacy line:** "No analytics or tracking. If you change the time settings or minimize the top bar, that
    choice stays in your browser." (since 15 Nov 2026; until then it named only the time settings). True: no
    analytics or third-party scripts, and `tic-time.js` and `tic-nav.js` write their cookie and local storage only
    when the visitor changes a setting or presses the bar's minimize button. Change the line before adding anything that tracks.
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
    `generated_at`. Blackout (13 Nov 2026) is on Cloudflare Pages too, so its whole feed is read the same way (about
    40 KB, about 5 KB as served), and so is Headwind's (13 Nov 2026; about 150 KB, about 8 KB as served), and Orbit's
    (13 Nov 2026; about 50 KB, about 5 KB as served). Since 5 Nov 2026 the line adds "· running late" in amber when its own
    "Updated … ago" is older than that program's `fresh_hours` in COP's health (COP's own `state` judges the newest
    data, not publication, so it isn't used); the reason is in the tooltip. If Vigil's `/api/summary` 503s, Vigil's
    time falls back to COP's `data_as_of`. The
    tooltip gives the full time in the viewer's zone. `connect-src` lists the cop., elements., cordon., vis., blackout., headwind. and orbit. origins.
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
