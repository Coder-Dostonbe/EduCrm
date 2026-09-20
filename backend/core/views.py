from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.db.models import (
    Count,
    DecimalField,
    OuterRef,
    Q,
    Subquery,
    Sum,
    Value,
)
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import ModulePermission
from finance.models import Invoice, Payment

from .models import (
    Attendance,
    Branch,
    Course,
    Exam,
    Grade,
    Group,
    Lesson,
    Student,
    Teacher,
)
from .serializers import (
    AttendanceBulkSerializer,
    AttendanceSerializer,
    BranchSerializer,
    CourseSerializer,
    ExamSerializer,
    GradeSerializer,
    GroupSerializer,
    LessonSerializer,
    StudentSerializer,
    TeacherSerializer,
    TeacherWriteSerializer,
)

MONEY = DecimalField(max_digits=14, decimal_places=2)


class ScopedQuerysetMixin:
    """Narrows results by role and by the ?branch= filter the topbar sends."""

    branch_field = "branch"

    def scope_to_role(self, qs):
        user = self.request.user
        if user.is_staff_role:
            return qs
        if user.is_teacher:
            return self.scope_for_teacher(qs, user)
        if user.is_student:
            return self.scope_for_student(qs, user)
        return qs.none()

    def scope_for_teacher(self, qs, user):
        return qs

    def scope_for_student(self, qs, user):
        return qs

    def filter_branch(self, qs):
        branch = self.request.query_params.get("branch")
        if branch and branch != "all":
            qs = qs.filter(**{self.branch_field: branch})
        return qs

    def get_queryset(self):
        return self.filter_branch(self.scope_to_role(super().get_queryset()))


# ── Branches ─────────────────────────────────────────────────────────


class BranchViewSet(ScopedQuerysetMixin, viewsets.ModelViewSet):
    module = "branches"
    permission_classes = [IsAuthenticated, ModulePermission]
    serializer_class = BranchSerializer
    branch_field = "id"
    search_fields = ["name", "address"]
    ordering_fields = ["name", "students_total"]

    def get_queryset(self):
        month_start = timezone.localdate().replace(day=1)
        # Revenue comes from a subquery, not a joined Sum: combining Sum with
        # the Count annotations below multiplies rows across the joins and
        # inflates the total (counts survive it via distinct=True, a Sum cannot).
        revenue = (
            Payment.objects.filter(
                branch=OuterRef("pk"), status=Payment.Status.PAID, date__gte=month_start
            )
            .values("branch")
            .annotate(total=Sum("amount"))
            .values("total")
        )
        qs = (
            Branch.objects.select_related("manager")
            .annotate(
                students_total=Count("students", filter=Q(students__status="active"), distinct=True),
                groups_total=Count("groups", filter=Q(groups__status="active"), distinct=True),
                teachers_total=Count("teachers", filter=Q(teachers__status="active"), distinct=True),
                revenue_total=Coalesce(
                    Subquery(revenue, output_field=MONEY),
                    Value(Decimal("0")),
                    output_field=MONEY,
                ),
            )
        )
        return self.filter_branch(qs)


# ── Courses ──────────────────────────────────────────────────────────


class CourseViewSet(viewsets.ModelViewSet):
    module = "courses"
    permission_classes = [IsAuthenticated, ModulePermission]
    serializer_class = CourseSerializer
    filterset_fields = ["category", "status"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "price", "students_total"]

    def get_queryset(self):
        return Course.objects.annotate(
            students_total=Count(
                "groups__students",
                filter=Q(groups__students__status="active"),
                distinct=True,
            ),
            groups_total=Count("groups", distinct=True),
        )


# ── Teachers ─────────────────────────────────────────────────────────


class TeacherViewSet(ScopedQuerysetMixin, viewsets.ModelViewSet):
    module = "teachers"
    permission_classes = [IsAuthenticated, ModulePermission]
    filterset_fields = ["status", "branch"]
    search_fields = ["user__first_name", "user__last_name", "specialization"]
    ordering_fields = ["rating", "base_salary", "hire_date"]

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return TeacherWriteSerializer
        return TeacherSerializer

    def get_queryset(self):
        qs = Teacher.objects.select_related("user", "branch").annotate(
            groups_total=Count("groups", distinct=True),
            students_total=Count(
                "groups__students",
                filter=Q(groups__students__status="active"),
                distinct=True,
            ),
        )
        return self.filter_branch(qs)


# ── Groups ───────────────────────────────────────────────────────────


class GroupViewSet(ScopedQuerysetMixin, viewsets.ModelViewSet):
    module = "groups"
    permission_classes = [IsAuthenticated, ModulePermission]
    serializer_class = GroupSerializer
    filterset_fields = ["status", "course", "teacher", "branch"]
    search_fields = ["name", "room"]
    ordering_fields = ["name", "start_date", "students_total"]

    def get_queryset(self):
        qs = Group.objects.select_related("course", "teacher__user", "branch").annotate(
            students_total=Count("students", filter=Q(students__status="active"), distinct=True)
        )
        return self.filter_branch(self.scope_to_role(qs))

    def scope_for_teacher(self, qs, user):
        return qs.filter(teacher__user=user)

    def scope_for_student(self, qs, user):
        return qs.filter(students__user=user)

    @action(detail=True, methods=["get"])
    def students(self, request, pk=None):
        group = self.get_object()
        qs = group.students.select_related("group__course")
        page = self.paginate_queryset(qs)
        serializer = StudentSerializer(page or qs, many=True)
        return self.get_paginated_response(serializer.data) if page else Response(serializer.data)


# ── Students ─────────────────────────────────────────────────────────


class StudentViewSet(ScopedQuerysetMixin, viewsets.ModelViewSet):
    module = "students"
    permission_classes = [IsAuthenticated, ModulePermission]
    serializer_class = StudentSerializer
    filterset_fields = ["status", "group", "branch", "gender"]
    search_fields = ["first_name", "last_name", "phone", "parent_phone"]
    ordering_fields = ["enrollment_date", "first_name", "last_name", "monthly_fee"]

    def get_queryset(self):
        qs = Student.objects.select_related("group__course", "group__teacher__user", "branch")
        return self.filter_branch(self.scope_to_role(qs))

    def scope_for_teacher(self, qs, user):
        return qs.filter(group__teacher__user=user)

    def scope_for_student(self, qs, user):
        return qs.filter(user=user)

    @action(detail=True, methods=["get"])
    def summary(self, request, pk=None):
        """Everything the student profile page needs, in one round trip."""
        student = self.get_object()
        attendance = student.attendance_records.select_related("lesson")[:60]
        payments = student.payments.all()[:30]
        grades = student.grades.select_related("exam")[:30]
        outstanding = sum((inv.balance for inv in student.invoices.all()), Decimal("0"))

        return Response(
            {
                "student": StudentSerializer(student).data,
                "attendance": AttendanceSerializer(attendance, many=True).data,
                "grades": GradeSerializer(grades, many=True).data,
                "payments": [
                    {
                        "id": p.id,
                        "invoice_no": p.invoice_no,
                        "amount": p.amount,
                        "method": p.method,
                        "status": p.status,
                        "date": p.date,
                    }
                    for p in payments
                ],
                "debt": outstanding,
                "attendance_rate": student.attendance_rate,
                "performance": student.performance,
            }
        )


# ── Schedule ─────────────────────────────────────────────────────────


class LessonViewSet(ScopedQuerysetMixin, viewsets.ModelViewSet):
    module = "schedule"
    permission_classes = [IsAuthenticated, ModulePermission]
    serializer_class = LessonSerializer
    branch_field = "group__branch"
    filterset_fields = ["group", "room", "canceled"]
    ordering_fields = ["date", "start_time"]

    def get_queryset(self):
        qs = Lesson.objects.select_related(
            "group__course", "group__teacher__user", "group__branch"
        )
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        teacher = self.request.query_params.get("teacher")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if teacher and teacher != "all":
            qs = qs.filter(group__teacher=teacher)
        return self.filter_branch(self.scope_to_role(qs))

    def scope_for_teacher(self, qs, user):
        return qs.filter(group__teacher__user=user)

    def scope_for_student(self, qs, user):
        return qs.filter(group__students__user=user)

    @extend_schema(
        parameters=[
            OpenApiParameter("date_from", str, description="ISO date, inclusive"),
            OpenApiParameter("date_to", str, description="ISO date, inclusive"),
            OpenApiParameter("teacher", int, description="Teacher id, or 'all'"),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


# ── Attendance ───────────────────────────────────────────────────────


class AttendanceViewSet(ScopedQuerysetMixin, viewsets.ModelViewSet):
    module = "attendance"
    permission_classes = [IsAuthenticated, ModulePermission]
    serializer_class = AttendanceSerializer
    branch_field = "student__branch"
    filterset_fields = ["status", "student", "lesson"]
    ordering_fields = ["lesson__date"]

    def get_queryset(self):
        qs = Attendance.objects.select_related("student", "lesson__group", "marked_by")
        group = self.request.query_params.get("group")
        date = self.request.query_params.get("date")
        if group and group != "all":
            qs = qs.filter(lesson__group=group)
        if date:
            qs = qs.filter(lesson__date=date)
        return self.filter_branch(self.scope_to_role(qs))

    def scope_for_teacher(self, qs, user):
        return qs.filter(lesson__group__teacher__user=user)

    def scope_for_student(self, qs, user):
        return qs.filter(student__user=user)

    def perform_create(self, serializer):
        serializer.save(marked_by=self.request.user)

    @extend_schema(request=AttendanceBulkSerializer, responses={200: AttendanceSerializer(many=True)})
    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk(self, request):
        """Mark a whole group for one lesson in a single request."""
        serializer = AttendanceBulkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            lesson = Lesson.objects.get(pk=serializer.validated_data["lesson"])
        except Lesson.DoesNotExist:
            return Response({"lesson": "Lesson not found."}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.is_teacher and lesson.group.teacher.user_id != request.user.id:
            return Response(
                {"detail": "You can only mark attendance for your own groups."},
                status=status.HTTP_403_FORBIDDEN,
            )

        valid_ids = set(lesson.group.students.values_list("id", flat=True))
        saved = []
        for item in serializer.validated_data["records"]:
            if item["student"] not in valid_ids:
                continue  # ignore students who are not in this group
            record, _ = Attendance.objects.update_or_create(
                student_id=item["student"],
                lesson=lesson,
                defaults={
                    "status": item["status"],
                    "note": item.get("note", ""),
                    "marked_by": request.user,
                },
            )
            saved.append(record)

        return Response(AttendanceSerializer(saved, many=True).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Attendance rate per group over the last N days (default 30)."""
        days = int(request.query_params.get("days", 30))
        since = timezone.localdate() - timedelta(days=days)
        qs = self.get_queryset().filter(lesson__date__gte=since)

        rows = (
            qs.values("lesson__group", "lesson__group__name")
            .annotate(
                total=Count("id"),
                attended=Count("id", filter=Q(status__in=["present", "late"])),
            )
            .order_by("-attended")
        )
        return Response(
            [
                {
                    "group": r["lesson__group"],
                    "group_name": r["lesson__group__name"],
                    "total": r["total"],
                    "rate": round(r["attended"] / r["total"] * 100) if r["total"] else 0,
                }
                for r in rows
            ]
        )


# ── Exams & grades ───────────────────────────────────────────────────


class ExamViewSet(ScopedQuerysetMixin, viewsets.ModelViewSet):
    module = "exams"
    permission_classes = [IsAuthenticated, ModulePermission]
    serializer_class = ExamSerializer
    branch_field = "group__branch"
    filterset_fields = ["status", "group"]
    search_fields = ["name"]
    ordering_fields = ["date", "name"]

    def get_queryset(self):
        qs = Exam.objects.select_related("group__course", "group__teacher__user")
        return self.filter_branch(self.scope_to_role(qs))

    def scope_for_teacher(self, qs, user):
        return qs.filter(group__teacher__user=user)

    def scope_for_student(self, qs, user):
        return qs.filter(group__students__user=user)

    @action(detail=True, methods=["get"])
    def grades(self, request, pk=None):
        exam = self.get_object()
        grades = exam.grades.select_related("student", "exam")
        return Response(GradeSerializer(grades, many=True).data)


class GradeViewSet(ScopedQuerysetMixin, viewsets.ModelViewSet):
    module = "exams"
    permission_classes = [IsAuthenticated, ModulePermission]
    serializer_class = GradeSerializer
    branch_field = "student__branch"
    filterset_fields = ["exam", "student"]

    def get_queryset(self):
        qs = Grade.objects.select_related("student", "exam__group")
        return self.filter_branch(self.scope_to_role(qs))

    def scope_for_teacher(self, qs, user):
        return qs.filter(exam__group__teacher__user=user)

    def scope_for_student(self, qs, user):
        return qs.filter(student__user=user)


# ── Dashboard ────────────────────────────────────────────────────────


class DashboardView(APIView):
    """KPI cards + chart series for the dashboard, in one request."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        month_start = today.replace(day=1)
        prev_30 = today - timedelta(days=30)
        prev_60 = today - timedelta(days=60)

        branch = request.query_params.get("branch")
        branch_q = Q()
        if branch and branch != "all":
            branch_q = Q(branch=branch)

        students = Student.objects.filter(branch_q)
        groups = Group.objects.filter(branch_q)
        payments = Payment.objects.filter(branch_q, status=Payment.Status.PAID)

        revenue_30 = payments.filter(date__gte=prev_30).aggregate(
            total=Coalesce(Sum("amount"), Value(Decimal("0")), output_field=MONEY)
        )["total"]
        revenue_prev_30 = payments.filter(date__gte=prev_60, date__lt=prev_30).aggregate(
            total=Coalesce(Sum("amount"), Value(Decimal("0")), output_field=MONEY)
        )["total"]

        outstanding = sum(
            (inv.balance for inv in Invoice.objects.filter(student__in=students)),
            Decimal("0"),
        )

        attendance_qs = Attendance.objects.filter(
            student__in=students, lesson__date__gte=prev_30
        )
        att_total = attendance_qs.count()
        att_ok = attendance_qs.filter(status__in=["present", "late"]).count()
        attendance_rate = round(att_ok / att_total * 100, 1) if att_total else 0

        # Monthly revenue series for the last 12 months
        revenue_series = (
            payments.filter(date__gte=today - timedelta(days=365))
            .annotate(month=TruncMonth("date"))
            .values("month")
            .annotate(revenue=Sum("amount"))
            .order_by("month")
        )

        # Monthly enrolments for the last 12 months
        growth_series = (
            students.filter(enrollment_date__gte=today - timedelta(days=365))
            .annotate(month=TruncMonth("enrollment_date"))
            .values("month")
            .annotate(joined=Count("id"))
            .order_by("month")
        )

        return Response(
            {
                "kpis": {
                    "total_students": students.filter(status="active").count(),
                    "active_groups": groups.filter(status="active").count(),
                    "monthly_revenue": payments.filter(date__gte=month_start).aggregate(
                        total=Coalesce(Sum("amount"), Value(Decimal("0")), output_field=MONEY)
                    )["total"],
                    "revenue_30d": revenue_30,
                    "revenue_prev_30d": revenue_prev_30,
                    "outstanding_debt": outstanding,
                    "attendance_rate": attendance_rate,
                    "new_students_30d": students.filter(enrollment_date__gte=prev_30).count(),
                },
                "revenue_series": [
                    {"date": r["month"], "revenue": r["revenue"]} for r in revenue_series
                ],
                "growth_series": [
                    {"date": r["month"], "joined": r["joined"]} for r in growth_series
                ],
                "top_teachers": [
                    {
                        "id": t.id,
                        "name": t.user.name,
                        "specialization": t.specialization,
                        "rating": t.rating,
                        "student_count": t.student_count,
                    }
                    for t in Teacher.objects.select_related("user")
                    .filter(status="active")
                    .order_by("-rating")[:5]
                ],
            }
        )
