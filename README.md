# ESG Transition Simulation

An in-class strategy simulation: you are the group's Chief Sustainability Officer, with 60 influence units to turn a signed net-zero pledge into changed operating practice across 12 stakeholders.

Built on the same engine as *Corporate Integration Management* (Go Overseas). Same 12 roles, same network, same action set — the narrative, the stakeholders' hidden agendas and the endgame cases are rewritten for an ESG transition.

## Live

<https://yan-shipeng.github.io/esg-simulation/en>

## What changed vs. the original

- Branding: *Corporate Integration Management* → **ESG Transition Simulation**
- Player role: Overseas Integration Lead → **Group Chief Sustainability Officer**
- 12 stakeholders: job titles unchanged; descriptions and hidden goals rewritten for the ESG agenda (output vs. decarbonisation, jobs vs. transition, green premium vs. volume)
- 13 actions: renamed and re-described (e.g. Private Interview → One-on-One Conversation, Announce KPIs → Set ESG Targets and Deadlines)
- Random events: media coverage, energy-savings beat, retrofit stoppage, board softening the pledge
- Debrief cases: Interface, Ørsted, Maersk / Unilever, DSM, Iberdrola / Volkswagen, BP, Boeing
- Mechanics, scores, network topology and the 60-unit budget are **unchanged**

## Notes

- The original front-end ships as a single minified bundle; source maps are not available. All edits are string-level replacements in `assets/index-BxBTfExN.js`, applied through the mapping tables in `_work/map*.py` (kept for traceability, not deployed).
- The leaderboard is served by a tRPC + SQLite backend that GitHub Pages cannot run. On this static deployment the game detects the missing API and falls back to a local session: you can play and see your score, but results are not written to a shared leaderboard.
- Routes are prefixed with `/esg-simulation/` because this is a project page, not a user page.
