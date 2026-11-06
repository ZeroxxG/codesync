# apps/web — React frontend

React + TypeScript + Vite + Monaco Editor + Tailwind + Yjs

## Responsibilities
- Monaco Editor for code editing
- Yjs + y-monaco for real-time collaborative CRDT sync
- Yjs awareness for live remote cursors and selections
- Language selector that syncs across all clients in a room
- Calls Django REST API for auth and room management
- Connects to the realtime service over WebSocket

## Tech
- React 18, TypeScript (strict), Vite
- Monaco Editor (`@monaco-editor/react`)
- Tailwind CSS
- Yjs, y-monaco, y-websocket

## Development
```sh
pnpm install
pnpm dev        # Vite dev server on :5173
pnpm test       # Vitest
pnpm lint       # ESLint
pnpm tsc --noEmit  # Type check
```

> **Status:** not started — skeleton only.
