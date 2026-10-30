# The Intelligence Company hub - Claude Context

The company's home page (to serve `theintelligence.company`) and the canonical home of code shared by every
Intelligence Company site. Started 27 Oct 2026 at Tom's request after a review of all his projects.

## Family (decided with Tom, 27 Oct 2026)
- Two houses. **The Intelligence Company** (`theintelligence.company`): analysis, warning and professional tools.
  **Oddly Specific Studio** (`oddlyspecific.studio`): games and family apps (Whiteout, Mole Hunt, Tres Casas,
  Mission Control).
- Intelligence Company products: Watchfloor (beta; CONTEXT's rebuild, `[local path]`), Noisefloor
  (one word since 27 Oct; `[local path]`), Vigil, CONTEXT (`[local path]`), PropertyCast
  (stays here for now), Title 10 Field Guide (`activation.`), Listening Post (invite-only job-search app; listed on the hub
  as "Invite only" since 27 Oct).
- Names for new intel products come from the vocabulary of watching and listening.
- Each product keeps its own colours. Every site carries the house layer: the footer pattern (who, updated date,
  source code and licence if public, terms, data credits, Sources page), the same About structure (what it is,
  method, limits, sources), and the shared time settings.
- Folders from other work belong to neither house.
- Licences: products that may earn money stay on public GitHub under GNU AGPL-3.0 (Vigil, `4b6bc35`; Noisefloor,
  `cf0aa94`; Tom, 27 Oct 2026). Title 10, PropertyCast and Watchfloor have no licence file yet; ask Tom before
  adding one.

## Shared code
- `site/shared/tic-time.js` + `tic-time.css` (v1.2; v1.2 fixed a first visit saving zone=undefined, which opened
  the dialog on "Other"): time display. Copies: Watchfloor `web/`, Title 10 `deploy/public/`, Noisefloor
  `site_src/`, PropertyCast `src/wx/static/`, CONTEXT `public/`, Vigil `public/`, Listening Post `web/public/`. House rule: store UTC; show the viewer's own
  zone by default, always naming it; a settings menu for zone (automatic, Zulu/UTC, major zones, any IANA zone) and
  12/24-hour clock. On `*.theintelligence.company` the choice is kept in a domain-wide cookie so it follows the
  visitor across sites. Copy the files into each site and keep the version line; the hub also serves them at
  `/shared/` (CORS open) once the domain is live.

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
  Indexing of `https://theintelligence.company/` was requested the same day (Google's first crawl had seen the old
  noindex tag).
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
  lists the two origins. A feed that fails leaves the static line. PropertyCast has no JSON feed yet.
- Product screenshots in `site/img/` (WebP, 2x, captions dated): retake with headless Edge when a product changes.
- Local preview: `firebase serve --only hosting:hub --port 5055 --project context-484804` (it does not apply the
  `firebase.json` headers, so check the CSP on the live site after a deploy).
- The About bio: "an intelligence professional with 25 years in the Air National Guard, an OSINT and
  space-domain-awareness analyst, and a former USAF weather forecaster" (Tom, 30 Oct 2026). Never "25-year ..." before
  a noun: readers took it as his age. A headshot slot can be added when Tom sends one.
- **Location on every public page: "Fargo-Moorhead"**, never "Moorhead, Minnesota" (the LLC is registered in Fargo;
  Tom, 30 Oct 2026). PropertyCast's forecast point is the Moorhead yard itself, which stays as it is.
- Times: store UTC; display per the shared module. Messages to Tom use Central time.
