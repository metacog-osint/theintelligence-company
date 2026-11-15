# Hub handoff: where things stand (15 Nov 2026, about 12:30 PM CST)

Read with `CLAUDE.md` (the project's notes). Times are Central (CST since 1 Nov). Each commit, push and deploy needs
approved. Every finished dated section up to 13 Nov 2026 (Veterans Day planner, house bar v1.3 to v1.9, Vis,
tests, dispatch, the Vigil summary feed) is in `HISTORY.md`, moved verbatim on 14 Nov 2026. What each program is
and how the house bar rolls out are in `CLAUDE.md`.

## Design review and hub preview (15 Nov 2026, about 4:00 PM CST)
- **Review** (Tom: "review ... layout, flow, connectivity, and user experience in all sites", with ideas from the
  Squarespace homepage): published as a private page, https://claude.ai/artifact/HbqH9AaUvGSWiu1JXfW2V4. Source,
  screenshots and the Playwright measuring scripts: `D:\Projects\theintelligence-company\.claude\design-review\`
  (untracked). Measured 15 Nov about 2:20-3:10 PM CST, headless Edge at 1440x900 and 390x844:
  - Hub 8,701 px desktop, 13,300 px phone. Longest program pages on a phone: Cordon 36,195 px (about 43 screens),
    Orbit 27,713, Elements 19,333, Undertow 16,097, Headwind 15,897, Launch 14,269.
  - Links to sibling sites outside the house bar: COP links to all 13 programs; Vigil, Noisefloor, Blackout,
    Headwind, Orbit, Undertow and Wake link to none; Watchfloor, Context and Elements only to the hub; Cordon to
    Launch, Vis to Watchfloor, Launch to Orbit. **No program page links to COP.**
  - Three looks: light pages (Elements, Cordon, Blackout, Headwind, Orbit, Launch, Undertow, Wake, Noisefloor close),
    dark dashboards (COP, Context, Vigil), and their own style (Watchfloor, Vis, Title 10, PropertyCast; keep these).
  - Squarespace was read from its markup only (the in-app browser was hidden and Chrome's screenshots timed out), so
    its structure was seen, not its motion.
- **Preview built, Tom's "Yes, build preview" then "Yes, commit":** branch `design/hub-preview`, commit `f6099a5`,
  worktree `D:\Projects\_worktrees\hub-design`, one commit on GitHub's `master` `25d99d3`. **Not pushed, merged
  or deployed.** 213 of 213 tests passed on Edge (`BROWSER_CHANNEL=msedge npm test`; the worktree's
  `tests/node_modules` is a junction to the main checkout's). Preview: the `hub-design` entry in
  `D:\Projects\.claude\launch.json`, `tools/serve.py` on port 5058. What it changes:
  - Compact hero, so the drawing starts 495 px down at 1440x900 (was 1,221 at 1024 wide). Nav gains Layers and Today.
  - **Draft wording, not approved by Tom:** top line "Conflict · Cyber · GPS · Space · Hazards · Economics ·
    Shipping"; lede "Monitoring tools built from publicly available information, from the seabed to orbit. Each one
    reads its own layer against its own baseline, and every product credits its sources, dates its claims and
    publishes its methods."; first button "Explore the layers" (`#layers`).
  - Drawing: a program tag glows (class `hot`) when COP health's `anomalies` for it is above 0; aria-label and the
    program panel give the count ("unusual against its own baseline in today's COP snapshot"); legend "Unusual
    findings today". Drop-shadow only, so tag geometry and the label-overlap test are unchanged; still with reduced
    motion.
  - `#today` band after the drawing: four numbers from COP health (feeds fresh of all, `placed` summed, `anomalies`
    summed, programs with anomalies), hidden until they load, count-up unless reduced motion; then the four Latest
    articles (markup unchanged; the heading is now an h3) in a row.
  - Products: the three feature blocks became a screenshot rail (`#shots`, arrow buttons). `ul.plist` cards carry
    `data-layer` and `data-layer-name` (label drawn by CSS `attr()`), coloured by `--l-*` tokens from the drawing's
    plates; COP is a full-width first card; on phones the list is a sideways rail. **Both lists are now ordered by
    home layer** (COP, Watchfloor, Headwind, Context, Undertow, Vigil, Blackout, Noisefloor, Orbit, Launch, Vis,
    Cordon, Elements, Wake, then PropertyCast, Title 10, Listening Post); `404.html` matches, as its test requires.
  - `#sources` wall: 41 publishers taken from each program's `attribution` in COP health, each linking to that
    program's Sources page (the footer's URLs). Script adds a hidden second copy and `.moving`; it pauses on hover,
    focus or the Pause button; without script or with reduced motion it is a still, wrapped list.
  - After: desktop 7,851 px (was 8,701), phone 8,956 px (was 13,300); products on a phone about 1,037 px (was about
    5,000). No console or CSP errors.
- **Proposed in the review, not built:** sticky-scroll "How it works" over the drawing; folding Work with us, How we
  work and About; a Verdict number in the Today band (needs Verdict's origin in `connect-src`); house bar v2 (layer
  grouping, a freshness dot per program, "See it on COP"); `tic-related.js` "Elsewhere today" (other programs'
  findings in the same countries, from COP's snapshot; start on Blackout); one shared page layout for the light
  pages, with sections as tabs on phones (start with Cordon); consistent page titles "Name · The Intelligence Company".
- **Before merging:** Tom approves or rewrites the draft wording; bump the footer date and `sitemap.xml` `lastmod`;
  check the 404 page's look with the new cards; record the new rules in `CLAUDE.md` (layer order of the product
  lists, the glow, the Today band, the sources wall and its sync with each program's attribution). The main
  checkout's local `master` was 4 commits behind GitHub on 15 Nov; pull before merging there.

## Current state (checked 14 Nov 2026, about 3:27 PM CST)
- **House bar v1.13** (15 Nov 2026, Tom's "Yes, all 16"; only `tic-nav.js` changed: Wake in the Programs menu,
  `tic-nav.css` stays v1.3). Hub `23b2e27` (deployed about 12:35 PM CST) and Wake (`5e9548c`, deployed by hand).
  Every old copy matched the hub's v1.12 byte for byte. Worktrees `_worktrees/<site>-nav113`, branch
  `tic-nav-v1.13` (the folders named `watchfloor-nav113` and `context-nav113` hold geo-context and more-context,
  which are Context and Watchfloor: labels swapped, contents right). Pushed by sha, about 1:45 PM CST: COP
  `1a56c5f`, Context (geo-context, `master`) `74ff939`, Title 10 `573fc08` (`sw.js` `t10-2026-11-15a`), Noisefloor
  `3a060d7` (with `build_site.py`'s `?v=` hashes), PropertyCast `bca54f4`, Watchfloor (more-context) `c013585`,
  Vigil `e4a045c`, Elements `57293f2`, Cordon `dc68580`, Vis `bc7d55f`, Blackout `70c3cc3`, Headwind `e4df8ce`,
  Orbit `9bf2035`, Launch `9c0bdb9`, Undertow `28fb96d` (PropertyCast, Elements, Cordon and Orbit rebased over
  their bots' commits first). Deployed by hand: Watchfloor (`python -I scripts/build_web.py`, then `firebase deploy
  --only hosting:watchfloor --project context-484804`), Title 10 (`deploy/` of the clean worktree), Context
  (`npx vercel deploy --prod` with `.vercel/project.json` copied in; READY), Listening Post (no git; v1.12 backed up
  in `_backups/tic-nav-v1.12-2026-11-15/`; `firebase deploy --only hosting`). **Checked live about 2:00 PM CST:**
  every `/tic-nav.js` reads v1.13 on all 18 sites but PropertyCast, whose page inlines the bar and still shows
  **v1.10** (its v1.12 never published either); `main` carries v1.13, so its 16 Nov publish (about 4:20 AM CST)
  should bring it. Check its home page HTML then. Remove the `*-nav113` worktrees once that is confirmed.
- **House bar v1.12** (stays at the top, minimizes to a tab; `tic-nav.css` v1.3; Tom's yes on the look 14 Nov,
  "push and deploy" 15 Nov): checked 15 Nov about 12:10 PM CST, every live `/tic-nav.js` reads `version: "1.12"` and
  every `/tic-nav.css` v1.3: the hub and COP (`/shared/`), Watchfloor, Title 10 (`activation.`), Noisefloor,
  Context, Vigil, Listening Post, Elements, Cordon, Vis, Blackout, Headwind, Orbit, Launch and Undertow. A live
  browser check the same hour, 1440 px and 375 px, passed on all 16: the bar stays at the top when scrolled, nothing
  of the site's slides under the full bar, minimizing sets `--tic-house-h` to 0px, Programs opens from the tab, no
  page is wider than the phone, no script errors. **PropertyCast's page still carries v1.10** (built 10:16 UTC
  15 Nov, before the push); its `main` (`241aee6`) carries v1.12, so it goes live at its 16 Nov publish, about
  4:20 AM CST. Pushed by sha on 15 Nov morning: hub `de3d057` (`site-checks` 43730327238 green), Watchfloor
  `56158c6`, Title 10 `102a707`, Noisefloor `0ea8510`, PropertyCast `241aee6`, Context `3bcb711` (`master`), Vigil
  `7d5f4a6`, COP `67ea331`, Elements `86a235a`, Cordon `5365d45`, Vis `1541504`, Blackout `b2ecef0`, Headwind
  `0814445`, Orbit `ed7275f`, Launch `d17412d`, Undertow `79f99a1`. Deployed by hand: the hub, Watchfloor
  (`build_web.py`), Title 10 (the first try failed in Firebase's file upload, the retry deployed), Context (`npx vercel
  deploy --prod` from the worktree with `.vercel/project.json` copied in; the first run printed `"status": "error"`,
  the retry was ready) and Listening Post (no git; its v1.10 files are in `_backups/tic-nav-v1.10-2026-11-14/`).
  Hub tests: 213, all passing (the full run's one failure, the COP "Latest" line under load, passed 40 of 40 alone).
  What each site changed: `CLAUDE.md`, "Rolling out a shared file".
- **Programs in the house bar:** 16, the newest Undertow and Launch (14 Nov), Orbit and Headwind (13 Nov) and
  Blackout (12-13 Nov). Their wording, drawing rows and footer credits: `CLAUDE.md`, "Family".
- **`site-checks` on `master`: green.** The last run, 43616958717 on `4d4351b` (the Launch listing), passed both jobs
  (`checks`, `feeds`). The commits since (`c0c037d` to `e1e3e29`) touch only `CLAUDE.md` and `dispatch/`, which don't
  start it; `dispatch-deploy` passed on `15caf79` (COP's watchdog).
- **Dispatch:** `tic-dispatch` starts Elements, Cordon, COP (build and watchdog), Vis, Blackout, Headwind, Orbit and
  Launch (and Undertow since 14 Nov evening, Noisefloor's COSMIC-2 job since 15 Nov; `CLAUDE.md`). **On its own `*/5` cron since 14 Nov 2026, 7:19 PM CST**
  (Tom's yes): PropertyCast `cad0665` removed `lend()` and the `DISPATCH` binding (`trigger-deploy` 43662451686,
  7:18 PM; the deployed Worker lists only `LIVE`, `REPO`, `REF`), then hub `c1c301b` added the cron
  (`dispatch-deploy` 43662538238; Cloudflare reported `schedule: */5 * * * *`). No slot was missed or started twice.
  The first starts on its own clock all passed: Elements 7:35 PM (43663787442), Cordon 7:40 PM (43664175719),
  Blackout 7:45 PM (43664557789). Cron triggers in use: 3 of the free 5 (`CLAUDE.md`, "Dispatch Worker").
- **Tests on this machine:** `BROWSER_CHANNEL=msedge npm test` runs everything on the installed Edge (`tests/README.md`);
  190 of 190 passed in 6 full runs on 14 Nov, 2 to 3 minutes each. The two tests that failed only in full runs, and a
  third found on the way, are fixed at the cause (`CLAUDE.md`, "Tests"): `serve.py`'s listen backlog, off-site-only
  routing in the tests, and the planner's `roads.js` v1.1 timeout. Pushed 14 Nov about 4:33 PM CST (`5245689`;
  `site-checks` run 43648715410 green, both jobs) and deployed to the hub about 4:40 PM CST (approved); the live
  `/veterans/veterans-day/roads.js` is byte-identical to `master`. After `npm ci` (14 Nov evening; `node_modules` had been
  found empty at 7:29 PM CST, cause not found), 190 of 190 passed on `682285e`, Undertow's changes included. The drag test's 34 px shift (2 of about 12 runs
  before the routing change, none in 8 after) wasn't explained; it now also waits for the map to stop gliding.

- **Watchfloor contrast fixed (14 Nov 2026, Tom's yes):** axe on the live site, light and dark, found the warm badge
  (light, 3.63:1), the hot badge (dark, 2.28:1), the primary button (light, 3.99:1) and an empty table header. Watchfloor
  `ba51ad7` fixes all four (5.51, 8.58 and 4.65:1, an "Alarm" label for screen readers) without changing a background;
  deployed about 7:55 PM CST, and live axe now flags only Rising's headline links as under the 24 px target size
  (optional, a layout change).

## Next steps
1. **PropertyCast to v1.12:** after its 16 Nov publish (about 4:20 AM CST), check its home page's HTML for
   `tic-nav.js v1.12` and `tic-nav.css v1.3` (the inlined copies' first lines). That finishes v1.12 everywhere.
2. **Waiting on the publisher (listed 14 Nov 2026, nothing changed):**
   - The drawing is small between 821 and about 1100 px wide (labels 5 to 7 px at 821 to 1024 px); the phone layout
     starts at 820 px, so a breakpoint change.
   - PropertyCast's `tools/smoke_garden.py` fails 3 of 237 checks (`payload: tomcast`, `pests`, `water`) since at
     least 7 Nov, probably the off-season.
   - Elements' next text update when more weather lanes go live (count publishers in the live `data/feed.geojson`
     first; next CAP countries in the assessment: Canada (ECCC Datamart), then Japan (JMA); the radiation lane).
   - Product screenshots (`site/img/`, 31 Oct 2026) may be out of date.
   - Watchfloor's Rising headline links are 17 px tall, under WCAG 2.2's 24 px target size (axe, 14 Nov); fixing it
     changes the layout.
   - Veterans Day 2027: the open questions in `veterans-day/README.md` ("After the day"): repeat visits, how receipts
     are read, a reach counter, and a daily cron for the hash and salt wipe.
3. **Waiting on access:** Blackout's night lights (the publisher accepting LAADS's data licence on his Earthdata account), then
   its drawing line; Launch's worldwide NOTAMs (FAA access).
4. **Wake** is on the drawing as in development, not linked. Before the hub links it, it needs live collectors or
   its seed data labelled as test.
5. **Other repos, noted, not started (rechecked on GitHub 14 Nov evening):** Vis's gate is fixed: it counted a run
   whose build it skipped as a build, so each skip restarted its 6-hour window; Vis `99327e5` (approved, 14 Nov about
   8:25 PM CST; push run 43667680394 passed) counts only runs whose build job succeeded. First real test: the 08:53 UTC
   fallback, 2:53 AM CST 15 Nov. Headwind, Orbit and Launch have no gate job, so a late fallback cron repeats a dispatched run.
   Vigil: `/api/feed` counts claims from a `limit=300` query, the `cisa-advisories` 403, and COP's
   `tests/fixtures/vigil.geojson` unchanged since 31 Oct. Elements' wording needs nothing yet: its live feed (386
   items, 16 publishers) has no lane the house bar's text doesn't already name.
6. **Leftover worktrees and branches (removing them is the publisher's call):** `_worktrees/hub-colorado-springs`,
   `hub-denver`, `hub-reno-sparks` (clean, merged), `hub-fort-meade` (merged; uncommitted edits to the planner's
   `engine.js` and `roads.js`), `hub-dispatch-pntsa` (2 commits not in `master`; pntsa now runs its own Worker),
   `D:\Projects\tic-vetday` (branch `veterans-day`, merged, 19 uncommitted files; never deploy from it), and the merged
   local branch `vetday-co-chains`. Added 14 Nov evening, both clean and merged: `_worktrees/pc-trigger-own-clock`
   (PropertyCast, branch `trigger-own-clock`) and `_worktrees/watchfloor-contrast` (Watchfloor, branch `contrast-fix`), and `_worktrees/vis-gate` (Vis, branch
   `gate-fix`). Also left from the v1.10 rollout, all clean: the eleven `_worktrees/*-nav110` (branch
   `tic-nav-v1.10`). The v1.12 rollout's own worktrees (`*-nav112`, `hub-nav-v112`, branch `tic-nav-v1.12` or
   `nav-v1.12`) were removed after its pushes.
