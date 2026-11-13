# apps/runner — Sandboxed code execution worker

Python + Celery + Docker SDK

## Responsibilities
- Consumes job tasks from the Celery queue (broker = Redis)
- Spins up a fresh Docker container per run using a pre-built minimal language image
- Streams stdout/stderr chunks to a Redis pub/sub channel for the room
- Publishes the final exit code and wall-clock runtime to the same channel
- Enforces mandatory sandbox controls on every container:
  - No network access (`network_mode=none`)
  - CPU, memory and PID limits
  - Hard wall-clock timeout — kills the container even if the worker crashes
  - Output size cap (truncates with a notice)
  - Read-only root filesystem with a small writable tmpfs
  - Runs as a non-root user, all Linux capabilities dropped, `no-new-privileges`,
    default seccomp profile
- Calls Django to persist the final run result (exit code, duration, truncated output)
- **Security isolation**: must NOT receive `DJANGO_SECRET_KEY` or `POSTGRES_*` env vars;
  it only gets the job payload and `REDIS_URL`

## Tech
- Python 3.12, Celery, Docker SDK (`docker` Python package)
- pytest for tests (including adversarial container tests)
- ruff, mypy

## Development
```sh
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
celery -A runner worker -Q runner --loglevel=info
pytest
```

> **Status:** Complete — container executor, Celery worker, Redis streaming, adversarial test suite, and reaper daemon implemented.
