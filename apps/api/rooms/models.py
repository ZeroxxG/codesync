import secrets
import uuid
from django.db import models


def generate_room_slug() -> str:
    return secrets.token_urlsafe(6)


class Room(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=32, unique=True, default=generate_room_slug, editable=False)
    language = models.CharField(max_length=32, default="python")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} ({self.slug})"
