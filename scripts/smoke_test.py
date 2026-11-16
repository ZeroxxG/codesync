#!/usr/bin/env python3
"""
CodeSync End-to-End Stack Smoke Test (make smoke)
Validates:
1. System health endpoints (Django API, Postgres, Redis, Realtime Hocuspocus).
2. Guest room creation via REST API.
3. Two WebSocket clients connecting and converging edits via Yjs CRDTs.
4. Sandboxed code execution with live output capture and exit verification.
"""

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent

GREEN = "\033[92m"
RED = "\033[91m"
BLUE = "\033[94m"
BOLD = "\033[1m"
RESET = "\033[0m"


def log_pass(msg: str):
    print(f"[{GREEN}PASS{RESET}] {msg}")


def log_fail(msg: str):
    print(f"[{RED}FAIL{RESET}] {msg}")


def log_info(msg: str):
    print(f"[{BLUE}INFO{RESET}] {msg}")


def http_get(url: str, timeout: int = 5) -> tuple[int, dict | str]:
    req = urllib.request.Request(url, headers={"User-Agent": "CodeSync-SmokeTester"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status = resp.status
            body = resp.read().decode("utf-8")
            try:
                return status, json.loads(body)
            except Exception:
                return status, body
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body
    except Exception as e:
        return 0, str(e)


def http_post(url: str, data: dict, timeout: int = 5) -> tuple[int, dict | str]:
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "CodeSync-SmokeTester",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status = resp.status
            body = resp.read().decode("utf-8")
            try:
                return status, json.loads(body)
            except Exception:
                return status, body
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body
    except Exception as e:
        return 0, str(e)


def test_health_endpoints() -> bool:
    log_info("Stage 1: Testing system health endpoints...")

    # 1. API Basic Health
    code, body = http_get("http://127.0.0.1:8000/api/health/")
    if code != 200 or not isinstance(body, dict) or body.get("status") not in ("ok", "healthy"):
        log_fail(f"API health (/api/health/) returned HTTP {code}: {body}")
        return False
    log_pass("Django API health endpoint (/api/health/) responded 200 OK")

    # 2. API Deep Health (Database & Redis ping)
    code, body = http_get("http://127.0.0.1:8000/health/")
    if code != 200 or not isinstance(body, dict) or body.get("status") not in ("ok", "healthy"):
        log_fail(f"Deep system health (/health/) returned HTTP {code}: {body}")
        return False
    log_pass("System dependencies (/health/) healthy (PostgreSQL & Redis connected)")

    # 3. Realtime Service Health
    code, body = http_get("http://127.0.0.1:1234/health")
    if code != 200 or not isinstance(body, dict) or body.get("status") != "healthy":
        log_fail(f"Realtime health (:1234/health) returned HTTP {code}: {body}")
        return False
    log_pass("Hocuspocus realtime server (:1234/health) responded 200 OK")

    # 4. Optional Nginx Ingress check if listening on port 80
    code, body = http_get("http://127.0.0.1:80/api/health/")
    if code == 200:
        log_pass("Nginx Gateway (:80/api/health/) proxy routing verified")

    return True


def test_room_creation() -> tuple[bool, str]:
    log_info("Stage 2: Testing guest room creation...")
    data = {
        "title": f"Smoke Test Room {int(time.time())}",
        "language": "python",
    }
    code, body = http_post("http://127.0.0.1:8000/api/rooms/", data)
    if code != 201 or not isinstance(body, dict) or "slug" not in body:
        log_fail(f"Room creation failed with HTTP {code}: {body}")
        return False, ""

    slug = body["slug"]
    log_pass(f"Created guest room successfully (slug: '{slug}')")
    return True, slug


def test_realtime_convergence(slug: str) -> bool:
    log_info("Stage 3: Testing WebSocket CRDT convergence between 2 peers...")
    script_path = ROOT_DIR / "scripts" / "smoke_realtime.mjs"

    # Attempt 1: Run via local node
    res = subprocess.run(
        ["node", str(script_path), slug, "ws://127.0.0.1:1234"],
        capture_output=True,
        text=True,
    )
    if res.returncode == 0:
        log_pass("Two WebSocket clients connected and converged Yjs edits seamlessly")
        return True

    # Attempt 2: If local node lacks modules, run inside web container
    log_info("Local node modules missing; attempting inside web container...")
    node_inline = (
        "import { HocuspocusProvider } from '@hocuspocus/provider';"
        f"const p1 = new HocuspocusProvider({{ url: 'ws://realtime-1:1234', name: '{slug}', token: 'anonymous', parameters: {{ user: 'SmokeUser1' }} }});"
        f"const p2 = new HocuspocusProvider({{ url: 'ws://realtime-2:1234', name: '{slug}', token: 'anonymous', parameters: {{ user: 'SmokeUser2' }} }});"
        "p1.on('synced', () => { p1.document.getText('monaco').insert(0, 'SMOKE_OK'); });"
        "p2.document.getText('monaco').observe(() => {"
        "  if (p2.document.getText('monaco').toString() === 'SMOKE_OK') {"
        "    p1.destroy(); p2.destroy();"
        "    process.exit(0);"
        "  }"
        "});"
        "setTimeout(() => { console.error('Timed out waiting for convergence'); process.exit(1); }, 10000);"
    )
    res_docker = subprocess.run(
        [
            "docker",
            "compose",
            "exec",
            "-T",
            "web",
            "node",
            "--experimental-websocket",
            "--input-type=module",
            "-e",
            node_inline,
        ],
        capture_output=True,
        text=True,
    )
    if res_docker.returncode == 0:
        log_pass("Two WebSocket clients converged edits inside realtime cluster")
        return True

    log_fail(f"Realtime convergence test failed:\n{res.stderr or res.stdout or res_docker.stderr}")
    return False


def test_sandboxed_execution(slug: str) -> bool:
    log_info("Stage 4: Testing sandboxed code execution...")
    secret_marker = f"CodeSync_Smoke_Token_{int(time.time())}"
    run_payload = {
        "language": "python",
        "code": f"import sys\nprint('{secret_marker}')\nsys.stdout.flush()\n",
    }

    code, body = http_post(f"http://127.0.0.1:8000/api/rooms/{slug}/runs/", run_payload)
    if code != 201 or not isinstance(body, dict) or "id" not in body:
        log_fail(f"Execution request failed with HTTP {code}: {body}")
        return False

    run_id = body["id"]
    log_pass(f"Dispatched execution task to runner queue (Run ID: {run_id})")

    # Poll for completion (timeout 20s)
    log_info("Waiting for sandboxed container execution result...")
    start = time.time()
    while time.time() - start < 20:
        time.sleep(1)
        c, runs = http_get(f"http://127.0.0.1:8000/api/rooms/{slug}/runs/")
        if c == 200 and isinstance(runs, list):
            target = next((r for r in runs if r.get("id") == run_id), None)
            if target and target.get("status") in ("completed", "failed", "timeout", "oom"):
                status = target.get("status")
                exit_code = target.get("exit_code")
                output = target.get("output", "")
                if status == "completed" and exit_code == 0 and secret_marker in output:
                    log_pass(f"Execution completed in container (exit: 0, duration: {target.get('duration_ms')}ms)")
                    log_pass(f"Verified streamed stdout output: '{output.strip()}'")
                    return True
                else:
                    log_fail(f"Execution finished with non-zero or unexpected state: status={status}, exit={exit_code}, output={output}")
                    return False

    log_fail("Execution timed out waiting for Celery worker and Docker sandbox container")
    return False


def main():
    print(f"\n{BOLD}{BLUE}==============================================={RESET}")
    print(f"{BOLD}{BLUE}       CodeSync Full-Stack Smoke Test          {RESET}")
    print(f"{BOLD}{BLUE}==============================================={RESET}\n")

    # Stage 1: Health
    if not test_health_endpoints():
        print(f"\n{RED}{BOLD}Smoke test aborted at Stage 1 (Health Endpoints).{RESET}\n")
        return 1

    # Stage 2: Room Creation
    room_ok, slug = test_room_creation()
    if not room_ok:
        print(f"\n{RED}{BOLD}Smoke test aborted at Stage 2 (Room Creation).{RESET}\n")
        return 1

    # Stage 3: Realtime Convergence
    if not test_realtime_convergence(slug):
        print(f"\n{RED}{BOLD}Smoke test aborted at Stage 3 (Realtime Convergence).{RESET}\n")
        return 1

    # Stage 4: Sandboxed Code Execution
    if not test_sandboxed_execution(slug):
        print(f"\n{RED}{BOLD}Smoke test aborted at Stage 4 (Sandboxed Execution).{RESET}\n")
        return 1

    print(f"\n{GREEN}{BOLD}==============================================={RESET}")
    print(f"{GREEN}{BOLD} ✓ ALL SMOKE TESTS PASSED (Stack is Production-Ready) {RESET}")
    print(f"{GREEN}{BOLD}==============================================={RESET}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
