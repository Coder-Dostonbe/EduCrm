"""Shared fixtures: one small but complete education center."""

from datetime import time, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import Branch, Course, Group, Lesson, Student, Teacher
from finance.models import Invoice, Payment

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def branch(db):
    return Branch.objects.create(name="Chilonzor", address="Toshkent, Bunyodkor 21A", rooms=10)


@pytest.fixture
def other_branch(db):
    return Branch.objects.create(name="Yunusobod", address="Toshkent, Amir Temur 108", rooms=6)


@pytest.fixture
def admin_user(db, branch):
    return User.objects.create_user(
        email="admin@test.uz", password="pass12345", first_name="Sardor",
        last_name="Alimov", role="admin", branch=branch,
    )


@pytest.fixture
def manager_user(db, branch):
    return User.objects.create_user(
        email="manager@test.uz", password="pass12345", first_name="Nilufar",
        last_name="Karimova", role="manager", branch=branch,
    )


@pytest.fixture
def course(db):
    return Course.objects.create(
        name="General English", category="languages", duration_months=6,
        price=Decimal("450000"),
    )


@pytest.fixture
def teacher(db, branch, course):
    user = User.objects.create_user(
        email="teacher@test.uz", password="pass12345", first_name="Jasur",
        last_name="Rahimov", role="teacher", branch=branch,
    )
    return Teacher.objects.create(
        user=user, branch=branch, specialization="General English",
        base_salary=Decimal("8500000"), rating=Decimal("4.8"),
    )


@pytest.fixture
def other_teacher(db, other_branch):
    user = User.objects.create_user(
        email="teacher2@test.uz", password="pass12345", first_name="Sevara",
        last_name="Abdullayeva", role="teacher", branch=other_branch,
    )
    return Teacher.objects.create(
        user=user, branch=other_branch, specialization="IELTS",
        base_salary=Decimal("9000000"), rating=Decimal("4.6"),
    )


@pytest.fixture
def group(db, course, teacher, branch):
    return Group.objects.create(
        name="GE-A1 Morning", course=course, teacher=teacher, branch=branch,
        room="101", days=["mon", "wed", "fri"], start_time=time(9, 0),
        end_time=time(10, 30), capacity=3, start_date=timezone.localdate(),
        status="active",
    )


@pytest.fixture
def other_group(db, course, other_teacher, other_branch):
    return Group.objects.create(
        name="IELTS Evening", course=course, teacher=other_teacher, branch=other_branch,
        room="201", days=["tue", "thu"], start_time=time(18, 0),
        end_time=time(19, 30), capacity=10, start_date=timezone.localdate(),
        status="active",
    )


@pytest.fixture
def student(db, group, branch):
    return Student.objects.create(
        first_name="Aziza", last_name="Yusupova", gender="female",
        phone="+998901234567", date_of_birth=timezone.localdate() - timedelta(days=6000),
        parent_name="Anvar Yusupov", parent_phone="+998901234568",
        group=group, branch=branch, monthly_fee=Decimal("450000"),
    )


@pytest.fixture
def student_user(db, student, branch):
    user = User.objects.create_user(
        email="student@test.uz", password="pass12345", first_name="Aziza",
        last_name="Yusupova", role="student", branch=branch,
    )
    student.user = user
    student.save(update_fields=["user"])
    return user


@pytest.fixture
def other_student(db, other_group, other_branch):
    return Student.objects.create(
        first_name="Bekzod", last_name="Tursunov", gender="male",
        phone="+998907654321", date_of_birth=timezone.localdate() - timedelta(days=7000),
        group=other_group, branch=other_branch, monthly_fee=Decimal("650000"),
    )


@pytest.fixture
def lesson(db, group):
    return Lesson.objects.create(
        group=group, date=timezone.localdate() - timedelta(days=1),
        start_time=group.start_time, end_time=group.end_time, room=group.room,
    )


@pytest.fixture
def invoice(db, student):
    """An open invoice that is NOT yet overdue.

    The due date is pinned relative to today rather than to the 1st of the
    month, so the fixture behaves the same whatever day the suite runs on —
    overdue behaviour has its own test with its own invoice.
    """
    today = timezone.localdate()
    return Invoice.objects.create(
        student=student, period=today.replace(day=1), amount_due=student.monthly_fee,
        due_date=today + timedelta(days=5),
    )


@pytest.fixture
def auth(api):
    """Return a helper that authenticates the client as a given user."""

    def _auth(user):
        api.force_authenticate(user=user)
        return api

    return _auth
