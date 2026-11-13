import uuid
from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Room, RoomMembership, RoomSnapshot

User = get_user_model()


class HasInternalServiceToken(permissions.BasePermission):
    """
    Validates that the incoming request has the secret service-to-service token.
    Checks 'X-Internal-Token' header or 'Authorization: Bearer <token>'.
    """

    def has_permission(self, request: Request, view: APIView) -> bool:
        expected_token = getattr(settings, "INTERNAL_API_TOKEN", None)
        if not expected_token:
            return False

        token = request.headers.get("X-Internal-Token")
        if not token:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ", 1)[1]

        if not token or token != expected_token:
            raise AuthenticationFailed("Invalid or missing internal service token.")

        return True


class InternalRoomRoleView(APIView):
    """
    GET /internal/rooms/<room_id_or_slug>/role/?user_id=123&viewer_token=abc
    Called by the realtime service to verify a user's role before admitting to WebSocket.
    """

    permission_classes = [HasInternalServiceToken]

    def get(self, request: Request, room_identifier: str) -> Response:
        # Find room by UUID or by slug
        room = None
        try:
            val = uuid.UUID(room_identifier)
            room = Room.objects.filter(id=val).first()
        except ValueError:
            pass

        if not room:
            room = get_object_or_404(Room, slug=room_identifier)

        viewer_token = request.query_params.get("viewer_token") or request.query_params.get("token")
        user_id = request.query_params.get("user_id")

        # 1. Check viewer token match (anonymous or logged-in guest)
        if viewer_token and viewer_token == room.viewer_token:
            return Response(
                {
                    "room_id": str(room.id),
                    "room_slug": room.slug,
                    "role": RoomMembership.Role.VIEWER,
                    "is_guest": True,
                    "user_id": int(user_id) if user_id and user_id.isdigit() else None,
                },
                status=status.HTTP_200_OK,
            )

        # 2. If room has no owner (legacy/unowned), default to editor
        if not room.owner_id:
            return Response(
                {
                    "room_id": str(room.id),
                    "room_slug": room.slug,
                    "role": RoomMembership.Role.EDITOR,
                    "is_guest": False,
                    "user_id": int(user_id) if user_id and user_id.isdigit() else None,
                },
                status=status.HTTP_200_OK,
            )

        # 3. Check registered user
        if not user_id or not user_id.isdigit():
            raise PermissionDenied("User ID or valid viewer token is required.")

        uid = int(user_id)
        user = User.objects.filter(id=uid, is_active=True).first()
        if not user:
            raise PermissionDenied("User not found or inactive.")

        if room.owner_id == user.id:
            return Response(
                {
                    "room_id": str(room.id),
                    "room_slug": room.slug,
                    "role": RoomMembership.Role.OWNER,
                    "is_guest": False,
                    "user_id": user.id,
                    "username": user.username,
                },
                status=status.HTTP_200_OK,
            )

        membership = room.memberships.filter(user=user).first()
        if membership:
            return Response(
                {
                    "room_id": str(room.id),
                    "room_slug": room.slug,
                    "role": membership.role,
                    "is_guest": False,
                    "user_id": user.id,
                    "username": user.username,
                },
                status=status.HTTP_200_OK,
            )

        raise PermissionDenied("User is not a member of this room.")


class InternalRoomSnapshotView(APIView):
    """
    GET /internal/rooms/<room_id_or_slug>/snapshot/
    Returns binary Yjs state.

    PUT /internal/rooms/<room_id_or_slug>/snapshot/
    Persists binary Yjs state (debounced by realtime service).
    """

    permission_classes = [HasInternalServiceToken]

    def _get_room(self, room_identifier: str) -> Room:
        try:
            val = uuid.UUID(room_identifier)
            room = Room.objects.filter(id=val).first()
            if room:
                return room
        except ValueError:
            pass
        return get_object_or_404(Room, slug=room_identifier)

    def get(self, request: Request, room_identifier: str) -> HttpResponse:
        room = self._get_room(room_identifier)
        snapshot = getattr(room, "snapshot", None)
        if not snapshot or not snapshot.data:
            return HttpResponse(status=status.HTTP_204_NO_CONTENT)

        response = HttpResponse(bytes(snapshot.data), content_type="application/octet-stream")
        response["Content-Length"] = str(len(snapshot.data))
        response["X-Snapshot-Bytes"] = str(snapshot.size_bytes)
        return response

    def put(self, request: Request, room_identifier: str) -> Response:
        room = self._get_room(room_identifier)
        binary_data = request.body

        max_bytes = getattr(settings, "MAX_DOCUMENT_BYTES", 1048576)
        if len(binary_data) > max_bytes:
            return Response(
                {
                    "error": f"Snapshot size ({len(binary_data)} bytes) exceeds maximum limit of {max_bytes} bytes."
                },
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        snapshot, _ = RoomSnapshot.objects.update_or_create(
            room=room,
            defaults={
                "data": binary_data,
                "size_bytes": len(binary_data),
            },
        )

        return Response(
            {
                "room_id": str(room.id),
                "room_slug": room.slug,
                "size_bytes": snapshot.size_bytes,
                "updated_at": snapshot.updated_at.isoformat(),
            },
            status=status.HTTP_200_OK,
        )
