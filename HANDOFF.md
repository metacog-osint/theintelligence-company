# Hub handoff: where things stand (4 Nov 2026, 10:40 PM CST, from the "hub" session)

Read with `CLAUDE.md` (the project's notes). Times are Central (CST since 1 Nov). Each commit, push and deploy needs
Tom's yes.

## Live and finished
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
- The house bar (`site/shared/tic-nav.js` + `.css`, v1.1) is live on all ten program sites (Title 10 has v1.0).
  tic-time v1.3 is on every program repo's main branch (checked 5 Nov; the local PropertyCast and Context trees lag).
- A local preview config is at `.claude/launch.json` (untracked; runs `tools/serve.py 5055`).
- The Firebase CLI login expired on 4 Nov; Tom ran `firebase login --reauth` and the deploy went through.

## Next steps
1. **Vigil `data_as_of`** (Tom's answer still pending; see the Vigil section below). Then switch
   `setFresh("vigil", …)` in `site.js` from `built_at` to `data_as_of`, falling back to `built_at`, and deploy.
2. Copy tic-nav v1.1 to Title 10 (bump `sw.js` VERSION).
3. Retake product screenshots when products change; keep the Elements and Cordon lines current as their planned
   pieces arrive (count `properties.sources[].publisher`).
4. **Before the hub links Blackout, Wake, Orbit or Headwind:** they need live collectors, or their seed data labelled
   as test. Today they show invented numbers as observed data.
5. Parked (don't raise): Context vs Watchfloor; Watchfloor's noindex; copyright registration or ™.

## Vigil: public daily summary feed session
Full notes, with the real response, the counting rules and the measurements behind them:
`~\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\side-session-notes\local_c4454dcd-fad6-40da-a7eb-4249d50abf51\vigil-summary-endpoint.md`.

**Where it stands (4 Nov, ~3:30 PM CST)**
- `GET https://vigil.theintelligence.company/api/summary` is live. It came from Vigil PR #83, merged 31 Oct as
  `c4c55d3`; Vercel production deploy 7465383397 succeeded. The code is `api/summary.js` and
  `api/_lib/publicSummary.js`, with 30 tests in `src/lib/__tests__/publicSummary.test.js`. No migration or grant
  change was made: the endpoint reads as anon from `sync_log`, `incidents_commercial` and `threat_actors_commercial`,
  and never uses the service role.
- The hub's wiring is live: `site.js` reads `brief`, `day` and `built_at`; `connect-src` lists the Vigil origin; and
  the footer credits RansomLook (CC BY 4.0).
- After the 3–4 Nov outage (the database restarted 2:39 PM CST, 4 Nov), the endpoint returns 200 for **2 Nov**: 51
  claims, 15 groups, The Gentlemen 24.
  - No claims were lost. RansomLook's first run after the restore, at 3:15 PM CST, added 88 and skipped 12; 3 Nov
    now holds 27 claims and 4 Nov 68.
  - 9 of 10 feeds ran after the restore. `cisa-advisories` failed with HTTP 403 from CISA, and `ofac-sdn` shows late
    (it's daily). Not investigated.
- **Nothing of this session's is uncommitted.** It has no worktree open and no edits in the hub or Vigil. The only
  files left are scratch scripts in its temp scratchpad, which aren't needed.

**Decisions waiting on Tom**
1. **One Vigil PR with two `/api/summary` fixes** (asked 4 Nov, unanswered):
   - **Add `data_as_of`**, the time of the last successful RansomLook run. The hub's Vigil row reads "Updated just
     now", because `built_at` is when the summary was assembled; it should show when Vigil last took in data.
   - **Accept a gap over 12 h when the run closing it has `metadata.result.skipped > 0`.** Skipped rows mean the
     fetch overlapped claims already stored, so the day is complete. Today the 12-h rule excludes 3 and 4 Nov, and
     unchanged the hub shows 2 Nov until about **6:15 PM CST on 5 Nov**, when the problem clears on its own.
2. **Delete the merged branches** `feat/public-summary` and `fix/feed-summary-counts`, locally and on GitHub
   (optional).

**Next steps, in order (each push, merge and deploy needs its own yes)**
1. If Tom says yes to item 1:
   - Make a new Vigil worktree from `origin/main`. The shared `D:\Projects\Vigil` tree is behind `main`, so never
     stash, reset or switch branches there.
   - In the `sync_log` query, also select `metadata`.
   - Add `data_as_of` and the overlap rule, with tests.
   - Run `npx vitest run` and `npm run lint` (zero new warnings).
   - Commit, staging explicit paths.
   - PR, then merge (merging deploys Vigil).
2. Then the hub: switch `setFresh("vigil", …)` in `site.js` from `built_at` to `data_as_of`, falling back to
   `built_at`. Deploy the hub with its next batch.
3. Follow-ups noted, not started:
   - The `cisa-advisories` 403.
   - `/api/feed` counts claims with `claims.length` from a `limit=300` query, and similar caps exist for KEV and
     disclosures. Today's counts are correct, but past the cap they would stop rising and give no warning.
   - COP's test fixture `D:\Projects\cop\tests\fixtures\vigil.geojson` is stale.
