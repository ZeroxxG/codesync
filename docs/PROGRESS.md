# Progress log

The agent reads this at the start of every session and updates it at the end of every phase.

## Status
| Phase | Status | Commits | Pushed |
|---|---|---|---|
| 0. Project skeleton | done | 8 | yes |
| 1. Collaboration core | done | 15 | yes |
| 2. Auth, permissions, persistence, presence | not started | 0 | no |
| 3. Sandboxed execution | not started | 0 | no |
| 4. Scale, hardening, measurement | not started | 0 | no |
| 5. Polish | not started | 0 | no |

## Decisions made
<!-- One line each: date, decision, why. Example: 2026-11-08: Hocuspocus over y-websocket (built-in auth hooks) -->
- 2026-11-07: app services in docker-compose use `profiles: [full]` so `make dev-infra` starts only postgres+redis without needing Dockerfiles built yet.
- 2026-11-07: Hocuspocus server selected for Yjs synchronization; provides native TypeScript bindings and hook interfaces for Phase 2 auth and persistence.
- 2026-11-07: Yjs awareness protocol used for cursors and selections; styled via dynamic CSS classes with deterministic user color palette hashing.
- 2026-11-07: Language selection synchronized via CRDT shared Map (`room-meta`) with asynchronous persistence to Django REST API.

## Known issues
<!-- Things that are broken or incomplete, so a fresh session doesn't rediscover them. -->
- JWT auth and room roles (owner/editor/viewer) are stubbed for Phase 2; Phase 1 allows anonymous users with client-specified display names.
- Persistent Yjs snapshots are not yet stored in PostgreSQL; state lives in memory on the realtime server until Phase 2 debounced snapshot endpoints are connected.

## Next steps
<!-- What the next session should start with. -->
- Start Phase 2: User auth (register/login/refresh/logout with simplejwt), Room membership & roles, read-only share links, debounced snapshot endpoints (`GET/PUT /internal/rooms/{id}/snapshot`), and server-side viewer write rejection.
