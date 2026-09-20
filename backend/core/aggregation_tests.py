"""Regression tests for aggregation correctness.

Combining a Sum across one relation with Counts across others multiplies rows
through the JOINs. These tests pin the branch revenue to the value a plain
per-branch query returns, so the inflation can never come back unnoticed.
"""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.db.models import Sum
from django.urls import reverse
from django.utils import timezone

from core.models import Group, Student
from finance.models import Payment

pytestmark = pytest.mark.django_db


@pytest.fixture
def busy_branch(db, branch, course, teacher, student):
    """A branch with several students, groups and payments in one month.

    The inflation only shows up once more than one row exists on each side of
    the join, so the fixture deliberately creates a few of each.
    """
    today = timezone.localdate()
    month_start = today.replace(day=1)

    for i in range(3):
        group = Group.objects.create(
            name=f"Extra group {i}", course=course, teacher=teacher, branch=branch,
            room=f"20{i}", days=["tue"], start_time="09:00", end_time="10:30",
            capacity=10, start_date=today, status="active",
        )
        for j in range(2):
            s = Student.objects.create(
                first_name=f"S{i}{j}", last_name="Test", gender="male",
                phone=f"+9989011{i}{j}333", date_of_birth="2006-01-01",
                group=group, branch=branch, monthly_fee=Decimal("450000"),
            )
            Payment.objects.create(
                student=s, branch=branch, amount=Decimal("450000"),
                status=Payment.Status.PAID, date=month_start + timedelta(days=1),
            )
    return branch


def true_revenue(branch) -> Decimal:
    month_start = timezone.localdate().replace(day=1)
    return Payment.objects.filter(
        branch=branch, status=Payment.Status.PAID, date__gte=month_start
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0")


class TestBranchRevenueAggregation:
    def test_branch_list_revenue_matches_a_plain_sum(self, auth, admin_user, busy_branch):
        expected = true_revenue(busy_branch)
        assert expected == Decimal("2700000")  # 6 payments × 450 000

        r = auth(admin_user).get(reverse("branch-list"))
        assert r.status_code == 200
        row = next(b for b in r.data["results"] if b["id"] == busy_branch.id)
        assert Decimal(str(row["monthly_revenue"])) == expected

    def test_branch_report_revenue_matches_a_plain_sum(self, auth, admin_user, busy_branch):
        r = auth(admin_user).get(reverse("report", args=["branches"]))
        assert r.status_code == 200
        assert Decimal(str(r.data["total"])) == true_revenue(busy_branch)

    def test_counts_stay_correct_alongside_the_revenue_subquery(
        self, auth, admin_user, busy_branch
    ):
        r = auth(admin_user).get(reverse("branch-list"))
        row = next(b for b in r.data["results"] if b["id"] == busy_branch.id)
        # 1 student from the base fixture + 6 created here
        assert row["student_count"] == 7
        # 1 group from the base fixture + 3 created here
        assert row["group_count"] == 4

    def test_a_branch_with_no_payments_reports_zero(self, auth, admin_user, other_branch):
        r = auth(admin_user).get(reverse("branch-list"))
        row = next(b for b in r.data["results"] if b["id"] == other_branch.id)
        assert Decimal(str(row["monthly_revenue"])) == Decimal("0")
