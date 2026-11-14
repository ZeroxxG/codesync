import logging
import time
import uuid

logger = logging.getLogger("codesync.request")


class RequestLoggingMiddleware:
    """
    Middleware that measures request duration and outputs structured JSON logs.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.request_id = request_id

        start_time = time.monotonic()
        response = self.get_response(request)
        duration_ms = round((time.monotonic() - start_time) * 1000, 2)

        user_id = None
        if hasattr(request, "user") and request.user.is_authenticated:
            user_id = request.user.id

        extra = {
            "request_id": request_id,
            "method": request.method,
            "path": request.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "user_id": user_id,
        }

        # Don't log spammy internal health polls at info level unless degraded
        if request.path.startswith("/health") or request.path.startswith("/api/health"):
            if response.status_code == 200:
                logger.debug("Health check probe", extra=extra)
            else:
                logger.warning("Health check failed", extra=extra)
        else:
            logger.info(
                f"{request.method} {request.path} {response.status_code} ({duration_ms}ms)",
                extra=extra,
            )

        response["X-Request-ID"] = request_id
        return response
