#!/usr/bin/env bash
set -e

# CodeSync Preflight Check (POSIX wrapper)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

if command -v python3 >/dev/null 2>&1; then
    python3 scripts/doctor.py "$@"
elif command -v python >/dev/null 2>&1; then
    python scripts/doctor.py "$@"
else
    echo "Error: Python 3.11+ is required to run CodeSync preflight checks." >&2
    exit 1
fi
