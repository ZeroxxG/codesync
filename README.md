# CodeSync

A real-time collaborative code editor. Multiple users edit the same file at once with live
cursors, then run the code safely in an isolated sandbox with output streamed to everyone
in the room.

> Work in progress. This README is a skeleton; the agent fills in each section as the
> matching phase is completed (see `docs/PROGRESS.md`).

## Features (planned)
- Real-time editing with Yjs (CRDT) and Monaco Editor
- Live cursors, selections and presence
- Rooms with owner / editor / viewer roles and read-only share links
- Sandboxed code execution (Docker, no network, resource limits) with streamed output
- Horizontally scalable realtime layer over Redis pub/sub

## Architecture
_Add a Mermaid diagram here in Phase 1 and update it as services are added._

## Quick start
_Add after Phase 1: prerequisites, `cp .env.example .env`, `make dev`._

## Tech stack
React, TypeScript, Vite, Monaco, Yjs, Node.js, Hocuspocus, Django, Django REST Framework,
Celery, Redis, PostgreSQL, Docker, GitHub Actions.

## Key design decisions
_Summarize from `docs/DESIGN.md` once it exists._

## Security
_Summarize the sandbox controls and link to `docs/SECURITY.md` after Phase 3._

## Benchmarks
_Summarize real measured results and link to `docs/BENCHMARKS.md` after Phase 4._

## Docs
- [Project brief](docs/PROJECT_BRIEF.md)
- [Progress log](docs/PROGRESS.md)
