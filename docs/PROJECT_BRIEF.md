# CodeSync: project brief

## Goal
Build a production-quality, portfolio-grade web app where multiple users edit the
same code file simultaneously with live cursors and selections, then run the code
safely in an isolated sandbox with output streamed to everyone in the room.

This is a resume project for full stack / SDE roles. Prioritize correctness,
security, clear architecture and measurable results over feature count.

Working rules, tech stack and the git workflow are in `CLAUDE.md`. This file holds the
detailed spec. Read the section for the current phase before starting it.

## Service responsibilities and contracts
- Django issues JWTs (access + refresh) and is the single source of truth for who can
  do what in which room (roles: owner, editor, viewer).
- The realtime service verifies the JWT on WebSocket connect, then calls a Django
  internal endpoint to confirm the user's role in that room. Viewers must be read-only,
  enforced on the server by rejecting their document updates.
- Document persistence: the realtime service loads and saves Yjs state through internal
  Django endpoints (`GET/PUT /internal/rooms/{id}/snapshot`), protected by a
  service-to-service token and not reachable from the public internet. Snapshots are
  debounced; document size is capped.
- Execution flow: the client calls `POST /api/rooms/{id}/runs` on Django, which validates
  permission and rate limits, creates a Run row, and enqueues a Celery task. The runner
  executes it and publishes output chunks plus status to a Redis channel for that room.
  The realtime service subscribes and broadcasts these to everyone in the room. The final
  result (exit code, runtime, truncated output) is saved to the Run row by Django.
- Document all contracts (REST endpoints, internal endpoints, Redis channel formats,
  WebSocket message types) in `docs/API.md` and keep it updated.

## Phase 1: Collaboration core
- Minimal Django project with a Room model and create/join-by-link endpoints.
- Two or more browsers edit one Monaco document in real time through the realtime service.
- Live remote cursors and selections with the user's name and a stable color.
- Language selector (Python, JavaScript, C++) that syncs across the room.
- Acceptance: open 3 browser tabs, edit concurrently, and all documents converge with no
  lost edits. Add an automated test that simulates concurrent edits from multiple Yjs
  clients and asserts convergence.

## Phase 2: Auth, permissions, persistence and presence
- Django: register/login/refresh/logout, user profile, room CRUD, room membership with
  owner/editor/viewer roles, and read-only share links (signed or tokenized).
- Realtime: JWT verification and the Django permission check described above. Anonymous
  guests are allowed only through a viewer share link.
- Persist Yjs state through the internal snapshot endpoints. Reloading the page or
  restarting the realtime server must not lose content.
- Presence list of who is online. Handle disconnect/reconnect and offline edits merging
  back cleanly.
- Django tests (pytest-django) for auth, permission rules and snapshot endpoints,
  including attempts to access rooms the user doesn't belong to.
- Acceptance: kill the realtime server mid-session, restart it, and the room recovers with
  all content. A viewer cannot modify the document even with a hand-crafted WebSocket client.

## Phase 3: Sandboxed execution (the most important phase)
- Django `Run` model (room, user, language, code hash, status, exit code, duration,
  truncated output, timestamps) and the `POST /api/rooms/{id}/runs` endpoint.
- The Celery runner executes each job in a fresh Docker container, then destroys it.
- Stream stdout/stderr to the room in real time via Redis pub/sub and the realtime
  service, plus exit code and runtime at the end.
- Mandatory sandbox controls, each documented and tested:
  - No network access (`network_mode="none"`)
  - CPU, memory and PID limits (prevent fork bombs and memory exhaustion)
  - Hard wall-clock timeout that kills the container, even if the worker crashes (use a
    reaper that removes stale containers)
  - Output size cap (truncate with a notice)
  - Read-only root filesystem with a small writable tmpfs
  - Run as non-root, drop all Linux capabilities, `no-new-privileges`, default seccomp profile
  - Pre-built minimal images per language, no package installs at runtime
  - The runner must not have access to the Postgres or Django secrets. It receives only
    the job payload.
- Per-user and per-room rate limits and a max queue depth. Only one run at a time per
  room; a second click gets a clear "already running" response.
- Adversarial tests that run inside the sandbox: infinite loop, fork bomb, memory bomb,
  huge stdout, network call attempt, filesystem write attempt, reading environment
  variables, trying to reach the Docker socket. Each must be contained and must not
  affect the host or other jobs.
- Acceptance: all adversarial tests pass and the host stays healthy.
- Write a threat model in `docs/SECURITY.md`, including what this design does NOT protect
  against and how gVisor or Firecracker would strengthen it.

## Phase 4: Scale, hardening and measurement
- Run 2+ realtime instances behind a load balancer (nginx or Traefik), synced via Redis
  pub/sub. Show that users connected to different instances still collaborate and still
  receive run output.
- Run Django with gunicorn behind the same proxy. Add DB indexes where queries need them
  and check with EXPLAIN. Use `select_related`/`prefetch_related` where relevant and add a
  test that guards against N+1 queries on list endpoints.
- Load test (k6 or a script): N concurrent editors per room and M rooms. Report sync
  latency (p50/p95), API latency and execution throughput in `docs/BENCHMARKS.md`.
- Structured logging, health-check endpoints, graceful shutdown, basic metrics.
- Input validation on every endpoint and socket message, CORS configured correctly,
  secure cookie/JWT settings, size limits on document updates.
- CI: ruff + mypy + pytest for Django and the runner, eslint + tsc + tests for Node and
  React. All run on every push.

## Phase 5: Polish (only after phases 1-4 work)
- Run history per room, a clean responsive UI, dark/light theme, keyboard shortcuts.
- Optional: an "explain this error" endpoint in Django that sends a failed run's stderr
  and code to an LLM API, behind a feature flag and a per-user rate limit.

## Repository layout
```
codesync/
  CLAUDE.md
  README.md
  Makefile                 # make dev / make test / make lint (create in Phase 1)
  docker-compose.yml       # create in Phase 1
  .env.example
  .gitignore
  apps/
    web/                   # React + TypeScript + Vite + Monaco
    realtime/              # Node + Hocuspocus (Yjs sync, awareness, run-output broadcast)
    api/                   # Django + DRF (auth, rooms, roles, snapshots, runs)
    runner/                # Celery worker + Docker sandbox
  packages/
    shared/                # shared types/constants where useful
  docker/                  # Dockerfiles, sandbox images per language, nginx config
  docs/
    PROJECT_BRIEF.md       # this file
    PROGRESS.md            # session-to-session progress log
    PHASE_PROMPTS.md       # prompts to paste per phase (for the human)
    SETUP.md               # GitHub and tooling setup (for the human)
    API.md                 # create in Phase 1, keep updated
    DESIGN.md              # create in Phase 1, keep updated
    SECURITY.md            # create in Phase 3
    BENCHMARKS.md          # create in Phase 4
```
`make dev` starts everything, `make test` runs every suite, `make lint` runs all linters.

## Documentation deliverables
- `README.md`: what it is, demo GIF placeholder, architecture diagram (Mermaid), quick
  start, tech stack, key design decisions
- `docs/DESIGN.md`: why CRDT over OT, why Yjs sync is a separate Node service while Django
  owns business logic, awareness/cursor throttling, scaling strategy, failure modes
- `docs/API.md`: public and internal endpoints, Redis channels, WebSocket messages
- `docs/SECURITY.md`: threat model and sandbox controls
- `docs/BENCHMARKS.md`: methodology and results

## Definition of done
- `docker compose up` brings up the whole stack
- All phases' acceptance criteria are met and tested
- CI is green
- Docs are complete and accurate, with real benchmark numbers (no invented figures)
- At the end, give me 4-5 resume bullets based on the real measured results, plus a list
  of likely interview questions with short answers drawn from `docs/DESIGN.md`
