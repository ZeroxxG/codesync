# CodeSync: API reference

> This document is updated progressively as each phase is completed.

## Public REST endpoints (Django)
_To be written in Phase 1 (rooms) and Phase 2 (auth, roles, runs)._

## Internal endpoints (realtime → Django)
_To be written in Phase 2._

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/internal/rooms/{id}/snapshot` | GET | service token | Load Yjs state |
| `/internal/rooms/{id}/snapshot` | PUT | service token | Save Yjs state |
| `/internal/rooms/{id}/role` | GET | service token | Get user's role in room |

## Redis channel formats
_To be written in Phase 3._

## WebSocket message types
_To be written in Phase 1._
