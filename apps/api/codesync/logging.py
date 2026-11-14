import datetime
import json
import logging


class JSONFormatter(logging.Formatter):
    """
    Formats log records as structured, single-line JSON objects
    suitable for ingestion by central logging tools (Datadog, ELK, CloudWatch).
    """

    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "service": "codesync-api",
            "message": record.getMessage(),
        }

        if hasattr(record, "request_id"):
            log_obj["request_id"] = record.request_id

        if hasattr(record, "method"):
            log_obj["method"] = record.method

        if hasattr(record, "path"):
            log_obj["path"] = record.path

        if hasattr(record, "status_code"):
            log_obj["status_code"] = record.status_code

        if hasattr(record, "duration_ms"):
            log_obj["duration_ms"] = record.duration_ms

        if hasattr(record, "user_id"):
            log_obj["user_id"] = record.user_id

        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_obj)
