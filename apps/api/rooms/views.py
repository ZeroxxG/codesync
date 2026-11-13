from django.contrib.auth import get_user_model
from django.db.models import Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Room, RoomMembership
from .serializers import (
    AddMemberSerializer,
    CreateRoomSerializer,
    RoomMemberSerializer,
    RoomSerializer,
)

User = get_user_model()


def get_user_room_role(room: Room, user, token: str | None = None) -> str:
    """Helper to determine effective role for user in room."""
    if token:
        if hasattr(room, "editor_token") and token == room.editor_token:
            return RoomMembership.Role.EDITOR
        if token == room.viewer_token:
            return RoomMembership.Role.VIEWER

    if not room.owner_id:
        return RoomMembership.Role.EDITOR

    if not user or not user.is_authenticated:
        return "none"

    if room.owner_id == user.id:
        return RoomMembership.Role.OWNER

    membership = room.memberships.filter(user=user).first()
    if membership:
        return membership.role

    return "none"


class RoomListCreateView(APIView):
    """
    POST: Create a new room with an auto-generated join slug.
    GET: List rooms user owns or belongs to.
    """

    def get(self, request: Request) -> Response:
        if request.user.is_authenticated:
            rooms = Room.objects.filter(
                Q(owner=request.user) | Q(memberships__user=request.user)
            ).distinct()[:50]
        else:
            rooms = Room.objects.all()[:20]

        serializer = RoomSerializer(rooms, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request: Request) -> Response:
        serializer = CreateRoomSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        room = serializer.save()

        if request.user.is_authenticated:
            room.owner = request.user
            room.save(update_fields=["owner"])
            RoomMembership.objects.create(
                user=request.user,
                room=room,
                role=RoomMembership.Role.OWNER,
            )

        return Response(
            RoomSerializer(room, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class RoomDetailView(APIView):
    """
    GET: Retrieve room by slug or token (join by link).
    PATCH: Update room settings (language).
    """

    def get(self, request: Request, slug: str) -> Response:
        room = Room.objects.filter(slug=slug).first()
        if not room:
            room = Room.objects.filter(viewer_token=slug).first()
        if not room and hasattr(Room, "editor_token"):
            room = Room.objects.filter(editor_token=slug).first()

        if not room:
            raise Http404("Room not found")

        token = (
            request.query_params.get("editor_token")
            or request.query_params.get("viewer_token")
            or request.query_params.get("invite_token")
            or request.query_params.get("token")
        )
        if not token:
            if slug == room.viewer_token or (hasattr(room, "editor_token") and slug == room.editor_token):
                token = slug

        role = get_user_room_role(room, request.user, token)

        if role == "none":
            raise PermissionDenied("You do not have access to this room.")

        serializer = RoomSerializer(room, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        token = request.query_params.get("viewer_token") or request.query_params.get("token")
        role = get_user_room_role(room, request.user, token)

        if role not in (RoomMembership.Role.OWNER, RoomMembership.Role.EDITOR):
            raise PermissionDenied("Viewers cannot modify room settings.")

        serializer = RoomSerializer(room, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class RoomMembershipView(APIView):
    """
    GET: List all members in the room.
    POST: Add or update a member's role (owner only).
    """

    def get(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        token = request.query_params.get("viewer_token") or request.query_params.get("token")
        role = get_user_room_role(room, request.user, token)

        if role == "none":
            raise PermissionDenied("You do not have access to view members.")

        memberships = room.memberships.select_related("user").all()
        serializer = RoomMemberSerializer(memberships, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        role = get_user_room_role(room, request.user)

        if role != RoomMembership.Role.OWNER:
            raise PermissionDenied("Only the room owner can manage members.")

        serializer = AddMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_user = User.objects.get(username__iexact=serializer.validated_data["username"])
        target_role = serializer.validated_data["role"]

        if target_user.id == room.owner_id:
            return Response(
                {"error": "The room owner's role cannot be modified."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership, _ = RoomMembership.objects.update_or_create(
            user=target_user,
            room=room,
            defaults={"role": target_role},
        )
        return Response(RoomMemberSerializer(membership).data, status=status.HTTP_200_OK)


class RoomMembershipDetailView(APIView):
    """
    DELETE: Remove a member from the room.
    """

    def delete(self, request: Request, slug: str, user_id: int) -> Response:
        room = get_object_or_404(Room, slug=slug)
        current_role = get_user_room_role(room, request.user)

        # Allow room owner to remove anyone, or a user to remove themselves
        if current_role != RoomMembership.Role.OWNER and request.user.id != user_id:
            raise PermissionDenied("Only the room owner can remove members.")

        if user_id == room.owner_id:
            return Response(
                {"error": "The room owner cannot be removed from the room."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership = get_object_or_404(RoomMembership, room=room, user_id=user_id)
        membership.delete()
        return Response({"message": "Member removed successfully."}, status=status.HTTP_200_OK)


class RoomViewerLinkView(APIView):
    """
    GET: Retrieve the read-only viewer share link.
    POST: Regenerate the viewer share token (owner only).
    """

    def get(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        role = get_user_room_role(room, request.user)

        if role not in (RoomMembership.Role.OWNER, RoomMembership.Role.EDITOR):
            raise PermissionDenied("Only owners and editors can retrieve the viewer share link.")

        return Response(
            {
                "viewer_token": room.viewer_token,
                "share_param": f"?viewer_token={room.viewer_token}",
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        role = get_user_room_role(room, request.user)

        if role != RoomMembership.Role.OWNER:
            raise PermissionDenied("Only the room owner can regenerate the viewer link.")

        new_token = room.refresh_viewer_token()
        return Response(
            {
                "viewer_token": new_token,
                "share_param": f"?viewer_token={new_token}",
            },
            status=status.HTTP_200_OK,
        )
