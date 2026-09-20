from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.db.models import DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import ModulePermission
from core.views import ScopedQuerysetMixin

from .models import Invoice, Payment, Salary
from .serializers import InvoiceSerializer, PaymentSerializer, SalarySerializer

MONEY = DecimalField(max_digits=14, decimal_places=2)
ZERO = Value(Decimal("0"))


class PaymentViewSet(ScopedQuerysetMixin, viewsets.ModelViewSet):
    module = "payments"
    permission_classes = [IsAuthenticated, ModulePermission]
    serializer_class = PaymentSerializer
    filterset_fields = ["status", "method", "student", "branch"]
    search_fields = ["invoice_no", "student__first_name", "student__last_name"]
    ordering_fields = ["date", "amount"]

    def get_queryset(self):
        qs = Payment.objects.select_related("student__group__course", "cashier", "branch")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return self.filter_branch(self.scope_to_role(qs))

    def scope_for_student(self, qs, user):
        return qs.filter(student__user=user)

    def scope_for_teacher(self, qs, user):
        return qs.none()  # teachers have no payments module

    def perform_create(self, serializer):
        serializer.save(cashier=self.request.user)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """The six KPI tiles on the Payments page."""
        qs = self.get_queryset()
        today = timezone.localdate()
        month_start = today.replace(day=1)
        paid = qs.filter(status=Payment.Status.PAID)

        def total(queryset):
            return queryset.aggregate(t=Coalesce(Sum("amount"), ZERO, output_field=MONEY))["t"]

        invoices = Invoice.objects.select_related("student")
        branch = request.query_params.get("branch")
        if branch and branch != "all":
            invoices = invoices.filter(student__branch=branch)

        outstanding = sum((inv.balance for inv in invoices), Decimal("0"))
        overdue_count = sum(1 for inv in invoices if inv.is_overdue)

        return Response(
            {
                "today_income": total(paid.filter(date=today)),
                "month_income": total(paid.filter(date__gte=month_start)),
                "expected_income": total(paid.filter(date__gte=month_start)) + outstanding,
                "collected_income": total(paid.filter(date__gte=month_start)),
                "outstanding_debt": outstanding,
                "overdue_payments": overdue_count,
            }
        )


class InvoiceViewSet(ScopedQuerysetMixin, viewsets.ModelViewSet):
    """Debts page — invoices with an outstanding balance."""

    module = "debts"
    permission_classes = [IsAuthenticated, ModulePermission]
    serializer_class = InvoiceSerializer
    branch_field = "student__branch"
    filterset_fields = ["student"]
    search_fields = ["student__first_name", "student__last_name", "student__phone"]
    ordering_fields = ["due_date", "amount_due", "period"]

    def get_queryset(self):
        qs = Invoice.objects.select_related("student__group__course", "student__branch")
        return self.filter_branch(self.scope_to_role(qs))

    def scope_for_student(self, qs, user):
        return qs.filter(student__user=user)

    def scope_for_teacher(self, qs, user):
        return qs.none()

    def list(self, request, *args, **kwargs):
        # Only unpaid invoices belong on the Debts page.
        queryset = [inv for inv in self.filter_queryset(self.get_queryset()) if inv.balance > 0]
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page if page is not None else queryset, many=True)
        return (
            self.get_paginated_response(serializer.data)
            if page is not None
            else Response(serializer.data)
        )

    @action(detail=False, methods=["get"])
    def summary(self, request):
        invoices = [inv for inv in self.get_queryset() if inv.balance > 0]
        total = sum((inv.balance for inv in invoices), Decimal("0"))
        overdue = sum((inv.balance for inv in invoices if inv.is_overdue), Decimal("0"))
        count = len(invoices)
        return Response(
            {
                "total_debt": total,
                "overdue_amount": overdue,
                "debtor_count": count,
                "average_debt": (total / count) if count else Decimal("0"),
            }
        )

    @action(detail=True, methods=["post"], url_path="remind")
    def remind(self, request, pk=None):
        """Stub for the SMS/Telegram reminder the Debts page triggers."""
        invoice = self.get_object()
        return Response(
            {
                "sent": True,
                "to": invoice.student.parent_phone or invoice.student.phone,
                "message": (
                    f"Hurmatli {invoice.student.parent_name or invoice.student.full_name}! "
                    f"{invoice.student.full_name}ning {invoice.balance} so'm qarzdorligi mavjud."
                ),
            }
        )


class SalaryViewSet(ScopedQuerysetMixin, viewsets.ModelViewSet):
    module = "salaries"
    permission_classes = [IsAuthenticated, ModulePermission]
    serializer_class = SalarySerializer
    filterset_fields = ["status", "employee", "branch"]
    search_fields = ["employee__first_name", "employee__last_name"]
    ordering_fields = ["month", "base_salary"]

    def get_queryset(self):
        qs = Salary.objects.select_related("employee", "branch")
        month = self.request.query_params.get("month")  # YYYY-MM
        if month:
            year, mon = month.split("-")
            qs = qs.filter(month__year=int(year), month__month=int(mon))
        return self.filter_branch(qs)

    @action(detail=True, methods=["post"], url_path="pay")
    def pay(self, request, pk=None):
        salary = self.get_object()
        salary.status = Salary.Status.PAID
        salary.payment_date = timezone.localdate()
        salary.save(update_fields=["status", "payment_date"])
        return Response(self.get_serializer(salary).data)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        qs = self.get_queryset()
        rows = list(qs)
        total = sum((s.total for s in rows), Decimal("0"))
        pending = sum((s.total for s in rows if s.status == Salary.Status.PENDING), Decimal("0"))
        return Response(
            {"payroll_total": total, "paid": total - pending, "pending": pending}
        )
