# The Intelligence Company hub - Claude Context

The company's home page (to serve `theintelligence.company`) and the canonical home of code shared by every
Intelligence Company site. Started 27 Oct 2026 at Tom's request after a review of all his projects.

## Family (decided with Tom, 27 Oct 2026)
- Two houses. **The Intelligence Company** (`theintelligence.company`): analysis, warning and professional tools.
  **Oddly Specific Studio** (`oddlyspecific.studio`): games and family apps (Whiteout, Mole Hunt, Tres Casas,
  Mission Control).
- Intelligence Company products: Watchfloor (beta; CONTEXT's rebuild, `[local path]`), Noisefloor
  (one word since 27 Oct; `[local path]`), Vigil, CONTEXT (`[local path]`), PropertyCast
  (stays here for now), Title 10 Field Guide (`activation.`), Listening Post (sign-in job app; not listed on the hub
  until Tom says).
- Names for new intel products come from the vocabulary of watching and listening.
- Each product keeps its own colours. Every site carries the house layer: the footer pattern (who, updated date,
  source code and licence if public, terms, data credits, Sources page), the same About structure (what it is,
  method, limits, sources), and the shared time settings.
- Folders from other work belong to neither house.

## Shared code
- `site/shared/tic-time.js` + `tic-time.css` (v1.0): time display. House rule: store UTC; show the viewer's own
  zone by default, always naming it; a settings menu for zone (automatic, Zulu/UTC, major zones, any IANA zone) and
  12/24-hour clock. On `*.theintelligence.company` the choice is kept in a domain-wide cookie so it follows the
  visitor across sites. Copy the files into each site and keep the version line; the hub also serves them at
  `/shared/` (CORS open) once the domain is live.

## Site
- Static files in `site/`, no build step. Firebase Hosting site `theintelligencecompany` in project
  context-484804: https://theintelligencecompany.web.app. Deploy (needs Tom's yes):
  `firebase deploy --only hosting:hub --project context-484804`.
- Hidden from search engines (meta, X-Robots-Tag, robots.txt) until Tom approves going public.
- Apex domain: Tom adds `theintelligence.company` in the Firebase console (Hosting, theintelligencecompany site,
  Add custom domain) and puts the A/TXT records it shows into Squarespace DNS. Claude is blocked from DNS changes.
- Times: store UTC; display per the shared module. Messages to Tom use Central time.
