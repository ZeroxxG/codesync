# Progress log

The agent reads this at the start of every session and updates it at the end of every phase.

## Status
| Phase | Status | Commits | Pushed |
|---|---|---|---|
| 0. Project skeleton | done | 8 | yes |
| 1. Collaboration core | done | 15 | yes |
| 2. Auth, permissions, persistence, presence | done | 14 | yes |
| 3. Sandboxed execution | done | 14 | yes |
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
- 2026-11-14: Docker sandbox with strict containment: network_mode=none, read_only=True, tmpfs, user=10001:10001, cap_drop=ALL, pids_limit=64, mem_limit=128m, and 10s wall-clock timeout.
- 2026-11-14: Celery runner decoupled from database credentials; reports exit codes, duration, and output back via authenticated internal Django endpoint with X-Internal-Token.
- 2026-11-14: Real-time execution streaming over Redis pub/sub (room:<slug>:runs) relayed through Hocuspocus broadcastStateless messages to connected frontend clients.
- 2026-11-14: Per-room active execution lock (room:<slug>:running_lock) with 15s TTL and viewer role rejection (403).
- 2026-11-14: Automated adversarial attack suite verifying containment against CPU loops, memory bombs, fork bombs, network probes, rootfs writes, and secret leakage.
- 2026-11-14: Background reaper daemon sweeping orphaned sandbox containers older than 30s.

## Known issues
<!-- Things that are broken or incomplete, so a fresh session doesn't rediscover them. -->
- Phase 4 scope pending: load testing, benchmarking concurrency limits, and production hardening.

## Next steps
<!-- What the next session should start with. -->
- Move to Phase 4: Scale, Hardening, Measurement (load testing, concurrent room stress, Redis cluster/sentinel benchmarks, metrics export).
