from django.urls import path
from .health_views import HealthCheckView, LivenessCheckView

urlpatterns = [
    path("", HealthCheckView.as_view(), name="health-check"),
    path("liveness/", LivenessCheckView.as_view(), name="liveness-check"),
    path("readiness/", HealthCheckView.as_view(), name="readiness-check"),
]
