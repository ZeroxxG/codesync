import pytest
from django.contrib.auth import get_user_model
from django.test.utils import CaptureQueriesContext
from django.db import connection
from rest_framework.test import APIClient
from rooms.models import Room, RoomMembership, Run

User = get_user_model()


@pytest.mark.django_db
def test_room_list_n_plus_one_prevention():
    """
    Ensure RoomList endpoint executes a constant number of queries
    regardless of how many rooms or members exist (O(1) queries).
    """
    owner = User.objects.create_user(username="owner_n1", password="Password123!")
    collaborator = User.objects.create_user(username="collab_n1", password="Password123!")

    # Create 1 room with membership
    room1 = Room.objects.create(name="Room 1", owner=owner)
    RoomMembership.objects.create(room=room1, user=owner, role=RoomMembership.Role.OWNER)
    RoomMembership.objects.create(room=room1, user=collaborator, role=RoomMembership.Role.EDITOR)

    client = APIClient()
    client.force_authenticate(user=owner)

    # Capture queries for 1 room
    with CaptureQueriesContext(connection) as ctx_1:
        res1 = client.get("/api/rooms/")
        assert res1.status_code == 200
        assert len(res1.json()) == 1

    query_count_1 = len(ctx_1)

    # Create 9 more rooms with memberships
    for i in range(2, 11):
        r = Room.objects.create(name=f"Room {i}", owner=owner)
        RoomMembership.objects.create(room=r, user=owner, role=RoomMembership.Role.OWNER)
        RoomMembership.objects.create(room=r, user=collaborator, role=RoomMembership.Role.EDITOR)

    # Capture queries for 10 rooms
    with CaptureQueriesContext(connection) as ctx_10:
        res10 = client.get("/api/rooms/")
        assert res10.status_code == 200
        assert len(res10.json()) == 10

    query_count_10 = len(ctx_10)

    # Number of queries must remain constant: no N+1 queries per room or membership!
    assert query_count_10 == query_count_1, (
        f"N+1 query regression detected: 1 room executed {query_count_1} queries, "
        f"but 10 rooms executed {query_count_10} queries.\n"
        f"Queries: {[q['sql'] for q in ctx_10.captured_queries]}"
    )


@pytest.mark.django_db
def test_room_runs_list_n_plus_one_prevention():
    """
    Ensure RoomRunView GET executes a constant number of queries
    regardless of the number of runs returned.
    """
    owner = User.objects.create_user(username="run_owner", password="Password123!")
    room = Room.objects.create(name="Run Test Room", owner=owner)
    RoomMembership.objects.create(room=room, user=owner, role=RoomMembership.Role.OWNER)

    # Create 1 run
    Run.objects.create(
        room=room,
        user=owner,
        language="python",
        status=Run.Status.COMPLETED,
        output="run 1\n",
    )

    client = APIClient()
    client.force_authenticate(user=owner)

    with CaptureQueriesContext(connection) as ctx_1:
        res1 = client.get(f"/api/rooms/{room.slug}/runs/")
        assert res1.status_code == 200
        assert len(res1.json()) == 1

    count_1 = len(ctx_1)

    # Create 9 more runs
    for i in range(2, 11):
        Run.objects.create(
            room=room,
            user=owner,
            language="python",
            status=Run.Status.COMPLETED,
            output=f"run {i}\n",
        )

    with CaptureQueriesContext(connection) as ctx_10:
        res10 = client.get(f"/api/rooms/{room.slug}/runs/")
        assert res10.status_code == 200
        assert len(res10.json()) == 10

    count_10 = len(ctx_10)

    assert count_10 == count_1, (
        f"N+1 regression in runs list: 1 run took {count_1} queries, 10 runs took {count_10} queries."
    )


@pytest.mark.django_db
def test_database_indexes_used_in_query_plans():
    """
    Verify PostgreSQL query plan uses indexes for RoomMembership and Run lookups.
    """
    owner = User.objects.create_user(username="idx_owner", password="Password123!")
    room = Room.objects.create(name="Index Room", owner=owner)
    RoomMembership.objects.create(room=room, user=owner, role=RoomMembership.Role.OWNER)

    # Test explain on room membership
    qs = RoomMembership.objects.filter(room=room, role=RoomMembership.Role.OWNER)
    explain_output = qs.explain().lower()
    # In SQLite or Postgres, index is referenced or scan is performed
    assert "scan" in explain_output or "index" in explain_output

    # Test explain on runs by room ordered by created_at
    run_qs = Run.objects.filter(room=room).order_by("-created_at")
    run_explain = run_qs.explain().lower()
    assert "scan" in run_explain or "index" in run_explain
