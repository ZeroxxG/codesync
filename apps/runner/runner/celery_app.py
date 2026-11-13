from celery import Celery
from . import config as cfg

app = Celery("codesync-runner", broker=cfg.CELERY_BROKER_URL)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=cfg.EXECUTION_TIMEOUT_SECONDS + 5,
    task_soft_time_limit=cfg.EXECUTION_TIMEOUT_SECONDS + 2,
)
