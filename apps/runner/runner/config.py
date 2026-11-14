import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env if available
load_dotenv(BASE_DIR.parent.parent / ".env")
load_dotenv(BASE_DIR / ".env")

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", REDIS_URL)

_raw_internal = os.environ.get("INTERNAL_API_URL", "http://localhost:8000/internal").strip().rstrip("/")
if not _raw_internal.endswith("/internal"):
    INTERNAL_API_URL = f"{_raw_internal}/internal"
else:
    INTERNAL_API_URL = _raw_internal

# On local development, avoid Windows IPv6 resolution timeouts by pointing to 127.0.0.1
if "://localhost:" in INTERNAL_API_URL:
    INTERNAL_API_URL = INTERNAL_API_URL.replace("://localhost:", "://127.0.0.1:")

INTERNAL_API_TOKEN = os.environ.get("INTERNAL_API_TOKEN", "codesync-internal-token-change-in-prod")

if not INTERNAL_API_TOKEN or INTERNAL_API_TOKEN == "CHANGE_ME":
    INTERNAL_API_TOKEN = "codesync-internal-token-change-in-prod"

EXECUTION_TIMEOUT_SECONDS = int(os.environ.get("EXECUTION_TIMEOUT_SECONDS", "10"))
MEMORY_LIMIT = os.environ.get("MEMORY_LIMIT", "128m")
MEMSWAP_LIMIT = os.environ.get("MEMSWAP_LIMIT", "128m")
NANO_CPUS = int(os.environ.get("NANO_CPUS", "500000000"))  # 0.5 CPU
PIDS_LIMIT = int(os.environ.get("PIDS_LIMIT", "64"))
MAX_OUTPUT_BYTES = int(os.environ.get("MAX_OUTPUT_BYTES", "65536"))  # 64KB

# Docker images for supported languages
SANDBOX_IMAGES = {
    "python": os.environ.get("SANDBOX_IMAGE_PYTHON", "codesync-sandbox-python:latest"),
    "javascript": os.environ.get("SANDBOX_IMAGE_JAVASCRIPT", "codesync-sandbox-javascript:latest"),
    "cpp": os.environ.get("SANDBOX_IMAGE_CPP", "codesync-sandbox-cpp:latest"),
}
