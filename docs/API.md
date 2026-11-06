# CodeSync: API Reference

This document maintains contracts for all REST endpoints, internal service endpoints, Redis pub/sub channels, and WebSocket message types across CodeSync.

---

## 1. Public REST Endpoints (Django API)

Base URL: `http://localhost:8000/api`

### Rooms

#### `POST /api/rooms/`
Creates a new collaborative room with an auto-generated unique slug.

- **Auth**: None (Phase 1) / JWT (Phase 2)
- **Request Body** (optional):
```json
{
  "name": "Team Standup Room",
  "language": "python"
}
```
- **Response**: `201 Created`
```json
{
  "id": "c1386548-2831-419b-a0d4-1a93e3d9f957",
  "name": "Team Standup Room",
  "slug": "k7a_9B",
  "language": "python",
  "created_at": "2026-11-07T01:10:32.415012Z"
}
```

---

#### `GET /api/rooms/<slug>/`
Fetches room metadata by join slug.

- **Auth**: None / Read-only link
- **Response**: `200 OK`
```json
{
  "id": "c1386548-2831-419b-a0d4-1a93e3d9f957",
  "name": "Team Standup Room",
  "slug": "k7a_9B",
  "language": "python",
  "created_at": "2026-11-07T01:10:32.415012Z",
  "updated_at": "2026-11-07T01:12:15.109230Z"
}
```

---

#### `PATCH /api/rooms/<slug>/`
Updates room metadata (e.g. editor language selection).

- **Request Body**:
```json
{
  "language": "javascript"
}
```
- **Response**: `200 OK`
```json
{
  "id": "c1386548-2831-419b-a0d4-1a93e3d9f957",
  "name": "Team Standup Room",
  "slug": "k7a_9B",
  "language": "javascript",
  "created_at": "2026-11-07T01:10:32.415012Z",
  "updated_at": "2026-11-07T01:13:00.000000Z"
}
```

---

## 2. Realtime WebSocket Protocol (Hocuspocus / Yjs)

Base URL: `ws://localhost:1234`

### Connection
- **URL Pattern**: `ws://localhost:1234/<roomSlug>?user=<userName>`
- **Protocol**: Yjs binary sync protocol over WebSocket.
- **Shared Types**:
  - `doc.getText("monaco")`: Monaco editor document text (CRDT string).
  - `doc.getMap("room-meta")`: Room metadata (`language: "python" | "javascript" | "cpp"`).
- **Awareness State**:
```json
{
  "user": {
    "name": "Alice",
    "color": "#3b82f6",
    "colorLight": "rgba(59, 130, 246, 0.25)"
  },
  "cursor": {
    "anchor": 142,
    "head": 142
  }
}
```

---

## 3. Internal Endpoints (Realtime Service → Django API)
*(To be implemented in Phase 2)*

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/internal/rooms/{id}/snapshot` | GET | `INTERNAL_API_TOKEN` | Load saved Yjs document binary |
| `/internal/rooms/{id}/snapshot` | PUT | `INTERNAL_API_TOKEN` | Persist debounced Yjs document binary |
| `/internal/rooms/{id}/role` | GET | `INTERNAL_API_TOKEN` | Verify user role & permissions |

---

## 4. Redis Pub/Sub Channels
*(To be implemented in Phase 3)*

| Channel Pattern | Publisher | Subscriber | Purpose |
|---|---|---|---|
| `room:{id}:output` | Celery Runner | Realtime Service | Broadcast stdout/stderr chunks and exit status |
