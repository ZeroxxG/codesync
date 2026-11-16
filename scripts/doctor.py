#!/usr/bin/env python3
"""
CodeSync Preflight Diagnostic Tool (make doctor)
Validates system prerequisites, Docker daemon status, required ports, and configuration.
"""

import os
import shutil
import socket
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent

RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
BOLD = "\033[1m"
RESET = "\033[0m"


def print_status(tag: str, color: str, message: str):
    print(f"[{color}{tag}{RESET}] {message}")


def check_python() -> tuple[bool, str]:
    ver = sys.version_info
    v_str = f"{ver.major}.{ver.minor}.{ver.micro}"
    if ver >= (3, 11):
        return True, f"Python {v_str} (>= 3.11 required)"
    return False, f"Python {v_str} is too old. Requires Python 3.11+"


def check_tool(name: str, args: list[str], min_version_note: str = "") -> tuple[bool, str]:
    path = shutil.which(name)
    if not path:
        return False, f"{name} is not installed or not in PATH."
    try:
        use_shell = sys.platform == "win32"
        out = subprocess.check_output(args, stderr=subprocess.STDOUT, text=True, timeout=5, shell=use_shell).strip()
        first_line = out.splitlines()[0] if out else "installed"
        return True, f"{first_line} {min_version_note}".strip()
    except Exception as e:
        return False, f"{name} error: {e}"


def check_docker_daemon() -> tuple[bool, str]:
    try:
        res = subprocess.run(
            ["docker", "info", "--format", "{{.ServerVersion}}"],
            capture_output=True,
            text=True,
            timeout=8,
        )
        if res.returncode == 0:
            version = res.stdout.strip()
            return True, f"Docker daemon is running (Engine v{version})"
        err = res.stderr.strip() or res.stdout.strip()
        if "permission denied" in err.lower() or "access is denied" in err.lower():
            return False, "Docker daemon permission denied. Ensure user is in 'docker' group or has socket access."
        return False, f"Docker daemon is not responding: {err[:80]}"
    except FileNotFoundError:
        return False, "Docker CLI is not installed."
    except subprocess.TimeoutExpired:
        return False, "Docker daemon timed out responding to ping."
    except Exception as e:
        return False, f"Cannot reach Docker daemon: {e}"


def check_port_free(port: int, desc: str) -> tuple[bool, str]:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind(("127.0.0.1", port))
        s.close()
        return True, f"Port {port} ({desc}) is free"
    except OSError:
        return False, f"Port {port} ({desc}) is ALREADY IN USE by another process."


def check_sandbox_images() -> tuple[bool, str]:
    required = [
        "codesync-sandbox-python:latest",
        "codesync-sandbox-javascript:latest",
        "codesync-sandbox-cpp:latest",
    ]
    missing = []
    try:
        res = subprocess.run(
            ["docker", "image", "inspect"] + required,
            capture_output=True,
            text=True,
            timeout=10,
        )
        if res.returncode == 0:
            return True, "All 3 sandbox runtime images are built and present"
        return False, "One or more sandbox runtime images are missing. Run 'make setup' to build them."
    except Exception:
        return False, "Could not verify sandbox images (Docker unreachable)."


def check_env_file() -> tuple[bool, str]:
    env_path = ROOT_DIR / ".env"
    if env_path.is_file():
        return True, ".env configuration file is present"
    return False, ".env file missing. Run 'make setup' or 'cp .env.example .env'."


def main():
    print(f"\n{BOLD}{BLUE}=== CodeSync Preflight System Doctor ==={RESET}\n")

    checks = []
    failures = []
    warnings = []

    # 1. Environment & Tools
    py_ok, py_msg = check_python()
    checks.append((py_ok, "Python", py_msg, "Install Python 3.12+ from python.org or system package manager."))

    git_ok, git_msg = check_tool("git", ["git", "--version"])
    checks.append((git_ok, "Git", git_msg, "Install Git from git-scm.com."))

    dock_ok, dock_msg = check_tool("docker", ["docker", "--version"])
    checks.append((dock_ok, "Docker CLI", dock_msg, "Install Docker Engine or Docker Desktop from docker.com."))

    node_ok, node_msg = check_tool("node", ["node", "--version"], "(>= 20 required)")
    checks.append((node_ok, "Node.js", node_msg, "Install Node.js 20+ from nodejs.org."))

    pnpm_ok, pnpm_msg = check_tool("pnpm", ["pnpm", "--version"], "(9.x recommended)")
    checks.append((pnpm_ok, "pnpm", pnpm_msg, "Install pnpm via 'npm install -g pnpm@9.15.9'."))

    # 2. Docker Daemon
    daemon_ok, daemon_msg = check_docker_daemon()
    checks.append((
        daemon_ok,
        "Docker Daemon",
        daemon_msg,
        "Start Docker Desktop or run 'sudo systemctl start docker'.",
    ))

    # 3. Environment configuration file
    env_ok, env_msg = check_env_file()
    checks.append((
        env_ok,
        ".env File",
        env_msg,
        "Run 'make setup' or copy '.env.example' to '.env'.",
    ))

    # 4. Sandbox Images
    if daemon_ok:
        sb_ok, sb_msg = check_sandbox_images()
        checks.append((
            sb_ok,
            "Sandbox Images",
            sb_msg,
            "Run 'make build-sandboxes' or 'make setup' to build sandbox container images.",
        ))

    # 5. Required Ports
    ports_to_check = [
        (80, "Nginx Ingress / HTTP Gateway"),
        (1234, "Realtime Hocuspocus WebSocket"),
        (5173, "Web Frontend Vite Dev"),
        (5432, "PostgreSQL Database"),
        (6379, "Redis Message Broker"),
        (8000, "Django REST API"),
    ]

    for port, desc in ports_to_check:
        p_ok, p_msg = check_port_free(port, desc)
        checks.append((
            p_ok,
            f"Port {port}",
            p_msg,
            f"Free up port {port} or inspect conflicting containers with 'docker ps'.",
        ))

    # Print results
    for ok, category, msg, fix in checks:
        if ok:
            print_status("PASS", GREEN, f"{category}: {msg}")
        else:
            if category in ("Sandbox Images", "pnpm", "Node.js"):
                print_status("WARN", YELLOW, f"{category}: {msg}")
                warnings.append((category, fix))
            else:
                print_status("FAIL", RED, f"{category}: {msg}")
                failures.append((category, fix))

    print(f"\n{BOLD}=== Doctor Summary ==={RESET}")
    if not failures and not warnings:
        print(f"{GREEN}{BOLD}✓ All preflight checks passed! System is ready to run CodeSync.{RESET}\n")
        print("To start the stack, run:\n  make dev\n")
        return 0

    if warnings:
        print(f"\n{YELLOW}{BOLD}Warnings (optional / can be auto-resolved):{RESET}")
        for cat, fix in warnings:
            print(f"  - {BOLD}{cat}{RESET}: {fix}")

    if failures:
        print(f"\n{RED}{BOLD}Critical Issues to Resolve Before Starting:{RESET}")
        for cat, fix in failures:
            print(f"  - {BOLD}{cat}{RESET}: {fix}")
        print("\nFix the issues above and re-run: make doctor\n")
        return 1

    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
