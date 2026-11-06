# apps/api — Django REST API

Django + Django REST Framework + simplejwt

## Responsibilities
- Single source of truth for auth (register / login / refresh / logout) and JWTs
- Room model and CRUD: create, list, join by link
- Room membership with owner / editor / viewer roles and read-only share links
- Internal endpoints for the realtime service:
  - `GET/PUT /internal/rooms/{id}/snapshot` — Yjs state persistence
  - `GET /internal/rooms/{id}/role` — user role lookup (protected by service token)
- Run model and `POST /api/rooms/{id}/runs` endpoint: validates permissions, rate limits,
  creates the Run row, and enqueues a Celery task for the runner
- Rate limiting (per-user and per-room) and max queue depth enforcement
- Saves final run result (exit code, duration, truncated output) when the runner finishes
- PostgreSQL as the only persistent store; never connects to Redis directly

## Tech
- Python 3.12, Django 5, Django REST Framework, simplejwt
- pytest-django for tests
- ruff (linter), mypy (type checker)
- Celery for task dispatch (broker = Redis)

## Development
```sh
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
pytest
```

> **Status:** not started — skeleton only.
