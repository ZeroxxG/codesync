.PHONY: doctor smoke setup build-sandboxes dev dev-infra test lint lint-python lint-node help

# ---------------------------------------------------------------------------
# Diagnostics & Health Preflight
# ---------------------------------------------------------------------------

## Run preflight diagnostics: checks Docker daemon, tool versions, ports, and configuration.
doctor:
	@python scripts/doctor.py

## Run end-to-end stack smoke test: validates health, room creation, CRDT convergence, and sandboxed run.
smoke:
	@python scripts/smoke_test.py

# ---------------------------------------------------------------------------
# Setup & Initial Bootstrap
# ---------------------------------------------------------------------------

## Bootstrap local setup: creates .env from .env.example and builds sandbox images.
setup:
	@python -c "import shutil, os; shutil.copyfile('.env.example', '.env') if not os.path.exists('.env') else None"
	@echo "Local .env verified."
	docker build -t codesync-sandbox-python:latest docker/sandbox-python
	docker build -t codesync-sandbox-javascript:latest docker/sandbox-javascript
	docker build -t codesync-sandbox-cpp:latest docker/sandbox-cpp
	@echo "Sandbox container images built successfully."

## Build all three language sandbox runtime images.
build-sandboxes:
	docker build -t codesync-sandbox-python:latest docker/sandbox-python
	docker build -t codesync-sandbox-javascript:latest docker/sandbox-javascript
	docker build -t codesync-sandbox-cpp:latest docker/sandbox-cpp

# ---------------------------------------------------------------------------
# Local development
# ---------------------------------------------------------------------------

## Start infrastructure only (postgres + redis). App services use --profile full.
dev-infra:
	docker compose up postgres redis

## Start the full stack (all services). Requires Dockerfiles in each app folder.
dev:
	docker compose --profile full up --build

## Bring down all containers and remove orphans.
down:
	docker compose --profile full down --remove-orphans

# ---------------------------------------------------------------------------
# Testing
# ---------------------------------------------------------------------------

## Run every test suite.
test: test-api test-realtime test-web test-runner

test-api:
	docker compose run --rm api pytest

test-realtime:
	docker compose run --rm realtime pnpm test

test-web:
	docker compose run --rm web pnpm test

test-runner:
	docker compose run --rm runner pytest

# ---------------------------------------------------------------------------
# Linting
# ---------------------------------------------------------------------------

## Run every linter.
lint: lint-python lint-node

## Ruff + mypy for Python apps (api, runner).
lint-python:
	ruff check apps/api apps/runner
	mypy apps/api apps/runner

## ESLint + tsc for TypeScript apps (web, realtime).
lint-node:
	cd apps/web && pnpm lint && pnpm tsc --noEmit
	cd apps/realtime && pnpm lint && pnpm tsc --noEmit

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

## Show this help message.
help:
	@echo "Usage: make <target>"
	@grep -E '^##' Makefile | sed 's/## /  /'
