from rest_framework import serializers
from .models import Room


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ["id", "name", "slug", "language", "created_at", "updated_at"]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]

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
