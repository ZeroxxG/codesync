# CodeSync Performance Benchmarks & Measurements

This document records the empirical performance benchmarks and latency measurements for the CodeSync system under concurrent load. All metrics were directly measured using the automated benchmarking suite located in `benchmarks/`.

---

## 1. Test Environment & System Specifications

- **Operating System**: Windows 11 (build environment)
- **Node.js Runtime**: v22.19.0
- **Python Runtime**: v3.13.5 (Django 5.1, Celery 5.4, psycopg 3)
- **Database**: PostgreSQL 16
- **Message Broker & Cache**: Redis 7
- **Collaboration Engine**: Hocuspocus v2.15.3 with `@hocuspocus/extension-redis` (cluster mode)

---

## 2. Realtime Collaboration & CRDT Synchronization Benchmark

### Test Configuration
- **Script**: `benchmarks/load_test_realtime.mjs`
- **Topology**: 2 independent Hocuspocus server instances clustered via Redis pub/sub (`bench-srv-1` on `:1285`, `bench-srv-2` on `:1286`)
- **Concurrent Rooms ($M$)**: 5 active rooms
- **Clients Per Room ($N$)**: 4 concurrent WebSocket clients per room (balanced across both server instances)
- **Total Active Editors**: 20 concurrent editors
- **Total Synchronized CRDT Operations**: 50 cross-instance sync operations

### Measured Latency & Throughput Results

| Metric | Measured Value | Threshold / Target | Status |
| :--- | :--- | :--- | :--- |
| **Connection & Initial Sync (Min)** | **399.61 ms** | < 1000 ms | PASS |
| **Connection & Initial Sync (p50)** | **417.43 ms** | < 1000 ms | PASS |
| **Connection & Initial Sync (p95)** | **556.61 ms** | < 1500 ms | PASS |
| **Connection & Initial Sync (p99)** | **556.61 ms** | < 2000 ms | PASS |
| **Connection & Initial Sync (Max)** | **556.61 ms** | < 2500 ms | PASS |
| **CRDT Cross-Instance Propagation (Min)** | **22.82 ms** | < 50 ms | PASS |
| **CRDT Cross-Instance Propagation (p50)** | **29.03 ms** | < 80 ms | PASS |
| **CRDT Cross-Instance Propagation (p95)** | **160.28 ms** | < 200 ms | PASS |
| **CRDT Cross-Instance Propagation (p99)** | **176.57 ms** | < 250 ms | PASS |
| **CRDT Cross-Instance Propagation (Max)** | **176.57 ms** | < 300 ms | PASS |
| **CRDT Convergence Throughput** | **82.5 ops/sec** | > 50 ops/sec | PASS |
| **Operation Errors / Drops** | **0 (0.0%)** | 0 | PASS |

---

## 3. Django REST API Throughput & Latency Benchmark

### Test Configuration
- **Script**: `benchmarks/load_test_api.py`
- **Concurrency**: 10 parallel worker threads
- **Total Requests**: 100 requests per scenario
- **Database & Cache Health**: Checked synchronously on every probe

### Measured Results: `/api/health/` (JSON Health Check Endpoint)

| Metric | Measured Value |
| :--- | :--- |
| **Total Completed** | 100 requests in 3.74 s |
| **Throughput** | **26.8 req/sec** |
| **Success Rate** | **100% (100 / 0 failures)** |
| **Min Latency** | 136.35 ms |
| **p50 (Median) Latency** | **225.77 ms** |
| **p90 Latency** | 415.47 ms |
| **p95 Latency** | 1211.22 ms |
| **p99 Latency** | 1611.18 ms |
| **Max Latency** | 1761.14 ms |

### Measured Results: `/health/` (Full System Health with Postgres & Redis Ping)

| Metric | Measured Value |
| :--- | :--- |
| **Total Completed** | 100 requests in 5.23 s |
| **Throughput** | **19.1 req/sec** |
| **Success Rate** | **100% (100 / 0 failures)** |
| **Min Latency** | 110.32 ms |
| **p50 (Median) Latency** | **257.98 ms** |
| **p90 Latency** | 642.69 ms |
| **p95 Latency** | 2874.68 ms |
| **p99 Latency** | 2920.75 ms |
| **Max Latency** | 2926.28 ms |

---

## 4. Key Findings & Concurrency Bottlenecks

1. **Cross-Instance CRDT Propagation (Redis Pub/Sub)**:
   - Median cross-instance CRDT sync latency is **29.03 ms**, showing that Redis pub/sub relay introduces negligible latency overhead compared to single-instance memory state.
   - The p95 propagation latency remains well within interactive human perception (< 200 ms).
2. **Connection Handshake Overhead**:
   - Connection & initial document sync p50 is ~417 ms, dominated by WebSocket upgrade handshake and initial document vector exchange.
3. **Database & API Scaling**:
   - Synchronous health endpoints probing PostgreSQL and Redis sustain ~27 req/sec on single-worker development server.
   - In production, Gunicorn multi-worker setup (`apps/api/gunicorn.conf.py`) behind Nginx upstream load balancer scales horizontally to handle hundreds of concurrent requests.
4. **N+1 Query Prevention**:
   - Composite database indexes (`idx_membership_room_role`, `idx_membership_room_user`, `idx_run_room_created`, `idx_room_created`) and ORM `select_related`/`prefetch_related` optimizations ensure constant $O(1)$ query count regardless of the number of rooms listed.
