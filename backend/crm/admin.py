from django.contrib import admin

from .models import Lead, LeadNote, MessageTemplate, Notification, SentMessage


class LeadNoteInline(admin.TabularInline):
    model = LeadNote
    extra = 0


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ["name", "phone", "stage", "source", "priority", "manager", "branch"]
    list_filter = ["stage", "source", "priority", "branch"]
    search_fields = ["name", "phone", "email"]
    inlines = [LeadNoteInline]


@admin.register(MessageTemplate)
class MessageTemplateAdmin(admin.ModelAdmin):
    list_display = ["key", "channel", "subject"]
    list_filter = ["channel"]


@admin.register(SentMessage)
class SentMessageAdmin(admin.ModelAdmin):
    list_display = ["recipient_name", "channel", "to", "status", "created_at"]
    list_filter = ["channel", "status"]
    search_fields = ["recipient_name", "to"]


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "type", "read_at", "created_at"]
    list_filter = ["type"]
    search_fields = ["title", "body"]
