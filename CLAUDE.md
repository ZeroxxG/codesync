# CodeSync: agent rules

Real-time collaborative code editor with sandboxed code execution. This is a
resume project for full stack / SDE roles, so correctness, security and clear
design matter more than feature count. Every design decision must be explainable
in an interview.

- Full spec: `docs/PROJECT_BRIEF.md`. Read the section for the current phase before starting it.
- Progress log: `docs/PROGRESS.md`. Read it at the start of every session and update it at the end of every phase.

## Working rules
1. Before writing code for a phase, propose a short plan (files, folder structure,
   order of commits) and wait for my OK.
2. Work one phase at a time. Finish and verify a phase before starting the next.
3. If a requirement is ambiguous, or you want to deviate from the stack below, ask
   first. Don't silently change scope.
4. Don't invent a custom CRDT or a custom sandbox shortcut. Use the tools named below
   and explain trade-offs in `docs/DESIGN.md`.
5. Never run untrusted code on the host. All execution goes through the sandbox
   runner, including during development and tests.
6. At the end of each phase: run all tests, update the README and `docs/PROGRESS.md`,
   then summarize what works, what doesn't, and what's next.

## Tech stack
- Frontend (`apps/web`): React + TypeScript + Vite, Monaco Editor, Tailwind, Yjs + y-monaco, Yjs awareness for cursors
- Realtime (`apps/realtime`): Node.js + TypeScript, Hocuspocus (or y-websocket). Yjs sync, awareness and run-output broadcast ONLY. Stateless, no direct DB access, talks to Django over internal endpoints.
- API (`apps/api`): Django + Django REST Framework (or Django Ninja), simplejwt for JWT. Owns users, rooms, roles, snapshots, run history, rate limits, job dispatch.
- Runner (`apps/runner`): Celery worker (Python) that runs code in Docker containers via the Docker SDK, on its own queue
- Data: PostgreSQL (Django only), Redis (pub/sub, Celery broker, rate limits, run-output channel)
- Infra: Docker Compose for local dev, GitHub Actions for CI, nginx or Traefik for load balancing

## Code quality
- TypeScript strict mode. Python type hints plus mypy. Lint with ruff (Python) and eslint (TS).
- Small functions, tests for every feature, no dead code, no leftover TODOs or placeholders.
- All secrets come from environment variables. Keep `.env.example` current. Never commit real secrets.
- Validate every endpoint input and every WebSocket message, with size limits.

## Git workflow (applies to every phase)
Repository: <https://github.com/ZeroxxG/codesync.git>

- At the start, check whether the repo is cloned and the remote is set. If not, run
  `git remote add origin <repo url>`. Use the `main` branch.
- Make roughly 10-15 small commits per phase. Each commit is one logical step (add a
  model, wire one endpoint, add one test, fix one bug) and leaves the project working.
- Commit as the work happens, in order. Don't batch steps into one commit and don't
  write everything first and split it into commits afterwards.
- Push after every commit: `git push origin main`.
- Commit messages: short, plain, imperative, one line, under about 70 characters. No
  emojis, no marketing language, no long bodies. Examples:
  `add Room model and migration`, `fix cursor color not syncing on reconnect`,
  `add test for viewer write rejection`, `set memory limit on runner container`.
- Small follow-up commits (typo, missed import, test fix) are fine.
- Never force-push, rewrite history, or commit secrets, `.env` files or build artifacts.
- If a push fails (auth, network, conflict), stop and tell me. Don't try workarounds.
- At the end of each phase, report the number of commits and confirm everything is pushed.
