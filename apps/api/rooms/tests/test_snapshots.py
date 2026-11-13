import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rooms.models import Room, RoomMembership, RoomSnapshot

User = get_user_model()


@pytest.mark.django_db
def test_internal_endpoints_require_token() -> None:
    room = Room.objects.create(name="Internal Test")
    client = APIClient()

    # Without token
    res_role = client.get(f"/internal/rooms/{room.slug}/role/")
    assert res_role.status_code in (401, 403)

    res_snap = client.get(f"/internal/rooms/{room.slug}/snapshot/")
    assert res_snap.status_code in (401, 403)

    # With invalid token
    res_invalid = client.get(
        f"/internal/rooms/{room.slug}/role/",
        HTTP_X_INTERNAL_TOKEN="wrong-token",
    )
    assert res_invalid.status_code in (401, 403)


@pytest.mark.django_db
def test_internal_role_lookup() -> None:
    owner = User.objects.create_user(username="int_owner", password="Password123!")
    editor = User.objects.create_user(username="int_editor", password="Password123!")
    outsider = User.objects.create_user(username="int_outsider", password="Password123!")

    room = Room.objects.create(name="Role Room", owner=owner)
    RoomMembership.objects.create(room=room, user=owner, role=RoomMembership.Role.OWNER)
    RoomMembership.objects.create(room=room, user=editor, role=RoomMembership.Role.EDITOR)

    token = getattr(settings, "INTERNAL_API_TOKEN", "codesync-internal-token-change-in-prod")
    client = APIClient()

    # Owner role
    res_owner = client.get(
        f"/internal/rooms/{room.slug}/role/?user_id={owner.id}",
        HTTP_X_INTERNAL_TOKEN=token,
    )
    assert res_owner.status_code == 200
    assert res_owner.json()["role"] == "owner"

    # Editor role
    res_editor = client.get(
        f"/internal/rooms/{room.slug}/role/?user_id={editor.id}",
        HTTP_X_INTERNAL_TOKEN=token,
    )
    assert res_editor.status_code == 200
    assert res_editor.json()["role"] == "editor"

    # Viewer via token
    res_guest = client.get(
        f"/internal/rooms/{room.slug}/role/?viewer_token={room.viewer_token}",
        HTTP_X_INTERNAL_TOKEN=token,
    )
    assert res_guest.status_code == 200
    assert res_guest.json()["role"] == "viewer"
    assert res_guest.json()["is_guest"] is True

    # Non-member rejected
    res_outsider = client.get(
        f"/internal/rooms/{room.slug}/role/?user_id={outsider.id}",
        HTTP_X_INTERNAL_TOKEN=token,
    )
    assert res_outsider.status_code == 403


@pytest.mark.django_db
def test_internal_snapshot_lifecycle_and_size_limit() -> None:
    room = Room.objects.create(name="Snapshot Room")
    token = getattr(settings, "INTERNAL_API_TOKEN", "codesync-internal-token-change-in-prod")
    client = APIClient()

    # 1. Initial snapshot is empty (204)
    res_empty = client.get(
        f"/internal/rooms/{room.slug}/snapshot/",
        HTTP_X_INTERNAL_TOKEN=token,
    )
    assert res_empty.status_code == 204

    # 2. Put binary data
    mock_yjs_binary = b"\x00\x01\x02\x03\x04test_crdt_snapshot_bytes"
    res_put = client.put(
        f"/internal/rooms/{room.slug}/snapshot/",
        data=mock_yjs_binary,
        content_type="application/octet-stream",
        HTTP_X_INTERNAL_TOKEN=token,
    )
    assert res_put.status_code == 200
    assert res_put.json()["size_bytes"] == len(mock_yjs_binary)

    # 3. Retrieve binary data
    res_get = client.get(
        f"/internal/rooms/{room.slug}/snapshot/",
        HTTP_X_INTERNAL_TOKEN=token,
    )
    assert res_get.status_code == 200
    assert res_get.content == mock_yjs_binary
    assert res_get["Content-Type"] == "application/octet-stream"

    # 4. Exceed MAX_DOCUMENT_BYTES
    max_bytes = getattr(settings, "MAX_DOCUMENT_BYTES", 1048576)
    oversized_data = b"x" * (max_bytes + 10)
    res_too_large = client.put(
        f"/internal/rooms/{room.slug}/snapshot/",
        data=oversized_data,
        content_type="application/octet-stream",
        HTTP_X_INTERNAL_TOKEN=token,
    )
    assert res_too_large.status_code == 413
