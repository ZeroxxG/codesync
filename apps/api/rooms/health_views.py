import datetime
from django.conf import settings
from django.db import connection
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    """
    GET /api/health/ and /health/
    Verifies connectivity to PostgreSQL and Redis.
    Returns HTTP 200 when healthy, or HTTP 503 if any dependency fails.
    """

    authentication_classes = []
    permission_classes = []

    def get(self, request: Request) -> Response:
        checks = {}
        all_healthy = True

        # 1. Database check
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                row = cursor.fetchone()
                if row and row[0] == 1:
                    checks["database"] = "ok"
                else:
                    checks["database"] = "unexpected_response"
                    all_healthy = False
        except Exception as e:
            checks["database"] = f"error: {str(e)}"
            all_healthy = False

        # 2. Redis check
        try:
            import redis
            redis_url = getattr(settings, "REDIS_URL", "redis://localhost:6379/0")
            client = redis.from_url(redis_url, socket_timeout=2)
            if client.ping():
                checks["redis"] = "ok"
            else:
                checks["redis"] = "ping_failed"
                all_healthy = False
        except Exception as e:
            checks["redis"] = f"error: {str(e)}"
            all_healthy = False

        payload = {
            "status": "healthy" if all_healthy else "unhealthy",
            "service": "codesync-api",
            "checks": checks,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }

        http_status = status.HTTP_200_OK if all_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(payload, status=http_status)


class LivenessCheckView(APIView):
    """
    GET /api/health/liveness/
    Quick liveness probe to verify the application process is running.
    """

    authentication_classes = []
    permission_classes = []

    def get(self, request: Request) -> Response:
        return Response({"status": "alive"}, status=status.HTTP_200_OK)
