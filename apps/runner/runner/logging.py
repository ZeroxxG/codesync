import datetime
import json
import logging


class JSONFormatter(logging.Formatter):
    """
    Formats log records as structured, single-line JSON objects for apps/runner.
    """

    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "service": "codesync-runner",
            "message": record.getMessage(),
        }

        if hasattr(record, "run_id"):
            log_obj["run_id"] = record.run_id

        if hasattr(record, "room_slug"):
            log_obj["room_slug"] = record.room_slug

        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_obj)


def setup_runner_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)
