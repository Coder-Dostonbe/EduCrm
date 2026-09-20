from datetime import timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone

from core.models import Attendance, Student

pytestmark = pytest.mark.django_db


class TestRolePermissions:
    """The API must enforce the same matrix the sidebar renders."""

    @pytest.mark.parametrize(
        "url_name,expected",
        [
            ("student-list", 403),
            ("teacher-list", 403),
            ("salary-list", 403),
            ("invoice-list", 403),
            ("lesson-list", 200),
            ("exam-list", 200),
        ],
    )
    def test_student_module_access(self, auth, student_user, url_name, expected):
        assert auth(student_user).get(reverse(url_name)).status_code == expected

    @pytest.mark.parametrize(
        "url_name,expected",
        [
            ("student-list", 200),
            ("group-list", 200),
            ("attendance-list", 200),
            ("salary-list", 403),
            ("invoice-list", 403),
            ("branch-list", 403),
        ],
    )
    def test_teacher_module_access(self, auth, teacher, url_name, expected):
        assert auth(teacher.user).get(reverse(url_name)).status_code == expected

    def test_manager_cannot_touch_salaries(self, auth, manager_user):
        assert auth(manager_user).get(reverse("salary-list")).status_code == 403

    def test_admin_sees_everything(self, auth, admin_user):
        for name in ["student-list", "salary-list", "branch-list", "invoice-list"]:
            assert auth(admin_user).get(reverse(name)).status_code == 200

    def test_teacher_cannot_create_students(self, auth, teacher, group):
        r = auth(teacher.user).post(
            reverse("student-list"),
            {
                "first_name": "Yangi", "last_name": "Talaba", "phone": "+998901112233",
                "date_of_birth": "2006-01-01", "gender": "male",
                "group": group.id, "branch": group.branch_id, "monthly_fee": "450000",
            },
            format="json",
        )
        assert r.status_code == 403

    def test_anonymous_access_is_denied(self, api):
        assert api.get(reverse("student-list")).status_code == 401


class TestQuerysetScoping:
    def test_teacher_sees_only_their_own_students(self, auth, teacher, student, other_student):
        r = auth(teacher.user).get(reverse("student-list"))
        assert r.status_code == 200
        ids = {row["id"] for row in r.data["results"]}
        assert student.id in ids
        assert other_student.id not in ids

    def test_teacher_sees_only_their_own_groups(self, auth, teacher, group, other_group):
        r = auth(teacher.user).get(reverse("group-list"))
        ids = {row["id"] for row in r.data["results"]}
        assert ids == {group.id}

    def test_student_sees_only_their_own_record(self, auth, student_user, student, other_student):
        # students have no /students/ access at all
        assert auth(student_user).get(reverse("student-list")).status_code == 403

    def test_branch_filter_narrows_results(self, auth, admin_user, student, other_student, branch):
        r = auth(admin_user).get(reverse("student-list"), {"branch": branch.id})
        ids = {row["id"] for row in r.data["results"]}
        assert ids == {student.id}

    def test_admin_sees_all_branches_by_default(self, auth, admin_user, student, other_student):
        r = auth(admin_user).get(reverse("student-list"))
        assert r.data["count"] == 2


class TestStudentRules:
    def test_enrolment_is_blocked_when_the_group_is_full(self, auth, admin_user, group, branch):
        # capacity is 3 in the fixture
        for i in range(3):
            Student.objects.create(
                first_name=f"S{i}", last_name="Test", gender="male",
                phone=f"+99890111223{i}", date_of_birth="2006-01-01",
                group=group, branch=branch, monthly_fee=Decimal("450000"),
            )
        r = auth(admin_user).post(
            reverse("student-list"),
            {
                "first_name": "Ortiqcha", "last_name": "Talaba", "phone": "+998901119999",
                "date_of_birth": "2006-01-01", "gender": "male",
                "group": group.id, "branch": branch.id, "monthly_fee": "450000",
            },
            format="json",
        )
        assert r.status_code == 400
        assert "full" in str(r.data).lower()

    def test_invalid_phone_is_rejected(self, auth, admin_user, group, branch):
        r = auth(admin_user).post(
            reverse("student-list"),
            {
                "first_name": "Test", "last_name": "Talaba", "phone": "12345",
                "date_of_birth": "2006-01-01", "gender": "male",
                "group": group.id, "branch": branch.id, "monthly_fee": "450000",
            },
            format="json",
        )
        assert r.status_code == 400
        assert "phone" in r.data

    def test_branch_and_fee_default_from_the_group(self, auth, admin_user, group):
        r = auth(admin_user).post(
            reverse("student-list"),
            {
                "first_name": "Avtomatik", "last_name": "Talaba", "phone": "+998901110000",
                "date_of_birth": "2006-01-01", "gender": "female", "group": group.id,
            },
            format="json",
        )
        assert r.status_code == 201, r.data
        created = Student.objects.get(id=r.data["id"])
        assert created.branch_id == group.branch_id
        assert created.monthly_fee == group.course.price

    def test_attendance_rate_is_computed_from_records(self, student, lesson):
        Attendance.objects.create(student=student, lesson=lesson, status="present")
        assert student.attendance_rate == 100

        second = lesson
        second.pk = None
        second.date = timezone.localdate() - timedelta(days=2)
        second.save()
        Attendance.objects.create(student=student, lesson=second, status="absent")
        assert student.attendance_rate == 50


class TestAttendance:
    def test_bulk_marking_creates_records(self, auth, teacher, student, lesson):
        r = auth(teacher.user).post(
            reverse("attendance-bulk"),
            {"lesson": lesson.id, "records": [{"student": student.id, "status": "present"}]},
            format="json",
        )
        assert r.status_code == 200
        assert Attendance.objects.filter(student=student, lesson=lesson).count() == 1

    def test_bulk_marking_is_idempotent(self, auth, teacher, student, lesson):
        url = reverse("attendance-bulk")
        payload = {"lesson": lesson.id, "records": [{"student": student.id, "status": "present"}]}
        auth(teacher.user).post(url, payload, format="json")
        payload["records"][0]["status"] = "late"
        auth(teacher.user).post(url, payload, format="json")

        records = Attendance.objects.filter(student=student, lesson=lesson)
        assert records.count() == 1
        assert records.first().status == "late"

    def test_teacher_cannot_mark_another_teachers_group(
        self, auth, other_teacher, student, lesson
    ):
        r = auth(other_teacher.user).post(
            reverse("attendance-bulk"),
            {"lesson": lesson.id, "records": [{"student": student.id, "status": "present"}]},
            format="json",
        )
        assert r.status_code == 403

    def test_students_outside_the_group_are_ignored(
        self, auth, teacher, student, other_student, lesson
    ):
        r = auth(teacher.user).post(
            reverse("attendance-bulk"),
            {
                "lesson": lesson.id,
                "records": [
                    {"student": student.id, "status": "present"},
                    {"student": other_student.id, "status": "present"},
                ],
            },
            format="json",
        )
        assert r.status_code == 200
        assert len(r.data) == 1
        assert not Attendance.objects.filter(student=other_student).exists()


class TestGroupValidation:
    def test_end_time_must_follow_start_time(self, auth, admin_user, course, teacher, branch):
        r = auth(admin_user).post(
            reverse("group-list"),
            {
                "name": "Teskari", "course": course.id, "teacher": teacher.id,
                "branch": branch.id, "room": "102", "days": ["mon"],
                "start_time": "18:00", "end_time": "17:00",
                "capacity": 10, "start_date": str(timezone.localdate()),
            },
            format="json",
        )
        assert r.status_code == 400

    def test_unknown_weekday_is_rejected(self, auth, admin_user, course, teacher, branch):
        r = auth(admin_user).post(
            reverse("group-list"),
            {
                "name": "Noto'g'ri kun", "course": course.id, "teacher": teacher.id,
                "branch": branch.id, "room": "102", "days": ["monday"],
                "start_time": "09:00", "end_time": "10:30",
                "capacity": 10, "start_date": str(timezone.localdate()),
            },
            format="json",
        )
        assert r.status_code == 400
        assert "days" in r.data


class TestDashboard:
    def test_dashboard_returns_kpis_and_series(self, auth, admin_user, student, group):
        r = auth(admin_user).get(reverse("dashboard"))
        assert r.status_code == 200
        for key in [
            "total_students", "active_groups", "monthly_revenue",
            "outstanding_debt", "attendance_rate",
        ]:
            assert key in r.data["kpis"]
        assert "revenue_series" in r.data
        assert "top_teachers" in r.data
