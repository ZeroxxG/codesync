from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Room
from .serializers import CreateRoomSerializer, RoomSerializer


class RoomListCreateView(APIView):
    """
    POST: Create a new room with an auto-generated join slug.
    GET: List recent rooms.
    """

    def get(self, request: Request) -> Response:
        rooms = Room.objects.all()[:20]
        serializer = RoomSerializer(rooms, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request: Request) -> Response:
        serializer = CreateRoomSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        room = serializer.save()
        return Response(RoomSerializer(room).data, status=status.HTTP_201_CREATED)


class RoomDetailView(APIView):
    """
    GET: Retrieve room by slug (join by link).
    PATCH: Update room settings (e.g. language).
    """

    def get(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        return Response(RoomSerializer(room).data, status=status.HTTP_200_OK)

    def patch(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        serializer = RoomSerializer(room, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
