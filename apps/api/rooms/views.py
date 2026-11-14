import hashlib
import uuid
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Room, RoomMembership, Run
from .serializers import (
    AddMemberSerializer,
    CreateRoomSerializer,
    CreateRunSerializer,
    RoomMemberSerializer,
    RoomSerializer,
    RunSerializer,
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


class RoomRunView(APIView):
    """
    POST /api/rooms/<slug>/runs/
    Dispatches a code execution job to the runner worker via Celery.
    Rejects viewers (403), enforces rate limits (429), and checks per-room active run mutex lock (409).

    GET /api/rooms/<slug>/runs/
    Returns recent runs for the room.
    """

    def get(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        token = (
            request.query_params.get("editor_token")
            or request.query_params.get("viewer_token")
            or request.query_params.get("invite_token")
            or request.query_params.get("token")
        )
        role = get_user_room_role(room, request.user, token)
        if role == "none":
            raise PermissionDenied("You do not have access to view runs in this room.")

        runs = room.runs.all()[:20]
        serializer = RunSerializer(runs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request: Request, slug: str) -> Response:
        room = get_object_or_404(Room, slug=slug)
        token = (
            request.query_params.get("editor_token")
            or request.query_params.get("viewer_token")
            or request.query_params.get("invite_token")
            or request.query_params.get("token")
            or request.headers.get("X-Editor-Token")
            or request.headers.get("X-Viewer-Token")
        )
        role = get_user_room_role(room, request.user, token)

        if role == RoomMembership.Role.VIEWER:
            return Response(
                {"error": "Viewers are not permitted to execute code."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if role not in (RoomMembership.Role.OWNER, RoomMembership.Role.EDITOR):
            raise PermissionDenied("You do not have permission to execute code in this room.")

        serializer = CreateRunSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data["code"]
        language = serializer.validated_data.get("language") or room.language

        # Connect to Redis for rate-limiting and mutex lock
        import redis
        redis_url = getattr(settings, "REDIS_URL", "redis://localhost:6379/0")
        r = None
        try:
            r = redis.from_url(redis_url)

            # 1. Rate limiting: 6 runs/min per user, 10 runs/min per room
            user_ident = str(request.user.id) if (request.user and request.user.is_authenticated) else request.META.get("REMOTE_ADDR", "anon")
            user_key = f"ratelimit:user:{user_ident}"
            room_key = f"ratelimit:room:{room.slug}"

            user_runs = r.incr(user_key)
            if user_runs == 1:
                r.expire(user_key, 60)
            if user_runs > 6:
                return Response(
                    {"error": "User run rate limit exceeded (maximum 6 runs per minute)."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

            room_runs = r.incr(room_key)
            if room_runs == 1:
                r.expire(room_key, 60)
            if room_runs > 10:
                return Response(
                    {"error": "Room run rate limit exceeded (maximum 10 runs per minute)."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

            # 2. Concurrency lock (15s TTL mutex)
            lock_key = f"room:{room.slug}:running_lock"
            acquired = r.set(lock_key, "1", nx=True, ex=15)
            if not acquired:
                return Response(
                    {"error": "Another code execution is currently running in this room. Please wait for it to complete."},
                    status=status.HTTP_409_CONFLICT,
                )
        except redis.RedisError:
            r = None

        code_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()
        run = Run.objects.create(
            room=room,
            user=request.user if (request.user and request.user.is_authenticated) else None,
            language=language,
            code_hash=code_hash,
            status=Run.Status.QUEUED,
        )

        # Dispatch Celery task
        try:
            from codesync.celery import app as celery_app
            celery_app.send_task(
                "runner.tasks.execute_code",
                args=[str(run.id), room.slug, language, code],
                queue="runner",
            )

        except Exception as e:
            if r:
                try:
                    r.delete(f"room:{room.slug}:running_lock")
                except Exception:
                    pass
            run.status = Run.Status.FAILED
            run.output = f"Failed to dispatch execution task: {str(e)}"
            run.save(update_fields=["status", "output"])
            return Response(
                {"error": f"Failed to queue execution: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(RunSerializer(run).data, status=status.HTTP_201_CREATED)


class RoomRunDetailView(APIView):
    """
    GET /api/rooms/<slug>/runs/<uuid:run_id>/
    Retrieve the status and output of a specific execution.
    """

    def get(self, request: Request, slug: str, run_id: uuid.UUID) -> Response:
        room = get_object_or_404(Room, slug=slug)
        token = (
            request.query_params.get("editor_token")
            or request.query_params.get("viewer_token")
            or request.query_params.get("invite_token")
            or request.query_params.get("token")
        )
        role = get_user_room_role(room, request.user, token)
        if role == "none":
            raise PermissionDenied("You do not have access to view runs in this room.")

        run = get_object_or_404(Run, id=run_id, room=room)
        return Response(RunSerializer(run).data, status=status.HTTP_200_OK)

