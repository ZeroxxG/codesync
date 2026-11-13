from django.contrib import admin
from .models import Room, RoomMembership, RoomSnapshot


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "language", "owner", "created_at")
    search_fields = ("name", "slug", "owner__username")


@admin.register(RoomMembership)
class RoomMembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "room", "role", "created_at")
    list_filter = ("role",)
    search_fields = ("user__username", "room__name", "room__slug")


@admin.register(RoomSnapshot)
class RoomSnapshotAdmin(admin.ModelAdmin):
    list_display = ("room", "size_bytes", "updated_at")
