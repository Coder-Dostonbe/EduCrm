from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.db.models import Count, DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import ModulePermission
from core.models import Student
from core.serializers import StudentSerializer
from core.views import ScopedQuerysetMixin
from finance.models import Invoice

from .models import Lead, LeadNote, MessageTemplate, Notification, SentMessage
from .serializers import (
    LeadConvertSerializer,
    LeadNoteSerializer,
    LeadSerializer,
    LeadStageSerializer,
    MessageTemplateSerializer,
    NotificationSerializer,
    SendMessageSerializer,
    SentMessageSerializer,
)

MONEY = DecimalField(max_digits=14, decimal_places=2)
ZERO = Value(Decimal("0"))

#: Sending to more recipients than this needs an explicit confirmation flag.
LARGE_SEND_THRESHOLD = 50


# ── Leads ────────────────────────────────────────────────────────────


class LeadViewSet(ScopedQuerysetMixin, viewsets.ModelViewSet):
    module = "leads"
    permission_classes = [IsAuthenticated, ModulePermission]
    serializer_class = LeadSerializer
    filterset_fields = ["stage", "source", "priority", "manager", "branch"]
    search_fields = ["name", "phone", "email"]
    ordering_fields = ["created_at", "expected_value", "next_contact_date"]

    def get_queryset(self):
        qs = Lead.objects.select_related(
            "course_interest", "manager", "branch", "converted_student"
        ).prefetch_related("notes__author")
        return self.filter_branch(qs)

    def perform_create(self, serializer):
        # Default the owner and branch to the person creating the lead.
        extra = {}
        if not serializer.validated_data.get("manager"):
            extra["manager"] = self.request.user
        if not serializer.validated_data.get("branch"):
            if self.request.user.branch_id:
                extra["branch_id"] = self.request.user.branch_id
        serializer.save(**extra)

    @extend_schema(request=LeadStageSerializer, responses=LeadSerializer)
    @action(detail=True, methods=["post"], url_path="stage")
    def move_stage(self, request, pk=None):
        """Move a lead between pipeline columns (the Kanban drag-and-drop)."""
        lead = self.get_object()
        serializer = LeadStageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_stage = serializer.validated_data["stage"]
        if new_stage == Lead.Stage.ENROLLED and not lead.converted_student:
            return Response(
                {
                    "detail": (
                        "Use the convert endpoint to enrol a lead — it creates the "
                        "student record and links it to this lead."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        lead.stage = new_stage
        if new_stage == Lead.Stage.LOST:
            lead.lost_reason = serializer.validated_data.get("lost_reason", "")
        lead.save(update_fields=["stage", "lost_reason", "updated_at"])
        return Response(self.get_serializer(lead).data)

    @extend_schema(request=LeadNoteSerializer, responses=LeadNoteSerializer)
    @action(detail=True, methods=["post"], url_path="notes")
    def add_note(self, request, pk=None):
        lead = self.get_object()
        serializer = LeadNoteSerializer(data={**request.data, "lead": lead.id})
        serializer.is_valid(raise_exception=True)
        serializer.save(author=request.user, lead=lead)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(request=LeadConvertSerializer, responses=StudentSerializer)
    @action(detail=True, methods=["post"])
    def convert(self, request, pk=None):
        """Enrol the lead: create the student, link it, close the lead."""
        lead = self.get_object()
        if lead.converted_student:
            return Response(
                {"detail": "This lead has already been converted."},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = LeadConvertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        group = data["group"]

        # Fall back to splitting the lead's single name field.
        parts = lead.name.split(" ", 1)
        first = data.get("first_name") or parts[0]
        last = data.get("last_name") or (parts[1] if len(parts) > 1 else "")

        with transaction.atomic():
            student = Student.objects.create(
                first_name=first,
                last_name=last,
                phone=lead.phone,
                email=lead.email,
                date_of_birth=data["date_of_birth"],
                gender=data["gender"],
                parent_name=data.get("parent_name", ""),
                parent_phone=data.get("parent_phone", ""),
                group=group,
                branch=group.branch,
                monthly_fee=group.course.price,
                status=Student.Status.ACTIVE,
            )
            lead.converted_student = student
            lead.stage = Lead.Stage.ENROLLED
            lead.save(update_fields=["converted_student", "stage", "updated_at"])

            Notification.notify_roles(
                ["admin", "manager"],
                type=Notification.Type.STUDENT,
                title="Yangi o'quvchi",
                body=f"{student.full_name} — {group.name} guruhiga qabul qilindi.",
                link=f"/students/{student.id}",
            )

        return Response(StudentSerializer(student).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def pipeline(self, request):
        """Counts and value per stage — what the Kanban header shows."""
        rows = (
            self.filter_queryset(self.get_queryset())
            .values("stage")
            .annotate(
                count=Count("id"),
                value=Coalesce(Sum("expected_value"), ZERO, output_field=MONEY),
            )
        )
        by_stage = {r["stage"]: r for r in rows}
        stages = [
            {
                "stage": stage,
                "count": by_stage.get(stage, {}).get("count", 0),
                "value": by_stage.get(stage, {}).get("value", Decimal("0")),
            }
            for stage, _ in Lead.Stage.choices
        ]

        enrolled = by_stage.get(Lead.Stage.ENROLLED, {}).get("count", 0)
        lost = by_stage.get(Lead.Stage.LOST, {}).get("count", 0)
        closed = enrolled + lost
        open_value = sum(
            (s["value"] for s in stages if s["stage"] not in Lead.CLOSED_STAGES),
            Decimal("0"),
        )

        return Response(
            {
                "stages": stages,
                "total": sum(s["count"] for s in stages),
                "pipeline_value": open_value,
                "conversion_rate": round(enrolled / closed * 100) if closed else 0,
                "enrolled": enrolled,
            }
        )


# ── Communications ───────────────────────────────────────────────────


class MessageTemplateViewSet(viewsets.ModelViewSet):
    module = "communications"
    permission_classes = [IsAuthenticated, ModulePermission]
    serializer_class = MessageTemplateSerializer
    queryset = MessageTemplate.objects.all()
    filterset_fields = ["channel", "key"]


class SentMessageViewSet(ScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    module = "communications"
    permission_classes = [IsAuthenticated, ModulePermission]
    serializer_class = SentMessageSerializer
    branch_field = "student__branch"
    filterset_fields = ["channel", "status", "student"]
    search_fields = ["recipient_name", "to", "body"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        qs = SentMessage.objects.select_related("student", "sent_by", "template")
        return self.filter_branch(qs)

    @extend_schema(request=SendMessageSerializer, responses={201: SentMessageSerializer(many=True)})
    @action(detail=False, methods=["post"])
    def send(self, request):
        """Render the message per recipient and record it.

        No external gateway is wired up yet — messages are stored with
        status `sent`, which is what the history view reads. Swapping in a
        real SMS/Telegram provider means replacing the delivery block below.
        """
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        recipients = self._resolve_audience(data)
        if not recipients:
            return Response(
                {"detail": "No recipients matched this audience."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(recipients) > LARGE_SEND_THRESHOLD and not data.get("confirm_large_send"):
            return Response(
                {
                    "detail": (
                        f"This would message {len(recipients)} people. "
                        "Resend with confirm_large_send=true to proceed."
                    ),
                    "recipient_count": len(recipients),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        template = data.get("template")
        channel = data["channel"]
        messages = []

        for student in recipients:
            context = {
                "student_name": student.full_name,
                "parent_name": student.parent_name or student.full_name,
                "course": student.group.course.name if student.group else "",
                "room": student.group.room if student.group else "",
                "amount": f"{student.monthly_fee:,.0f}".replace(",", " "),
                "date": timezone.localdate().isoformat(),
            }
            body = data["body"]
            for key, value in context.items():
                body = body.replace("{" + key + "}", str(value))

            to = student.email if channel == "email" else (
                student.parent_phone or student.phone
            )
            messages.append(
                SentMessage(
                    channel=channel,
                    template=template,
                    student=student,
                    recipient_name=student.parent_name or student.full_name,
                    to=to,
                    body=body,
                    status=SentMessage.Status.SENT if to else SentMessage.Status.FAILED,
                    error="" if to else "No contact details on file.",
                    sent_by=request.user,
                )
            )

        created = SentMessage.objects.bulk_create(messages)
        return Response(
            SentMessageSerializer(created, many=True).data, status=status.HTTP_201_CREATED
        )

    def _resolve_audience(self, data) -> list[Student]:
        students = Student.objects.filter(status=Student.Status.ACTIVE).select_related(
            "group__course"
        )
        branch = self.request.query_params.get("branch")
        if branch and branch != "all":
            students = students.filter(branch=branch)

        audience = data["audience"]
        if audience == "group":
            return list(students.filter(group=data["group"]))
        if audience == "all-debtors":
            debtor_ids = {
                inv.student_id
                for inv in Invoice.objects.select_related("student").filter(
                    student__in=students
                )
                if inv.balance > 0
            }
            return list(students.filter(id__in=debtor_ids))
        return list(students)


# ── Notifications ────────────────────────────────────────────────────


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """Each user only ever sees their own notifications."""

    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    filterset_fields = ["type"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        unread = self.request.query_params.get("unread")
        if unread in {"true", "1"}:
            qs = qs.filter(read_at__isnull=True)
        return qs

    @action(detail=True, methods=["post"], url_path="read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.mark_read()
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=["post"], url_path="read-all")
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(read_at__isnull=True).update(
            read_at=timezone.now()
        )
        return Response({"marked": updated})

    @action(detail=False, methods=["get"])
    def summary(self, request):
        qs = Notification.objects.filter(user=request.user)
        by_type = {
            row["type"]: row["count"]
            for row in qs.values("type").annotate(count=Count("id"))
        }
        return Response(
            {
                "total": qs.count(),
                "unread": qs.filter(read_at__isnull=True).count(),
                "by_type": by_type,
            }
        )
