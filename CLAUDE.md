# The Intelligence Company hub - Claude Context

The company's home page (to serve `theintelligence.company`) and the canonical home of code shared by every
Intelligence Company site. Started 27 Oct 2026 at Tom's request after a review of all his projects.

## Family (decided with Tom, 27 Oct 2026)
- Two houses. **The Intelligence Company** (`theintelligence.company`): analysis, warning and professional tools.
  **Oddly Specific Studio** (`oddlyspecific.studio`): games and family apps (Whiteout, Mole Hunt, Tres Casas,
  Mission Control).
- Intelligence Company products: Watchfloor (beta; CONTEXT's rebuild, `D:\Projects\more-context`), Noisefloor
  (one word since 27 Oct; `D:\Projects\noise-floor`), Vigil, CONTEXT (`D:\Projects\geo-context`), PropertyCast
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
- Hidden from search engines (meta, X-Robots-Tag, robots.txt) until Tom approves going public. Tom, 27 Oct: stay
  hidden until `theintelligence.company` points at the hub.
- Contact shown on the hub: support@theintelligence.company (Tom, 27 Oct). The About names Tom only (his choice).
- Apex domain: `theintelligence.company` and `www.` (redirects to the apex) are Firebase custom domains on the
  theintelligencecompany site since 28 Oct 2026. Squarespace DNS holds `A @ 199.36.158.100`,
  `TXT @ hosting-site=theintelligencecompany` and `CNAME www → theintelligencecompany.web.app`; the Google Workspace
  MX/SPF/DKIM/DMARC records are untouched. Claude set it up at Tom's request; method in
  `D:\Projects\CLAUDE_HANDOVER.md` §3.11. The hub still links to `watchfloor.web.app`.
- Times: store UTC; display per the shared module. Messages to Tom use Central time.
