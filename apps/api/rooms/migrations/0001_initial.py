import uuid
from django.db import migrations, models
import rooms.models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Room",
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
                ("name", models.CharField(max_length=120)),
                (
                    "slug",
                    models.SlugField(
                        default=rooms.models.generate_room_slug,
                        editable=False,
                        max_length=32,
                        unique=True,
                    ),
                ),
                ("language", models.CharField(default="python", max_length=32)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
