# The Intelligence Company hub - History

Dated history and superseded details moved verbatim out of `CLAUDE.md` on 6 Nov 2026 so the auto-loaded file
stays short. Nothing here loads automatically. `CLAUDE.md` is the current reference; where the two disagree,
`CLAUDE.md` is current. Headings say which section each passage came from.

## From "Shared code" (the whole section as it stood on 6 Nov 2026)

## Shared code
- `site/shared/tic-time.js` + `tic-time.css` (v1.3; v1.3, 31 Oct 2026, makes the `year` option give a full date in the
  house style, "31 Oct 2026", in every zone and clock, Zulu included (it used to be ignored in Zulu), and `renderAll`
  reads `data-tic-year`; v1.2 fixed a first visit saving zone=undefined, which opened the dialog on "Other"): time
  display. Every copy is v1.3 on its repo's main branch (checked 5 Nov 2026; some local trees lag). Copies: Watchfloor `web/`, Title 10 `deploy/public/`, Noisefloor
  `site_src/`, PropertyCast `src/wx/static/`, CONTEXT `public/`, Vigil `public/`, Listening Post `web/public/`. House rule: store UTC; show the viewer's own
  zone by default, always naming it; a settings menu for zone (automatic, Zulu/UTC, major zones, any IANA zone) and
  12/24-hour clock. On `*.theintelligence.company` the choice is kept in a domain-wide cookie so it follows the
  visitor across sites. Copy the files into each site and keep the version line; the hub also serves them at
  `/shared/` (CORS open) once the domain is live.
  Tom, 1 Nov 2026: roll v1.3 out to every program site (with tic-nav below), which a separate rollout session does
  site by site. COP, Elements and Cordon also carry copies.
- `site/shared/tic-nav.js` + `tic-nav.css` (v1.1, 1 Nov 2026; v1.1 raises the bar's z-index to 10000 so its menu
  covers headers with their own stacking, such as Noisefloor's z-index 1100, and resets `display`, margins, padding and
  borders on the bar so a site's generic `nav` rules can't reshape it, such as Watchfloor's flex `nav`). **v1.2** (5 Nov
  2026, hub `0d92a8b`; `tic-nav.css` stays v1.1) changes only Elements' `long` text: worldwide, regional and "US only
  for now" sources, and "Global weather is planned". It went to all ten sites the same day (commits in `HANDOFF.md`).
  **v1.3** (5 Nov 2026, hub `3afcdf9`; Tom approved the wording) moves weather warnings to "Regional: … for the US and
  Europe" now that MeteoAlarm is live on Elements, and says "Weather for more of the world is planned"; `oe.js` names
  NOAA and MeteoAlarm (38 European countries and Israel). Rolled out to all ten sites that evening; PropertyCast
  builds the bar into its page at its daily publish, so check its home page's HTML, not `/tic-nav.js`.
  **v1.4** (6 Nov 2026, hub `58a54ea`; Tom approved the wording) adds EMSC under Worldwide earthquakes (impact alerts
  stay with USGS) and wildfire incidents (NIFC) under "US only for now", after Elements `8f6cfb4` put both lanes live.
  Rolled out to all ten sites that morning (commits in `HANDOFF.md`); PropertyCast with its 7 Nov publish.
  **v1.5** (8 Nov 2026) adds Vis (rollout in `HANDOFF.md`, "Vis live across the suite"). **v1.6** (13 Nov 2026
  UTC, hub `41b4a7f`; Tom approved the wording: "Approve, deploy all", then "Yes to all") adds Blackout after
  Vigil, label "Cyberspace · internet outages" (the draft's "Cyber" changed to match the drawing's layer and
  Vigil's label). Rolled out to all ten sites and Listening Post the night of 12 Nov CST (commits in `HANDOFF.md`);
  PropertyCast with its 13 Nov publish. Blackout's own page gets the files from its own session.
  **Rolled out
  (1 Nov 2026 UTC):** Title 10 (e7286a4, v1.0; v1.1 since 5 Nov 2026, 49a49c5, deployed from a clean worktree because
  its main folder holds an untracked `deploy/public/data/benefits-pack.json` that must not ship),
  Watchfloor (478fc95), Noisefloor (319242c; its pre-commit hook needs the private term list, so commit from a
  worktree with `FORBIDDEN_TERMS="$(cat <main>/private/forbidden_terms.txt)"`; after copying, run
  `python tools/build_site.py` so the `site/` pages carry the new file's `?v=` hash, or CI fails and the deploy is skipped), PropertyCast (57b22f1, goes live with
  the next daily publish), Context (b86602f; deploys only with `npx vercel --prod`, so copy `.vercel/project.json` into
  the worktree; new `/sources` page), Vigil (6afc178; Vercel deploys on push to main), Listening Post (which
  has **no git**: back up files before editing; new public `/sources.html`; `firebase deploy --only hosting`).
  COP (d447aaf; COP is a fixed full-screen layout, so `cop.css` pins the bar and moves `.bar` and `.app` down 34px,
  under `body:has(> .tic-house)`), Elements (22a67c1) and Cordon (33cd380; both copy `site_src/` to `site/` at build
  and deploy to GitHub Pages on push). **All ten program sites done, 1 Nov 2026.** When a program is added or
  renamed, update `PROGRAMS` in `tic-nav.js` and copy it to every site. Method: a git worktree per repo, test locally, Tom's yes, push to main, deploy the
  repo's own way. **Stop local preview servers with Stop-Process on their node or esbuild PIDs:** stopping the task
  only kills the shell, and the leftover processes lock the worktree folder. **The house bar** on every program site
  (Tom: "I need a
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

## From "Site": Google Search Console

  Indexing of `https://theintelligence.company/` was requested the same day (Google's first crawl had seen the old
  noindex tag).

## From "Site": a second local-preview line (the other one, kept, says the same)

- Local preview with the live headers: `python tools/serve.py 5055` serves `site/` with every `firebase.json` header,
  CSP included (`firebase serve` skips them).

## From "Site", "Seven improvements": Hero top line

  - **Hero top line:** "Conflict · GPS interference · Cyber threats · Forecasting" since 31 Oct 2026 (first
    "Warning · Spectrum · Cyber · Forecasting"; it used to repeat the headline). Keep it to one line at 1280 px.

## From "Site": Phone layout fix

- Phone layout fix (31 Oct 2026): the `max-width: 560px` rule set `.wrap { padding: 0 16px }`, which also zeroed the
  top and bottom padding of every block that is also `.wrap` (top bar, masthead, contact, footer). It now sets the
  sides only.

## From "Site", "Second batch": Vigil feature block (the first image)

  - **Vigil feature block** (first shot `img/vigil.webp`, the signed-out landing page, replaced on 31 Oct 2026 by the signed-in `vigil-actors.webp`; see Product screenshots). The first was captured with headless Edge at
    1280×800 and `--force-device-scale-factor=2`, then cropped to box (0, 115, 1500, 1485) with Pillow. The crop
    deliberately leaves out "Recent Incidents": **don't put leak-site victim names on the hub.** The three points are
    from Vigil's README. Vigil's other pages need an account.

## From "Site", "Second batch": Vigil "Latest" line (with its PR history)

  - **Vigil "Latest" line** from `https://vigil.theintelligence.company/api/summary` (live since Vigil PR #83, merged
    31 Oct 2026 as `c4c55d3`). It returns
    `brief`, `day`, `data_as_of` and `built_at` with open CORS and an hour of CDN cache, or a 503 whenever Vigil can't
    stand behind a number, including a zero day. Then the hub keeps the static line. Rules from that session: insert
    `brief` as text only (group names come from criminal leak sites); `day` is RansomLook's calendar day, one to two
    hours ahead of UTC, so never label it UTC; credit RansomLook (CC BY 4.0) in the footer, which the hub does. Vigil's
    origin is in `connect-src`, and `setFresh("vigil", data_as_of || built_at)` drives "Updated … ago" in the product
    list. **Vigil PR #86** (merged 5 Nov 2026 UTC as `224b358`, `method: "vigil-summary-2"`) added `data_as_of` and lets a gap over 12 h between
    RansomLook runs count as complete when the run closing it skipped stored claims (`sync_log.metadata.result.skipped
    > 0`), which is how the 3–4 Nov outage closed.

## From "Site", "Second batch": Copyright notice (registration)

    `404.html`. Registration was discussed and not done: $45 single or $65 standard at copyright.gov (a rise to $55
    and $85 was proposed for about Nov 2026, unconfirmed). Only the human-authored parts are protectable, since the
    JP figure is public domain and AI-generated material must be disclaimed. Trademark fits names and logos, not the
    drawing.
