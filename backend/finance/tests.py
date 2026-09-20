from datetime import timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone

from finance.models import Invoice, Payment, Salary

pytestmark = pytest.mark.django_db


class TestInvoiceNumbering:
    def test_invoice_numbers_are_sequential_and_unique(self, student, branch):
        first = Payment.objects.create(
            student=student, branch=branch, amount=Decimal("450000"), status="paid"
        )
        second = Payment.objects.create(
            student=student, branch=branch, amount=Decimal("450000"), status="paid"
        )
        year = timezone.localdate().year
        assert first.invoice_no == f"INV-{year}-00001"
        assert second.invoice_no == f"INV-{year}-00002"

    def test_an_explicit_invoice_number_is_respected(self, student, branch):
        payment = Payment.objects.create(
            student=student, branch=branch, amount=Decimal("1"),
            status="paid", invoice_no="CUSTOM-1",
        )
        assert payment.invoice_no == "CUSTOM-1"


class TestDebtCalculation:
    def test_a_fresh_invoice_is_fully_outstanding(self, invoice, student):
        assert invoice.amount_paid == Decimal("0")
        assert invoice.balance == invoice.amount_due
        assert student.debt == invoice.amount_due
        assert student.payment_status in {"pending", "overdue"}

    def test_payment_reduces_the_balance(self, invoice, student, branch):
        Payment.objects.create(
            student=student, branch=branch, amount=Decimal("200000"),
            status="paid", date=invoice.period + timedelta(days=1),
        )
        assert invoice.amount_paid == Decimal("200000")
        assert invoice.balance == Decimal("250000")
        assert student.payment_status == "partial"

    def test_full_payment_clears_the_debt(self, invoice, student, branch):
        Payment.objects.create(
            student=student, branch=branch, amount=invoice.amount_due,
            status="paid", date=invoice.period + timedelta(days=1),
        )
        assert invoice.balance == Decimal("0")
        assert student.debt == Decimal("0")
        assert student.payment_status == "paid"

    def test_a_cancelled_payment_does_not_count(self, invoice, student, branch):
        Payment.objects.create(
            student=student, branch=branch, amount=invoice.amount_due,
            status="cancelled", date=invoice.period + timedelta(days=1),
        )
        assert invoice.balance == invoice.amount_due

    def test_overdue_is_flagged_after_the_due_date(self, student):
        period = timezone.localdate().replace(day=1) - timedelta(days=60)
        overdue = Invoice.objects.create(
            student=student, period=period, amount_due=Decimal("450000"),
            due_date=timezone.localdate() - timedelta(days=10),
        )
        assert overdue.is_overdue
        assert overdue.overdue_days == 10
        assert student.payment_status == "overdue"


class TestPaymentApi:
    def test_creating_a_payment_records_the_cashier(self, auth, manager_user, student):
        r = auth(manager_user).post(
            reverse("payment-list"),
            {"student": student.id, "amount": "450000", "method": "cash"},
            format="json",
        )
        assert r.status_code == 201, r.data
        assert Payment.objects.get(id=r.data["id"]).cashier == manager_user

    def test_branch_defaults_to_the_students_branch(self, auth, manager_user, student):
        r = auth(manager_user).post(
            reverse("payment-list"),
            {"student": student.id, "amount": "450000", "method": "card"},
            format="json",
        )
        assert r.status_code == 201
        assert Payment.objects.get(id=r.data["id"]).branch_id == student.branch_id

    def test_zero_amount_is_rejected(self, auth, manager_user, student):
        r = auth(manager_user).post(
            reverse("payment-list"),
            {"student": student.id, "amount": "0", "method": "cash"},
            format="json",
        )
        assert r.status_code == 400

    def test_students_see_only_their_own_payments(
        self, auth, student_user, student, other_student, branch, other_branch
    ):
        Payment.objects.create(student=student, branch=branch, amount=Decimal("450000"))
        Payment.objects.create(
            student=other_student, branch=other_branch, amount=Decimal("650000")
        )
        r = auth(student_user).get(reverse("payment-list"))
        assert r.status_code == 200
        assert r.data["count"] == 1

    def test_summary_returns_the_kpi_tiles(self, auth, admin_user, student, branch, invoice):
        Payment.objects.create(
            student=student, branch=branch, amount=Decimal("450000"),
            status="paid", date=timezone.localdate(),
        )
        r = auth(admin_user).get(reverse("payment-summary"))
        assert r.status_code == 200
        for key in [
            "today_income", "month_income", "expected_income",
            "collected_income", "outstanding_debt", "overdue_payments",
        ]:
            assert key in r.data


class TestDebtsApi:
    def test_only_unpaid_invoices_are_listed(self, auth, admin_user, invoice, student, branch):
        assert auth(admin_user).get(reverse("invoice-list")).data["count"] == 1

        Payment.objects.create(
            student=student, branch=branch, amount=invoice.amount_due,
            status="paid", date=invoice.period + timedelta(days=1),
        )
        assert auth(admin_user).get(reverse("invoice-list")).data["count"] == 0

    def test_summary_totals(self, auth, admin_user, invoice):
        r = auth(admin_user).get(reverse("invoice-summary"))
        assert r.status_code == 200
        assert r.data["debtor_count"] == 1
        assert r.data["total_debt"] == invoice.amount_due

    def test_reminder_endpoint_targets_the_parent(self, auth, admin_user, invoice, student):
        r = auth(admin_user).post(reverse("invoice-remind", args=[invoice.id]))
        assert r.status_code == 200
        assert r.data["sent"] is True
        assert r.data["to"] == student.parent_phone


class TestSalaries:
    def test_total_is_base_plus_bonus_minus_deductions(self, admin_user, branch):
        salary = Salary.objects.create(
            employee=admin_user, branch=branch,
            month=timezone.localdate().replace(day=1),
            base_salary=Decimal("10000000"), bonus=Decimal("1000000"),
            deductions=Decimal("500000"),
        )
        assert salary.total == Decimal("10500000")

    def test_pay_action_marks_it_paid(self, auth, admin_user, branch):
        salary = Salary.objects.create(
            employee=admin_user, branch=branch,
            month=timezone.localdate().replace(day=1),
            base_salary=Decimal("10000000"),
        )
        r = auth(admin_user).post(reverse("salary-pay", args=[salary.id]))
        assert r.status_code == 200
        salary.refresh_from_db()
        assert salary.status == "paid"
        assert salary.payment_date == timezone.localdate()

    def test_only_admins_can_see_payroll(self, auth, manager_user, teacher):
        assert auth(manager_user).get(reverse("salary-list")).status_code == 403
        assert auth(teacher.user).get(reverse("salary-list")).status_code == 403


class TestProtectedDeletes:
    def test_deleting_a_student_with_payments_returns_409(
        self, auth, admin_user, student, branch
    ):
        Payment.objects.create(student=student, branch=branch, amount=Decimal("450000"))
        r = auth(admin_user).delete(reverse("student-detail", args=[student.id]))
        assert r.status_code == 409
        assert "blocked_by" in r.data

    def test_a_student_without_payments_can_be_deleted(self, auth, admin_user, student):
        r = auth(admin_user).delete(reverse("student-detail", args=[student.id]))
        assert r.status_code == 204
