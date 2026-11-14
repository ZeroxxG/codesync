import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_root_health_check_returns_200():
    client = APIClient()
    res = client.get("/health/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "codesync-api"
    assert data["checks"]["database"] == "ok"
    assert data["checks"]["redis"] == "ok"
    assert "timestamp" in data


@pytest.mark.django_db
def test_api_health_check_endpoints():
    client = APIClient()
    res = client.get("/api/health/")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    liveness = client.get("/api/health/liveness/")
    assert liveness.status_code == 200
    assert liveness.json()["status"] == "alive"

    readiness = client.get("/api/health/readiness/")
    assert readiness.status_code == 200
    assert readiness.json()["status"] == "healthy"
