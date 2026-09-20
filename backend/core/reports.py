"""Reports module — one endpoint per report type the Reports page offers.

Each report returns the same envelope so the frontend can render any of them
through a single code path:

    {
      "report": "revenue",
      "headers": [...],          # column titles, for the table and the export
      "rows": [[...], ...],      # table body
      "chart": [{label, value}], # what the chart plots
      "total": <number>,
      "total_label": "...",
      "money": true|false
    }
"""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, DecimalField, OuterRef, Q, Subquery, Sum, Value
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import ModulePermission
from finance.models import Invoice, Payment

from .models import Attendance, Branch, Course, Group, Student, Teacher

MONEY = DecimalField(max_digits=14, decimal_places=2)
ZERO = Value(Decimal("0"))

REPORT_TYPES = [
    "students", "attendance", "revenue", "debt",
    "teachers", "courses", "leads", "branches",
]


class ReportView(APIView):
    """GET /api/reports/<report>/?date_from=&date_to=&branch=&course="""

    module = "reports"
    permission_classes = [IsAuthenticated, ModulePermission]

    @extend_schema(
        parameters=[
            OpenApiParameter("date_from", str, description="ISO date, inclusive"),
            OpenApiParameter("date_to", str, description="ISO date, inclusive"),
            OpenApiParameter("branch", str, description="Branch id, or 'all'"),
            OpenApiParameter("course", str, description="Course id, or 'all'"),
        ]
    )
    def get(self, request, report: str):
        if report not in REPORT_TYPES:
            return Response(
                {"detail": f"Unknown report. Choose one of: {', '.join(REPORT_TYPES)}."},
                status=400,
            )

        today = timezone.localdate()
        self.date_from = request.query_params.get("date_from") or str(today - timedelta(days=30))
        self.date_to = request.query_params.get("date_to") or str(today)
        branch = request.query_params.get("branch")
        course = request.query_params.get("course")
        self.branch = branch if branch and branch != "all" else None
        self.course = course if course and course != "all" else None

        data = getattr(self, f"_{report}")()
        return Response({"report": report, **data})

    # ── helpers ──────────────────────────────────────────────────────

    def _students_qs(self):
        qs = Student.objects.select_related("group__course", "branch")
        if self.branch:
            qs = qs.filter(branch=self.branch)
        if self.course:
            qs = qs.filter(group__course=self.course)
        return qs

    def _payments_qs(self):
        qs = Payment.objects.filter(
            status=Payment.Status.PAID, date__gte=self.date_from, date__lte=self.date_to
        )
        if self.branch:
            qs = qs.filter(branch=self.branch)
        if self.course:
            qs = qs.filter(student__group__course=self.course)
        return qs

    # ── reports ──────────────────────────────────────────────────────

    def _students(self):
        students = self._students_qs()
        rows = [
            [
                s.full_name,
                s.group.course.name if s.group else "",
                s.group.name if s.group else "",
                f"{s.attendance_rate}%",
                str(s.debt),
                s.status,
            ]
            for s in students[:500]
        ]
        by_status = students.values("status").annotate(count=Count("id"))
        return {
            "headers": ["Student", "Course", "Group", "Attendance", "Debt", "Status"],
            "rows": rows,
            "chart": [{"label": r["status"], "value": r["count"]} for r in by_status],
            "total": students.count(),
            "total_label": "Total students",
            "money": False,
        }

    def _attendance(self):
        records = Attendance.objects.filter(
            lesson__date__gte=self.date_from, lesson__date__lte=self.date_to
        )
        if self.branch:
            records = records.filter(student__branch=self.branch)
        if self.course:
            records = records.filter(lesson__group__course=self.course)

        by_group = (
            records.values("lesson__group__name")
            .annotate(
                total=Count("id"),
                attended=Count("id", filter=Q(status__in=["present", "late"])),
            )
            .order_by("-total")
        )
        rows, chart = [], []
        for row in by_group:
            rate = round(row["attended"] / row["total"] * 100) if row["total"] else 0
            rows.append([row["lesson__group__name"], row["total"], row["attended"], f"{rate}%"])
            chart.append({"label": row["lesson__group__name"], "value": rate})

        total = records.count()
        attended = records.filter(status__in=["present", "late"]).count()
        return {
            "headers": ["Group", "Lessons", "Attended", "Rate"],
            "rows": rows,
            "chart": chart,
            "total": round(attended / total * 100, 1) if total else 0,
            "total_label": "Overall attendance",
            "money": False,
            "suffix": "%",
        }

    def _revenue(self):
        payments = self._payments_qs()
        by_month = (
            payments.annotate(month=TruncMonth("date"))
            .values("month")
            .annotate(revenue=Sum("amount"), count=Count("id"))
            .order_by("month")
        )
        rows = [
            [str(r["month"]), r["count"], str(r["revenue"])] for r in by_month
        ]
        return {
            "headers": ["Month", "Payments", "Revenue"],
            "rows": rows,
            "chart": [
                {"label": str(r["month"]), "value": r["revenue"]} for r in by_month
            ],
            "total": payments.aggregate(t=Coalesce(Sum("amount"), ZERO, output_field=MONEY))["t"],
            "total_label": "Total revenue",
            "money": True,
        }

    def _debt(self):
        invoices = Invoice.objects.select_related("student__group__course", "student__branch")
        if self.branch:
            invoices = invoices.filter(student__branch=self.branch)
        if self.course:
            invoices = invoices.filter(student__group__course=self.course)

        unpaid = [inv for inv in invoices if inv.balance > 0]
        rows = [
            [
                inv.student.full_name,
                inv.student.group.name if inv.student.group else "",
                str(inv.amount_due),
                str(inv.balance),
                str(inv.due_date),
                inv.overdue_days,
            ]
            for inv in unpaid[:500]
        ]
        chart = [
            {"label": inv.student.first_name, "value": inv.balance} for inv in unpaid[:12]
        ]
        return {
            "headers": ["Student", "Group", "Due", "Balance", "Due date", "Days overdue"],
            "rows": rows,
            "chart": chart,
            "total": sum((inv.balance for inv in unpaid), Decimal("0")),
            "total_label": "Total debt",
            "money": True,
        }

    def _teachers(self):
        teachers = Teacher.objects.select_related("user", "branch")
        if self.branch:
            teachers = teachers.filter(branch=self.branch)

        rows, chart = [], []
        for teacher in teachers:
            students = Student.objects.filter(
                group__teacher=teacher, status=Student.Status.ACTIVE
            )
            rows.append(
                [
                    teacher.user.name,
                    teacher.specialization,
                    teacher.groups.count(),
                    students.count(),
                    float(teacher.rating),
                ]
            )
            chart.append({"label": teacher.user.first_name, "value": float(teacher.rating) * 20})
        return {
            "headers": ["Teacher", "Specialization", "Groups", "Students", "Rating"],
            "rows": rows,
            "chart": chart,
            "total": teachers.count(),
            "total_label": "Teachers",
            "money": False,
        }

    def _courses(self):
        courses = Course.objects.annotate(
            students_total=Count(
                "groups__students",
                filter=Q(groups__students__status="active"),
                distinct=True,
            ),
            groups_total=Count("groups", distinct=True),
        )
        rows = [
            [c.name, c.get_category_display(), c.groups_total, c.students_total, str(c.price)]
            for c in courses
        ]
        return {
            "headers": ["Course", "Category", "Groups", "Students", "Price"],
            "rows": rows,
            "chart": [{"label": c.name, "value": c.students_total} for c in courses],
            "total": sum(c.students_total for c in courses),
            "total_label": "Enrolled students",
            "money": False,
        }

    def _leads(self):
        from crm.models import Lead

        leads = Lead.objects.all()
        if self.branch:
            leads = leads.filter(branch=self.branch)

        by_stage = leads.values("stage").annotate(
            count=Count("id"),
            value=Coalesce(Sum("expected_value"), ZERO, output_field=MONEY),
        )
        stage_map = {r["stage"]: r for r in by_stage}
        ordered = [
            {
                "stage": stage,
                "count": stage_map.get(stage, {}).get("count", 0),
                "value": stage_map.get(stage, {}).get("value", Decimal("0")),
            }
            for stage, _ in Lead.Stage.choices
        ]
        rows = [[r["stage"], r["count"], str(r["value"])] for r in ordered]
        enrolled = stage_map.get("enrolled", {}).get("count", 0)
        lost = stage_map.get("lost", {}).get("count", 0)
        closed = enrolled + lost
        return {
            "headers": ["Stage", "Leads", "Expected value"],
            "rows": rows,
            "chart": [{"label": r["stage"], "value": r["count"]} for r in ordered],
            "total": round(enrolled / closed * 100) if closed else 0,
            "total_label": "Conversion rate",
            "money": False,
            "suffix": "%",
        }

    def _branches(self):
        month_start = timezone.localdate().replace(day=1)
        # Subquery, not a joined Sum — see the note in BranchViewSet.
        revenue = (
            Payment.objects.filter(
                branch=OuterRef("pk"), status=Payment.Status.PAID, date__gte=month_start
            )
            .values("branch")
            .annotate(total=Sum("amount"))
            .values("total")
        )
        branches = Branch.objects.annotate(
            students_total=Count("students", filter=Q(students__status="active"), distinct=True),
            groups_total=Count("groups", filter=Q(groups__status="active"), distinct=True),
            revenue_total=Coalesce(
                Subquery(revenue, output_field=MONEY), ZERO, output_field=MONEY
            ),
        )
        rows = [
            [b.name, b.students_total, b.groups_total, str(b.revenue_total)] for b in branches
        ]
        return {
            "headers": ["Branch", "Students", "Groups", "Revenue (this month)"],
            "rows": rows,
            "chart": [{"label": b.name, "value": b.revenue_total} for b in branches],
            "total": sum((b.revenue_total for b in branches), Decimal("0")),
            "total_label": "Total revenue",
            "money": True,
        }
