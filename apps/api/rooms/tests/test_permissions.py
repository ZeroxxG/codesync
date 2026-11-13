import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rooms.models import Room, RoomMembership

User = get_user_model()


@pytest.mark.django_db
def test_create_room_assigns_owner_membership() -> None:
    user = User.objects.create_user(username="owner_user", password="Password123!")
    client = APIClient()
    client.force_authenticate(user=user)

    res = client.post("/api/rooms/", {"name": "Architecture Review"}, format="json")
    assert res.status_code == 201
    data = res.json()
    assert data["owner"] == user.id
    assert data["current_user_role"] == "owner"

    room = Room.objects.get(id=data["id"])
    membership = RoomMembership.objects.filter(room=room, user=user).first()
    assert membership is not None
    assert membership.role == RoomMembership.Role.OWNER


@pytest.mark.django_db
def test_non_member_access_rejected() -> None:
    owner = User.objects.create_user(username="room_owner", password="Password123!")
    other_user = User.objects.create_user(username="other_user", password="Password123!")

    room = Room.objects.create(name="Private Room", owner=owner)
    RoomMembership.objects.create(room=room, user=owner, role=RoomMembership.Role.OWNER)

    client = APIClient()
    client.force_authenticate(user=other_user)

    res = client.get(f"/api/rooms/{room.slug}/")
    assert res.status_code == 403


@pytest.mark.django_db
def test_viewer_token_grants_read_only_access() -> None:
    owner = User.objects.create_user(username="owner1", password="Password123!")
    room = Room.objects.create(name="Streamed Room", owner=owner)

    client = APIClient()
    # Anonymous request without token -> 403
    res_no_token = client.get(f"/api/rooms/{room.slug}/")
    assert res_no_token.status_code == 403

    # With valid viewer token -> 200 and viewer role
    res_with_token = client.get(f"/api/rooms/{room.slug}/?viewer_token={room.viewer_token}")
    assert res_with_token.status_code == 200
    assert res_with_token.json()["current_user_role"] == "viewer"

    # Viewer attempts to modify room settings -> 403
    res_patch = client.patch(
        f"/api/rooms/{room.slug}/?viewer_token={room.viewer_token}",
        {"language": "cpp"},
        format="json",
    )
    assert res_patch.status_code == 403


@pytest.mark.django_db
def test_editor_can_update_room_settings() -> None:
    owner = User.objects.create_user(username="owner2", password="Password123!")
    editor = User.objects.create_user(username="editor2", password="Password123!")

    room = Room.objects.create(name="Collaborative Session", owner=owner, language="python")
    RoomMembership.objects.create(room=room, user=editor, role=RoomMembership.Role.EDITOR)

    client = APIClient()
    client.force_authenticate(user=editor)

    res = client.patch(f"/api/rooms/{room.slug}/", {"language": "javascript"}, format="json")
    assert res.status_code == 200
    assert res.json()["language"] == "javascript"
    room.refresh_from_db()
    assert room.language == "javascript"


@pytest.mark.django_db
def test_owner_manages_members() -> None:
    owner = User.objects.create_user(username="owner3", password="Password123!")
    target = User.objects.create_user(username="collaborator", password="Password123!")

    room = Room.objects.create(name="Team Room", owner=owner)
    RoomMembership.objects.create(room=room, user=owner, role=RoomMembership.Role.OWNER)

    client = APIClient()

    # Non-owner cannot add members
    client.force_authenticate(user=target)
    fail_res = client.post(
        f"/api/rooms/{room.slug}/members/",
        {"username": "collaborator", "role": "editor"},
        format="json",
    )
    assert fail_res.status_code == 403

    # Owner adds member as editor
    client.force_authenticate(user=owner)
    add_res = client.post(
        f"/api/rooms/{room.slug}/members/",
        {"username": "collaborator", "role": "editor"},
        format="json",
    )
    assert add_res.status_code == 200
    assert add_res.json()["role"] == "editor"

    # Owner removes member
    del_res = client.delete(f"/api/rooms/{room.slug}/members/{target.id}/")
    assert del_res.status_code == 200
    assert not RoomMembership.objects.filter(room=room, user=target).exists()


@pytest.mark.django_db
def test_owner_regenerates_viewer_token() -> None:
    owner = User.objects.create_user(username="owner4", password="Password123!")
    room = Room.objects.create(name="Public Talk", owner=owner)

    client = APIClient()
    client.force_authenticate(user=owner)

    old_token = room.viewer_token
    res = client.post(f"/api/rooms/{room.slug}/viewer-link/")
    assert res.status_code == 200
    new_token = res.json()["viewer_token"]
    assert new_token != old_token

    room.refresh_from_db()
    assert room.viewer_token == new_token
