import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rooms.models import Room, RoomMembership, Run

User = get_user_model()


@pytest.fixture
def owner(db):
    return User.objects.create_user(username="explain_owner", password="password123")


@pytest.fixture
def other_user(db):
    return User.objects.create_user(username="explain_other", password="password123")


@pytest.fixture
def room(db, owner):
    r = Room.objects.create(name="AI Explain Room", owner=owner, language="python")
    RoomMembership.objects.create(room=r, user=owner, role=RoomMembership.Role.OWNER)
    return r


@pytest.fixture
def failed_run(db, room, owner):
    return Run.objects.create(
        room=room,
        user=owner,
        language="python",
        status=Run.Status.FAILED,
        exit_code=1,
        output="ZeroDivisionError: division by zero\n  File 'main.py', line 1, in <module>\n",
    )


@pytest.fixture
def successful_run(db, room, owner):
    return Run.objects.create(
        room=room,
        user=owner,
        language="python",
        status=Run.Status.COMPLETED,
        exit_code=0,
        output="Hello World\n",
    )


@pytest.mark.django_db
def test_explain_failed_run_success(room, failed_run, owner):
    client = APIClient()
    client.force_authenticate(user=owner)

    url = f"/api/rooms/{room.slug}/runs/{failed_run.id}/explain/"
    resp = client.post(url, data={"code": "print(10 / 0)"}, format="json")

    assert resp.status_code == 200
    data = resp.json()
    assert data["run_id"] == str(failed_run.id)
    assert data["exit_code"] == 1
    assert "ZeroDivisionError" in data["explanation"]
    assert "suggested_fix" in data
    assert len(data["suggested_fix"]) > 0


@pytest.mark.django_db
def test_explain_successful_run_rejected(room, successful_run, owner):
    client = APIClient()
    client.force_authenticate(user=owner)

    url = f"/api/rooms/{room.slug}/runs/{successful_run.id}/explain/"
    resp = client.post(url, data={}, format="json")

    assert resp.status_code == 400
    assert "Only failed runs" in resp.json()["error"]


@pytest.mark.django_db
def test_explain_unauthorized_user_forbidden(room, failed_run, other_user):
    client = APIClient()
    client.force_authenticate(user=other_user)

    url = f"/api/rooms/{room.slug}/runs/{failed_run.id}/explain/"
    resp = client.post(url, data={}, format="json")

    assert resp.status_code == 403


@pytest.mark.django_db
def test_explain_rate_limit(room, failed_run, owner):
    client = APIClient()
    client.force_authenticate(user=owner)

    url = f"/api/rooms/{room.slug}/runs/{failed_run.id}/explain/"

    # First 5 calls pass
    for _ in range(5):
        resp = client.post(url, data={}, format="json")
        assert resp.status_code == 200

    # 6th call hits rate limit
    rate_limited_resp = client.post(url, data={}, format="json")
    assert rate_limited_resp.status_code == 429
    assert "rate limit exceeded" in rate_limited_resp.json()["error"]
