import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
def test_register_user_success() -> None:
    client = APIClient()
    payload = {
        "username": "alice",
        "email": "alice@example.com",
        "password": "Password123!",
        "password_confirm": "Password123!",
    }
    response = client.post("/api/auth/register/", payload, format="json")
    assert response.status_code == 201
    data = response.json()
    assert "access" in data
    assert "refresh" in data
    assert data["user"]["username"] == "alice"
    assert data["user"]["email"] == "alice@example.com"
    assert User.objects.filter(username="alice").exists()


@pytest.mark.django_db
def test_register_password_mismatch_fails() -> None:
    client = APIClient()
    payload = {
        "username": "bob",
        "email": "bob@example.com",
        "password": "Password123!",
        "password_confirm": "MismatchPass123!",
    }
    response = client.post("/api/auth/register/", payload, format="json")
    assert response.status_code == 400
    assert "password_confirm" in response.json()


@pytest.mark.django_db
def test_login_success() -> None:
    User.objects.create_user(username="charlie", email="charlie@example.com", password="Password123!")
    client = APIClient()

    # Login with username
    res = client.post("/api/auth/login/", {"username": "charlie", "password": "Password123!"}, format="json")
    assert res.status_code == 200
    data = res.json()
    assert "access" in data
    assert "refresh" in data
    assert data["user"]["username"] == "charlie"

    # Login with email
    res_email = client.post("/api/auth/login/", {"username": "charlie@example.com", "password": "Password123!"}, format="json")
    assert res_email.status_code == 200
    assert "access" in res_email.json()


@pytest.mark.django_db
def test_login_invalid_credentials() -> None:
    User.objects.create_user(username="dave", password="Password123!")
    client = APIClient()
    res = client.post("/api/auth/login/", {"username": "dave", "password": "WrongPassword!"}, format="json")
    assert res.status_code == 400


@pytest.mark.django_db
def test_get_current_user_profile() -> None:
    user = User.objects.create_user(username="eve", email="eve@example.com", password="Password123!")
    client = APIClient()

    # Unauthorized
    res_unauth = client.get("/api/auth/me/")
    assert res_unauth.status_code == 401

    # Authorized
    client.force_authenticate(user=user)
    res_auth = client.get("/api/auth/me/")
    assert res_auth.status_code == 200
    data = res_auth.json()
    assert data["username"] == "eve"
    assert data["email"] == "eve@example.com"


@pytest.mark.django_db
def test_logout_blacklists_token() -> None:
    user = User.objects.create_user(username="frank", password="Password123!")
    client = APIClient()

    # Login to get refresh token
    login_res = client.post("/api/auth/login/", {"username": "frank", "password": "Password123!"}, format="json")
    refresh_token = login_res.json()["refresh"]
    access_token = login_res.json()["access"]

    # Logout
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
    logout_res = client.post("/api/auth/logout/", {"refresh": refresh_token}, format="json")
    assert logout_res.status_code == 200

    # Attempting to refresh with blacklisted token fails
    refresh_res = client.post("/api/auth/refresh/", {"refresh": refresh_token}, format="json")
    assert refresh_res.status_code == 401
