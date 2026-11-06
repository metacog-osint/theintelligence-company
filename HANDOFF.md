# Hub handoff: where things stand (5 Nov 2026, 10:45 PM CST: dispatch Worker live)

Read with `CLAUDE.md` (the project's notes). Times are Central (CST since 1 Nov). Each commit, push and deploy needs
Tom's yes.

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
0. **Merge Vigil's four crons into one** (Tom, 5 Nov 2026): `15 * * * *`, `0 */6 * * *`, `0 3 * * *` and
   `0 4 * * SUN` in `Vigil/workers/wrangler.toml` become one trigger (for example `0,15 * * * *`), with `scheduled()`
   choosing the job from the time. That frees three of the free plan's five cron triggers. Do it in a Vigil session,
   as a PR; the ingestion Worker is deployed by hand. Optional after that: cut Elements' and Cordon's own crons from
   four an hour to one, the fallback their notes planned once the dispatcher worked.
1. **Confirm v1.3 is live on PropertyCast** after its daily publish (about 4:23 AM CST, 6 Nov): the home page's
   HTML should hold `TicNav = { version: "1.3"`. It held v1.1 at 9:40 PM CST, 5 Nov, as expected.
2. **Next Elements text update (v1.4)** when more lanes go live. Count publishers in the live `data/feed.geojson`
   first, then get Tom's OK on the wording.
   - EMSC earthquakes (worldwide) and NIFC wildfires (US only): built 4 Nov, still uncommitted in
     `D:\Projects\elements` at 9:20 PM CST, 5 Nov, and not in the feed.
   - More weather: the assessment's next CAP countries are Canada (ECCC Datamart), then Japan (JMA).
   - Roll out the way v1.2 and v1.3 went. Noisefloor needs `tools/build_site.py` and the private term list at commit;
     Title 10 needs a `sw.js` bump and a clean worktree; Context needs `.vercel/project.json` copied into its
     worktree; Listening Post has no git, so back up first; Vigil goes as a PR if a Vigil session is working there.
   - `D:\Projects\vis\site\tic-nav.js` is still v1.1. Vis is in development and not one of the ten; bring it up to
     date when it launches.
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
