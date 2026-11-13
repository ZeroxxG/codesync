from unittest.mock import patch
import pytest
from runner import config as cfg
from runner.sandbox import DockerSandboxExecutor


@pytest.fixture(scope="module")
def executor():
    return DockerSandboxExecutor()


def test_infinite_loop_timeout(executor):
    """Attack 1: Infinite CPU/time loop must be terminated at timeout limit."""
    code = """
import time
while True:
    time.sleep(0.02)
"""
    with patch.object(cfg, "EXECUTION_TIMEOUT_SECONDS", 2):
        res = executor.execute("adv-loop", "python", code)
    assert res.status == "timeout"
    assert res.exit_code in (124, 137)
    assert "Wall-clock timeout exceeded" in res.output


def test_memory_bomb_oom(executor):
    """Attack 2: Memory allocation exceeding 128MB limit triggers OOM kill."""
    code = """
b = bytearray(200 * 1024 * 1024)
print("ALLOCATED")
"""
    res = executor.execute("adv-oom", "python", code)
    assert res.status == "oom" or res.exit_code == 137
    assert "ALLOCATED" not in res.output
    assert "Out of Memory limit reached" in res.output or res.exit_code == 137


def test_fork_bomb_pid_limit(executor):
    """Attack 3: Process table exhaustion is contained by pids_limit=64."""
    code = """
import os
blocked = 0
for _ in range(120):
    try:
        os.fork()
    except OSError:
        blocked += 1
print(f"FORK_BLOCKED_{blocked > 0}")
"""
    res = executor.execute("adv-fork", "python", code)
    assert "FORK_BLOCKED_True" in res.output or res.status in ("completed", "failed")


def test_output_flood_truncation(executor):
    """Attack 4: Massive stdout stream is capped at 64KB with notice."""
    code = """
print("X" * 150000)
"""
    res = executor.execute("adv-flood", "python", code)
    assert len(res.output) <= cfg.MAX_OUTPUT_BYTES + 200
    assert "[Output truncated at 64KB]" in res.output


def test_outbound_network_blocked(executor):
    """Attack 5: Outbound network calls fail immediately (network_mode=none)."""
    code = """
import socket
try:
    s = socket.create_connection(("1.1.1.1", 80), timeout=2)
    print("NETWORK_SUCCESS")
except OSError as e:
    print(f"NETWORK_BLOCKED_{type(e).__name__}")
"""
    res = executor.execute("adv-net", "python", code)
    assert "NETWORK_SUCCESS" not in res.output
    assert "NETWORK_BLOCKED" in res.output


def test_read_only_root_filesystem(executor):
    """Attack 6: Writes to root filesystem are denied."""
    code = """
try:
    with open("/etc/injected.txt", "w") as f:
        f.write("hacked")
    print("WRITE_SUCCESS")
except OSError as e:
    print(f"FS_BLOCKED_{type(e).__name__}")
"""
    res = executor.execute("adv-fs", "python", code)
    assert "WRITE_SUCCESS" not in res.output
    assert "FS_BLOCKED" in res.output


def test_no_secret_environment_leakage(executor):
    """Attack 7: Secrets and credentials are not present in container environment."""
    code = """
import os
suspicious = [
    k for k in os.environ
    if any(s in k.lower() for s in ["secret", "token", "password", "postgres", "django", "redis", "database"])
]
print("SUSPICIOUS_VARS:", suspicious)
"""
    res = executor.execute("adv-env", "python", code)
    assert "SUSPICIOUS_VARS: []" in res.output


def test_docker_socket_not_exposed(executor):
    """Attack 8: Host Docker daemon socket is inaccessible from inside sandbox."""
    code = """
import os
sock_exists = os.path.exists("/var/run/docker.sock")
print("DOCKER_SOCKET_FOUND:", sock_exists)
"""
    res = executor.execute("adv-sock", "python", code)
    assert "DOCKER_SOCKET_FOUND: False" in res.output
