from django.urls import path
from .views import RoomDetailView, RoomListCreateView

urlpatterns = [
    path("", RoomListCreateView.as_view(), name="room-list-create"),
    path("<slug:slug>/", RoomDetailView.as_view(), name="room-detail"),
]
