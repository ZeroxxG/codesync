# Progress log

The agent reads this at the start of every session and updates it at the end of every phase.

## Status
| Phase | Status | Commits | Pushed |
|---|---|---|---|
| 0. Project skeleton | done | 7 | yes |
| 1. Collaboration core | not started | 0 | no |
| 2. Auth, permissions, persistence, presence | not started | 0 | no |
| 3. Sandboxed execution | not started | 0 | no |
| 4. Scale, hardening, measurement | not started | 0 | no |
| 5. Polish | not started | 0 | no |

## Decisions made
<!-- One line each: date, decision, why. Example: 2026-11-08: Hocuspocus over y-websocket (built-in auth hooks) -->
- 2026-11-07: app services in docker-compose use `profiles: [full]` so `make dev-infra` starts only postgres+redis without needing Dockerfiles built yet.

## Known issues
<!-- Things that are broken or incomplete, so a fresh session doesn't rediscover them. -->
- App Dockerfiles (api, realtime, runner, web) don't exist yet; `make dev` and `make test` require them (Phase 1).

## Next steps
<!-- What the next session should start with. -->
- Start Phase 1: minimal Django project with Room model, Hocuspocus realtime service, Vite+Monaco frontend, and convergence test.
