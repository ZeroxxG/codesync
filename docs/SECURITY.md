# CodeSync: Security Architecture & Threat Model

This document specifies the security controls, containment boundaries, threat vectors, and defense-in-depth protections implemented in CodeSync's sandboxed execution engine (**Phase 3**).

---

## 1. Threat Model & Risk Analysis

CodeSync allows untrusted users to write and execute arbitrary code in Python, JavaScript, and C++. Untrusted code execution introduces critical vulnerabilities if not isolated properly:

| Threat Vector | Potential Impact | Containment Mitigation |
|---|---|---|
| **CPU Starvation / Infinite Loops** | DoS on host machine or runner worker | Hard 10s wall-clock timeout killed by Python supervisor; `nano_cpus=500_000_000` (0.5 CPU core limit). |
| **Memory Exhaustion (OOM Bombs)** | Host kernel OOM panic, node crash | Linux cgroups memory limit: `mem_limit="128m"`, `memswap_limit="128m"`. Container terminated with exit code 137 upon breach. |
| **Process Table Exhaustion (Fork Bombs)** | Process table starvation, worker crash | Strict cgroups PID limit: `pids_limit=64`. System calls fail immediately with `EAGAIN` / `BlockingIOError`. |
| **Network Exfiltration / SSRF** | Data exfiltration, scanning internal VPC/host | Complete network isolation: `network_mode="none"`. Zero network interfaces beyond loopback; socket connections fail with `Network unreachable`. |
| **Filesystem Tampering / Persistence** | Rootkits, container escape, host file modification | Immutable root filesystem: `read_only=True`. Ephemeral in-memory tmpfs (`/tmp:size=16m,noexec,nosuid,nodev` for Python/JS; `exec,size=32m,nosuid,nodev` for C++). |
| **Privilege Escalation / Container Escape** | Host takeover via kernel exploit | Non-root unprivileged user `10001:10001` (`sandbox`), `cap_drop=["ALL"]`, `security_opt=["no-new-privileges:true"]`. |
| **Credential & Database Leakage** | Database compromise via environment inspection | Worker separation: `apps/runner` NEVER receives `POSTGRES_*` or `DJANGO_SECRET_KEY`. Container environment receives only standard execution paths. |
| **Docker Socket Abuse** | Host takeover via container daemon escape | Host Docker socket (`/var/run/docker.sock`) is NEVER mounted or exposed into sandbox containers. |
| **Output Flood DoS** | Memory/bandwidth exhaustion via massive stdout | Stream capped at 64KB (`MAX_OUTPUT_BYTES = 65536`). Output truncated with user notification. |
| **Orphaned Sandbox Accumulation** | Container leak after worker crash | Background Reaper Daemon (`apps/runner/runner/reaper.py`) sweeps and removes containers older than 30 seconds. |

---

## 2. Container Isolation Specification

Every execution container is created dynamically and destroyed immediately in a `finally` block using the following Docker parameters:

```python
container = client.containers.create(
    image=image_name,                      # Pre-built minimal Alpine image
    command=cmd,                          # Specific language entrypoint
    volumes={code_path: {'bind': f'/tmp/{filename}', 'mode': 'ro'}},  # Read-only code mount
    network_mode="none",                  # Complete network namespace isolation
    read_only=True,                       # Immutable container root filesystem
    tmpfs=tmpfs_options,                  # Ephemeral RAM-backed tmpfs (noexec for Py/JS)
    user="10001:10001",                   # Unprivileged non-root user
    cap_drop=["ALL"],                     # Drop all Linux capabilities (chown, net_admin, etc.)
    security_opt=["no-new-privileges:true"], # Block setuid / privilege escalation
    mem_limit="128m",                     # 128MB RAM limit
    memswap_limit="128m",                 # Zero swap allowance beyond 128MB
    nano_cpus=500_000_000,                # 0.5 CPU cores
    pids_limit=64,                        # Max 64 processes
    labels={"codesync": "sandbox", "run_id": run_id, "created_at": str(time.time())}
)
```

---

## 3. Worker & Service Separation

1. **Celery Worker (`apps/runner`)**:
   - Runs in an isolated service layer.
   - Connected only to `REDIS_URL` and `INTERNAL_API_URL`.
   - Never connects to PostgreSQL or Django ORM directly.
   - Reports completed exit code, duration, and output back to Django via internal authenticated endpoint `PUT /internal/runs/<run_id>/` with `X-Internal-Token`.

2. **Concurrency & Rate Limiting**:
   - **Per-Room Active Run Lock**: Redis mutex `room:<slug>:running_lock` with 15s TTL prevents overlapping runs in the same room (`409 Conflict`).
   - **Per-User Rate Limit**: 6 runs per minute (`429 Too Many Requests`).
   - **Per-Room Rate Limit**: 10 runs per minute (`429 Too Many Requests`).
   - **Viewer Role Rejection**: Users with `viewer` role are strictly blocked from triggering execution (`403 Forbidden`).

---

## 4. Adversarial Attack Suite (`apps/runner/tests/test_adversarial.py`)

Automated tests continuously verify the threat model against active exploits:

1. `test_infinite_loop_timeout`: Verifies process is terminated at timeout and flagged `status="timeout"`.
2. `test_memory_bomb_oom`: Verifies 200MB allocation is terminated by cgroups OOM killer (`status="oom"`, `exit_code=137`).
3. `test_fork_bomb_pid_limit`: Verifies process table exhaustion is prevented (`pids_limit=64`, `BlockingIOError`).
4. `test_output_flood_truncation`: Verifies 150KB stdout stream is truncated at 64KB with notice.
5. `test_outbound_network_blocked`: Verifies socket connection to external IP fails (`network_mode="none"`).
6. `test_read_only_root_filesystem`: Verifies write to `/etc` fails with `Read-only file system`.
7. `test_no_secret_environment_leakage`: Verifies container environment is clean of database or JWT secrets.
8. `test_docker_socket_not_exposed`: Verifies `/var/run/docker.sock` does not exist inside sandbox.

---

## 5. Future Hardening Paths (Phase 4 / Production)

For multi-tenant cloud scale, CodeSync can incorporate additional isolation layers:
- **gVisor (`runsc`)**: User-space kernel interception layer replacing default runc runtime for container syscall virtualization.
- **AWS Firecracker MicroVMs**: Minimal KVM-based microVMs per execution providing hardware-level virtualization with sub-100ms startup.
- **WebAssembly (Wasm / Wasmtime)**: Sandboxed browser-compatible execution for interpreted languages.
