# Hub handoff: where things stand (9 Nov 2026, 12:30 PM CST: Veterans Day route line live from 8db32a6; 8 Nov: route builder live, Vis live across the suite)

Read with `CLAUDE.md` (the project's notes). Times are Central (CST since 1 Nov). Each commit, push and deploy needs
Tom's yes.

## Veterans Day planner: route line on the Map, 9 Nov 2026, about 12:30 PM CST ("I would like to see an actual route line depicted on the map", then "Build it as written")
**Live** since about 12:30 PM CST from `8db32a6` ("Commit, push, deploy"; pushed; GitHub's site-checks green).
Checked live: the files match the commit, the CSP's `connect-src` lists OSRM, and headless Edge at phone size drew the
road line from one OSRM request, with the start point not sent and no console errors. The first deploy attempt failed
because the Firebase CLI sign-in for metacog@ had expired; the publisher ran `firebase login --reauth`. The Map now draws the current route: a straight dashed
line through the stops at once, then the store-to-store legs along the roads from OSRM's public server
(`router.project-osrm.org`, run by FOSSGIS; the one `drive_matrix.py` uses). The leg from you to stop 1 is always
straight and drawn on the phone, so the position and start point never leave it. New `roads.js` v1.0 (one request
per missing stretch, legs kept for the visit, at most one request a second, 8 s timeout, a failed leg waits a minute,
only while the Map is open); `connect-src` gained `https://router.project-osrm.org`; approved wording for
Privacy, Sources, the Me note and the map note; legend keys now wrap with their labels. Tests: new
`veterans-roads.test.js` (12) and `veterans-map.test.js` (4, browser: only store coordinates sent, never a start point
or GPS fix); the unit tests caught `isFinite(null)` letting a bad point through, fixed. Checked live in the `hub-main`
preview at phone size, light and dark: one real OSRM request for 7 stores, road line drawn. Details and what wasn't
verified (FOSSGIS's log retention) in `veterans-day/README.md` ("Route line on the Map").
**Follow-up the same day (Tom: "Yes, fit it"):** opening the Map tab zooms to the route's stores (a long route ran off
the default view); the view then stays where the user puts it until they leave the Map and come back. A fifth browser
test covers it, and the GPS privacy check now waits for the settled route (a late GPS fix re-plans it). **Live** since
about 3:35 PM CST from `6e104cb` (Tom: "Commit, push, deploy"; pushed). Checked live: `app.js` matches the commit, and
headless Edge at phone size opened the Map with all 7 stops in view, one OSRM request, no start point sent, no errors.

## Veterans Day planner: Tuesday checklist run early, 8 Nov 2026, about 9:45 PM CST ("Push to GitHub, commit and deploy")
asked for the Tuesday re-checks with his file `Documents\2026 Veterans Day discounts.txt`. **Live** since about
10:05 PM CST from `6ba53fe` (pushed; checked: live `deals.json` and `drive.json` match the build): 68 deals at 166
stores, A 18 / B 23 / C 27; `drive.json` rebuilt; 67 tests pass; phone-size check clean. Details in `veterans-day/README.md` ("Re-check, 8 Nov 2026 night"). In short: 12 chains up to
A from their own 2026 pages; Air Museum coffee hour and Cash Wise's chicken dinner (four stores) to A; Perkins to B;
Charleys (at the Petro, the location given) and Royal Buffet (C) added; Olive Garden and Red Lobster marked "not announced
by the company". No local media roundup existed yet, no tips had come in, and the publisher had confirmed nothing by phone and
had no details for Fryn' Pan, Doolittle's or Porter Creek. **Still for Tue 10 Nov:** re-run the local roundup search
and the posts' and bars' own pages, take the publisher's phone results, rebuild, deploy with approved.

## Veterans Day planner: review against the consolidated report, 8 Nov 2026 night (committed `8a8fb40`, deployed)
"previous sessions have missed many free opportunities", with his report
`Downloads\2026 Fargo-Moorhead Veterans Day Deals & Events — Consolidated Report.md`. Details in
`veterans-day/README.md` ("Review against the consolidated report"). In short: 55 deals at 149 stores (was 42 at
129), a new `extras-2026.json` (4 other-day items: VA PatriotCafe Tue, MATBUS, national parks, Fargo Force Sat; and
22 earlier-year places listed at the end of Deals, off the route), a `bar` category Off by default, the Air Museum
program graded A from the museum's own events list, and fargobites.com links removed (the site redirects to an
unrelated "verify" page). Kept out against the report: Smashburger (closed), Famous Dave's (closed). The new
grade-C entries go on Tuesday's call list below. 65 tests pass; a phone-size headless-Edge check showed the new lists
and no errors.
**Follow-up the same night (Tom):** bars on by default with a drive-safe line, ten bars moved onto the route; Fryn'
Pan, Doolittle's and Porter Creek confirmed by Tom (grade A); Hardee's added (C, Tom's memory of 2025); engine v1.2
keeps a Great Clips or Freddy's card from opening a route unless it has to. Now 66 deals at 161 stores, 12 leads.
No cap on bars per route (Tom: "Leave it as is"). 67 tests pass; not committed or deployed. Preview: `hub-main-alt` in `D:\Projects\.claude\launch.json` serves the main checkout on port 5063
when another session holds 5055 (not 5061: browsers block that port).

## Veterans Day planner: route builder live, 8 Nov 2026 evening ("Commit and deploy", then "push to github and update the handoff")
**The day is Wednesday 11 Nov 2026.** Page: https://theintelligence.company/veterans/veterans-day/ (shared by direct
link only). Everything about the planner is in `veterans-day/README.md`; the summary is in `CLAUDE.md`'s Veterans Day
section.

**Live now** (deployed about 6:55 PM CST from `87ccead`; notes `7787812`; both pushed):
- The **Route tab** is the main page and replaced Next and Plan. Tom asked for an auto-route builder there that takes
  in location, interests and time (now, travel time, and when each deal's window ends). At the top: start point,
  leave time, done-by time, "Plan for" (Best for me or **Maximize**: Most stops, Most savings, Stops + savings; Tom's
  request), What I'm after chips (Love/Fine/Off, plus "Deals that need a purchase", Off by default) and "Take food
  home". Then one route: stop 1 as the action card; each later stop with arrival against its deal's end, a window
  bar, red under 25 minutes to spare; "Ending soon, not on your route" with Add; other next choices; Google Maps links.
- **Tickets for later** (Tom: Great Clips, Texas Roadhouse, Freddy's give a ticket for later use; quick stops, nothing
  eaten): `ticket=True` in `CURATE`. Great Clips is a 5-minute card pickup and no longer blocks a Sport Clips haircut.
- **Engine v1.1:** appetite (eaten food fills, wears off at 0.3 an hour; tickets and take-home food fill nothing; no
  eating when nearly full), the three Maximize goals, and a pass that fills waits (from Moorhead at 7 AM it now fits
  IHOP and a coffee before Great Clips opens at 9, instead of waiting 1 h 43 min).
- **Data:** `purchase` and `eat` tags; Kwik Trip (24 h), Casey's (5–10 PM) and Circle K (5–11 PM) use their chain's
  usual hours where a store's own are unknown (41 stores). Same 129 stores in the same order, so `drive.json` didn't
  change. The planner's JSON is `no-cache` in `firebase.json`.
- Sample day (middle of Fargo, 8 AM, done by 9 PM): Best for me 7 stops, $113, done 11:42 AM; Most stops 18, done
  3:09 PM; Most savings 18, $171, done 3:56 PM; with food taken home 19, $185.
- Tests: 32 planner tests (`tests/veterans.test.js`, `tests/veterans-engine.test.js`) and `site.test.js` pass.

**Watch out:**
- **Don't deploy from `D:\Projects\tic-vetday`.** That worktree (branch `veterans-day`) is still at `32ffe9f`, the
  old Next/Plan page; a deploy from there would roll the route builder back. Work in the main checkout on `master`.
  The `vetday` preview config (port 5056) serves that worktree; `hub-main` (port 5055, added 8 Nov in
  `D:\Projects\.claude\launch.json`) serves the main checkout. Removing the worktree is the publisher's call.
- `build_data.py` calls the Census geocoder live. After a rebuild, diff `deals.json` against the old one: place ids
  and their order must not change unless stores changed (then run `drive_matrix.py`, about 2 minutes, and
  `veterans.test.js` checks the two match).
- Not on the hub's product lists, house bar or drawing (decided 8 Nov); don't add it without Tom.

**Tuesday 10 Nov (before the last deploy):**
1. **Grades:** one deal is "Confirmed 2026" (the Air Museum program; 33 announced, 21 not confirmed). For each announced chain, look for
   the business's own 2026 post (site, newsroom, social) and upgrade to A with the source, in
   `research/national-2026.json`.
2. **Local and not-confirmed entries** (grade C, last year's information): Granite City, Pizza Ranch, Perkins, Caribou,
   Insomnia, Fargo VFW/Legion Post 2 stew lunch, AMVETS Post 7 lunch, Moorhead Legion program, West Fargo VFW 7564
   program; added 8 Nov: Village Inn, Sickies (2), Brewtus' West Fargo, Pub West (offer and address disputed), Cash
   Wise Moorhead deli, Sandy's (2), Blarney Stone, Harwood Legion stew, Air Museum coffee hour, Hardee's, the ten bars,
   and whether the Air Museum is free on 11 Nov. Fryn' Pan, Doolittle's and Porter Creek are confirmed; what
   each offers this year would improve their cards. Also the 12 earlier-year places in `research/extras-2026.json`
   `leads`: one with a 2026 confirmation becomes a deal. Check their Facebook pages or call; update
   `research/local-2026.json` and `CURATE`.
3. **Tips** sent through the page: `npx wrangler d1 execute vetday --remote --command "SELECT id, ts, name, address,
   offer, when_, source FROM tips WHERE status = 'new'"` (run wrangler with `env -u CLOUDFLARE_API_TOKEN`).
4. Rebuild, diff, test, deploy (approved): `python -I veterans-day/build/build_data.py`, then
   `cd tests && node --test --no-warnings veterans.test.js veterans-engine.test.js site.test.js`, then
   `firebase deploy --only hosting:hub --project context-484804`.
5. Known gaps, each the publisher's call: 70 stores have no store-specific hours (41 now use chain hours) and 55 of 129 addresses
   come from directories; a short link (`/vetday` redirect), a Veterans Day link-preview card and a QR code; an
   offline copy (a small service worker for the page and data, about 500 KB) for weak signal in restaurants; a
   phone-size browser smoke test of the planner; whether to plan more than 5 minutes before a deal ends (tight stops
   show in red now).

**Wednesday 11 Nov:** decide who watches reports. Pulling a dead deal needs a laptop with wrangler (`overrides`
table; commands in the README's "On the day"); it shows on phones within five minutes.

## Vis launch follow-ups, 8 Nov 2026 afternoon (Tom's list of five, from the section below)
- **Dispatch clock for Vis: not working yet; the token still lacks `vis`.** No dispatched Vis run appeared for
  2:25 PM (20:25 UTC): `gh run list -R metacog-osint/vis --event workflow_dispatch` was still empty at 2:45 PM. In the
  same hour the clock started Elements (2:05 PM), Cordon (2:10 PM) and COP (2:20 PM), all successful. The hub side is
  right: `JOBS` has `metacog-osint/vis` `build.yml` on `main` at minute 25, hours 8 and 20 UTC; `dispatch-deploy` for
  `d1a8eb3` passed at 1:10 PM; Vis's `build.yml` is active with `workflow_dispatch` on `main`. That leaves GitHub
  refusing the token, which for a fine-grained token without the repository is the 404. (This machine's Cloudflare
  token can't read Workers logs, so the error text itself wasn't seen.) **Tom:** add `vis` under the token's
  Repository access and save; the next start is 2:25 AM, 9 Nov (08:25 UTC). The 20:53 UTC fallback cron should skip,
  since the 1:10 PM push build is under 6 hours old; GitHub starts it late, and after 7:10 PM it would build instead.
- **Vis's gate, seen and not changed:** it asks for the newest `build.yml` run with `status=success`. A scheduled run
  whose build the gate skipped also ends as "success", so a skip restarts the 6-hour window. Elements' gate reads real
  deployments instead. With 12 hours between Vis's runs this rarely matters; the fix is to look for the newest run
  whose `build` job succeeded.
- **PropertyCast v1.5: not checkable yet.** At 1:38 PM its home page still read `TicNav = { version: "1.4"`, and
  `ea2cca9` is on its `main`. Its publish ran by `workflow_dispatch` at 4:16 AM on 7 and 8 Nov (the 09:23 UTC cron
  comes hours later and skips). Check the home page's HTML after about 4:30 AM, 9 Nov; that finishes v1.5 everywhere.
- **Stray kit commit `24fcc56`: already gone.** Another session reset `D:\Projects\tic-doctrine` at 1:37 PM (reflog:
  "reset: moving to origin/main"); the folder is at `63882c0`, clean and even with `origin/main`. `24fcc56` had nothing
  `63882c0` lacks: Vis sat at the end among the planned entries (status live), fresh 18 h, shorter terms ("Vis code
  AGPL-3.0; CC BY 4.0 (Open-Meteo, ECMWF IFS ensemble); NOAA GEFS public domain"), `owns` "theatre weather and
  illumination effects by zone", and no README line. The reflog keeps it until git prunes it.
- **Listening Post's dark-mode Done button: already fixed and live, nothing changed.** `web/src/app.css` (7 Nov,
  5:31 PM) has `.tic-time-dialog .tic-time-actions .tic-time-done { color: var(--acc-ink); }`, which outranks the
  shared file's `.tic-time-actions .tic-time-done`. `--acc-ink` is `#0D1A26` in dark (7.9:1 on `#7DB2E6`) and white in
  light (6.7:1 on `#1F5F99`), and it follows the app's own Settings theme. It went live with the 8 Nov house bar
  deploy (live CSS `index-ClxoDwjI.css`). axe 4.13 on the live dialog, mounted on the sign-in page in headless Edge:
  0 violations in light, dark, Settings dark on a light system, and Settings light on a dark system. The proposed bare
  `@media (prefers-color-scheme: dark)` rule was not added: with a dark system and Settings on light it would put
  `#1F1F1D` on `#1F5F99` (2.5:1). No backup or deploy was needed.
- **Kit CRLF test fixed** (`tic-doctrine` `04da0a7`, pushed with Tom's yes; its `ci` passed): in `tests/test_kit.py` the CRLF step becomes
  `doc.read_bytes().replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")` (LF first, so a file that is already CRLF stays
  CRLF instead of becoming `\r\r\n`). Tested on scratch clones of `63882c0`: before, a CRLF clone
  (`core.autocrlf=true`) failed that one test; after, all 39 kit tests pass on CRLF and LF clones. `tests/` is not in
  the vendored kit (`PARTS` in `tools/sync.py`), so no program's `kitcheck` changes and the kit stays 0.4.2. (The main
  folder's files are LF, which is why it passed there before.)

## Vis live across the suite, 8 Nov 2026 (side session "Vis live across the suite"; Tom: "yes to all deploys, yes to
## beta, yes to wording, yes to option A for cop display question, yes to hub commit, push; yes to kit commit, push;
## yes to cop commit, push; yes to house bar v1.5 commit, push. make the changes needed to the noticed items", then
## "yes to the dispatch clock, too")
Vis (https://vis.theintelligence.company, launched 8 Nov 11:57 AM CST from Vis `9ad677c`) is listed as **beta** on the
hub, in every site's Programs menu and in COP. Times below are CST.
- **Hub** `a5be9dc`, pushed and deployed about 1:15 PM (Tom ran `firebase login --reauth` first); `site-checks` passed
  on GitHub. Vis is linked on the drawing, with the new line "…how likely wind, poor visibility, heavy rain or snow,
  icing, extreme heat or cold, or low cloud are to reach indicative limits at named airfields and ports over the next
  7 days, from the NOAA and ECMWF ensembles, with each night's moonlight and darkness. A thunderstorm hazard and scoring
  against station reports are planned." The air layer's feed is "now". Vis is in Every product and `404.html` between
  Cordon and Elements; the footer credits `https://vis.theintelligence.company/#sources`; footer date and `<lastmod>`
  8 Nov 2026. **"Updated … ago"** for Vis reads its feed's `generated_at` with a GET: Cloudflare Pages sends an ETag but
  no `Last-Modified`, and the feed is 168 KB, about 8 KB as served (brotli). `connect-src` allows the vis. origin.
  Tests: a Vis sample feed and shape check, Vis's expected Updated line, the 404 test counts the home page's list
  instead of a fixed 10, and `check-live.js` covers seven feeds. 108 tests passed locally on the installed Edge (this
  machine has no Playwright Chromium; see `CLAUDE.md`, Tests).
- **House bar `tic-nav.js` v1.5** (wording Tom approved): Vis between Cordon and Elements, label "Air · operational
  weather", phones "Operational weather and night light for each watched conflict zone.", hover "Operational weather and
  illumination for Watchfloor's conflict zones: … Updated twice a day; not an official forecast." Live with
  `version: "1.5"` (checked by 1:25 PM): COP `4558cdb`, Elements `7261718`, Cordon `81fcdc0`, Vigil `1e8d5f9` (straight
  to `main`: no Vigil session was running), Noisefloor `1657cb0` (file and rebuilt `site/`, pages load
  `tic-nav.js?v=163586d7d9`), Context `175892d` (`npx vercel --prod`; the first try errored, the retry deployed),
  Watchfloor `57b8e6a` (`build_web.py`, `firebase deploy --only hosting:watchfloor`), Title 10 `1626271` (`sw.js`
  `t10-2026-11-08a`, deploy README line, clean worktree), Listening Post (no git; v1.4 backed up to
  `_backups/tic-nav-v1.4-2026-11-08/`; hosting only, since another session's work today is in `functions/`), Vis
  `f6f0b5b`. **PropertyCast `ea2cca9` goes live at its next daily publish** (about 4:23 AM, 9 Nov).
  These deploys also shipped the 7 Nov work that was waiting on this machine: every site now serves `tic-nav.css` v1.2.
- **Doctrine kit 0.4.2** (`tic-doctrine` `63882c0`): Vis live in the registry, in the live block after Cordon; fresh
  20 h, stale 48 h; terms say AGPL-3.0 (the entry said MIT); `owns` names the Open-Meteo ensembles at named airfields
  and ports and the computed sun and moon. **Loose end:** the main folder `D:\Projects\tic-doctrine` holds a local,
  unpushed commit `24fcc56` with the same title, made at 12:59 PM by another session (fresh 18 h, Vis left among the
  planned entries). It diverges from `origin/main`; it was left alone. Whoever made it should drop it (`git reset
  --hard origin/main` in that folder) once they agree `63882c0` covers it. Syncs here used a worktree at `63882c0`.
- **COP** `d4a0d2c` (deploys on push; the build at 1:05 PM had Vis fresh, 32 items, no lint errors): kit 0.4.2 (the old
  "Weather impact (working label)" is gone), Vis drawn in Okabe-Ito yellow under its own "Weather" preset, its three
  sources registered (Open-Meteo `commercial_ok` false). **Option A** (Tom): Vis's Amber and Red forecasts (tier
  `warning`) show in every view next to measured anomalies; the rest show with routine items or under "Weather",
  where the panel says "The map shows Vis's forecast for every point". Forecasts are never picks. A forecast's card
  says "Forecast: a probability, not a measurement" (and "Warning: Vis's judgment" at tier warning) with the kit's
  likelihood and confidence chips. The MCP instructions name Vis and say its items are forecasts; unfiltered
  `search_items` lists Vis's warnings first. Details in COP's `CLAUDE.md`.
- **Vis fixes** (Vis `d783c84`; the build and deploy at 1:10 PM passed): titles quote the published probability ("almost
  certain (99%)", was "(100%)" against a 99% probability and a 95–99% term); the page says each zone has a named
  point and most an alternate, each its own row (it said "one point per zone"); kit 0.4.2.
- **Dispatch clock** (hub `d1a8eb3`, `dispatch-deploy` passed at 1:10 PM): `tic-dispatch` starts Vis `build.yml` at 08:25
  and 20:25 UTC (2:25 AM and 2:25 PM CST). Vis's own cron moved to :53 as the fallback, and its new gate job skips a
  scheduled run within 6 hours of a successful build. **Tom: add `vis` to the `DISPATCH_TOKEN` token's repository
  access** (GitHub, Settings › Developer settings › fine-grained tokens); until then Vis's start fails with a 404 twice
  a day and the other jobs carry on.
- **Seen, not changed:** the kit test `test_kitcheck_survives_crlf_and_catches_edits` fails in a fresh Windows
  worktree (CRLF checkout: its CRLF step makes `\r\r\n`); it passes on LF files. Two preview entries
  (`hub-vis-worktree`, `cop-vis-worktree`) were added to `D:\Projects\.claude\launch.json` and removed again.

## Merge, rollout, Time dialogs and drawing labels, 7 Nov 2026 evening (cloud session; Tom: "1. yes 2. yes 3. yes,
## just make sure everything is clean, nothing overlaps 4. yes")
The session ran in a cloud sandbox with the nine program repos attached and a new personal environment, "The
Intelligence Company", whose network reaches the hub and every program site (Tom approved it). It has no Firebase,
Vercel or Google Cloud sign-in, so those deploys are Tom's (commands below).
- **Hub:** branch `ccr-c24c283b-rb52w0` fast-forwarded into `master` after `site-checks` passed. **Not deployed:**
  run `firebase deploy --only hosting:hub --project context-484804`. Footer Updated date and `<lastmod>`: 7 Nov 2026.
- **House bar `tic-nav.css` v1.2** ("You are here" readable on the light menu), pushed to each repo's main branch:
  - Live by 4:55 PM CST (checked: `/tic-nav.css` reads v1.2): COP `196b327`, Elements `dbbee3d`, Cordon `f8a6e65`,
    Vigil `e6cf216`, Noisefloor `5203f6f` (with `site/` rebuilt by `tools/build_site.py`, new `?v=` hash).
  - PropertyCast `09d8757`: inlined at the next daily publish (about 4:23 AM CST, 8 Nov); check its home page HTML
    for `--tn-here`.
  - **Tom's machine:** Watchfloor `2162548` (`python -I scripts/build_web.py`, then `firebase deploy --only
    hosting:watchfloor --project context-484804`); Title 10 `64af250` (from `deploy/` in a clean worktree, `firebase
    deploy --only hosting`; `sw.js` is `t10-2026-11-07a`); Context `bfeb389` (`npx vercel --prod`); Listening Post (no
    git: back up, copy the hub's `site/shared/tic-nav.css` into `web/public/`, `firebase deploy --only hosting`).
- **Time dialogs, checked live in light and dark with axe** (each site's own CSS; the shared file is unchanged):
  - Fixed and pushed in the same commits: Title 10 (light text on white in dark mode, 1.2:1: maps `--sheet`,
    `--ground`, `--rule`; Done takes `--accent-ink`), Watchfloor (Done: white on amber, 4.0:1 light and 1.9:1 dark; now
    dark text `#1a1206`, 4.7:1 and 10:1), COP (legend and note `#666`, 3.1:1 in dark: maps `--rule` and `--mut`). Each
    passed axe in both modes from the repo's own files. Title 10 and Watchfloor go live with their deploys above.
  - **Listening Post, not fixed (no git here):** in dark mode the Done button is white on `#7DB2E6`, 2.2:1. In its own
    stylesheet: `@media (prefers-color-scheme: dark) { .tic-time-dialog .tic-time-actions .tic-time-done { color:
    #1F1F1D; } }` (7.4:1).
  - Fine as they are: Vigil (sets its own dialog colours), Context, Elements, Cordon; Noisefloor and PropertyCast keep
    a white dialog in dark mode, which reads fine.
- **Drawing labels** (details and the rules in `CLAUDE.md`): every label at least 9 px on a 1440×900 screen (was 5.9 px);
  in-plate labels hidden on phones (were 3 to 5 px); no overlaps, nothing sticking out of its plate, under another plate
  or off the edge at ten screen sizes (before: Headwind sat on "Economic", Blackout and Noisefloor on "SPECTRUM",
  "GEO BELT" and part of "near space" were hidden under plates, "BY KIND" was clipped on phones). New tests in
  `tests/browser.test.js` fail on the old drawing at all ten sizes. 108 hub tests pass.
- **Seen along the way, not changed:**
  - PropertyCast's `tools/smoke_garden.py` fails 3 of 237 checks (`payload: tomcast`, `pests`, `water`) with or without
    this change: probably the November off-season.
  - Watchfloor's own `button.primary` puts white on amber in light mode (4.0:1), as its Time dialog did.
  - Between 821 and about 1100 px wide the two-column layout keeps the drawing small (labels 5 to 7 px at 821 to
    1024 px). The phone layout starts at 820 px; moving that breakpoint would be a layout change for Tom to decide.

## Tests, preview server and accessibility fixes, 7 Nov 2026 (cloud session; Tom: "please run all four")
- **Where:** branch `ccr-c24c283b-rb52w0`, merged into `master` the same evening (section above). The session ran in a
  cloud sandbox; at this stage it could not reach the product sites or Firebase.
- **Tests** (`tests/`, 95 in all, about 40 s; `tests/README.md`): the house rules from `CLAUDE.md` read from the files;
  `serve.py`; the home page in Chromium with sample feeds (Latest lines, "Updated … ago", "running late", every
  fallback, the guide, keyboard, phone, 10 widths from 320 to 1440 px, the 404 page); the house bar on a stand-in
  product page; axe (WCAG 2.2 AA and best practices) in light and dark. Each list and wording check was proved by
  planting the mistake it guards against. `.github/workflows/site-checks.yml` runs them on push; its `feeds` job runs
  `tests/check-live.js` on the six real feeds and doesn't block. First run (commit `8bf2bab`, 2:44 PM CST): 95 of 95
  passed, and all six live feeds had every field the hub reads.
- **`tools/serve.py`:** a missing page, or a folder without `index.html`, now gets `404.html` with status 404 (it gave
  Python's bare error page and folder listings). Port 0 picks a free port.
- **Fixed, found by axe:**
  - House bar "You are here" on the light panel: amber `#E3A83B` read 1.87:1 (WCAG needs 4.5:1). `tic-nav.css` v1.2
    uses `#8F5509` there (5.4:1); dark mode keeps the amber (6.9:1). **Not rolled out**: the ten sites carry v1.1.
  - The hub's Time dialog in dark mode drew light text on white (1.18:1): `tic-time.css` reads `--panel` and others,
    which the hub names differently. `style.css` now maps them on the dialog; the shared file is unchanged.
  - The top bar (location line and Time button) was outside every landmark; `<header>` now wraps it with the
    masthead. Full-page screenshots at 1440 and 375 px, light and dark, matched pixel for pixel outside the drawing's
    animation.
- **Measured, fine:** no sideways scroll at any tested width; every drawing label has at least 4.5:1 against the
  artwork behind it (measured from a screenshot, since axe can't see through the artwork).
- **Text fixes, Tom's yes ("make the text changes in 3 to 6"), same branch:**
  1. COP's static Latest line (shown when COP's health feed fails) no longer claims "cross-program convergence by
     country" (only on COP's unpushed branch; the drawing dropped it on 5 Nov). It reads "Every program’s latest
     findings on one map, with today’s top five and each feed’s health."
  2. The footer says the latest lines come from "Noisefloor, Watchfloor, Vigil and COP", and credits COP (its home
     page), Elements and Cordon (`/#health-h`, each page's Sources card; checked in their repos' `site_src`).
  3. Every new-tab link in the footer ends in ↗ (joined with `&nbsp;`); the tests no longer exempt the footer.
  4. The drawing says "GPS reference stations" and "Ionospheric disturbance from GPS base stations"; the GNSS
     allow list in the tests is gone.
- **Found, not changed (Tom's call):**
  5. The drawing's labels are small: at 1440 px, 19 of 58 render under 9 px (smallest "GEO BELT", 5.9 px; plate
     captions such as "Political" and "Party A" 8 to 8.5 px). On a 375 px phone, 43 of 50 are under 9 px (smallest
     2.7 px). Contrast is fine and pinch-zoom works, so it isn't a WCAG failure.

## Vigil's four cron triggers merged into one, 6 Nov 2026 (Tom: "pick one or more of the recommended tasks")
- **Done:** Vigil PR #92 (https://github.com/metacog-osint/vigil/pull/92), commit `c4d3aa9`, merged as `a2383f5` at
  3:18 PM CST with Tom's go. The ingestion Worker was deployed by hand at about 3:20 PM CST: wrangler reported
  `schedule: 15,45 * * * *` (version `4b35666a`). The account now uses 2 of its 5 free cron triggers (PropertyCast 1,
  Vigil 1).
- **Checked live:** the first tick on the new trigger ran at 3:45 PM CST (`worker-run` row, trigger `15,45 * * * *`,
  success, 2 jobs, 24 s, nothing deferred).
- **Why twice an hour:** the four triggers were only ticks; Vigil's scheduler runs whatever is overdue. Its 35 jobs
  declare about 898 subrequests a day; a tick admits 32. Four triggers gave about 29 ticks (933, 96% full); one
  hourly trigger would give 768 (117%). `15,45` gives 1,536 (58%). In the 48 hours before, ThreatFox and alert-rules
  averaged 78 and 81 minutes against 60.
- **Guard:** Vigil's new `workers/src/lib/__tests__/capacity.test.js` fails on more than one trigger, a job costing
  more than a tick, or daily demand over 75% of capacity. The limits moved to `workers/src/lib/limits.js`.
- **Checks:** 1,367 Vigil tests passed; lint-and-test, build, CodeQL and Vercel passed on the PR. Tom chose to merge
  while the three e2e browser checks were still running (the PR touches only `workers/` and docs).
- **Left:** the `worker-one-cron` branch on GitHub (merged; Tom may prune it). Vigil's `docs/SESSION_HANDOFF.md` still
  says "4 of 5" in its dated 22 Sep table; another session has uncommitted edits to that file, so it wasn't touched.
- **Not done, on purpose:** cutting Elements' and Cordon's fallback crons to one an hour. GitHub fired only 4 scheduled
  runs a day on each regardless of the cron, so it would change nothing measurable.

## House bar v1.4, 6 Nov 2026 (Tom approved the wording, then said "Yes, roll it out")
- **Why:** Elements `8f6cfb4` put two lanes live:
  - **EMSC earthquakes:** a second worldwide catalogue, M4.5 and up, matched against USGS within 90 s and 150 km.
    EMSC-only events become their own items.
  - **NIFC wildfire incidents** (WFIGS), US only: wildfires not declared out that are still uncontained or were
    found in the last 14 days.
- **Measured first:** the live feed generated 10:06 AM CST held 390 items: NASA FIRMS 95, USGS 91, EMSC 91, GDACS 49,
  NWS 49, NIFC (WFIGS) 30, MeteoAlarm 51 (AEMET 23, MeteoAlarm 20, IPMA 8), Copernicus EMS 5, USGS Volcano Hazards 3,
  SPC 2, tsunami centres 2, Drought Monitor 1.
- **Text:**
  - `tic-nav.js` (`long`): "Worldwide: earthquakes from USGS (with impact alerts) and EMSC, …" and "US only for now:
    wildfire incidents, severe-storm outlooks, drought and volcano alert levels." Regional and "Weather for more of
    the world is planned" are unchanged.
  - `oe.js` (`line`): "earthquakes from USGS (with impact alerts) and from EMSC's independent catalogue" and "US only
    for now: wildfire incidents (NIFC), …". It still ends "Weather for more of the world and a radiation lane are
    planned."
  - "With impact alerts" stays with USGS: the alerts are USGS PAGER's, and EMSC-only events have none.
- **Tested at 1440 px:** the menu's Elements panel is 270 × 322 px (was 302), shorter than the 545 px program list,
  so the menu doesn't scroll. The drawing's Elements panel is 403 × 541 px (was 520) beside the 820 px figure. No
  console errors.
- **Hub** `58a54ea`, pushed to `master` and deployed about 11:00 AM CST.
- **Sites:** a worktree per repo off its main branch, pushed straight to main (no conflicts). All were checked live
  with `version: "1.4"` at 11:01 AM CST, except PropertyCast:
  - COP `44368ea`, Cordon `b6950bd`, Elements `1f3d645`: deploy on push.
  - Vigil `7c0a807`: straight to `main`, since no Vigil session was active. CI and CodeQL passed.
  - Noisefloor `8cd36d0`: the file and the rebuilt `site/` in one commit; ci and deploy-site passed. Pages load
    `tic-nav.js?v=53c8f2a0e7`.
  - Context `304625d`: `npx vercel --prod`. The first try said "Not authorized"; the retry deployed.
  - Watchfloor `721058a`: `scripts/build_web.py`, then `firebase deploy --only hosting:watchfloor`.
  - Title 10 `f5f8d8b`: `sw.js` `t10-2026-11-06a` and the deploy README line, deployed from `deploy/` in a clean
    worktree.
  - Listening Post: no git. v1.3 was backed up to `_backups/tic-nav-v1.3-2026-11-06/`, then `firebase deploy --only
    hosting`, whose predeploy builds `web/dist` from `web/public`.
  - PropertyCast `7a2facb`: live with the next daily publish. See Next steps 1.
- **Along the way:**
  - The Firebase login expired again before the hub deploy; Tom ran `firebase login --reauth`.
  - The external D: drive dropped off at about 10:50 AM CST, mid-rollout: Windows listed no D: disk at all.
    Everything was already pushed, and Tom reconnected it.
  - All nine worktrees and their `tic-nav-v1.4` branches were removed after checking each branch was on its main.
  - After the local preview stopped, port 5055 still showed as listening, owned by PID 0 (no process). Harmless, but
    the next preview may need another port.

## Wrap-up, 6 Nov 2026 (about 10:15 AM CST; Tom asked to wrap up the site effort and all branches)
- **House bar v1.3** was live on the hub and all ten sites (checked); v1.4 (above) replaced it the same morning.
- **Notes trim:** done and pushed for Listening Post, Watchfloor, PropertyCast, the hub, Noisefloor and Context.
  - The originals are archived at `D:\Backups\notes-before-trim-2026-11-05`.
  - Noisefloor's local folder is on another session's `docs/satcom-reconcile` branch, so it still holds the old,
    long notes until that branch takes in `main`.
- **No leftover worktrees** in the hub, Title 10, Watchfloor, Noisefloor, PropertyCast, Context, Vigil, COP, Elements
  or Cordon. The empty `D:\Projects\_worktrees` folder was removed; `git worktree add` recreates it when needed.
- **Merged branches deleted** by Tom on 6 Nov, using `tools/prune_merged.sh` (it re-checks each branch is in main
  before deleting; Claude's own attempt was blocked by auto mode's safety check):
  - Vigil: 37 local and 50 on GitHub.
  - Noisefloor: 4 on GitHub.
  - PropertyCast: 9 local and 1 on GitHub.
  - Confirmed on GitHub afterwards: only the branches below and each repo's main remain.
- **Unmerged branches, kept on purpose:**
  - COP and Watchfloor `wip/2026-11-01-unreviewed`: waiting on Tom's review (COP convergence for the mosaic
    effect; Watchfloor's 13 charter indicators).
  - Noisefloor `docs/satcom-reconcile`: another session's live SATCOM work.
  - Vigil:
    - `dependabot/...` (2): open PRs #57 and #66, which need review.
    - `pr-assets/house-bar-layout` and `pr-assets/phone-overflow`: PR screenshots that PR pages link to.
    - `feat/evidence-tiers` and `docs/handover-24-september` (24 Sep, 2 commits each, not in `main`): review before
      deleting.
- **Uncommitted work belonging to other sessions** is untouched: Vigil (33 files), Cordon (9: the Google News
  fallback), PropertyCast (`tools/smoke_garden.py`), and Title 10's `benefits-pack` files.

## Pushed 6 Nov 2026 (Tom's yes): COP on the dispatch clock
- **COP on the dispatch clock**, worktree `D:\Projects\_worktrees\hub-dispatch-cop`, branch `dispatch-cop` (from
  `origin/master` `3563f8e`), pushed to `master` 6 Nov (Tom added `cop` to the token first): `dispatch/dispatch.js` (optional `hours` per job; COP `build.yml` at :20
  on even UTC hours) and `dispatch/dispatch.test.js` (15 tests pass). Part of COP's MCP server work (COP worktree
  `D:\Projects\_worktrees\cop-mcp`, branch `mcp-server`; plan `~\.claude\plans\compiled-toasting-treehouse.md`).
  Done in that order on 6 Nov: COP `9e421f9` first (its gate and the MCP server at
  https://cop.theintelligence.company/mcp, live and checked), then this, rebased onto `aa27ba7` (the notes trim).
  To confirm: COP's first dispatched build at 16:20 UTC (10:20 AM CST), `gh run list -R metacog-osint/cop
  --event workflow_dispatch`. Details in `CLAUDE.md` ("COP joins").

## Live and finished
- **Dispatch Worker `tic-dispatch`, live 5 Nov 2026** (Tom: "Yes, build it", then "proceed with sharing propertycast's
  timer"). Elements and Cordon now start every 30 minutes instead of every 4 to 9 hours. Details in `CLAUDE.md`
  ("Dispatch Worker").
  - Code: `dispatch/` (hub `ecd1736`, then `1148227`), deployed by `.github/workflows/dispatch-deploy.yml`. PropertyCast
    side: `7a4d07f` (`trigger/`: service binding `DISPATCH` and `lend()`; 14/14 checks in `tools/test_live.mjs`).
  - Why no cron of its own: the free plan's 5 cron triggers are all in use (PropertyCast 1, Vigil 4); the first deploy
    was refused (code 10072). Tom chose sharing PropertyCast's 5-minute clock over Workers Paid ($5/month).
  - Checked live: Elements' dispatched run started 10:35:51 PM CST and published at 10:36:48; Cordon's started
    10:40:50 and published at 10:41:22. PropertyCast's own feed kept updating (10:40:49 PM).
  - Secrets on the hub repo, set by Tom: `DISPATCH_TOKEN` (expires **5 Nov 2027**), `CLOUDFLARE_API_TOKEN` (no
    expiry; rolled once on 5 Nov after the first value was lost), `CLOUDFLARE_ACCOUNT_ID`.
  - Tom also loosened the cost rule the same night: new costs can be considered when a program needs them, with the
    price, what it buys and the free alternative, and his yes first (global `CLAUDE.md`).
- **House bar v1.3, 5 Nov 2026** (Tom approved the wording, then said "Yes, roll it out"). MeteoAlarm went live on
  Elements (`66bf4e4`), so Elements' text moves weather warnings from "US only for now" to **Regional**:
  - `tic-nav.js` (`long`): "Regional: weather warnings for the US and Europe, hurricane-center storms, and tsunami
    messages … US only for now: severe-storm outlooks, drought and volcano alert levels. Weather for more of the
    world is planned."
  - `oe.js` (`line`): "Regional: weather warnings for the US (NOAA) and for 38 European countries and Israel
    (MeteoAlarm), …", the same US-only list with its agencies, and "Weather for more of the world and a radiation lane
    are planned."
  - Measured first: the live feed (generated 8:46 PM CST) held 315 items: MeteoAlarm 28 (19 countries; 9 orange
    items in Madeira and Corsica, the rest yellow counted per country), NWS 43, no EMSC or NIFC. MeteoAlarm's lane
    reads 39 feeds (`FEEDS` in `elements/meteoalarm.py`): 38 European countries and Israel, CC BY 4.0.
  - Tested locally at 1440 px: the menu's Elements panel is 270 × 302 px, shorter than the program list, and the
    menu doesn't scroll; the drawing's Elements panel fits beside the figure; no console errors.
  - Hub `3afcdf9` (made on branch `tic-nav-v1.3`, fast-forwarded into `master`, pushed), deployed about 9:30 PM CST.
  - Sites, each from a worktree off its main branch, all checked live with `version: "1.3"` by 9:42 PM CST unless
    noted: COP `da940a8`, Cordon `110e10d`, Elements `19c0013`, Vigil `6e5c514` (straight to `main`: no Vigil
    session was working; all CI jobs passed, Firefox e2e on a rerun at 9:58 PM CST after the first attempt spent
    18.5 minutes downloading Firefox and hit the job's 20-minute limit), Watchfloor `e629282` (`scripts/build_web.py`, then `firebase deploy --only
    hosting:watchfloor`), Context `026bbcb` (`npx vercel --prod`; the first try errored, the retry went through),
    Title 10 `12c3f1c` (`sw.js` `t10-2026-11-05c`, deploy README line, clean worktree, `firebase deploy --only
    hosting`), Noisefloor `ef399c5` (file and rebuilt `site/` in one commit; CI and deploy-site passed; pages load
    `tic-nav.js?v=aa1c542e04`), Listening Post (no git; v1.2 backed up to `_backups/tic-nav-v1.2-2026-11-05/`;
    `firebase deploy --only hosting`), PropertyCast `935565f` (rebased over one daily-publish commit).
  - **PropertyCast builds the bar into its page** at the daily publish, so its `/tic-nav.js` returns the page, not
    the file. Check `TicNav = { version` in the home page's HTML. It showed v1.1 at 9:40 PM CST (expected); the
    publish at about 4:23 AM CST, 6 Nov should take it straight to v1.3. See Next steps 1.
- **House bar v1.2, 5 Nov 2026** (Tom asked for it). Tom: "US-based weather content is just a small slice of what I
  need Elements to be; I need global weather data." So Elements' text in `tic-nav.js` (`long`) and in `oe.js` (`line`)
  now splits its sources, measured from the live feed and the code that day:
  - **Worldwide:** USGS earthquakes (PAGER), NASA FIRMS fires, GDACS and Copernicus EMS.
  - **Regional:** NHC storms, and NTWC/PTWC tsunami messages (US and Canadian coasts, Hawaii, the Pacific and the
    Caribbean).
  - **US only for now:** NWS warnings, SPC outlooks, the Drought Monitor and USGS volcano alert levels.
  - Both end "Global weather is planned" (the `oe.js` line adds the radiation lane).
- **Same commit, hub fix:** the drawing's COP line no longer claims "multi-program country convergence". It had since
  `bd02c67` (4 Nov), but convergence is only on COP's unpushed `wip/2026-11-01-unreviewed` branch.
- **Hub:** `0d92a8b`, deployed about 12:45 PM CST. The new text fits the menu's hover panel (247 × 222 px at
  1440 px).
- **Sites:** the same one-file copy, checked live (`version: "1.2"`) unless noted:
  - Title 10: `3ec73d0`, `sw.js` `t10-2026-11-05b`, deployed from a clean worktree.
  - Watchfloor: `0362938`, `build_web.py`, then `firebase deploy --only hosting:watchfloor`.
  - Listening Post: no git; v1.1 backed up first; `firebase deploy --only hosting`.
  - Context: `68d027f`, `npx vercel --prod`.
  - COP: `063768f`.
  - Cordon: `26a03aa`.
  - Noisefloor: `d22d49f` failed CI because `site/` wasn't rebuilt; fixed in `dde6607` (`tools/build_site.py`).
  - Elements: `aeff62f` is on `main`, but the live site still served v1.1 at 1:10 PM CST. The push's Pages deploy hung
    on "updating_pages" and timed out at 1:05 PM CST. Since then GitHub refuses new Pages deployments "due to in
    progress deployment" `aeff62f…`, although that deployment reads `deployment_cancelled` (cancel API also called).
    Two dispatched runs failed that way. A retry 15 minutes later (run 42093792626) deployed: v1.2 live at 1:26 PM
    CST. If Pages sticks like this again, wait about 15 minutes before dispatching `update.yml` again.
  - PropertyCast: `3473dbc`, live with its next daily publish (about 4:23 AM CST).
  - Vigil: PR #90 (https://github.com/metacog-osint/vigil/pull/90), a pull request because a Vigil session was working
    there. All nine checks passed, including e2e in Chromium, Firefox and WebKit, which had been failing on `main`
    since 1 Nov. Merged with Tom's yes as `c83229b` at 1:05 PM CST; Vercel deploys on merge.
- **Global weather for Elements:** the "Elements: global weather sources" session (started 5 Nov) wrote a source
  assessment, `~\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\side-session-notes\local_8abbc62d-0c25-4eec-8a42-7af7062ba56a\elements-global-weather-sources.md`,
  and put the first lane live: **MeteoAlarm** European weather warnings (EUMETNET, 39 countries; Elements commit
  `66bf4e4`). The live feed at 8:46 PM CST, 5 Nov held 28 MeteoAlarm items, some credited to national services
  (Météo-France, IPMA). House bar v1.3 (above) brought the Elements text up to date.
- Hub `master` is on GitHub and live at https://theintelligence.company (deployed 4 Nov, about 10:35 PM CST). Site
  commit `bd02c67`; the notes commit follows it. Checked live at 1440 px and 375 px: no console errors, no sideways
  scroll on phones.
- What shipped:
  - **The guide** starts as three questions, one per band of the drawing, each opening to its programs' questions
    (`GROUPS` in `oe.js`). Tom chose this over trimming. Closed it is 418 px tall (was 1,486 px beside an 847 px
    drawing). Phones keep the row of program chips, in group order.
  - **Vis** is the weather program's name (Tom, 4 Nov; `id: "vis"`, no working-name mark).
  - The reviewed 1 Nov edits: COP's "All layers" line in "Latest", clickable cross-layer threads (t0–t5), Verdict,
    Headwind, Blackout, Orbit, Wake and Vis on the drawing as in development (none of them linked), and "running
    late" judged against each program's `fresh_hours` from COP's health.
  - Footer updated date and `sitemap.xml` `<lastmod>`: 5 Nov 2026 (UTC).
- The house bar (`site/shared/tic-nav.js` + `.css`, v1.1) is live on all ten program sites. Title 10 moved from v1.0
  to v1.1 on 5 Nov 2026 (commit `49a49c5`, pushed and deployed 12:36 PM CST, `sw.js` VERSION `t10-2026-11-05a`;
  tested locally on the guide, Money Kit and changes page at 1440 px and 375 px, then checked live byte for byte).
  Deploy Title 10 from a clean worktree: its main folder holds untracked `benefits-pack` files from 1 Nov
  (`data/`, `deploy/public/data/`, `tools/check-benefits-pack.js`) that no session has claimed and that must not ship.
  tic-time v1.3 is on every program repo's main branch (checked 5 Nov; the local PropertyCast and Context trees lag).
- **Vigil's "Updated … ago"** now shows when Vigil last took in claims (`data_as_of`, its last successful RansomLook
  run), not when its summary was assembled (`built_at`, which always read "just now"). Hub commit `4b26bf5`, deployed
  4 Nov about 10:59 PM CST; checked live: "Updated 44 min ago", tooltip "4 Nov 2026, 10:15 PM CST", no console errors.
  Vigil side: PR #86, below.
- A local preview config is at `.claude/launch.json` (untracked; `hub` runs `tools/serve.py 5055`; `root`, added
  5 Nov, serves the project root on 5057 for `tools/tic-nav-demo.html`). An older `serve.py`
  from 2:53 PM CST on 4 Nov (PIDs 30668/31228) was still listening on 5055 at 11 PM. The app's preview then
  opens its tab on 5056, but `serve.py` takes its port from the command line, so nothing answers there. On 5 Nov
  nothing held 5055 and the app still chose 5056, so open http://127.0.0.1:5055 by hand after starting it.
- The Firebase CLI login expired on 4 Nov and again on 5 Nov (before the Title 10 deploy); each time Tom ran
  `firebase login --reauth` and the deploy went through. Expect it before most deploys.

## Next steps
- **Veterans Day (first section):** Tuesday 10 Nov re-checks, rebuild and deploy; Wednesday 11 Nov report watch.
- **From 8 Nov (Vis sections):** Tom adds `vis` to the `DISPATCH_TOKEN` token's repository access (Vis's 20:25
  UTC start on 8 Nov didn't happen while Elements, Cordon and COP did); then confirm a dispatched Vis run at 08:25 or
  20:25 UTC (`gh run list -R metacog-osint/vis --event workflow_dispatch`). Check PropertyCast's home page for
  `TicNav = { version: "1.5"` after its 9 Nov publish (about 4:30 AM). Done: the stray kit commit, Listening Post's
  Done button, the kit CRLF test.
- **From 7 Nov:** the deploys are done (8 Nov rollout). Next time the hub's footer date changes, change `sitemap.xml`
  with it (a test checks they match).
0. **Done 6 Nov 2026:** Vigil's crons are one trigger (section above). Optional, Tom's call: give `tic-dispatch` a
   cron of its own so it no longer depends on PropertyCast's trigger (a free slot now exists).
1. **PropertyCast to v1.4:** check its home page's HTML for `TicNav = { version: "1.4"` after the daily publish at
   about 4:23 AM CST, 7 Nov. (v1.3 was done everywhere by 10:11 AM CST, 6 Nov, PropertyCast included.)
2. **Next Elements text update (v1.5)** when more lanes go live. Count publishers in the live `data/feed.geojson`
   first, then get Tom's OK on the wording.
   - Still planned: more of the world's weather (the assessment's next CAP countries are Canada (ECCC Datamart), then
     Japan (JMA)) and, on the drawing, the radiation lane.
   - Roll out the way v1.4 went (commits above). Noisefloor needs `tools/build_site.py` and the private term list at commit;
     Title 10 needs a `sw.js` bump and a clean worktree; Context needs `.vercel/project.json` copied into its
     worktree; Listening Post has no git, so back up first; Vigil goes as a PR if a Vigil session is working there.
3. Retake product screenshots when products change; keep the Elements and Cordon lines current as their planned
   pieces arrive (count `properties.sources[].publisher`).
4. **Before the hub links Blackout, Wake, Orbit or Headwind:** they need live collectors, or their seed data labelled
   as test. Today they show invented numbers as observed data.
5. Parked (don't raise): Context vs Watchfloor; Watchfloor's noindex; copyright registration or ™.

## Vigil: public daily summary feed session
Full notes, with the real response, the counting rules and the measurements behind them:
`~\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\side-session-notes\local_c4454dcd-fad6-40da-a7eb-4249d50abf51\vigil-summary-endpoint.md`.

**Where it stands (4 Nov, 11:05 PM CST)**
- `GET https://vigil.theintelligence.company/api/summary` is live. First built in Vigil PR #83 (merged 31 Oct as
  `c4c55d3`). The code is `api/summary.js` and `api/_lib/publicSummary.js`, with 36 tests in
  `src/lib/__tests__/publicSummary.test.js`. It reads as anon from `sync_log`, `incidents_commercial` and
  `threat_actors_commercial`, never the service role. No migration or grant change in either PR (anon can already
  read `sync_log.metadata`).
- **Vigil PR #86** (https://github.com/metacog-osint/vigil/pull/86), merged 4 Nov 10:56 PM CST as `224b358` with
  Tom's yes; live on Vercel by 10:57 PM CST, `method: "vigil-summary-2"`:
  - **`data_as_of`**: the latest successful RansomLook run. The hub's Vigil row now uses it (hub `4b26bf5`).
  - **Overlap rule:** a gap over 12 h between successful runs no longer rules a day out when the run closing it has
    a numeric `metadata.result.skipped > 0` (its 100-post fetch reached claims already stored). Only the closing
    run's skip count counts; `true`, a reason string or no count proves nothing. The worker's dedupe matches stored
    claims from any source, so the proof is firmest when the gap was Vigil's own, as on 3–4 Nov; after a
    RansomLook-only outage, ransomware.live rows stored meanwhile could also be skipped.
  - Result, checked live at 10:57 PM CST: the endpoint moved from 2 Nov to **4 Nov**: 74 claims, 19 groups, soul 25
    (direct SQL as anon agrees: 4 Nov 74 claims and 19 groups, 3 Nov 27 and 13). `data_as_of` 04:15 UTC (10:15 PM CST).
  - Tests: 36/36 in the summary file, including a replay of the real 3–4 Nov runs. Full suite: 1,362 passed, 3 todo,
    1 failed (below, unrelated). CI lint-and-test, build and CodeQL passed. Lint: 0 errors, 288 warnings (cap
    325), none in the changed files.
- The worktree `D:\Projects\Vigil-summary-data-as-of` was removed after the merge. The shared `D:\Projects\Vigil` tree
  was not touched; it is 2 commits behind `main` and holds someone else's uncommitted edits (`api/feed.js`,
  `api/_lib/doctrineFeed.js`, `docs/SESSION_HANDOFF.md`, `doctrine/kit/KIT.json`).

**Decisions waiting on Tom**
1. **Delete the merged branches:** covered by the branch wrap-up at the top of this file.

**Follow-ups noted, not started**
- **Fixed, checked 5 Nov 9:55 PM CST:** Vigil's e2e tests and the `useFilters` clock test. Both were fixed by Vigil
  PR #87 (`5e7e500`, 10:11 AM CST, 5 Nov), whose specs now find Vigil's own menu rather than the house bar and whose
  `useFilters` test pins the clock. CI on `main` has passed on every run since then, the v1.3 push included. e2e had failed on `main` from
  `6afc178` (1 Nov) through `224b358` (PR #86).
- **Vigil's "Feed health" workflow passed at 5:56 PM CST, 5 Nov**, its first success since 3 Nov 01:26 UTC (it failed
  on all five runs between). The cause of the failures and of the recovery was not checked.
- The `cisa-advisories` 403: not rechecked.
- `/api/feed` counts claims with `claims.length` from a `limit=300` query, and similar caps exist for KEV and
  disclosures. Today's counts are correct, but past the cap they would stop rising and give no warning.
- COP's test fixture `D:\Projects\cop\tests\fixtures\vigil.geojson` is stale.
