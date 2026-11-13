import logging
import requests
from . import config as cfg
from .celery_app import app
from .publisher import RedisPublisher
from .sandbox import DockerSandboxExecutor

logger = logging.getLogger(__name__)


@app.task(name="runner.tasks.execute_code")
def execute_code(run_id: str, room_slug: str, language: str, code: str) -> dict:
    """
    Celery task that executes a room's code run.
    1. Updates Django internal run status to 'running'
    2. Streams stdout/stderr chunks live over Redis pub/sub to room:<slug>:runs
    3. Publishes final exit code, duration, and status to Redis
    4. Reports final result back to Django internal API and releases room lock
    """
    publisher = RedisPublisher()
    executor = DockerSandboxExecutor()

    # 1. Update status to running
    try:
        requests.put(
            f"{cfg.INTERNAL_API_URL}/runs/{run_id}/",
            headers={"X-Internal-Token": cfg.INTERNAL_API_TOKEN},
            json={"status": "running"},
            timeout=5,
        )
    except Exception as e:
        logger.warning("Could not set run to running: %s", e)

    publisher.publish_run_started(room_slug, run_id)

    # 2. Execute code with streaming callback
    def on_output_chunk(chunk: str):
        publisher.publish_output_chunk(room_slug, run_id, chunk)

    result = executor.execute(
        run_id=run_id,
        language=language,
        code=code,
        on_output_chunk=on_output_chunk,
    )

    # 3. Publish completion event to Redis
    publisher.publish_run_completed(
        room_slug=room_slug,
        run_id=run_id,
        status=result.status,
        exit_code=result.exit_code,
        duration_ms=result.duration_ms,
        output=result.output,
    )

    # 4. Report final result back to Django internal API
    try:
        requests.put(
            f"{cfg.INTERNAL_API_URL}/runs/{run_id}/",
            headers={"X-Internal-Token": cfg.INTERNAL_API_TOKEN},
            json={
                "status": result.status,
                "exit_code": result.exit_code,
                "duration_ms": result.duration_ms,
                "output": result.output,
            },
            timeout=5,
        )
    except Exception as e:
        logger.error("Failed to report run result to internal API: %s", e)

    return result.to_dict()
