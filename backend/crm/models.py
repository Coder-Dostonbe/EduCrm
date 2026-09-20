from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.models import Branch, Group, Student, TimeStampedModel, phone_validator


# ── Leads ────────────────────────────────────────────────────────────


class Lead(TimeStampedModel):
    """A prospective student moving through the sales pipeline."""

    class Stage(models.TextChoices):
        NEW = "new", _("New")
        CONTACTED = "contacted", _("Contacted")
        INTERESTED = "interested", _("Interested")
        TRIAL = "trial", _("Trial lesson")
        NEGOTIATION = "negotiation", _("Negotiation")
        ENROLLED = "enrolled", _("Enrolled")
        LOST = "lost", _("Lost")

    class Source(models.TextChoices):
        INSTAGRAM = "instagram", _("Instagram")
        TELEGRAM = "telegram", _("Telegram")
        REFERRAL = "referral", _("Referral")
        WEBSITE = "website", _("Website")
        WALK_IN = "walk-in", _("Walk-in")
        ADS = "ads", _("Ads")

    class Priority(models.TextChoices):
        HIGH = "high", _("High")
        MEDIUM = "medium", _("Medium")
        LOW = "low", _("Low")

    #: Stages that close a lead — they leave the active pipeline.
    CLOSED_STAGES = {Stage.ENROLLED, Stage.LOST}

    name = models.CharField(max_length=160)
    phone = models.CharField(max_length=20, validators=[phone_validator])
    email = models.EmailField(blank=True)
    source = models.CharField(max_length=16, choices=Source.choices, default=Source.INSTAGRAM)
    course_interest = models.ForeignKey(
        "core.Course", on_delete=models.SET_NULL, null=True, blank=True, related_name="leads"
    )
    stage = models.CharField(max_length=16, choices=Stage.choices, default=Stage.NEW)
    priority = models.CharField(max_length=8, choices=Priority.choices, default=Priority.MEDIUM)
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="leads",
    )
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name="leads")
    expected_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    next_contact_date = models.DateField(null=True, blank=True)
    #: Set when the lead converts, so the pipeline links to the enrolled student.
    converted_student = models.OneToOneField(
        Student,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="origin_lead",
    )
    lost_reason = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["stage"]),
            models.Index(fields=["branch", "stage"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.stage})"

    @property
    def is_open(self) -> bool:
        return self.stage not in self.CLOSED_STAGES


class LeadNote(TimeStampedModel):
    """A line in the lead's communication history."""

    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="notes")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="lead_notes"
    )
    text = models.TextField()

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.lead.name}: {self.text[:40]}"


# ── Communications ───────────────────────────────────────────────────


class MessageTemplate(TimeStampedModel):
    class Channel(models.TextChoices):
        SMS = "sms", _("SMS")
        TELEGRAM = "telegram", _("Telegram")
        EMAIL = "email", _("Email")

    #: Keys the frontend has translations for.
    KEY_CHOICES = [
        ("paymentReminder", "Payment reminder"),
        ("classReminder", "Class reminder"),
        ("absenceNotification", "Absence notification"),
        ("welcome", "Welcome message"),
        ("examResult", "Exam result"),
        ("debtNotification", "Debt notification"),
        ("custom", "Custom"),
    ]

    key = models.CharField(max_length=32, choices=KEY_CHOICES, default="custom")
    channel = models.CharField(max_length=16, choices=Channel.choices, default=Channel.SMS)
    subject = models.CharField(max_length=160, blank=True)
    body = models.TextField(
        help_text="Supports {student_name}, {parent_name}, {amount}, {course}, {room}, {date}."
    )

    class Meta:
        ordering = ["key"]

    def __str__(self) -> str:
        return f"{self.get_key_display()} ({self.channel})"

    def render(self, context: dict) -> str:
        """Fill placeholders, leaving unknown ones untouched."""
        text = self.body
        for key, value in context.items():
            text = text.replace("{" + key + "}", str(value))
        return text


class SentMessage(TimeStampedModel):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", _("Scheduled")
        SENT = "sent", _("Sent")
        DELIVERED = "delivered", _("Delivered")
        FAILED = "failed", _("Failed")

    channel = models.CharField(max_length=16, choices=MessageTemplate.Channel.choices)
    template = models.ForeignKey(
        MessageTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name="messages"
    )
    student = models.ForeignKey(
        Student, on_delete=models.SET_NULL, null=True, blank=True, related_name="messages"
    )
    recipient_name = models.CharField(max_length=160)
    to = models.CharField(max_length=160, help_text="Phone number or email address.")
    body = models.TextField()
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.SENT)
    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="sent_messages"
    )
    error = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["channel", "status"])]

    def __str__(self) -> str:
        return f"{self.channel} → {self.recipient_name}"


# ── Notifications ────────────────────────────────────────────────────


class Notification(TimeStampedModel):
    class Type(models.TextChoices):
        PAYMENT = "payment", _("Payment")
        ATTENDANCE = "attendance", _("Attendance")
        SYSTEM = "system", _("System")
        STUDENT = "student", _("Student")
        LEAD = "lead", _("Lead")
        EXAM = "exam", _("Exam")

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    type = models.CharField(max_length=16, choices=Type.choices, default=Type.SYSTEM)
    title = models.CharField(max_length=160)
    body = models.CharField(max_length=500, blank=True)
    link = models.CharField(max_length=200, blank=True, help_text="Frontend route to open.")
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "read_at"])]

    def __str__(self) -> str:
        return f"{self.title} → {self.user.email}"

    @property
    def read(self) -> bool:
        return self.read_at is not None

    def mark_read(self) -> None:
        if self.read_at is None:
            self.read_at = timezone.now()
            self.save(update_fields=["read_at"])

    @classmethod
    def notify_roles(cls, roles: list[str], **kwargs) -> int:
        """Fan a notification out to every active user in the given roles."""
        from django.contrib.auth import get_user_model

        User = get_user_model()
        recipients = User.objects.filter(role__in=roles, is_active=True)
        cls.objects.bulk_create([cls(user=user, **kwargs) for user in recipients])
        return recipients.count()
