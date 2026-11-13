import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import rooms.models


class Migration(migrations.Migration):

    dependencies = [
        ("rooms", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="room",
            name="owner",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="owned_rooms",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="room",
            name="viewer_token",
            field=models.CharField(
                default=rooms.models.generate_viewer_token,
                editable=False,
                max_length=64,
                unique=True,
            ),
        ),
        migrations.CreateModel(
            name="RoomSnapshot",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("data", models.BinaryField()),
                ("size_bytes", models.PositiveIntegerField(default=0)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "room",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="snapshot",
                        to="rooms.room",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="RoomMembership",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("owner", "Owner"),
                            ("editor", "Editor"),
                            ("viewer", "Viewer"),
                        ],
                        default="editor",
                        max_length=16,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "room",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="memberships",
                        to="rooms.room",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="room_memberships",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="roommembership",
            constraint=models.UniqueConstraint(
                fields=("user", "room"), name="unique_user_room_membership"
            ),
        ),
    ]
