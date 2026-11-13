# Progress log

The agent reads this at the start of every session and updates it at the end of every phase.

## Status
| Phase | Status | Commits | Pushed |
|---|---|---|---|
| 0. Project skeleton | done | 8 | yes |
| 1. Collaboration core | done | 15 | yes |
| 2. Auth, permissions, persistence, presence | done | 14 | yes |
| 3. Sandboxed execution | not started | 0 | no |
| 4. Scale, hardening, measurement | not started | 0 | no |
| 5. Polish | not started | 0 | no |

## Decisions made
<!-- One line each: date, decision, why. Example: 2026-11-08: Hocuspocus over y-websocket (built-in auth hooks) -->
- 2026-11-07: app services in docker-compose use `profiles: [full]` so `make dev-infra` starts only postgres+redis without needing Dockerfiles built yet.
- 2026-11-07: Hocuspocus server selected for Yjs synchronization; provides native TypeScript bindings and hook interfaces for Phase 2 auth and persistence.
- 2026-11-07: Yjs awareness protocol used for cursors and selections; styled via dynamic CSS classes with deterministic user color palette hashing.
- 2026-11-07: Language selection synchronized via CRDT shared Map (`room-meta`) with asynchronous persistence to Django REST API.
- 2026-11-13: SimpleJWT authentication with token blacklisting on logout and automated client token refresh.
- 2026-11-13: Two-layer server-side write rejection for viewers: connection readOnly flag + deep binary frame inspection dropping mutation packets before touching in-memory Y.Doc.
- 2026-11-13: Debounced Yjs snapshot persistence (3000ms window, 1MB cap) storing raw binary updates in PostgreSQL BinaryField via service-token protected internal Django endpoints.
- 2026-11-13: Unique tokenized guest viewer links granting read-only access to unauthenticated or external reviewers.

## Known issues
<!-- Things that are broken or incomplete, so a fresh session doesn't rediscover them. -->
- Code execution engine is not yet connected (Phase 3 scope: Celery worker, Docker container sandbox, Redis output streaming).

## Next steps
<!-- What the next session should start with. -->
- Start Phase 3: Sandboxed code execution (Celery worker, Docker SDK runner, Redis pub/sub streaming, strict cgroups/seccomp limits, adversarial test suite).
