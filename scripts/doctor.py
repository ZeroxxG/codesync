#!/usr/bin/env python3
"""
CodeSync Preflight Diagnostic Tool (make doctor)
Validates system prerequisites, Docker daemon status, required ports, and configuration.
"""

import errno
import os
import re
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


def print_status(tag: str, color: str, message: str) -> None:
    print(f"[{color}{tag}{RESET}] {message}")


def check_python() -> tuple[bool, str]:
    ver = sys.version_info
    v_str = f"{ver.major}.{ver.minor}.{ver.micro}"
    if ver >= (3, 12):
        return True, f"Python {v_str} (>= 3.12 required)"
    return False, f"Python {v_str} is too old. Requires Python 3.12+"


def check_tool(name: str, args: list[str], min_version_note: str = "") -> tuple[bool, str]:
    path = shutil.which(name)
    if not path:
        return False, f"{name} is not installed or not in PATH."
    try:
        cmd = [path] + args[1:]
        out = subprocess.check_output(cmd, stderr=subprocess.STDOUT, text=True, timeout=5, shell=False).strip()
        lines = [
            line.strip()
            for line in out.splitlines()
            if line.strip() and not line.strip().lower().startswith(("warn", "[warn"))
        ]
        first_line = lines[0] if lines else (out.splitlines()[0] if out else "installed")
        return True, f"{first_line} {min_version_note}".strip()
    except Exception as e:
        return False, f"{name} error: {e}"


def check_node_version() -> tuple[bool, str]:
    path = shutil.which("node")
    if not path:
        return False, "Node.js is not installed or not in PATH."
    try:
        out = subprocess.check_output([path, "--version"], stderr=subprocess.STDOUT, text=True, timeout=5, shell=False).strip()
        lines = [
            line.strip()
            for line in out.splitlines()
            if line.strip() and not line.strip().lower().startswith(("warn", "[warn"))
        ]
        first_line = lines[0] if lines else (out.splitlines()[0] if out else "")
        m = re.search(r"v?(\d+)", first_line)
        if m:
            major = int(m.group(1))
            if major >= 20:
                return True, f"{first_line} (>= 20 required)"
            return False, f"{first_line} is too old. Requires Node.js 20+"
        return False, f"Could not determine Node.js version from '{first_line}'."
    except Exception as e:
        return False, f"Node.js error: {e}"


def check_pnpm_version() -> tuple[bool, str]:
    path = shutil.which("pnpm")
    if not path:
        return False, "pnpm is not installed or not in PATH."
    try:
        cwd_dir = ROOT_DIR / "apps" / "web"
        cwd = str(cwd_dir) if cwd_dir.is_dir() else str(ROOT_DIR)

        if sys.platform == "win32" and path.lower().endswith((".cmd", ".bat")):
            cmd = [os.environ.get("COMSPEC", "cmd.exe"), "/d", "/c", path, "--version"]
        else:
            cmd = [path, "--version"]

        res = subprocess.run(cmd, capture_output=True, text=True, timeout=5, shell=False, cwd=cwd)
        if res.returncode == 0 and res.stdout.strip():
            first_line = res.stdout.strip().splitlines()[0]
            return True, f"{first_line} (9.x recommended)"

        err_msg = res.stderr.strip() or res.stdout.strip()
        first_err = err_msg.splitlines()[0] if err_msg else "unknown error"
        return False, f"pnpm error: {first_err[:80]}"
    except Exception as e:
        return False, f"pnpm error: {e}"


def is_wsl() -> bool:
    if "WSL_DISTRO_NAME" in os.environ:
        return True
    try:
        proc_version = Path("/proc/version")
        if proc_version.is_file():
            content = proc_version.read_text(encoding="utf-8", errors="ignore").lower()
            return "microsoft" in content or "wsl" in content
    except Exception:
        pass
    return False


def check_docker_daemon() -> tuple[bool, str]:
    try:
        res = subprocess.run(
            ["docker", "info", "--format", "{{.ServerVersion}}"],
            capture_output=True,
            text=True,
            timeout=8,
            shell=False,
        )
        if res.returncode == 0:
            version = res.stdout.strip()
            return True, f"Docker daemon is running (Engine v{version})"
        err = res.stderr or res.stdout or ""
        err_lines = [
            line.strip()
            for line in err.splitlines()
            if line.strip() and not line.strip().lower().startswith(("warn", "[warn"))
        ]
        clean_err = " ".join(err_lines) if err_lines else err.strip()
        err_lower = clean_err.lower()
        if "permission denied" in err_lower or "access is denied" in err_lower:
            return False, "Docker daemon permission denied."
        msg = clean_err[:80] if clean_err else "Daemon is not responding."
        return False, f"Docker daemon is not responding: {msg}"
    except FileNotFoundError:
        return False, "Docker CLI is not installed."
    except subprocess.TimeoutExpired:
        return False, "Docker daemon timed out responding to ping."
    except Exception as e:
        return False, f"Cannot reach Docker daemon: {e}"


IN_USE_ERRNOS = {errno.EADDRINUSE}
if hasattr(errno, "WSAEADDRINUSE"):
    IN_USE_ERRNOS.add(errno.WSAEADDRINUSE)

ACCESS_ERRNOS = {errno.EACCES}
if hasattr(errno, "WSAEACCES"):
    ACCESS_ERRNOS.add(errno.WSAEACCES)

UNAVAIL_ERRNOS = {
    value
    for name in ("EADDRNOTAVAIL", "EAFNOSUPPORT", "ENOPROTOOPT", "EINVAL")
    if (value := getattr(errno, name, None)) is not None
}
UNAVAIL_WINERRORS = {10049, 10047, 10046, 10051, 10022}


def check_port_free(port: int, desc: str) -> tuple[bool | None, str]:
    """
    Checks whether a TCP port is free for binding on local loopback
    addresses (127.0.0.1 and ::1).

    Returns:
        (True, msg): Port is confirmed free.
        (False, msg): Port is confirmed occupied (address already in use).
        (None, msg): Availability could not be determined (permission denied or unknown bind error).

    This does not test every network interface. A brief race condition
    is possible if another process binds the port after this check.
    """
    # 1. IPv4 loopback check
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s4:
            s4.bind(("127.0.0.1", port))
    except OSError as e:
        err_num = getattr(e, "errno", None)
        win_err = getattr(e, "winerror", None)

        if err_num in IN_USE_ERRNOS or win_err == 10048:
            return False, f"Port {port} ({desc}) is ALREADY IN USE on IPv4 (127.0.0.1)."

        if err_num in ACCESS_ERRNOS or win_err == 10013:
            return None, f"Port {port} ({desc}) permission denied on IPv4 (requires root/admin)."

        return None, f"Port {port} ({desc}) bind failed on IPv4: {e}"

    # 2. IPv6 loopback check (optional; skip only explicitly recognized unavailable errors)
    if socket.has_ipv6:
        try:
            with socket.socket(socket.AF_INET6, socket.SOCK_STREAM) as s6:
                s6.bind(("::1", port))
        except OSError as e:
            err_num = getattr(e, "errno", None)
            win_err = getattr(e, "winerror", None)

            if err_num in IN_USE_ERRNOS or win_err == 10048:
                return False, f"Port {port} ({desc}) is ALREADY IN USE on IPv6 (::1)."

            if err_num in ACCESS_ERRNOS or win_err == 10013:
                return None, f"Port {port} ({desc}) permission denied on IPv6 (requires root/admin)."

            unavailable = (
                err_num in UNAVAIL_ERRNOS
                or win_err in UNAVAIL_WINERRORS
            )

            if not unavailable:
                return None, f"Port {port} ({desc}) bind failed on IPv6: {e}"

    return True, f"Port {port} ({desc}) is free"


def check_sandbox_images() -> tuple[bool, str]:
    required = [
        "codesync-sandbox-python:latest",
        "codesync-sandbox-javascript:latest",
        "codesync-sandbox-cpp:latest",
    ]
    try:
        res = subprocess.run(
            ["docker", "image", "inspect"] + required,
            capture_output=True,
            text=True,
            timeout=10,
            shell=False,
        )
        if res.returncode == 0:
            return True, "All 3 sandbox runtime images are built and present"
        return False, "One or more sandbox runtime images are missing. Run 'make setup' to build them."
    except Exception as e:
        return False, f"Could not verify sandbox images: {e}"


def check_env_file() -> tuple[bool, str]:
    env_path = ROOT_DIR / ".env"
    if env_path.is_file():
        return True, ".env configuration file is present"
    return False, ".env file missing. Run 'make setup' or 'cp .env.example .env'."


def main() -> int:
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

    node_ok, node_msg = check_node_version()
    checks.append((node_ok, "Node.js", node_msg, "Install Node.js 20+ from nodejs.org."))

    pnpm_ok, pnpm_msg = check_pnpm_version()
    pnpm_status = True if pnpm_ok else None
    checks.append((
        pnpm_status,
        "pnpm",
        pnpm_msg,
        "Install pnpm via 'npm install -g pnpm@9.15.9' (optional for Docker-based workflow; required for local host development).",
    ))

    # 2. Docker Daemon
    daemon_ok, daemon_msg = check_docker_daemon()
    docker_fix = ""
    if not daemon_ok:
        err_lower = daemon_msg.lower()
        if "permission denied" in err_lower or "access is denied" in err_lower:
            if sys.platform == "win32":
                docker_fix = "Ensure user account has access to the Docker Desktop named pipe."
            elif is_wsl():
                docker_fix = "Add user to docker group ('sudo usermod -aG docker $USER && newgrp docker') or verify Docker Desktop WSL integration."
            elif sys.platform == "darwin":
                docker_fix = "Ensure Docker Desktop has permission to access the Docker socket."
            else:
                docker_fix = "Add user to docker group: 'sudo usermod -aG docker $USER && newgrp docker'."
        elif "not installed" in err_lower:
            docker_fix = "Install Docker Engine or Docker Desktop from docker.com."
        elif sys.platform == "win32":
            docker_fix = "Start Docker Desktop and verify with 'docker info'."
        elif sys.platform == "darwin":
            docker_fix = "Start Docker Desktop."
        elif is_wsl():
            docker_fix = (
                "Start Docker Desktop on Windows and verify WSL integration is enabled for your distribution (check 'docker info'), "
                "or run 'sudo systemctl start docker' if using a local Docker Engine service."
            )
        else:
            docker_fix = "Run 'sudo systemctl start docker'."

    checks.append((daemon_ok, "Docker Daemon", daemon_msg, docker_fix))

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
        sb_status = True if sb_ok else None
        sb_fix = "Run 'make build-sandboxes' or 'make setup' to build sandbox container images." if not sb_ok else ""
        checks.append((
            sb_status,
            "Sandbox Images",
            sb_msg,
            sb_fix,
        ))
    else:
        checks.append((
            None,
            "Sandbox Images",
            "Skipped (Docker daemon is not running).",
            "Start Docker daemon before verifying sandbox images.",
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
        p_status, p_msg = check_port_free(port, desc)
        if p_status is False:
            p_fix = f"Free up port {port} or inspect conflicting containers with 'docker ps'."
        elif p_status is None:
            p_fix = f"Verify user permissions or network configuration for port {port}."
        else:
            p_fix = ""
        checks.append((p_status, f"Port {port}", p_msg, p_fix))

    # Print results
    for status, category, msg, fix in checks:
        if status is True:
            print_status("PASS", GREEN, f"{category}: {msg}")
        elif status is None:
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
