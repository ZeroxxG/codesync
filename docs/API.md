# CodeSync: API Reference

This document maintains contracts for all REST endpoints, internal service endpoints, Redis pub/sub channels, and WebSocket message types across CodeSync.

---

## 1. Authentication Endpoints (`/api/auth/`)

Base URL: `http://localhost:8000/api/auth`

### `POST /api/auth/register/`
Registers a new user account.
- **Request Body**:
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "Password123!",
  "password_confirm": "Password123!"
}
```
- **Response**: `201 Created`
```json
{
  "user": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com",
    "date_joined": "2026-11-13T11:25:00.000000Z"
  },
  "access": "eyJhbGciOi...",
  "refresh": "eyJhbGciOi..."
}
```

### `POST /api/auth/login/`
Authenticates a user by username or email.
- **Request Body**:
```json
{
  "username": "alice",
  "password": "Password123!"
}
```
- **Response**: `200 OK` (returns user profile + JWT access & refresh pair).

### `POST /api/auth/refresh/`
Refreshes an expired access token.
- **Request Body**:
```json
{
  "refresh": "eyJhbGciOi..."
}
```
- **Response**: `200 OK`
```json
{
  "access": "eyJhbGciOi...",
  "refresh": "eyJhbGciOi..."
}
```

### `POST /api/auth/logout/`
Blacklists a refresh token.
- **Headers**: `Authorization: Bearer <access_token>`
- **Request Body**: `{"refresh": "..."}`
- **Response**: `200 OK`

### `GET /api/auth/me/`
Returns current authenticated user profile.
- **Headers**: `Authorization: Bearer <access_token>`
- **Response**: `200 OK` `{"id": 1, "username": "alice", "email": "alice@example.com", "date_joined": "..."}`

---

## 2. Public Room Endpoints (`/api/rooms/`)

Base URL: `http://localhost:8000/api/rooms`

### `POST /api/rooms/`
Creates a collaborative room with unique slug. If authenticated, user becomes `owner`.
- **Request Body** (optional): `{"name": "Team Room", "language": "python"}`
- **Response**: `201 Created`

### `GET /api/rooms/<slug>/`
Retrieves room details by slug. Access requires membership or valid `?viewer_token=...`.
- **Query Params**: `?viewer_token=<token>` (optional for guests)
- **Response**: `200 OK`
```json
{
  "id": "c1386548-2831-419b-a0d4-1a93e3d9f957",
  "name": "Team Room",
  "slug": "k7a_9B",
  "language": "python",
  "owner": 1,
  "owner_username": "alice",
  "current_user_role": "owner",
  "created_at": "...",
  "updated_at": "..."
}
```

### `PATCH /api/rooms/<slug>/`
Updates room settings (language). Only `owner` and `editor` roles permitted.
- **Request Body**: `{"language": "javascript"}`

### `GET /api/rooms/<slug>/members/`
Lists room members and their roles (`owner`, `editor`, `viewer`).

### `POST /api/rooms/<slug>/members/`
Adds or updates a member's role. Restricted to room `owner`.
- **Request Body**: `{"username": "bob", "role": "editor"}`

### `DELETE /api/rooms/<slug>/members/<user_id>/`
Removes a member from the room. Restricted to room `owner` (or member self-removal).

### `GET /api/rooms/<slug>/viewer-link/`
Retrieves the read-only guest share link with `viewer_token`. Restricted to `owner` and `editor`.

### `POST /api/rooms/<slug>/viewer-link/`
Regenerates a new `viewer_token`, immediately invalidating previous viewer links. Restricted to `owner`.

---

## 3. Internal Endpoints (Realtime Service <-> Django API)

Base URL: `http://localhost:8000/internal`
Protected by header: `X-Internal-Token: <INTERNAL_API_TOKEN>`

| Endpoint | Method | Purpose | Response |
|---|---|---|---|
| `/internal/rooms/<id>/role/` | GET | Validates user role via JWT `user_id` or guest `viewer_token` | `200 OK` `{"role": "owner"\|"editor"\|"viewer", "user_id": ..., "is_guest": ...}` or `403` |
| `/internal/rooms/<id>/snapshot/` | GET | Loads binary Yjs document state | `200 OK` (binary `application/octet-stream`) or `204 No Content` |
| `/internal/rooms/<id>/snapshot/` | PUT | Stores binary Yjs document state (debounced, max 1MB) | `200 OK` `{"size_bytes": 1024, "updated_at": "..."}` or `413` |

---

## 4. Realtime WebSocket Protocol (Hocuspocus / Yjs)

Base URL: `ws://localhost:1234`

### Connection
- **URL Pattern**: `ws://localhost:1234/<roomSlug>?token=<jwt>&viewer_token=<token>&user=<name>`
- **Protocol**: Yjs binary sync protocol over WebSocket.
- **Server Enforcement**:
  - `owner` / `editor`: Read-write access.
  - `viewer`: Read-only. Document mutation packets (`syncStep2` and `update`) are actively dropped and rejected by server inspection.

---

## 5. Sandboxed Code Execution Endpoints (`/api/rooms/<slug>/runs/`)

Base URL: `http://localhost:8000/api/rooms/<slug>/runs`

### `POST /api/rooms/<slug>/runs/`
Queues a code execution job for the room.
- **Headers / Query Params**: JWT Bearer token or `?editor_token=<token>`.
- **Permissions**: `owner` or `editor`. `viewer` role rejected with `403 Forbidden`.
- **Rate Limits**:
  - Max 6 runs per minute per user (`429 Too Many Requests`).
  - Max 10 runs per minute per room (`429 Too Many Requests`).
- **Concurrency Mutex**: Redis key `room:<slug>:running_lock` (15s TTL). Returns `409 Conflict` if another run is currently executing.
- **Request Body**:
```json
{
  "code": "print('hello from codesync')",
  "language": "python"
}
```
- **Response**: `201 Created`
```json
{
  "id": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
  "room_slug": "k7a_9B",
  "user": 1,
  "user_username": "alice",
  "language": "python",
  "code_hash": "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
  "status": "queued",
  "exit_code": null,
  "duration_ms": null,
  "output": "",
  "created_at": "...",
  "updated_at": "..."
}
```

### `GET /api/rooms/<slug>/runs/`
Lists recent execution history for the room (ordered by `-created_at`, limit 20).
- **Response**: `200 OK` (Array of Run objects).

### `GET /api/rooms/<slug>/runs/<run_id>/`
Retrieves execution status, wall-clock duration, exit code, and captured output for a specific run.
- **Response**: `200 OK` (Run object).

---

## 6. Internal Runner Callback Endpoint (`/internal/runs/<run_id>/`)

Base URL: `http://localhost:8000/internal/runs/<run_id>/`
- **Protected by**: `X-Internal-Token: <INTERNAL_API_TOKEN>`
- **Method**: `PUT`
- **Request Body**:
```json
{
  "status": "completed",
  "exit_code": 0,
  "duration_ms": 142,
  "output": "hello from codesync\n"
}
```
- **Response**: `200 OK` (Updates DB record, truncates output at 64KB, and releases Redis room lock `room:<slug>:running_lock`).

---

## 7. Redis Pub/Sub Streaming Protocol

Channel Name Pattern: `room:<slug>:runs`

Messages are published as JSON strings by the runner and relayed to frontend clients via Hocuspocus stateless messages:

1. **Run Start Event**:
```json
{
  "type": "run_start",
  "run_id": "...",
  "room_slug": "k7a_9B"
}
```

2. **Output Chunk Event**:
```json
{
  "type": "run_output",
  "run_id": "...",
  "room_slug": "k7a_9B",
  "chunk": "hello "
}
```

3. **Run Completion Event**:
```json
{
  "type": "run_complete",
  "run_id": "...",
  "room_slug": "k7a_9B",
  "status": "completed",
  "exit_code": 0,
  "duration_ms": 142,
  "output": "hello world\n"
}
```

