from __future__ import annotations

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

phone_validator = RegexValidator(
    regex=r"^\+998\d{9}$",
    message="Phone must be in the format +998XXXXXXXXX.",
)


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# ── Branch ───────────────────────────────────────────────────────────


class Branch(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", _("Active")
        INACTIVE = "inactive", _("Inactive")

    name = models.CharField(max_length=120, unique=True)
    address = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True)
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_branches",
    )
    rooms = models.PositiveSmallIntegerField(default=0)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "branches"

    def __str__(self) -> str:
        return self.name


# ── Course ───────────────────────────────────────────────────────────


class Course(TimeStampedModel):
    class Category(models.TextChoices):
        LANGUAGES = "languages", _("Languages")
        IT = "it", _("IT & Programming")
        MATH = "math", _("Mathematics")
        DESIGN = "design", _("Design")
        EXAM_PREP = "exam-prep", _("Exam preparation")

    class Status(models.TextChoices):
        ACTIVE = "active", _("Active")
        ARCHIVED = "archived", _("Archived")

    name = models.CharField(max_length=120, unique=True)
    category = models.CharField(max_length=16, choices=Category.choices)
    description = models.TextField(blank=True)
    curriculum = models.JSONField(default=list, blank=True, help_text="List of module titles.")
    duration_months = models.PositiveSmallIntegerField(default=6)
    price = models.DecimalField(
        max_digits=12, decimal_places=2, help_text="Monthly fee in UZS."
    )
    color = models.CharField(
        max_length=16, default="chart-1",
        help_text="Design-token key used for calendar colouring.",
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name

    @property
    def student_count(self) -> int:
        return Student.objects.filter(group__course=self, status=Student.Status.ACTIVE).count()

    @property
    def group_count(self) -> int:
        return self.groups.count()


# ── Teacher ──────────────────────────────────────────────────────────


class Teacher(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", _("Active")
        VACATION = "vacation", _("On vacation")
        INACTIVE = "inactive", _("Inactive")

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="teacher_profile"
    )
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name="teachers")
    specialization = models.CharField(max_length=120)
    bio = models.TextField(blank=True)
    base_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
    )
    hire_date = models.DateField(default=timezone.localdate)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        ordering = ["user__first_name", "user__last_name"]

    def __str__(self) -> str:
        return self.user.name

    @property
    def student_count(self) -> int:
        return Student.objects.filter(group__teacher=self, status=Student.Status.ACTIVE).count()


# ── Group ────────────────────────────────────────────────────────────


class Group(TimeStampedModel):
    class Status(models.TextChoices):
        FORMING = "forming", _("Forming")
        ACTIVE = "active", _("Active")
        FINISHED = "finished", _("Finished")

    WEEKDAYS = [
        ("mon", "Monday"), ("tue", "Tuesday"), ("wed", "Wednesday"),
        ("thu", "Thursday"), ("fri", "Friday"), ("sat", "Saturday"), ("sun", "Sunday"),
    ]

    name = models.CharField(max_length=120)
    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name="groups")
    teacher = models.ForeignKey(
        Teacher, on_delete=models.SET_NULL, null=True, related_name="groups"
    )
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name="groups")
    room = models.CharField(max_length=32)
    days = models.JSONField(
        default=list, help_text='Weekday keys, e.g. ["mon", "wed", "fri"].'
    )
    start_time = models.TimeField()
    end_time = models.TimeField()
    capacity = models.PositiveSmallIntegerField(default=14)
    start_date = models.DateField()
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.FORMING)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["name", "branch"], name="unique_group_per_branch"),
            models.CheckConstraint(
                condition=models.Q(end_time__gt=models.F("start_time")),
                name="group_end_after_start",
            ),
        ]

    def __str__(self) -> str:
        return self.name

    @property
    def student_count(self) -> int:
        return self.students.filter(status=Student.Status.ACTIVE).count()

    @property
    def fill_rate(self) -> int:
        return round(self.student_count / self.capacity * 100) if self.capacity else 0


# ── Student ──────────────────────────────────────────────────────────


class Student(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", _("Active")
        INACTIVE = "inactive", _("Inactive")
        GRADUATED = "graduated", _("Graduated")
        SUSPENDED = "suspended", _("Suspended")

    class Gender(models.TextChoices):
        MALE = "male", _("Male")
        FEMALE = "female", _("Female")

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="student_profile",
        help_text="Optional login account for the student.",
    )
    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    phone = models.CharField(max_length=20, validators=[phone_validator])
    email = models.EmailField(blank=True)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=8, choices=Gender.choices)
    address = models.CharField(max_length=255, blank=True)

    parent_name = models.CharField(max_length=160, blank=True)
    parent_phone = models.CharField(
        max_length=20, blank=True, validators=[phone_validator]
    )

    group = models.ForeignKey(
        Group, on_delete=models.PROTECT, related_name="students", null=True
    )
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name="students")
    enrollment_date = models.DateField(default=timezone.localdate)
    monthly_fee = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-enrollment_date", "first_name"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["branch", "status"]),
        ]

    def __str__(self) -> str:
        return self.full_name

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @property
    def course(self) -> Course | None:
        return self.group.course if self.group else None

    @property
    def attendance_rate(self) -> int:
        """Percentage of lessons where the student showed up (present or late)."""
        records = self.attendance_records.all()
        total = records.count()
        if not total:
            return 100
        attended = records.filter(
            status__in=[Attendance.Status.PRESENT, Attendance.Status.LATE]
        ).count()
        return round(attended / total * 100)

    @property
    def performance(self) -> int:
        """Average exam score as a percentage."""
        grades = self.grades.select_related("exam")
        scores = [
            float(g.score) / float(g.exam.max_score) * 100
            for g in grades
            if g.exam.max_score
        ]
        return round(sum(scores) / len(scores)) if scores else 0

    @property
    def debt(self):
        """Outstanding balance across all invoices — always derived."""
        from decimal import Decimal

        return sum((inv.balance for inv in self.invoices.all()), Decimal("0"))

    @property
    def payment_status(self) -> str:
        """Mirrors the frontend payment states, computed from invoices."""
        from decimal import Decimal

        invoices = list(self.invoices.all())
        if not invoices:
            return "paid"
        outstanding = sum((inv.balance for inv in invoices), Decimal("0"))
        if outstanding <= 0:
            return "paid"
        if any(inv.is_overdue for inv in invoices):
            return "overdue"
        paid_any = any(inv.amount_paid > 0 for inv in invoices)
        return "partial" if paid_any else "pending"


# ── Schedule ─────────────────────────────────────────────────────────


class Lesson(TimeStampedModel):
    """A single scheduled class occurrence."""

    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="lessons")
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    room = models.CharField(max_length=32)
    canceled = models.BooleanField(default=False)

    class Meta:
        ordering = ["date", "start_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["group", "date", "start_time"], name="unique_lesson_slot"
            ),
        ]
        indexes = [models.Index(fields=["date"])]

    def __str__(self) -> str:
        return f"{self.group.name} — {self.date} {self.start_time:%H:%M}"


# ── Attendance ───────────────────────────────────────────────────────


class Attendance(TimeStampedModel):
    class Status(models.TextChoices):
        PRESENT = "present", _("Present")
        ABSENT = "absent", _("Absent")
        LATE = "late", _("Late")
        EXCUSED = "excused", _("Excused")

    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="attendance_records"
    )
    lesson = models.ForeignKey(
        Lesson, on_delete=models.CASCADE, related_name="attendance_records"
    )
    status = models.CharField(max_length=16, choices=Status.choices)
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-lesson__date"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "lesson"], name="unique_attendance_per_lesson"
            )
        ]

    def __str__(self) -> str:
        return f"{self.student.full_name} — {self.status}"


# ── Exams & grades ───────────────────────────────────────────────────


class Exam(TimeStampedModel):
    class Status(models.TextChoices):
        UPCOMING = "upcoming", _("Upcoming")
        IN_PROGRESS = "in-progress", _("In progress")
        GRADED = "graded", _("Graded")

    name = models.CharField(max_length=160)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="exams")
    date = models.DateField()
    max_score = models.DecimalField(max_digits=6, decimal_places=2, default=100)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.UPCOMING)

    class Meta:
        ordering = ["-date"]

    def __str__(self) -> str:
        return f"{self.name} ({self.group.name})"

    @property
    def participants(self) -> int:
        return self.group.student_count


class Grade(TimeStampedModel):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="grades")
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="grades")
    score = models.DecimalField(max_digits=6, decimal_places=2)
    comment = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-exam__date"]
        constraints = [
            models.UniqueConstraint(fields=["student", "exam"], name="unique_grade_per_exam")
        ]

    def __str__(self) -> str:
        return f"{self.student.full_name}: {self.score}/{self.exam.max_score}"

    @property
    def percentage(self) -> int:
        return round(float(self.score) / float(self.exam.max_score) * 100) if self.exam.max_score else 0
