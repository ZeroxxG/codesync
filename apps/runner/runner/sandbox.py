import logging
import os
import tempfile
import threading
import time
from typing import Callable, Optional
import docker
from docker.errors import APIError, DockerException
from . import config as cfg

logger = logging.getLogger(__name__)


class SandboxExecutionResult:
    def __init__(
        self,
        exit_code: int,
        status: str,
        duration_ms: int,
        output: str,
    ):
        self.exit_code = exit_code
        self.status = status
        self.duration_ms = duration_ms
        self.output = output

    def to_dict(self) -> dict:
        return {
            "exit_code": self.exit_code,
            "status": self.status,
            "duration_ms": self.duration_ms,
            "output": self.output,
        }

    def __repr__(self) -> str:
        return f"<SandboxExecutionResult status={self.status} exit_code={self.exit_code} duration_ms={self.duration_ms}>"


class DockerSandboxExecutor:
    """
    Executes user code inside disposable, heavily-contained Docker containers.
    Enforces no network, read-only root, memory/CPU/PID caps, non-root user,
    dropped capabilities, and strict wall-clock timeout.
    """

    def __init__(self, client: Optional[docker.DockerClient] = None):
        self._client = client

    @property
    def client(self) -> docker.DockerClient:
        if self._client is None:
            self._client = docker.from_env()
        return self._client

    def execute(
        self,
        run_id: str,
        language: str,
        code: str,
        on_output_chunk: Optional[Callable[[str], None]] = None,
    ) -> SandboxExecutionResult:
        lang = language.lower().strip()
        if lang not in cfg.SANDBOX_IMAGES:
            return SandboxExecutionResult(
                exit_code=1,
                status="failed",
                duration_ms=0,
                output=f"Unsupported language: '{language}'. Supported: {list(cfg.SANDBOX_IMAGES.keys())}",
            )

        image = cfg.SANDBOX_IMAGES[lang]
        if lang == "python":
            filename = "code.py"
            command = ["python", "-u", "/tmp/code.py"]
            tmpfs_opts = {"/tmp": "size=16m,noexec,nosuid,nodev"}
        elif lang == "javascript":
            filename = "code.js"
            command = ["node", "/tmp/code.js"]
            tmpfs_opts = {"/tmp": "size=16m,noexec,nosuid,nodev"}
        elif lang == "cpp":
            filename = "code.cpp"
            command = ["/usr/local/bin/run_cpp.sh"]
            tmpfs_opts = {"/tmp": "exec,size=32m,nosuid,nodev"}
        else:
            filename = "code.txt"
            command = ["cat", "/tmp/code.txt"]
            tmpfs_opts = {"/tmp": "size=16m,noexec,nosuid,nodev"}

        container = None
        collected_chunks = []
        total_bytes = 0
        truncated = False
        stop_stream = threading.Event()
        start_time = time.monotonic()

        try:
            with tempfile.TemporaryDirectory(prefix=f"codesync-run-{run_id[:8]}-") as td:
                host_code_path = os.path.join(td, filename)
                with open(host_code_path, "w", encoding="utf-8") as f:
                    f.write(code)

                container_name = f"codesync-sb-{run_id[:8]}-{int(time.time() * 1000) % 1000000}"

                container = self.client.containers.create(
                    image=image,
                    name=container_name,
                    command=command,
                    volumes={host_code_path: {"bind": f"/tmp/{filename}", "mode": "ro"}},
                    network_mode="none",
                    read_only=True,
                    tmpfs=tmpfs_opts,
                    user="10001:10001",
                    cap_drop=["ALL"],
                    security_opt=["no-new-privileges:true"],
                    mem_limit=cfg.MEMORY_LIMIT,
                    memswap_limit=cfg.MEMSWAP_LIMIT,
                    nano_cpus=cfg.NANO_CPUS,
                    pids_limit=cfg.PIDS_LIMIT,
                    labels={
                        "codesync": "sandbox",
                        "run_id": run_id,
                        "created_at": str(time.time()),
                    },
                )

                container.start()

                # Stream logs in background thread
                def _stream_reader():
                    nonlocal total_bytes, truncated
                    try:
                        for chunk in container.logs(stream=True, follow=True, stdout=True, stderr=True):
                            if stop_stream.is_set():
                                break
                            text = chunk.decode("utf-8", errors="replace")
                            if total_bytes + len(text) > cfg.MAX_OUTPUT_BYTES:
                                allowed = max(0, cfg.MAX_OUTPUT_BYTES - total_bytes)
                                if allowed > 0:
                                    trimmed = text[:allowed]
                                    collected_chunks.append(trimmed)
                                    total_bytes += len(trimmed)
                                    if on_output_chunk:
                                        on_output_chunk(trimmed)
                                truncated = True
                                break
                            else:
                                collected_chunks.append(text)
                                total_bytes += len(text)
                                if on_output_chunk:
                                    on_output_chunk(text)
                    except Exception as ex:
                        logger.debug("Log streaming finished or interrupted: %s", ex)

                stream_thread = threading.Thread(target=_stream_reader, daemon=True)
                stream_thread.start()

                # Wait for container completion or timeout
                timed_out = False
                try:
                    container.wait(timeout=cfg.EXECUTION_TIMEOUT_SECONDS)
                except Exception:
                    timed_out = True
                    try:
                        container.kill()
                    except Exception:
                        pass

                stop_stream.set()
                stream_thread.join(timeout=1.0)

                # Ensure all logs are captured even if container exited before stream attached
                try:
                    full_logs = container.logs(stdout=True, stderr=True).decode("utf-8", errors="replace")
                    streamed_text = "".join(collected_chunks)
                    if len(full_logs) > len(streamed_text):
                        if not streamed_text:
                            chunk_to_add = full_logs[:cfg.MAX_OUTPUT_BYTES]
                            collected_chunks.append(chunk_to_add)
                            total_bytes += len(chunk_to_add)
                            if on_output_chunk:
                                on_output_chunk(chunk_to_add)
                        elif full_logs.startswith(streamed_text):
                            rem = full_logs[len(streamed_text):cfg.MAX_OUTPUT_BYTES]
                            if rem:
                                collected_chunks.append(rem)
                                total_bytes += len(rem)
                                if on_output_chunk:
                                    on_output_chunk(rem)
                except Exception:
                    pass

                duration_ms = int((time.monotonic() - start_time) * 1000)

                # Inspect container final state
                try:
                    container.reload()
                    state = container.attrs.get("State", {})
                    exit_code = state.get("ExitCode", 0)
                    is_oom = state.get("OOMKilled", False)
                except Exception:
                    state = {}
                    exit_code = -1
                    is_oom = False

                if is_oom:
                    status = "oom"
                    exit_code = 137
                    collected_chunks.append("\n[Process terminated: Out of Memory limit reached (128MB)]\n")
                elif timed_out:
                    status = "timeout"
                    exit_code = 124
                    collected_chunks.append(f"\n[Process terminated: Wall-clock timeout exceeded ({cfg.EXECUTION_TIMEOUT_SECONDS}s)]\n")
                elif exit_code == 0:
                    status = "completed"
                else:
                    status = "failed"

                if truncated:
                    collected_chunks.append("\n[Output truncated at 64KB]\n")

                final_output = "".join(collected_chunks)
                return SandboxExecutionResult(
                    exit_code=exit_code,
                    status=status,
                    duration_ms=duration_ms,
                    output=final_output,
                )

        except DockerException as e:
            duration_ms = int((time.monotonic() - start_time) * 1000)
            logger.exception("Docker execution error: %s", e)
            return SandboxExecutionResult(
                exit_code=1,
                status="failed",
                duration_ms=duration_ms,
                output=f"Docker execution error: {str(e)}",
            )
        except Exception as e:
            duration_ms = int((time.monotonic() - start_time) * 1000)
            logger.exception("Unexpected execution error: %s", e)
            return SandboxExecutionResult(
                exit_code=1,
                status="failed",
                duration_ms=duration_ms,
                output=f"Execution error: {str(e)}",
            )
        finally:
            if container:
                try:
                    container.remove(force=True)
                except Exception:
                    pass
