from __future__ import annotations

from rest_framework import serializers

from core.models import Course, Group, Student

from .models import Lead, LeadNote, MessageTemplate, Notification, SentMessage


# ── Leads ────────────────────────────────────────────────────────────


class LeadNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.name", read_only=True, default="")
    date = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = LeadNote
        fields = ["id", "lead", "author", "author_name", "text", "date"]
        read_only_fields = ["author"]


class LeadSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(
        source="course_interest.name", read_only=True, default=""
    )
    manager_name = serializers.CharField(source="manager.name", read_only=True, default="")
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    notes = LeadNoteSerializer(many=True, read_only=True)
    is_open = serializers.BooleanField(read_only=True)

    class Meta:
        model = Lead
        fields = [
            "id", "name", "phone", "email", "source", "course_interest", "course_name",
            "stage", "priority", "manager", "manager_name", "branch", "branch_name",
            "expected_value", "next_contact_date", "converted_student",
            "lost_reason", "is_open", "notes", "created_at",
        ]
        read_only_fields = ["converted_student"]
        extra_kwargs = {
            # Defaults to the course's full programme price, and to the
            # requesting user's branch, when the client omits them.
            "expected_value": {"required": False},
            "branch": {"required": False},
        }

    def create(self, validated_data):
        course = validated_data.get("course_interest")
        if course and not validated_data.get("expected_value"):
            validated_data["expected_value"] = course.price * course.duration_months
        return super().create(validated_data)


class LeadStageSerializer(serializers.Serializer):
    """Payload for the Kanban drag-and-drop."""

    stage = serializers.ChoiceField(choices=Lead.Stage.choices)
    lost_reason = serializers.CharField(required=False, allow_blank=True, default="")


class LeadConvertSerializer(serializers.Serializer):
    """Turn a lead into an enrolled student."""

    group = serializers.PrimaryKeyRelatedField(queryset=Group.objects.all())
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField()
    gender = serializers.ChoiceField(choices=Student.Gender.choices)
    parent_name = serializers.CharField(required=False, allow_blank=True, default="")
    parent_phone = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_group(self, group: Group) -> Group:
        if group.student_count >= group.capacity:
            raise serializers.ValidationError(
                f"Group '{group.name}' is full ({group.capacity} seats)."
            )
        return group


# ── Communications ───────────────────────────────────────────────────


class MessageTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageTemplate
        fields = ["id", "key", "channel", "subject", "body"]


class SentMessageSerializer(serializers.ModelSerializer):
    sent_by_name = serializers.CharField(source="sent_by.name", read_only=True, default="")
    date = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = SentMessage
        fields = [
            "id", "channel", "template", "student", "recipient_name", "to",
            "body", "status", "sent_by", "sent_by_name", "error", "date",
        ]
        read_only_fields = ["sent_by", "status", "error"]


class SendMessageSerializer(serializers.Serializer):
    """What the Communications composer posts."""

    AUDIENCES = ["all-students", "all-debtors", "group"]

    channel = serializers.ChoiceField(choices=MessageTemplate.Channel.choices)
    audience = serializers.ChoiceField(choices=[(a, a) for a in AUDIENCES])
    group = serializers.PrimaryKeyRelatedField(
        queryset=Group.objects.all(), required=False, allow_null=True
    )
    template = serializers.PrimaryKeyRelatedField(
        queryset=MessageTemplate.objects.all(), required=False, allow_null=True
    )
    body = serializers.CharField()
    #: Guards against a slip of the finger blasting the whole center.
    confirm_large_send = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        if attrs["audience"] == "group" and not attrs.get("group"):
            raise serializers.ValidationError(
                {"group": "Pick a group when the audience is 'group'."}
            )
        return attrs


# ── Notifications ────────────────────────────────────────────────────


class NotificationSerializer(serializers.ModelSerializer):
    read = serializers.BooleanField(read_only=True)
    date = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "type", "title", "body", "link", "read", "read_at", "date"]
        read_only_fields = ["type", "title", "body", "link", "read_at"]
