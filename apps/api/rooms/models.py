import secrets
import uuid
from django.conf import settings
from django.db import models


def generate_room_slug() -> str:
    return secrets.token_urlsafe(6)


def generate_viewer_token() -> str:
    return secrets.token_urlsafe(24)


def generate_editor_token() -> str:
    return secrets.token_urlsafe(24)


class Room(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=32, unique=True, default=generate_room_slug, editable=False)
    language = models.CharField(max_length=32, default="python")
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_rooms",
    )
    viewer_token = models.CharField(
        max_length=64,
        unique=True,
        default=generate_viewer_token,
        editable=False,
    )
    editor_token = models.CharField(
        max_length=64,
        null=True,
        blank=True,
        default=generate_editor_token,
        editable=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} ({self.slug})"

    def refresh_viewer_token(self) -> str:
        self.viewer_token = generate_viewer_token()
        self.save(update_fields=["viewer_token", "updated_at"])
        return self.viewer_token

    def refresh_editor_token(self) -> str:
        self.editor_token = generate_editor_token()
        self.save(update_fields=["editor_token", "updated_at"])
        return self.editor_token


class RoomMembership(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        EDITOR = "editor", "Editor"
        VIEWER = "viewer", "Viewer"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="room_memberships",
    )
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(
        max_length=16,
        choices=Role.choices,
        default=Role.EDITOR,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "room"], name="unique_user_room_membership"),
        ]
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.user} - {self.room.name} ({self.role})"


class RoomSnapshot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.OneToOneField(
        Room,
        on_delete=models.CASCADE,
        related_name="snapshot",
    )
    data = models.BinaryField()
    size_bytes = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Snapshot for {self.room.name} ({self.size_bytes} bytes)"


class Run(models.Model):
    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        TIMEOUT = "timeout", "Timeout"
        OOM = "oom", "Out of Memory"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name="runs",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="runs",
    )
    language = models.CharField(max_length=32)
    code_hash = models.CharField(max_length=64, blank=True, default="")
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.QUEUED,
    )
    exit_code = models.IntegerField(null=True, blank=True)
    duration_ms = models.IntegerField(null=True, blank=True)
    output = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Run {self.id} ({self.room.slug} - {self.language} - {self.status})"

