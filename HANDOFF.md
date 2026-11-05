# Hub handoff: where things stand (5 Nov 2026, about 1:10 PM CST: house bar v1.2 rolled out)

Read with `CLAUDE.md` (the project's notes). Times are Central (CST since 1 Nov). Each commit, push and deploy needs
Tom's yes.

## Live and finished
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
    Two dispatched runs failed that way. A retry was scheduled for about 1:25 PM CST; if Pages is still stuck, the next
    `update.yml` run deploys it (the gate allows it, since the last deploy was 16:42 UTC).
  - PropertyCast: `3473dbc`, live with its next daily publish (about 4:23 AM CST).
  - Vigil: PR #90 (https://github.com/metacog-osint/vigil/pull/90), a pull request because a Vigil session was working
    there. All nine checks passed, including e2e in Chromium, Firefox and WebKit, which had been failing on `main`
    since 1 Nov. Merged with Tom's yes as `c83229b` at 1:05 PM CST; Vercel deploys on merge.
- **Global weather for Elements** is its own session ("Elements: global weather sources", started 5 Nov). It is
  assessing global sources and licences before building. When a lane goes live, update both Elements lines and roll
  the bar again.
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
- A local preview config is at `.claude/launch.json` (untracked; runs `tools/serve.py 5055`). An older `serve.py`
  from 2:53 PM CST on 4 Nov (PIDs 30668/31228) was still listening on 5055 at 11 PM. The app's preview then
  opens its tab on 5056, but `serve.py` takes its port from the command line, so nothing answers there. On 5 Nov
  nothing held 5055 and the app still chose 5056, so open http://127.0.0.1:5055 by hand after starting it.
- The Firebase CLI login expired on 4 Nov and again on 5 Nov (before the Title 10 deploy); each time Tom ran
  `firebase login --reauth` and the deploy went through. Expect it before most deploys.

## Next steps
1. **Confirm v1.2 is live on Elements** (`https://elements.theintelligence.company/tic-nav.js`, `version: "1.2"`; see
   the GitHub Pages problem above) **and on PropertyCast** after its daily publish (about 4:23 AM CST, 6 Nov).
2. **When Elements' EMSC earthquake and NIFC wildfire lanes go live** (built 4 Nov, not yet committed), add them to
   both Elements lines (EMSC is worldwide; NIFC wildfires are US only) and roll the bar again (v1.3).
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
1. **Delete the merged branches** `feat/public-summary`, `fix/feed-summary-counts` and `fix/summary-data-as-of`,
   locally and on GitHub (optional).

**Follow-ups noted, not started**
- **Vigil's e2e tests failed in all three browsers on the last CI run on `main`** (1 Nov, `6afc178`, the house-bar
  commit). PR #86 was merged once lint-and-test and CodeQL passed, per Tom's condition; its e2e runs were still
  going at merge time.
- **`useFilters.test.jsx` "should set days and update range"** reads the real clock: in US Central time a 7-day span
  that crosses the 1 Nov fall-back hour measures 8 days, so it fails locally this week (passes with `TZ=UTC`, as in
  CI). Fix by faking the time in the test.
- **Vigil's "Feed health" workflow has failed on every run since 3 Nov 14:51 UTC** (last success 3 Nov 01:26 UTC);
  likely the `cisa-advisories` 403 and the daily `ofac-sdn` reading late. Not investigated.
- The `cisa-advisories` 403 itself.
- `/api/feed` counts claims with `claims.length` from a `limit=300` query, and similar caps exist for KEV and
  disclosures. Today's counts are correct, but past the cap they would stop rising and give no warning.
- COP's test fixture `D:\Projects\cop\tests\fixtures\vigil.geojson` is stale.
