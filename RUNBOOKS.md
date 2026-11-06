# The Intelligence Company hub - Runbooks

Procedures needed now and then, moved verbatim out of `CLAUDE.md` on 6 Nov 2026 so they don't load into every
turn. `CLAUDE.md` points here where each applies; its rules still govern.

## Dispatch Worker: checks, failure signals, local test (from CLAUDE.md, Dispatch Worker)

- Checked 5 Nov: GitHub Pages' soft limit of 10 builds an hour doesn't apply to sites published by a custom Actions
  workflow (both are); a run takes under 75 seconds; both repos are public, so their minutes are free; Elements' repo
  was 1.3 MB after a week of data commits.
- No public URL (`workers_dev = false`, `preview_urls = false`); only the binding reaches it. A start that fails
  (expired token, a workflow without `workflow_dispatch`) shows as an error in tic-dispatch's metrics and as a
  `tic-dispatch: …` line in propertycast-trigger's logs; on the hub it shows up as "running late" on Elements or
  Cordon. The error carries GitHub's message, never the token.
- Local test without deploying: Wrangler is installed in `D:\Projects\mole-hunt\server\node_modules\wrangler`. Put
  `DISPATCH_TOKEN=fake` in `dispatch/.dev.vars` (git ignores it) and run `wrangler dev -c <PropertyCast>/trigger/wrangler.toml
  -c wrangler.toml --test-scheduled` in `dispatch/`, then POST
  `/cdn-cgi/local/explorer/api/local/scheduled?worker=propertycast-trigger` with
  `{"cron":"*/5 * * * *","scheduled_time":<ms>}` (the older `/cdn-cgi/handler/scheduled?time=` ignores the time). The
  fake token reaches GitHub and gets "401 Bad credentials", which proves the path. Wrangler 4.147's local runtime
  refuses PropertyCast's worker.js because it exports constants ("Incorrect type for map entry 'COLLECT_MINUTE'"),
  although Cloudflare runs it; test with a scratch copy that drops `export` from the `export const` lines. Afterwards
  stop the node, esbuild and workerd processes by PID and delete `dispatch/.wrangler/` and `.dev.vars`.

## Product screenshots (from CLAUDE.md, Site)

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

## Link-preview image and logo (from CLAUDE.md, Site, "Seven improvements")

  - **Link preview:** Open Graph and Twitter card tags in `<head>`, image `site/img/og-card.png` (1200×630). Its source
    is `tools/og-card.html` (site fonts and colours); `site/img/logo-512.png` comes from `tools/logo.html`. Neither
    source is deployed. To regenerate: from the project root run `python -m http.server 5056 --bind 127.0.0.1` (the
    fonts need http), then `msedge --headless=new --disable-gpu --hide-scrollbars --user-data-dir=%TEMP%\edge-og
    --window-size=1200,630 --virtual-time-budget=5000 --screenshot=<project>\site\img\og-card.png
    http://127.0.0.1:5056/tools/og-card.html` (512,512 and `logo.html` for the logo). Edge is at
    `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`. LinkedIn caches previews; its Post Inspector
    refreshes one.
