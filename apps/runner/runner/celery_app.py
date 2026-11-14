from celery import Celery
from . import config as cfg

app = Celery(
    "codesync-runner",
    broker=cfg.CELERY_BROKER_URL,
    include=["runner.tasks"],
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    broker_connection_retry_on_startup=True,
    task_default_queue="runner",
    task_routes={
        "runner.tasks.*": {"queue": "runner"},
    },
    task_time_limit=cfg.EXECUTION_TIMEOUT_SECONDS + 5,
    task_soft_time_limit=cfg.EXECUTION_TIMEOUT_SECONDS + 2,
)


# Explicitly import tasks after app initialization so they are always registered
import runner.tasks  # noqa: F401, E402



