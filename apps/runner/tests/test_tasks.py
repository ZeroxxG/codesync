from unittest.mock import MagicMock, patch
import pytest
from runner import config as cfg
from runner.celery_app import app
from runner.sandbox import SandboxExecutionResult
from runner.tasks import execute_code


def test_task_registration_and_queue():
    """Verify execute_code is registered in Celery and default queue is 'runner'."""
    assert "runner.tasks.execute_code" in app.tasks
    assert app.conf.task_default_queue == "runner"
    assert app.conf.task_routes.get("runner.tasks.*") == {"queue": "runner"}


def test_internal_api_url_normalization():
    """Verify internal API URL normalization."""
    assert cfg.INTERNAL_API_URL.endswith("/internal")
    assert not cfg.INTERNAL_API_URL.endswith("/internal/internal")


@patch("runner.tasks.requests.put")
@patch("runner.tasks.RedisPublisher")
@patch("runner.tasks.DockerSandboxExecutor")
def test_execute_code_lifecycle(mock_executor_cls, mock_publisher_cls, mock_requests_put):
    """Verify full execute_code flow: running update, chunk streaming, completion, and internal callback."""
    mock_publisher = MagicMock()
    mock_publisher_cls.return_value = mock_publisher

    mock_executor = MagicMock()
    mock_executor_cls.return_value = mock_executor
    mock_executor.execute.return_value = SandboxExecutionResult(
        exit_code=0,
        status="completed",
        duration_ms=42,
        output="Hello Codesync!\n",
    )

    run_id = "test-run-1234"
    room_slug = "test-room"

    result = execute_code(
        run_id=run_id,
        room_slug=room_slug,
        language="python",
        code="print('Hello Codesync!')",
    )

    # 1. Check running status callback
    assert mock_requests_put.call_count == 2
    first_call_args, first_call_kwargs = mock_requests_put.call_args_list[0]
    assert f"/runs/{run_id}/" in first_call_args[0]
    assert first_call_kwargs["json"] == {"status": "running"}

    # 2. Check publisher run started & completed
    mock_publisher.publish_run_started.assert_called_once_with(room_slug, run_id)
    mock_publisher.publish_run_completed.assert_called_once_with(
        room_slug=room_slug,
        run_id=run_id,
        status="completed",
        exit_code=0,
        duration_ms=42,
        output="Hello Codesync!\n",
    )

    # 3. Check final internal callback
    second_call_args, second_call_kwargs = mock_requests_put.call_args_list[1]
    assert f"/runs/{run_id}/" in second_call_args[0]
    assert second_call_kwargs["json"] == {
        "status": "completed",
        "exit_code": 0,
        "duration_ms": 42,
        "output": "Hello Codesync!\n",
    }

    assert result["status"] == "completed"
    assert result["exit_code"] == 0
    assert result["output"] == "Hello Codesync!\n"
