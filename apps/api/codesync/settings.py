import os
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env if present (from project root or apps/api)
load_dotenv(BASE_DIR.parent.parent / ".env")
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "codesync-insecure-dev-secret-key-32-chars-long!")
if SECRET_KEY == "CHANGE_ME" or len(SECRET_KEY) < 32:
    SECRET_KEY = "codesync-insecure-dev-secret-key-32-chars-long!"
DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() in ("true", "1", "yes")

allowed_hosts_raw = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,api")
ALLOWED_HOSTS = [h.strip() for h in allowed_hosts_raw.split(",") if h.strip()]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "accounts.apps.AccountsConfig",
    "rooms.apps.RoomsConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "codesync.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "codesync.wsgi.application"
ASGI_APPLICATION = "codesync.asgi.application"

# Database configuration
import socket

def resolve_host(host: str | None, fallback: str = "localhost") -> str:
    """Resolve host, falling back to localhost if running outside container network."""
    if not host:
        return fallback
    try:
        socket.gethostbyname(host)
        return host
    except (socket.gaierror, OSError):
        return fallback

def resolve_redis_url(url: str | None, fallback_host: str = "localhost") -> str:
    """If REDIS_URL points to an unresolvable hostname like 'redis', fallback to localhost."""
    if not url:
        return ""
    if "://redis:" in url or "://redis/" in url:
        try:
            socket.gethostbyname("redis")
        except (socket.gaierror, OSError):
            return url.replace("://redis:", f"://{fallback_host}:").replace("://redis/", f"://{fallback_host}/")
    return url

postgres_db = os.environ.get("POSTGRES_DB")
postgres_user = os.environ.get("POSTGRES_USER")
postgres_password = os.environ.get("POSTGRES_PASSWORD", "")
raw_postgres_host = os.environ.get("POSTGRES_HOST")
postgres_host = resolve_host(raw_postgres_host, "localhost") if raw_postgres_host else None
postgres_port = os.environ.get("POSTGRES_PORT", "5432")

REDIS_URL = resolve_redis_url(os.environ.get("REDIS_URL", "redis://localhost:6379/0"))

if postgres_db and postgres_user and postgres_host:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": postgres_db,
            "USER": postgres_user,
            "PASSWORD": postgres_password,
            "HOST": postgres_host,
            "PORT": postgres_port,
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CORS
cors_origins_raw = os.environ.get("DJANGO_CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
CORS_ALLOWED_ORIGINS = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]
CORS_ALLOW_CREDENTIALS = True

# REST Framework
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}

# SimpleJWT configuration
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(os.environ.get("JWT_ACCESS_TTL_MINUTES", "15"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(os.environ.get("JWT_REFRESH_TTL_DAYS", "7"))),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# Service-to-service auth & limits
INTERNAL_API_TOKEN = os.environ.get("INTERNAL_API_TOKEN", "codesync-internal-token-change-in-prod")
MAX_DOCUMENT_BYTES = int(os.environ.get("MAX_DOCUMENT_BYTES", "1048576"))
