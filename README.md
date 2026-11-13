# CodeSync

A real-time collaborative code editor with sandboxed execution. Multiple users edit the same code file simultaneously with live cursors and selections, then execute the code in an isolated container sandbox with real-time streamed output.

---

## Architecture

```mermaid
flowchart TD
    subgraph Clients["Browsers (Monaco + Yjs)"]
        U1["User 1 (Alice)"]
        U2["User 2 (Bob)"]
        U3["User 3 (Charlie)"]
    end

    subgraph Frontend["Frontend Tier (Vite + React)"]
        Web["apps/web (:5173)"]
    end

    subgraph RealtimeTier["Realtime Collaboration Tier"]
        Hocus["apps/realtime (:1234)<br/>Node.js + Hocuspocus"]
    end

    subgraph APITier["Business Logic & Persistence"]
        API["apps/api (:8000)<br/>Django + DRF"]
        DB[("PostgreSQL (:5432)")]
    end

    subgraph ExecutionTier["Sandboxed Execution (Phase 3)"]
        Redis[("Redis (:6379)<br/>Broker & Pub/Sub")]
        Runner["apps/runner<br/>Celery Worker + Docker"]
    end

    U1 & U2 & U3 -->|HTTP/REST| Web
    Web -->|Proxy /api| API
    U1 & U2 & U3 <-->|WebSocket Yjs Sync & Awareness| Hocus
    API <-->|SQL Queries| DB
    API -.->|Task Dispatch| Redis
    Redis -.->|Consume Job| Runner
    Runner -.->|Publish Output| Redis
    Redis -.->|Subscribe Output| Hocus
    Hocus -.->|Internal Auth & Snapshots| API
```

---

## Features

### Phase 1: Collaboration Core (Complete)
- **Real-time Collaborative Editing**: Conflict-free text synchronization via Yjs CRDT and Monaco editor bindings (`y-monaco`).
- **Live Remote Cursors & Selections**: Peer awareness with deterministic user color assignments and remote cursor name tags.
- **Synchronized Language Selector**: Multi-language support (Python, JavaScript, C++) with instant CRDT map synchronization.
- **Room Management**: Create rooms and share unique link slugs via Django REST API.
- **Automated Convergence Testing**: Deterministic multi-client Yjs suite testing concurrent out-of-order edits.

### Phase 2: Auth, Permissions, Persistence & Presence (Complete)
- **JWT Authentication**: Register, login, refresh, logout with token blacklisting and user profile endpoints.
- **Role-Based Access Control**: Owner, editor, and viewer roles enforced on both REST API and WebSocket connection.
- **Read-Only Share Links**: Tokenized guest links allowing view-only access without an account.
- **Server-Side Write Rejection**: Two-layer enforcement (connection-level `readOnly` + binary frame inspection) dropping unauthorized document updates.
- **Debounced Yjs State Persistence**: Automatic 3-second debounced binary snapshots saved to PostgreSQL with 1 MB document size limits.

### Upcoming Phases
- **Phase 3**: Sandboxed Docker code execution with real-time streamed terminal output.
- **Phase 4**: Multi-instance horizontal scaling, load balancing, and benchmarks.
- **Phase 5**: Polish, themes, keyboard shortcuts, and AI error analysis.
- **Phase 5**: Polish, themes, keyboard shortcuts, and AI error analysis.

---

## Quick Start (Local Development)

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (with `pnpm`)
- Python 3.12+

### 1. Setup Environment
```bash
cp .env.example .env
```

### 2. Start Infrastructure
```bash
make dev-infra
# Starts PostgreSQL (5432) and Redis (6379)
```

### 3. Run Services

**Terminal 1 (Django API):**
```bash
cd apps/api
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

**Terminal 2 (Realtime Collaboration Service):**
```bash
cd apps/realtime
pnpm install
pnpm dev
# Listens on ws://localhost:1234
```

**Terminal 3 (Vite Web App):**
```bash
cd apps/web
pnpm install
pnpm dev
# Opens at http://localhost:5173
```

---

## Testing

```bash
# Run realtime convergence tests (Vitest)
cd apps/realtime && pnpm test

# Run API test suite (pytest)
cd apps/api && pytest
```

---

## Key Design Decisions
- **CRDT (Yjs) over OT**: Strong eventual consistency without central transform coordinator; robust offline/reconnection merge.
- **Stateless Realtime Tier**: Decoupled Node.js Hocuspocus service handles WebSocket broadcast with minimal memory overhead while Django owns business logic and database models.
- *Read the full design rationale in [docs/DESIGN.md](docs/DESIGN.md).*
