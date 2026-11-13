from django.urls import path
from .views import (
    RoomDetailView,
    RoomListCreateView,
    RoomMembershipDetailView,
    RoomMembershipView,
    RoomRunDetailView,
    RoomRunView,
    RoomViewerLinkView,
)

urlpatterns = [
    path("", RoomListCreateView.as_view(), name="room-list-create"),
    path("<slug:slug>/", RoomDetailView.as_view(), name="room-detail"),
    path("<slug:slug>/members/", RoomMembershipView.as_view(), name="room-members"),
    path("<slug:slug>/members/<int:user_id>/", RoomMembershipDetailView.as_view(), name="room-member-detail"),
    path("<slug:slug>/viewer-link/", RoomViewerLinkView.as_view(), name="room-viewer-link"),
    path("<slug:slug>/runs/", RoomRunView.as_view(), name="room-runs"),
    path("<slug:slug>/runs/<uuid:run_id>/", RoomRunDetailView.as_view(), name="room-run-detail"),
]
