import pytest
from rest_framework.test import APIClient
from rooms.models import Room


@pytest.mark.django_db
def test_create_room_default_fields() -> None:
    client = APIClient()
    response = client.post("/api/rooms/", {}, format="json")
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Untitled Room"
    assert data["language"] == "python"
    assert len(data["slug"]) > 0
    assert Room.objects.filter(id=data["id"]).exists()


@pytest.mark.django_db
def test_create_room_custom_fields() -> None:
    client = APIClient()
    payload = {"name": "Algorithms Jam", "language": "javascript"}
    response = client.post("/api/rooms/", payload, format="json")
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Algorithms Jam"
    assert data["language"] == "javascript"


@pytest.mark.django_db
def test_create_room_invalid_language_fails() -> None:
    client = APIClient()
    payload = {"name": "Test Room", "language": "ruby"}
    response = client.post("/api/rooms/", payload, format="json")
    assert response.status_code == 400
    assert "language" in response.json()


@pytest.mark.django_db
def test_get_room_by_slug() -> None:
    client = APIClient()
    room = Room.objects.create(name="Collaborative Room", language="cpp")
    response = client.get(f"/api/rooms/{room.slug}/")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(room.id)
    assert data["name"] == "Collaborative Room"
    assert data["language"] == "cpp"


@pytest.mark.django_db
def test_patch_room_language() -> None:
    client = APIClient()
    room = Room.objects.create(name="Polyglot Room", language="python")
    response = client.patch(f"/api/rooms/{room.slug}/", {"language": "javascript"}, format="json")
    assert response.status_code == 200
    assert response.json()["language"] == "javascript"
    room.refresh_from_db()
    assert room.language == "javascript"


@pytest.mark.django_db
def test_get_nonexistent_room_returns_404() -> None:
    client = APIClient()
    response = client.get("/api/rooms/nonexistent-slug-123/")
    assert response.status_code == 404
