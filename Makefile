.PHONY: dev dev-infra test lint lint-python lint-node help

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
