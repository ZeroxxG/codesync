from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Room, RoomMembership, Run

User = get_user_model()


class RoomMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = RoomMembership
        fields = ["id", "user_id", "username", "email", "role", "created_at"]
        read_only_fields = ["id", "user_id", "username", "email", "created_at"]


class AddMemberSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    role = serializers.ChoiceField(
        choices=[RoomMembership.Role.EDITOR, RoomMembership.Role.VIEWER],
        default=RoomMembership.Role.EDITOR,
    )

    def validate_username(self, value: str) -> str:
        cleaned = value.strip().lower()
        if not User.objects.filter(username__iexact=cleaned).exists():
            raise serializers.ValidationError(f"User '{value}' does not exist.")
        return cleaned


class RoomSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True, default=None)
    current_user_role = serializers.SerializerMethodField()
    viewer_token = serializers.SerializerMethodField()
    editor_token = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            "id",
            "name",
            "slug",
            "language",
            "owner",
            "owner_username",
            "current_user_role",
            "viewer_token",
            "editor_token",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "slug",
            "owner",
            "owner_username",
            "current_user_role",
            "viewer_token",
            "editor_token",
            "created_at",
            "updated_at",
        ]

    def get_current_user_role(self, obj: Room) -> str:
        request = self.context.get("request")
        if not request:
            return "viewer"

        # Check query param for editor or viewer token
        token = (
            request.query_params.get("editor_token")
            or request.query_params.get("viewer_token")
            or request.query_params.get("invite_token")
            or request.query_params.get("token")
        )
        if token:
            if hasattr(obj, "editor_token") and token == obj.editor_token:
                return "editor"
            if token == obj.viewer_token:
                return "viewer"

        if request.user and request.user.is_authenticated:
            if obj.owner_id == request.user.id:
                return "owner"
            membership = next((m for m in obj.memberships.all() if m.user_id == request.user.id), None)
            if membership:
                return membership.role


        # If room has no owner (Phase 1 legacy anonymous room), default to editor
        if not obj.owner_id:
            return "editor"

        return "none"

    def get_viewer_token(self, obj: Room) -> str | None:
        role = self.get_current_user_role(obj)
        if role in ("owner", "editor", "viewer"):
            return obj.viewer_token
        return None

    def get_editor_token(self, obj: Room) -> str | None:
        role = self.get_current_user_role(obj)
        if role in ("owner", "editor"):
            if not getattr(obj, "editor_token", None):
                obj.refresh_editor_token()
            return obj.editor_token
        return None

    def validate_language(self, value: str) -> str:
        allowed = {"python", "javascript", "cpp"}
        cleaned = value.lower().strip()
        if cleaned not in allowed:
            raise serializers.ValidationError(f"Language must be one of: {', '.join(sorted(allowed))}")
        return cleaned


class CreateRoomSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=120, default="Untitled Room")
    language = serializers.CharField(max_length=32, default="python")

    class Meta:
        model = Room
        fields = ["id", "name", "slug", "language", "created_at"]
        read_only_fields = ["id", "slug", "created_at"]

    def validate_language(self, value: str) -> str:
        allowed = {"python", "javascript", "cpp"}
        cleaned = value.lower().strip()
        if cleaned not in allowed:
            raise serializers.ValidationError(f"Language must be one of: {', '.join(sorted(allowed))}")
        return cleaned


class RunSerializer(serializers.ModelSerializer):
    room_slug = serializers.CharField(source="room.slug", read_only=True)
    user_username = serializers.CharField(source="user.username", read_only=True, default=None)

    class Meta:
        model = Run
        fields = [
            "id",
            "room_slug",
            "user",
            "user_username",
            "language",
            "code_hash",
            "status",
            "exit_code",
            "duration_ms",
            "output",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "room_slug",
            "user",
            "user_username",
            "code_hash",
            "created_at",
            "updated_at",
        ]


class CreateRunSerializer(serializers.Serializer):
    code = serializers.CharField(required=True, allow_blank=False, max_length=65536)
    language = serializers.CharField(required=False, max_length=32, default=None)

    def validate_language(self, value: str | None) -> str | None:
        if not value:
            return None
        allowed = {"python", "javascript", "cpp"}
        cleaned = value.lower().strip()
        if cleaned not in allowed:
            raise serializers.ValidationError(f"Language must be one of: {', '.join(sorted(allowed))}")
        return cleaned

