# apps/realtime — Real-time collaboration service

Node.js + TypeScript + Hocuspocus (Yjs sync, awareness, run-output broadcast)

## Responsibilities
- Accept WebSocket connections from clients and sync Yjs document updates via Hocuspocus
- Broadcast Yjs awareness (cursors, selections, presence) between connected clients
- Verify the client's JWT on connect, then call Django's internal endpoint to confirm the
  user's room role; reject document updates from viewers
- Load Yjs state from and persist it to Django's internal snapshot endpoints
  (`GET/PUT /internal/rooms/{id}/snapshot`) with debounced saves
- Subscribe to the Redis run-output channel and broadcast execution output to all room members
- Stateless: owns no database connection; all business logic lives in Django

## Tech
- Node.js 20, TypeScript (strict)
- Hocuspocus (`@hocuspocus/server`)
- ioredis for Redis pub/sub

## Development
```sh
pnpm install
pnpm dev        # ts-node-dev or tsx watch on :1234
pnpm test       # Jest / Vitest
pnpm lint       # ESLint
pnpm tsc --noEmit  # Type check
```

> **Status:** not started — skeleton only.
