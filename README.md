# The Intelligence Company

The company's home page, https://theintelligence.company, and the canonical home of the code that every Intelligence
Company site shares. The programs themselves (COP, Noisefloor, Vigil, Blackout, Orbit, Launch and the rest) each have
their own repository and site; the home page lists them by layer.

## What is here

| Path | What it is |
|---|---|
| `site/` | The home page: static files, no build step. `site/oe/` draws the layers; `site/veterans/` holds the Veterans Day planner. |
| `site/shared/` | The shared site scripts every program site copies: `tic-nav` (the house bar and Programs menu), `tic-time` (times in the viewer's own zone, always named, with a time-zone and 12/24-hour menu), `tic-related` ("Elsewhere today"), `tic-tabs`, `tic-fold` and `tic-area` ("My area"). Each copy keeps the file's version line. |
| `dispatch/` | `tic-dispatch`, a Cloudflare Worker that starts the programs' scheduled GitHub workflows on time, because GitHub starts this account's scheduled runs hours late. |
| `sitecheck/` | `tic-sitecheck`, a Cloudflare Worker that opens every site in a headless browser twice a day and checks what a visitor would see. Results: https://tic-sitecheck.metacog.workers.dev/ |
| `tests/` | The home page's rules, checked from its files, and browser tests (see `tests/README.md`). |
| `veterans-day/` | The Veterans Day planner's data build, research and field-report service (see `veterans-day/README.md`). |

## Commands

```bash
python tools/serve.py 5055             # preview site/ with the headers in firebase.json
cd tests && npm ci && npm test         # site rules and browser tests
cd dispatch && node --test             # tic-dispatch tests
```

Pushing `master` runs the site checks, and deploys `tic-dispatch` or `tic-sitecheck` when their folders change. The
home page itself is deployed to Firebase Hosting by hand.

## Licence

Copyright © 2026 Thomas Brummer, The Intelligence Company. The code is licensed under the GNU Affero General Public
License v3.0 (`LICENSE`), except the shared site scripts in `site/shared/`, which are MIT so that every site can copy
them. Fonts and other third-party files keep their own licences, and data keeps its sources' terms; all are listed in
`NOTICE`.

## AI assistance

This repository is built with AI coding assistance (Anthropic's Claude Code). The Intelligence Company is responsible for everything published here.
