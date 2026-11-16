# Hub handoff: where things stand (15 Nov 2026, about 12:30 PM CST)

Read with `CLAUDE.md` (the project's notes). Times are Central (CST since 1 Nov). Each commit, push and deploy needs
approved. Every finished dated section up to 13 Nov 2026 (Veterans Day planner, house bar v1.3 to v1.9, Vis,
tests, dispatch, the Vigil summary feed) is in `HISTORY.md`, moved verbatim on 14 Nov 2026. What each program is
and how the house bar rolls out are in `CLAUDE.md`.

## Shared modules in the hub, and the move onto the new history (16 Nov 2026, about 8:20-8:40 AM CST)
- **Main checkout moved onto the rewritten history:** `master` in `[local path]` was old
  `f8d6390` (mapped to `0a8fc7f`, `swap\rewrite\maps\theintelligence-company-commit-map.tsv`). The uncommitted
  `CLAUDE.md` and `HANDOFF.md` notes were stashed, `master` reset to `origin/master` `df037c2` (Relief listed, house bar
  v2.1, by another session), and the notes re-applied cleanly. `vetrules.clean_notes()` changes nothing in either
  file. The pre-move diff is in `.claude/hub-notes-uncommitted-2026-11-16.patch`. Nothing committed.
- **Canonical copies in `site/shared/`** (uncommitted): `tic-related.js`/`.css` v1.0 from Blackout `bcdb010` and
  `tic-tabs.js`/`.css` v1.0 from Cordon `f17f551`, copied with `git show`, LF, byte-identical to those blobs.
- **Tests** (uncommitted): `tests/related.test.js` (pick rules in Node on a fixture index: decode, own program,
  other countries, stale, expired, individuals, order, the 48-hour rule, the two-day rule for day precision, month
  never; in headless Edge: the card, one per program, labels, links, one read without cookies, a redraw from the same
  read, nothing there, a failed read stays hidden, no read until the card nears the screen at 1440 and 375 px; axe
  light and dark) and `tests/tabs.test.js` (the row under the house bar, desktop, phone one at a time with
  `tic-tabs:show`, deep link `#health-h`, keyboard, resize, no script; axe light and dark from the top), with
  `tests/lib/modpage.js` (a stand-in program page under a strict CSP with the house bar) and the new files in
  `site.test.js`'s inline-code, CSS-reference and version-line checks. 14 and 11 pass on Edge, and the full suite 259 of 259 (`--test-concurrency=2`); a mutation run
  (the read made eager, phone groups never hidden) failed the lazy, phone and deep-link tests as it should.
  "Shared code" lines added to `CLAUDE.md`, rows to `tests/README.md`.
- **PropertyCast** went live with house bar v2.0 at its 16 Nov publish (`tic-nav.js v2.0`, `data-health="on"` in its
  home page HTML; checked about 8:30 AM CST). The `_worktrees/*-nav113` and `*-nav20` worktrees (30, all clean;
  Noisefloor's v1.13 differed in line endings only) were removed; their local branches `tic-nav-v1.13` and
  `tic-nav-v2.0` were left in each repo (old history in COP, Cordon, Elements, Undertow, Launch, Headwind and Wake:
  never push them).
- **Held commits checked against the current origins** (about 8:35 AM CST): COP `b666619` (1 ahead, 3 behind), Cordon
  `f17f551` (1 ahead, 35 behind), Blackout `17a199c`/`8ef0e2e`/`bcdb010` (3 ahead, 0 behind), Noisefloor `aa75019` and
  Watchfloor `9863836` (1 ahead, 2 behind each); every base is on the new history. Rebase each before its push.

## Sections row, tic-tabs.js v1.0 (16 Nov 2026, about 1:00 AM CST; built on Cordon, committed `f17f551`, not pushed)
- The light-page layout from the design review ("C · Shell"), first part: `tic-tabs.js` and `tic-tabs.css` in Cordon's
  worktree `[local path]` (branch `layout/tabs`, from the rewritten `origin/main`). Wrap the
  sections below the map in `<div data-tic-tabs>`, each group `<div id data-tab-label>`; a sticky "Sections on this
  page" row under the house bar; one group at a time at 760 px or less, every group with a jumping row wider. Rules in
  the module's header. Cordon also folds long tables on phones ("Show all N"). Cordon's phone page: 35,573 px with
  every card before, longest group now 8,506 px (Travel). Details and checks in Cordon's `CLAUDE.md`.
- Tom approved the look and wording; committed on his yes as Cordon `f17f551` (LF blobs), one ahead of `origin/main`.
- Still to do: push when the hold lifts, the canonical
  copy in the hub's `site/shared/` with tests, then the header row (layer chip in the drawing's colour, one "today's
  reading" line, stat tiles) and the other light sites, each in its own worktree.

## "Elsewhere today", tic-related.js v1.0 (15 Nov 2026, committed 10:48 PM CST; built on Blackout, not pushed)
- Blackout commit `17a199c` on branch `related/elsewhere-today`, worktree `[local path]`
  (on Blackout's `main` `8b4242f`), committed on Tom's yes, **not pushed** (push hold; pushing Blackout's `main`
  deploys it). Files: `site_src/tic-related.js` and `.css`, a hidden `#tic-related` card after "Now" on the
  Overview, `renderRelated()` in `app.js`, test lines in `tests/test_blackout.py`, a note in Blackout's `CLAUDE.md`.
- What it does: reads COP's agent index (`/data/agent/index.json`, columnar, labels coded as numbers in `codes`;
  about 100 KB brotli) once the card nears the screen, without cookies; other programs' items in the page's
  countries, not stale, not past `valid_until`, from the last 48 hours (day precision: today or yesterday UTC;
  month precision never), `us_person_data` "individuals" left out; unusual first, then the page's country order,
  then newest; three at most, one per program first; "N more on COP". Labels: Unusual (with the baseline note),
  Forecast, "<Program>'s judgment", As claimed. Hidden until the read succeeds. API `TicRelated.render(el, {countries,
  here, names, level, eager})` or `data-tic-related data-countries data-here`. The module's header has the rules.
- Checked on a copy of Blackout's live data under its real CSP (scratchpad preview "bo-related"): 1280 px light
  (lowest contrast 6.09:1), 390 px dark (7.27:1), no sideways scroll, no console errors. The lazy read was not seen
  firing: the Browser pane was hidden, and a hidden page never reports intersection, so the test used `eager`.
- **Lazy read fixed** (15 Nov 2026, about 11:15 PM CST): headless Edge on the same preview showed the
  read fired at load, every visit: while the card is hidden `whenNear` watched its parent, Blackout's whole Overview.
  It now watches an empty `span.tic-rel-near` placed just before the card (no height in block flow; removed once the
  read starts); a later `render` cancels an earlier wait. Checked headless (scratchpad `lazy_check.js`): no read at
  load, one read without cookies once the card's spot is within 400 px of the screen (1280 px light and 390 px dark),
  no console errors, no sideways scroll. Tom approved the card's look and wording from the screenshots and the fix
  was committed on his yes: Blackout `8ef0e2e` on `related/elsewhere-today` (LF in the blob), now three ahead
  of `origin/main` (`17a199c`, `8ef0e2e`, `bcdb010`), not pushed. Copy the hub's canonical file from `bcdb010`. Hub tests should cover it
  (the card well below the fold: no read until scrolled).
- **Day-stamped items show a clock time:** Watchfloor's zone items and Noisefloor's event and spoofing items cover a
  whole UTC day but carry `data_as_of` 23:59:59Z with no `data_as_of_precision`, so the card prints "Nov 14,
  5:59 PM CST". The fix belongs in those programs' feeds (`data_as_of_precision: "day"`, kit 0.5.6). **Tom, 15 Nov
  2026 about 11:30 PM CST: "count back two UTC days"**: a day-only item now counts if dated today or either of the
  two UTC days before (each still overlaps the last 48 hours), so Noisefloor's day, posted the next morning, shows.
  Committed on Tom's yes as Blackout `bcdb010` (`recent()` and the header), not pushed; checked on fixture
  rows through `_pick` (scratchpad `day_rule_check.js`: today, -1 and -2 days in; -3 days, tomorrow and month-only
  out; timed items keep the 48-hour cut). It changes nothing live until Watchfloor and Noisefloor mark their days.
- Still to do: the canonical copy in the hub's `site/shared/` (after the history rewrite), hub tests for it (pick
  rules on a fixture index, axe light and dark, the CSP list), a line in `CLAUDE.md` "Shared code", Tom's look at the
  card and its wording, the push, then other sites one at a time.

## House bar v2.0 (15 Nov 2026 night; on master; live on the hub and 15 program sites 15-16 Nov 2026)
- `tic-nav.js` and `tic-nav.css` v2.0: Programs grouped by layer in the drawing's order, freshness dots from COP's
  health check (opt-in per site with `data-health="on"` once its CSP allows COP; COP and the hub get them anyway),
  "See it on COP" at the panel's foot, and COP's convergence line. Rules and tests in `CLAUDE.md` (house bar, v2.0).
- **Hub deployed** about 9:50 PM CST 15 Nov from the main checkout, HEAD asserted `f8d6390`, after 234 of 234 tests
  passed on Edge (`--test-concurrency=2`). Live: v2.0, 13 dots, "See every layer together on COP", no console errors.
- **Rollout** (Tom's yes: push all 16, then the four hand deploys; about 10:00-10:30 PM CST): worktrees
  `_worktrees/<site>-nav20`, branch `tic-nav-v2.0`, one commit each, rebased on the latest main, one ahead, pushed by
  sha: COP `16bfeac`, Watchfloor (more-context) `e17a4c5`, Context (geo-context, `master`) `8b32e7a`, Title 10
  `1bbd053` (`sw.js` `t10-2026-11-16a`), Noisefloor `161ed93` (with `build_site.py`'s `?v=` hashes, and Methods'
  Time-button sentence removed: the "Your clock" line), PropertyCast `9538e67`, Vigil `ed9537a`, Elements `55da484`,
  Cordon `984e529`, Vis `dc8ad18`, Blackout `8b4242f` (its CSP test now expects COP and `data-health`), Headwind
  `07170b0`, Orbit `ac1cc3d`, Launch `72bd285`, Undertow `2d11178`, Wake `c95cd14`. COP's `main` was force-rewritten
  by the "Tom's launch map" scrub during the rollout (`62b0f1b` became `05067f2`); the commit was moved onto the new
  history with `rebase --onto` before pushing, and no old-history commit went up. Listening Post (no git): v1.13 backed
  up in `_backups/tic-nav-v1.13-2026-11-15/`. Deployed by hand: Watchfloor, Title 10, Context (first
  `vercel deploy` errored, the retry was READY) and Listening Post. Files were copied from the blob at `f8d6390`
  (the hub's working copy has CRLF endings).
- **Checked live about 10:40 PM CST:** `/tic-nav.js` v2.0, 13 dots and COP's note with the menu open on the hub, COP,
  Watchfloor, Context, Title 10, Noisefloor, Vigil, Elements, Cordon, Vis, Blackout, Headwind, Orbit, Launch, Undertow
  and Listening Post; COP in `connect-src` on every site that sets a CSP; no CSP errors.
- **Wake deployed by hand** about 10:55 PM CST (Tom: pushes are on hold, a deploy may go ahead): `npx --yes
  wrangler@4.151.3 pages deploy site --project-name wake --branch main` from `_worktrees/wake-nav20` at `c95cd14`.
  Its built `site/data/` is not in git, and the live `feed.geojson` was newer than any local copy, so the three live
  data files (`snapshot.json`, `feed.geojson`, `ended.geojson`; the other `/data/` paths answer with the page) were
  downloaded and deployed unchanged; checked byte-identical afterwards. Live: v2.0, 13 dots, COP in `connect-src`.
- **Not live yet:** PropertyCast (its next daily publish, about 4:20 AM CST 16 Nov; its page still shows v1.10, so
  check the home page HTML). Then remove the `*-nav113` and `*-nav20` worktrees.
- **Push hold** (Tom, about 10:50 PM CST 15 Nov: "there's a hold on pushes at the moment"): these notes are
  uncommitted in the main checkout; commit and push them when the hold lifts.
- **History rewrite under way** (message from the "Hub work continuation and overnight checks" session, about
  11:00 PM CST 15 Nov): tic-doctrine, cop, cordon, elements, undertow, verdict, launch and this hub are being
  rewritten and force-pushed. The v2.0 shas above for COP, Cordon, Elements, Undertow and Launch will change. Never
  pull or merge origin into an old branch afterwards: rebase with the commit map that session sends. These notes
  get rebased that way before they are committed.

## Hub finished and merged (15 Nov 2026 evening; deployed about 8:20 PM CST)
- Deployed from the main checkout at 94c3db0 after 221 of 221 tests passed (Tom's yes). On master after Tom's yes, from `design/hub-preview` (fa74742, 40aef94, afab8b9 and this note). The branch was
  first rebased off the old history onto the scrubbed master (old base 25d99d3 = new 03580e6), so no old commit
  went back to GitHub; the old copy is local only, `backup/hub-preview-oldbase`. The main checkout was moved to
  the new history the same evening. Deploy needs its own yes: `firebase deploy --only hosting:hub --project
  context-484804` from the main checkout, HEAD asserted.
- Still on the old history: the hub-colorado-springs, hub-denver, hub-fort-meade, hub-reno-sparks, hub-wake and
  hub-ground-roti worktrees and `[local path]` (swap plan step 9).
- Tom approved the wording (top line with Influence and Outages, the lede naming COP's role, COP's convergence line,
  "Every layer, one picture.") and asked that COP not be described as checking the programs and that the
  time-zone selling line go. Built in the worktree: sticky "How it works" steps lighting the drawing, the three
  folds, the Verdict tile (connect-src gains `https://metacog-osint.github.io`), footer date and `sitemap.xml`
  15 Nov 2026, 404 product list in step, rules in `CLAUDE.md` ("Hub design"), new tests. Phone page 8,231 px.
- The old COP line and Noisefloor's "Your clock" line went with house bar v2.0 (above).

## Design review and hub preview (15 Nov 2026, about 4:00 PM CST)
- **Review** (Tom: "review ... layout, flow, connectivity, and user experience in all sites", with ideas from the
  Squarespace homepage): published as a private page, https://claude.ai/artifact/HbqH9AaUvGSWiu1JXfW2V4. Source,
  screenshots and the Playwright measuring scripts: `[local path]`
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
  worktree `[local path]`, one commit on GitHub's `master` `25d99d3`. **Not pushed, merged
  or deployed.** 213 of 213 tests passed on Edge (`BROWSER_CHANNEL=msedge npm test`; the worktree's
  `tests/node_modules` is a junction to the main checkout's). Preview: the `hub-design` entry in
  `[local path]`, `tools/serve.py` on port 5058. What it changes:
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
   `[local path]` (branch `veterans-day`, merged, 19 uncommitted files; never deploy from it), and the merged
   local branch `vetday-co-chains`. Added 14 Nov evening, both clean and merged: `_worktrees/pc-trigger-own-clock`
   (PropertyCast, branch `trigger-own-clock`) and `_worktrees/watchfloor-contrast` (Watchfloor, branch `contrast-fix`), and `_worktrees/vis-gate` (Vis, branch
   `gate-fix`). Also left from the v1.10 rollout, all clean: the eleven `_worktrees/*-nav110` (branch
   `tic-nav-v1.10`). The v1.12 rollout's own worktrees (`*-nav112`, `hub-nav-v112`, branch `tic-nav-v1.12` or
   `nav-v1.12`) were removed after its pushes.
