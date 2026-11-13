# CodeSync: Architecture & Design Decisions

This document outlines the core technical decisions, trade-offs, and design rationale behind CodeSync. Every decision here is designed to be defensible in systems design and engineering interviews.

---

## 1. Why CRDT (Yjs) over Operational Transformation (OT)

### Context & Alternatives Considered
When building real-time collaborative text editors, there are two primary paradigms:
1. **Operational Transformation (OT)** (used by Google Docs, Etherpad).
2. **Conflict-Free Replicated Data Types (CRDTs)** (used by Figma, Apple Notes, Zed, CodeSync).

### Why CRDT (Specifically Yjs) was Chosen
- **Decentralized Convergence (Strong Eventual Consistency)**: OT relies strictly on a central server to establish a canonical total ordering of operations and transform concurrent operations against each other. If the central coordinator fails or drops connections, client states diverge easily. In contrast, Yjs documents are mathematically guaranteed to converge to the exact same state regardless of the order or delay in which updates arrive (`Y.applyUpdate(doc, update)`), without needing a complex central transform server.
- **Offline & Reconnection Resilience**: CRDT state vectors allow clients to capture local edits while offline, re-establish connection, and exchange binary diffs (`Y.encodeStateAsUpdate(doc, stateVector)`). This eliminates transform matrix rebasing and makes network partition handling clean and deterministic.
- **Yjs Performance & Memory Optimization**: Historically, academic CRDTs suffered from severe memory overhead (tombstones for every deleted character). Yjs solves this through a doubly-linked list of item blocks with run-length encoding. Sequential keystrokes are merged into single chunk structs, achieving memory overhead competitive with plain strings (~1-2 bytes per character in practical typing workloads) and sub-millisecond local update processing.
- **Ecosystem Maturity**: Yjs provides mature bindings for the Monaco editor (`y-monaco`), robust awareness protocol support (`y-protocols`), and binary state compression.

---

## 2. Why a Separate Node.js Realtime Service (not Django Channels)

### Architectural Separation
- **`apps/api` (Django + DRF)**: Owns the domain model, business logic, PostgreSQL database, authentication, user permissions (owner/editor/viewer), rate limits, and job dispatch.
- **`apps/realtime` (Node.js + Hocuspocus)**: Owns WebSocket connection handling, Yjs binary state propagation, and ephemeral awareness (cursor positions, presence). It is completely **stateless** and holds no direct connection to the database.

### Why this Split?
1. **Event Loop & High Concurrency Characteristics**:
   Real-time collaborative editing produces continuous small WebSocket packets (keystrokes, cursor coordinate updates every few milliseconds). Node.js's asynchronous single-threaded event loop and native V8 ArrayBuffer optimizations excel at high-frequency, non-blocking binary broadcast with minimal per-connection memory overhead (~10-20 KB per socket). Running this inside Python's ASGI/Django Channels would incur high overhead per connection and compete with CPU-bound business logic.
2. **Native Yjs Engine**:
   The reference and most performant Yjs implementation is in JavaScript/TypeScript. Running Yjs in Node allows the realtime server to parse, validate, and merge Yjs binary updates in-memory using the native library. While Python bindings (`ypy`) exist, the Node ecosystem (`@hocuspocus/server`) offers battle-tested binary protocol handling and lifecycle hooks.
3. **Fault Isolation & Blast Radius**:
   If an unexpected error or traffic spike occurs on the realtime WebSocket layer, the REST API and database remain completely unaffected. Conversely, heavy database migrations or complex API queries cannot degrade editor typing latency.
4. **Horizontal Scalability (Stateless Realtime Tier)**:
   Because the realtime service maintains no persistent database connection, scaling WebSocket capacity in Phase 4 requires only spinning up additional Node container instances behind a reverse proxy, synced via Redis pub/sub.

---

## 3. Awareness and Cursor Throttling

### The Problem
Monaco cursor movements generate high-frequency events (`onDidChangeCursorPosition` / `onDidChangeCursorSelection` can fire 60+ times per second during mouse drags or fast navigation). Broadcasting every raw cursor event to every peer in a room would flood the WebSocket connection and cause unnecessary re-renders.

### Solution & Design
1. **Decoupled CRDT Data vs Ephemeral Awareness**:
   Document content updates (Y.Text) and cursor positions (Awareness) are strictly separated. Cursor movements do NOT pollute the CRDT history and generate no permanent tombstones. If a client disconnects, their awareness state automatically expires via a heartbeat timeout (30 seconds in `y-protocols`).
2. **Stable Deterministic User Colors**:
   Each user is assigned a deterministic visual color derived from a hash of their display name/user ID (`getUserColor(id)`). This guarantees visual stability: reconnecting or refreshing the page retains the user's cursor color for their peers without needing database storage.
3. **CSS Class Injection**:
   Rather than re-rendering React trees on every cursor coordinate shift, Monaco decorations are styled via dynamic CSS classes injected into the DOM (`.yRemoteSelectionHead-${clientId}`). Monaco's native rendering engine updates the position smoothly via its internal hardware-accelerated canvas/DOM layer.

---

## 4. Document Persistence, Debouncing & Size Limits (Phase 2)

### 4.1 Debounced Snapshotting
In an active collaborative coding session with multiple participants typing simultaneously, writing to PostgreSQL on every keystroke would create hundreds of disk writes per second, saturating database connection pools and degrading performance.
- **Debounced Save Window (`SNAPSHOT_DEBOUNCE_MS=3000`)**: Changes emitted during typing reset a 3-second timer. Only after typing pauses for 3 seconds (or when the document is unloaded / clients disconnect) is a single combined snapshot written to Django via `PUT /internal/rooms/{id}/snapshot/`.
- **Raw Binary Storage**: The document state is encoded into Yjs binary update format (`Y.encodeStateAsUpdate(doc)`) and stored in a PostgreSQL `BinaryField` (`bytea`). This avoids serialization overhead to JSON and preserves Yjs internal state vectors.
- **Strict Size Cap (`MAX_DOCUMENT_BYTES=1048576`, 1 MB)**: Single source code files rarely exceed 1 MB. Capping snapshot writes protects both the Node process heap and PostgreSQL storage from malicious memory bloat or fork bombs.

### 4.2 Server-Side Viewer Protection
A critical security requirement is that users with `viewer` role (or anonymous guests via read-only share links) cannot modify the document. Client-side editor disables (`readOnly: true` in Monaco) are purely cosmetic and can be bypassed by an adversary sending raw WebSocket frames.
- **Two-Layer Server Rejection**:
  1. **Connection-level flag**: In `onAuthenticate`, when a viewer connects, `data.connection.readOnly = true` is set on the Hocuspocus connection.
  2. **Binary Packet Inspection**: In `beforeHandleMessage`, the realtime service intercepts incoming binary frames. Yjs message protocol byte 0 denotes a sync message, and byte 1 denotes message subtype (`1 = syncStep2`, `2 = update`). Any mutation frame from a viewer is rejected immediately with an authorization error before touching the memory `Y.Doc`.

### 4.3 Service-to-Service Isolation
The realtime service contains no database credentials and never connects directly to PostgreSQL.
- All persistence and role lookups route through Django internal endpoints (`/internal/rooms/{id}/snapshot/` and `/role/`).
- Protected by a preshared `INTERNAL_API_TOKEN` header. These endpoints are internal-only and inaccessible to public clients.

---

## 5. Scaling Strategy
*(Detailed specifications to be expanded in Phase 4)*
- Multiple realtime instances behind Traefik/Nginx with Redis pub/sub backplane.

## 6. Failure Modes
*(Detailed specifications to be expanded in Phase 4)*
- Worker crash, WebSocket disconnect recovery, and Redis reconnection handling.
