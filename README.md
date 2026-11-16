# CodeSync

A real-time collaborative code editor with conflict-free Yjs CRDT synchronization and secure sandboxed execution of untrusted code inside isolated, resource-constrained container environments.

[![CI](https://github.com/ZeroxxG/codesync/actions/workflows/ci.yml/badge.svg)](https://github.com/ZeroxxG/codesync/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)
![Django](https://img.shields.io/badge/Django-5.1-092E20?logo=django&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Sandboxed-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

[Live Demo](https://codesyncapp.duckdns.org) · [Architecture](docs/DESIGN.md) · [Security](docs/SECURITY.md) · [Benchmarks](docs/BENCHMARKS.md) · [Deployment](docs/DEPLOYMENT.md)

---

## Overview

![CodeSync Collaborative Editor & Sandboxed Execution](docs/assets/demo.gif)

*Two browser sessions editing Python code with live remote cursors, followed by sandboxed execution streaming stdout/stderr back into the terminal drawer.*

> **Live Demo**: [https://codesyncapp.duckdns.org](https://codesyncapp.duckdns.org)  
> **Demo Access**: Instant anonymous room creation or guest join — no login required. Optional user registration and login available on the home page.

---

## Why This Project Is Interesting

- **Conflict-Free Convergence Without Central Rebase**: Built on Yjs Conflict-Free Replicated Data Types (CRDTs). Edits merge deterministically (`Y.applyUpdate`) across high-latency or temporarily disconnected clients without a centralized Operational Transformation (OT) rebase server.
- **Defense-in-Depth Container Sandboxing**: Untrusted Python, Node.js, and C++ code executes in disposable Alpine containers with zero network access (`network_mode="none"`), immutable root filesystems (`read_only=True`), dropped Linux capabilities (`cap_drop=["ALL"]`), unprivileged execution (`10001:10001`), and hard limits on memory (128 MB), CPU (0.5 cores), processes (64 PIDs), and runtime (10s wall timeout).
- **Two-Layer Server-Side Permission Enforcement**: Read-only guest viewers are restricted both at the WebSocket connection level (`readOnly = true`) and via deep binary frame inspection that discards unauthorized document updates before they reach the server's in-memory `Y.Doc`.
- **Horizontal Multi-Instance Clustering**: A stateless Node.js Hocuspocus tier synchronized over a Redis Pub/Sub cluster backplane allows independent scaling of WebSocket connection capacity behind an Nginx load balancer (`ip_hash`) with a median cross-instance sync latency of 29.03 ms.
