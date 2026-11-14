from django.contrib import admin
from django.urls import include, path
from rooms.health_views import HealthCheckView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", HealthCheckView.as_view(), name="root-health"),
    path("api/health/", include("rooms.health_urls")),
    path("api/auth/", include("accounts.urls")),
    path("api/rooms/", include("rooms.urls")),
    path("internal/", include("rooms.internal_urls")),
]

