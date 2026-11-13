from django.urls import path
from .internal_views import InternalRoomRoleView, InternalRoomSnapshotView

urlpatterns = [
    path("rooms/<str:room_identifier>/role/", InternalRoomRoleView.as_view(), name="internal-room-role"),
    path("rooms/<str:room_identifier>/snapshot/", InternalRoomSnapshotView.as_view(), name="internal-room-snapshot"),
]
