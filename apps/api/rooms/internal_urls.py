from django.urls import path
from .internal_views import InternalRoomRoleView, InternalRoomSnapshotView, InternalRunCallbackView

urlpatterns = [
    path("rooms/<str:room_identifier>/role/", InternalRoomRoleView.as_view(), name="internal-room-role"),
    path("rooms/<str:room_identifier>/snapshot/", InternalRoomSnapshotView.as_view(), name="internal-room-snapshot"),
    path("runs/<uuid:run_id>/", InternalRunCallbackView.as_view(), name="internal-run-callback"),
]
