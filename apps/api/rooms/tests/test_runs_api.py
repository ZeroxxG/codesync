from unittest.mock import MagicMock, patch
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rooms.models import Room, RoomMembership, Run

User = get_user_model()


class MockRedis:
    def __init__(self):
        self.store = {}
        self.expires = {}

    def incr(self, key):
        val = int(self.store.get(key, 0)) + 1
        self.store[key] = str(val)
        return val

    def expire(self, key, seconds):
        self.expires[key] = seconds
        return True

    def set(self, key, value, nx=False, ex=None):
        if nx and key in self.store:
            return None
        self.store[key] = str(value)
        if ex:
            self.expires[key] = ex
        return True

    def get(self, key):
        return self.store.get(key)

    def delete(self, key):
        return 1 if self.store.pop(key, None) is not None else 0


@pytest.fixture
def mock_redis():
    mock_inst = MockRedis()
    with patch("redis.from_url", return_value=mock_inst) as p:
        yield mock_inst


@pytest.fixture
def mock_celery():
    with patch("codesync.celery.app.send_task") as mock_send:
        yield mock_send


@pytest.mark.django_db
def test_owner_can_trigger_run(mock_redis, mock_celery) -> None:
    owner = User.objects.create_user(username="owner1", password="Password123!")
    room = Room.objects.create(name="Python Room", owner=owner, language="python")
    RoomMembership.objects.create(room=room, user=owner, role=RoomMembership.Role.OWNER)

    client = APIClient()
    client.force_authenticate(user=owner)

    res = client.post(
        f"/api/rooms/{room.slug}/runs/",
        {"code": "print('hello from codesync')"},
        format="json",
    )
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "queued"
    assert data["language"] == "python"
    assert data["room_slug"] == room.slug
    assert data["code_hash"] != ""

    # Verify run record in DB
    run = Run.objects.get(id=data["id"])
    assert run.room == room
    assert run.user == owner
    assert run.status == Run.Status.QUEUED

    # Verify celery dispatch
    mock_celery.assert_called_once_with(
        "runner.tasks.execute_code",
        args=[str(run.id), room.slug, "python", "print('hello from codesync')"],
        queue="runner",
    )



@pytest.mark.django_db
def test_editor_token_can_trigger_run(mock_redis, mock_celery) -> None:
    owner = User.objects.create_user(username="owner2", password="Password123!")
    room = Room.objects.create(name="Collab Room", owner=owner, language="javascript")

    client = APIClient()
    # Anonymous with valid editor token
    res = client.post(
        f"/api/rooms/{room.slug}/runs/?editor_token={room.editor_token}",
        {"code": "console.log('hi');", "language": "javascript"},
        format="json",
    )
    assert res.status_code == 201
    assert res.json()["status"] == "queued"
    mock_celery.assert_called_once()


@pytest.mark.django_db
def test_viewer_is_rejected_with_403(mock_redis, mock_celery) -> None:
    owner = User.objects.create_user(username="owner3", password="Password123!")
    room = Room.objects.create(name="Restricted Room", owner=owner)

    client = APIClient()
    # Attempt run using viewer_token
    res = client.post(
        f"/api/rooms/{room.slug}/runs/?viewer_token={room.viewer_token}",
        {"code": "import os; print('forbidden')"},
        format="json",
    )
    assert res.status_code == 403
    assert "Viewers are not permitted to execute code" in res.json()["error"]
    assert mock_celery.call_count == 0


@pytest.mark.django_db
def test_concurrency_lock_rejects_simultaneous_run(mock_redis, mock_celery) -> None:
    owner = User.objects.create_user(username="owner4", password="Password123!")
    room = Room.objects.create(name="Mutex Room", owner=owner)
    RoomMembership.objects.create(room=room, user=owner, role=RoomMembership.Role.OWNER)

    # Pre-set the running lock in redis
    mock_redis.store[f"room:{room.slug}:running_lock"] = "active-run-id"

    client = APIClient()
    client.force_authenticate(user=owner)

    res = client.post(
        f"/api/rooms/{room.slug}/runs/",
        {"code": "print('wait')"},
        format="json",
    )
    assert res.status_code == 409
    assert "Another code execution is currently running" in res.json()["error"]
    assert mock_celery.call_count == 0


@pytest.mark.django_db
def test_rate_limit_enforced_at_limit(mock_redis, mock_celery) -> None:
    owner = User.objects.create_user(username="owner5", password="Password123!")
    room = Room.objects.create(name="Spam Room", owner=owner)
    RoomMembership.objects.create(room=room, user=owner, role=RoomMembership.Role.OWNER)

    client = APIClient()
    client.force_authenticate(user=owner)

    # Set user count to 6 (max limit)
    mock_redis.store[f"ratelimit:user:{owner.id}"] = "6"

    res = client.post(
        f"/api/rooms/{room.slug}/runs/",
        {"code": "print('spam')"},
        format="json",
    )
    assert res.status_code == 429
    assert "rate limit exceeded" in res.json()["error"]
    assert mock_celery.call_count == 0


@pytest.mark.django_db
def test_internal_run_callback_updates_status_and_clears_lock(mock_redis) -> None:
    owner = User.objects.create_user(username="owner6", password="Password123!")
    room = Room.objects.create(name="Callback Room", owner=owner)
    run = Run.objects.create(
        room=room,
        user=owner,
        language="python",
        code_hash="abc123",
        status=Run.Status.RUNNING,
    )
    mock_redis.store[f"room:{room.slug}:running_lock"] = "1"

    client = APIClient()
    # Reject without internal token
    res_unauth = client.put(
        f"/internal/runs/{run.id}/",
        {"status": "completed", "exit_code": 0, "duration_ms": 120, "output": "Success\n"},
        format="json",
    )
    assert res_unauth.status_code in (401, 403)

    # Authorized with X-Internal-Token
    res_auth = client.put(
        f"/internal/runs/{run.id}/",
        {"status": "completed", "exit_code": 0, "duration_ms": 120, "output": "Success\n"},
        format="json",
        HTTP_X_INTERNAL_TOKEN="codesync-internal-token-change-in-prod",
    )
    assert res_auth.status_code == 200
    data = res_auth.json()
    assert data["status"] == "completed"
    assert data["exit_code"] == 0
    assert data["duration_ms"] == 120
    assert data["output"] == "Success\n"

    # Verify DB update
    run.refresh_from_db()
    assert run.status == Run.Status.COMPLETED
    assert run.exit_code == 0
    assert run.duration_ms == 120
    assert run.output == "Success\n"

    # Verify lock was released
    assert f"room:{room.slug}:running_lock" not in mock_redis.store


@pytest.mark.django_db
def test_room_runs_list_and_detail(mock_redis) -> None:
    owner = User.objects.create_user(username="owner7", password="Password123!")
    room = Room.objects.create(name="History Room", owner=owner)
    RoomMembership.objects.create(room=room, user=owner, role=RoomMembership.Role.OWNER)

    run1 = Run.objects.create(
        room=room,
        user=owner,
        language="python",
        status=Run.Status.COMPLETED,
        output="run 1",
    )
    run2 = Run.objects.create(
        room=room,
        user=owner,
        language="python",
        status=Run.Status.FAILED,
        output="run 2 error",
    )

    client = APIClient()
    client.force_authenticate(user=owner)

    # List runs
    res_list = client.get(f"/api/rooms/{room.slug}/runs/")
    assert res_list.status_code == 200
    runs = res_list.json()
    assert len(runs) == 2
    assert runs[0]["id"] == str(run2.id)

    # Detail view
    res_detail = client.get(f"/api/rooms/{room.slug}/runs/{run1.id}/")
    assert res_detail.status_code == 200
    assert res_detail.json()["output"] == "run 1"
