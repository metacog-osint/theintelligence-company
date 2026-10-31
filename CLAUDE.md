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
  as "Invite only" since 27 Oct), COP (`cop.`, `[local path]`; the common operational picture, beta since 31 Oct
  2026, public and non-commercial for now), Elements (natural hazards) and Cordon (where authorities warn people
  away), both beta on the hub since 31 Oct 2026 (Tom's yes). Both are still on GitHub Pages
  (`metacog-osint.github.io/elements/`, `/cordon/`), not subdomains, so the shared time cookie doesn't reach them;
  moving them to `elements.` and `cordon.` takes a Squarespace DNS record each. Their drawing lines say what v0
  covers and what is planned (Elements: fires, volcanoes, radiation; Cordon: NOTAMs, launch hazard areas); update
  the lines as those arrive.
- Names for new intel products come from the vocabulary of watching and listening.
- Each product keeps its own colours. Every site carries the house layer: the footer pattern (who, updated date,
  source code and licence if public, terms, data credits, Sources page), the same About structure (what it is,
  method, limits, sources), and the shared time settings.
- Folders from other work belong to neither house.
- Licences: products that may earn money stay on public GitHub under GNU AGPL-3.0 (Vigil, `4b6bc35`; Noisefloor,
  `cf0aa94`; Tom, 27 Oct 2026). Title 10, PropertyCast and Watchfloor have no licence file yet; ask Tom before
  adding one.

## Shared code
- `site/shared/tic-time.js` + `tic-time.css` (v1.3; v1.3, 31 Oct 2026, makes the `year` option give a full date in the
  house style, "31 Oct 2026", in every zone and clock, Zulu included (it used to be ignored in Zulu), and `renderAll`
  reads `data-tic-year`; v1.2 fixed a first visit saving zone=undefined, which opened the dialog on "Other"): time
  display. Only the hub has v1.3 so far; the copies below are v1.2, which is compatible, so copy v1.3 over when a site
  next needs a full date. Copies: Watchfloor `web/`, Title 10 `deploy/public/`, Noisefloor
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
- **"How the programs fit"** (`#layers`, built 31 Oct 2026 from Tom's interactive draft and his 14 review points):
  a dark band after the hero. The artwork is inline SVG in `index.html` (seven plates adapted from JP 2-01.3 Fig I-1);
  `site/oe/oe.js` draws everything that changes from one data table: program tags on each home layer (live, beta or
  in development, planned, core), the reach line through every layer a program touches, the question-led guide
  ("Find your way in", no numbered start), the panels, and the live zone and topic counts from Watchfloor's
  `/summary` (shared with `site.js` through `window.ticWatchfloor`). **To add or move a program, edit `PROGRAMS`**
  (`home`, `reach`, `at`). Rules from Tom: no fixed counts in copy (zones change); the right column is doctrine's
  grouping, always on, with JP citations only in the sources line under the figure, and only publicly released
  documents cited; actors are described by role as sources describe them, never as hostile; PropertyCast stays off the
  drawing (it's in the product list). On phones, planned programs show as rings only.
- Local preview with the live headers: `python tools/serve.py 5055` serves `site/` with every `firebase.json` header,
  CSP included (`firebase serve` skips them).
- Product screenshots in `site/img/` (WebP, 2x, captions dated): retake with headless Edge when a product changes.
  **They must show the real site with real data, as a signed-in user sees it, header included** (Tom, 31 Oct 2026),
  never a signed-out landing page, demo mode (Vigil's demo is mock data) or a bare map. Current:
  `noisefloor-today.webp` and `watchfloor-zones.webp` (whole 1280×800 view at 2x, scaled to 1600×1000; Noisefloor's
  map needs WebGL, so run Edge with `--enable-unsafe-swiftshader --use-angle=swiftshader`, not `--disable-gpu`).
  Signed-in captures: Tom signs in once in a visible Edge window using a separate profile
  (`--user-data-dir=%TEMP%\edge-vigil`); after he closes it (stop any Edge processes still on that profile), a
  Playwright script using Vigil's own `node_modules/playwright-core` with `channel: "msedge"`,
  `launchPersistentContext` on that profile, 1280×800 at `deviceScaleFactor: 2` captures the pages. Then the profile
  folder is deleted so no session is left on disk. Claude never sees the password or the session. Vigil's welcome
  tour covers the page on a fresh profile; it is remembered only in local storage (`vigil_tour_completed`), so the
  script sets that key with `addInitScript`, with no clicks and nothing changed on Tom's account.
  `vigil-actors.webp` (31 Oct 2026) is the signed-in Threat Actors view: real data, group names only. The signed-in
  dashboard's AI summary names victims, so it isn't used.
- Local preview: `python tools/serve.py 5055` (applies the `firebase.json` headers). `firebase serve --only hosting:hub
  --port 5055 --project context-484804` also works but skips the headers, so a CSP problem only shows up live.
- About bio, reworded 31 Oct 2026 because "In 25 years of service he began…" read clunkily (Tom): "…and run by Thomas
  Brummer. He has served in the Air National Guard for 25 years. He started as an F-16 crew chief and an Air Force
  weather forecaster, and has spent more than half his career as a signals intelligence (SIGINT) analyst." Under the
  About sits a "Thomas Brummer on LinkedIn" link (https://www.linkedin.com/in/tom-brummer/, also `sameAs` on the
  founder in the JSON-LD). LinkedIn shows signed-out visitors a sign-in wall, so his photo can't be fetched from there.
- The About bio (short version, Tom approved 30 Oct 2026, so it doesn't read as a résumé): 25 years of service (all
  Air National Guard: "25 years of service" and "25 years in the ANG" are the same thing), starting as an F-16 crew
  chief and Air Force weather forecaster, more than half his career a SIGINT analyst, today in the Guard. Second
  paragraph: every job means judging the state of a complex system under pressure and saying how sure you are, which
  leads into the products' standards. The longer credentials (builds programs and leads analysts, research team, 100+
  analysts trained, AI-assisted analysis standards) live in his LinkedIn About, not here; nor do other career details. Never "25-year ..." before a noun: readers took it as his age. A
  headshot slot can be added when Tom sends one.
- **Location on every public page: "Fargo-Moorhead, ND/MN"** in labels, or "Fargo-Moorhead, on the North
  Dakota–Minnesota border" in prose (anchor added 31 Oct 2026 so readers outside the region can place it); never
  "Moorhead, Minnesota" (the LLC is registered in Fargo; Tom, 30 Oct 2026). PropertyCast's forecast point is the
  Moorhead yard itself, which stays as it is. On the hub it appears in the top bar, the About and the footer; the contact
  block no longer repeats it.
- **Links to the products open in a new tab** (Tom, 31 Oct 2026): `target="_blank" rel="noopener"
  aria-describedby="newtab"`, where `#newtab` is a hidden "Opens in a new tab" note for screen readers. `oe/oe.js`
  builds its "Open" links the same way; keep both in step when adding a product.
  Links that open a new tab end in **↗**; arrows on in-page controls stay →.
- **No clock in the top bar** since 31 Oct 2026: the Time button already names the viewer's zone, and Tom found the
  zone repeated (clock, button, and "Central time" in the contact block, all removed except the button).
- **Seven improvements, 31 Oct 2026 (Tom asked for all seven):**
  - **Link preview:** Open Graph and Twitter card tags in `<head>`, image `site/img/og-card.png` (1200×630). Its source
    is `tools/og-card.html` (site fonts and colours); `site/img/logo-512.png` comes from `tools/logo.html`. Neither
    source is deployed. To regenerate: from the project root run `python -m http.server 5056 --bind 127.0.0.1` (the
    fonts need http), then `msedge --headless=new --disable-gpu --hide-scrollbars --user-data-dir=%TEMP%\edge-og
    --window-size=1200,630 --virtual-time-budget=5000 --screenshot=<project>\site\img\og-card.png
    http://127.0.0.1:5056/tools/og-card.html` (512,512 and `logo.html` for the logo). Edge is at
    `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`. LinkedIn caches previews; its Post Inspector
    refreshes one.
  - **Hero top line:** "Conflict · GPS interference · Cyber threats · Forecasting" since 31 Oct 2026 (first
    "Warning · Spectrum · Cyber · Forecasting"; it used to repeat the headline). Keep it to one line at 1280 px.
  - **Say what each line measures** (Tom, 31 Oct 2026: readers must know Noisefloor is about GPS interference, and
    the same goes for every summary). Each "Latest" item starts with a bold topic (`.latest-topic`: "GPS
    interference:", "Conflict warning:", "Cyber threats:"), and `setItem` fills only `.latest-body`, so the topic
    stays whatever the feed says. The hub says "GPS" for Noisefloor and FieldCast, never "GNSS" or "the contested
    radio spectrum". Noisefloor's own brief still says "degraded aircraft", which is Noisefloor's wording to fix.
  - **Footer date** uses `data-tic-year`: "Updated 31 Oct 2026" in the viewer's zone.
  - **Footer Sources links:** Noisefloor `/sources`, Watchfloor `/#/sources`, Vigil `/sources`, PropertyCast
    `/#sources`, Title 10 `/#contacts` ("Contacts & sources"). Context and Listening Post have no Sources page yet, so
    they're left out; add them when they get one.
  - **Privacy line:** "No analytics or tracking. Time settings, if you change them, stay in your browser." True as
    of 31 Oct 2026: no analytics or third-party scripts, and `tic-time.js` writes its cookie and local storage only
    when the visitor changes a setting. Change the line before adding anything that tracks.
  - **Search markup:** JSON-LD in `<head>` (Organization with logo, email, founder Thomas Brummer, address Fargo, ND,
    the LLC's registered city; plus WebSite). A JSON-LD block isn't executed, so the `script-src 'self'` CSP allows it
    (checked: no console violation).
  - **Contact note:** "Corrections, data questions and collaboration." under the email.
- Phone layout fix (31 Oct 2026): the `max-width: 560px` rule set `.wrap { padding: 0 16px }`, which also zeroed the
  top and bottom padding of every block that is also `.wrap` (top bar, masthead, contact, footer). It now sets the
  sides only.
- **Second batch, 31 Oct 2026 (Tom approved items 1–9):**
  - **Search title** "The Intelligence Company · OSINT from Fargo-Moorhead, ND/MN"; the description and
    `og:description` name Fargo-Moorhead, ND/MN.
  - **`site/404.html`**: Firebase serves it for any missing path at any depth, so every URL in it is absolute. Its
    product list is a copy of the home page's; keep the two in step.
  - **Home-screen icons**: `img/apple-touch-icon.png` (180), `img/icon-192.png`, `img/logo-512.png`, `site.webmanifest`,
    and `theme-color` for light and dark. Headless Edge won't render a window narrower than about 500 px, so the 180
    and 192 are downscaled from the 512 render (System.Drawing, high-quality bicubic).
  - **`sitemap.xml`** (apex only) and a `Sitemap:` line in `robots.txt`. Bump `<lastmod>` when the page changes
    materially.
  - **"Updated … ago"** under Noisefloor and Watchfloor in the product list (`site.js` `setFresh`, keyed by
    `li[data-product]`), from Noisefloor's `built_utc` and Watchfloor's `built_at`; the tooltip gives the full time in the
    viewer's zone. Add a product by giving its row `data-product` and calling `setFresh` with its feed's build time.
  - **Vigil feature block** (first shot `img/vigil.webp`, the signed-out landing page, replaced on 31 Oct 2026 by the signed-in `vigil-actors.webp`; see Product screenshots). The first was captured with headless Edge at
    1280×800 and `--force-device-scale-factor=2`, then cropped to box (0, 115, 1500, 1485) with Pillow. The crop
    deliberately leaves out "Recent Incidents": **don't put leak-site victim names on the hub.** The three points are
    from Vigil's README. Vigil's other pages need an account.
  - **Vigil "Latest" line** from `https://vigil.theintelligence.company/api/summary` (Vigil commit `9d40d75` on
    `feat/public-summary`, built by a separate session; live only once Tom merges it into Vigil's `main`). It returns
    `brief`, `day` and `built_at` with open CORS and an hour of CDN cache, or a 503 whenever Vigil can't stand behind a
    number, including a zero day. Then the hub keeps the static line. Rules from that session: insert `brief` as
    text only (group names come from criminal leak sites); `day` is RansomLook's calendar day, one to two hours ahead
    of UTC, so never label it UTC; credit RansomLook (CC BY 4.0) in the footer, which the hub does. Vigil's origin
    is in `connect-src`, and `setFresh("vigil", built_at)` drives "Updated … ago" in the product list.
  - **"Work with us"** (`#services`, between Products and How we work; in the menu, and the hero's second button):
    custom monitoring, briefings, analyst training, tools and consulting (Tom confirmed all four, 31 Oct 2026). The
    button opens a mail to support@ with a subject line. Career details stay off the page, as with the About.
  - **COP on the hub** (asked by the COP session for Tom, 31 Oct 2026): `PROGRAMS` entry `cop` is `status: "beta"`
    with `href` and a guide question, and its line now says what v0 does (the old line promised cross-layer
    scoring, which COP doesn't do). `kind()` and `statusWords()` now follow status for core programs too: a planned
    core program (Verdict) keeps the dashed "core" mark, while a core program that is out draws as live or beta and
    reads "Beta, core". COP is also in "Every product" and `404.html`, after Context.
  - **Headshot** (31 Oct 2026): Tom sent his photo in chat; it is `img/thomas-brummer.webp` (480 px square), beside
    the bio (200 px; above it on phones, 140 px) and as the founder's `image` in the JSON-LD.
    `Downloads\headshot.jfif` is not Tom (it carries a Gemini watermark); never use it.
  - **Copyright notice** (Tom, 31 Oct 2026: "use the copyright symbol, and my name"): "Drawing © 2026 Thomas Brummer,
    adapted from JP 2-01.3…" under the drawing, and "© 2026 Thomas Brummer" first in the footer of `index.html` and
    `404.html`. Registration was discussed and not done: $45 single or $65 standard at copyright.gov (a rise to $55
    and $85 was proposed for about Nov 2026, unconfirmed). Only the human-authored parts are protectable, since the
    JP figure is public domain and AI-generated material must be disclaimed. Trademark fits names and logos, not the
    drawing.
- Times: store UTC; display per the shared module. Messages to Tom use Central time.
