# Notes for Gemini (Antigravity)

This repository keeps one set of notes for every AI tool. Before any work, read:

1. `CLAUDE.md`: the project's rules and how each part works (it is not specific to Claude).
2. `HANDOFF.md`: what is live, what is waiting, and what was decided most recently (newest section first).
3. For the Veterans Day planner, `veterans-day/README.md` and the area's `veterans-day/research/<area>/notes.md`.

Rules that matter most:

- Every commit, push and deploy needs Tom's explicit yes, each one separately.
- Deploy only from this checkout (`D:\Projects\theintelligence-company`, branch `master`), with
  `firebase deploy --only hosting:hub --project context-484804`. Never deploy from `D:\Projects\tic-vetday`: it is a
  stale worktree from 8 Nov 2026, and deploying it replaces the whole live hub with old files.
- Run the tests before asking to deploy (`cd tests && npm test`, or the planner's tests listed in its README), and
  check the page at phone size.
- Put a source and date on every claim, and say when something is unverified.
- Add what you change to `HANDOFF.md` and the relevant README, so the next session (yours or Claude's) knows.
