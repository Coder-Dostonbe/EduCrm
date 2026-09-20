from datetime import timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone

from core.models import Student
from crm.models import Lead, LeadNote, MessageTemplate, Notification, SentMessage
from finance.models import Invoice

pytestmark = pytest.mark.django_db


@pytest.fixture
def lead(db, branch, course, manager_user):
    return Lead.objects.create(
        name="Kamron Mirzayev",
        phone="+998901112233",
        source="instagram",
        course_interest=course,
        stage="new",
        priority="high",
        manager=manager_user,
        branch=branch,
        expected_value=Decimal("2700000"),
    )


@pytest.fixture
def template(db):
    return MessageTemplate.objects.create(
        key="paymentReminder",
        channel="sms",
        body="Hurmatli {parent_name}! {student_name}ning to'lovi {amount} so'm.",
    )


class TestLeadPermissions:
    def test_teacher_has_no_lead_access(self, auth, teacher):
        assert auth(teacher.user).get(reverse("lead-list")).status_code == 403

    def test_student_has_no_lead_access(self, auth, student_user):
        assert auth(student_user).get(reverse("lead-list")).status_code == 403

    def test_manager_can_list_leads(self, auth, manager_user, lead):
        r = auth(manager_user).get(reverse("lead-list"))
        assert r.status_code == 200
        assert r.data["count"] == 1


class TestLeadPipeline:
    def test_creating_a_lead_defaults_the_manager_to_the_creator(
        self, auth, manager_user, course, branch
    ):
        r = auth(manager_user).post(
            reverse("lead-list"),
            {
                "name": "Yangi Lid",
                "phone": "+998901119999",
                "source": "telegram",
                "course_interest": course.id,
                "branch": branch.id,
            },
            format="json",
        )
        assert r.status_code == 201, r.data
        assert Lead.objects.get(id=r.data["id"]).manager == manager_user

    def test_expected_value_defaults_to_the_full_programme_price(
        self, auth, manager_user, course, branch
    ):
        r = auth(manager_user).post(
            reverse("lead-list"),
            {
                "name": "Qiymat Testi",
                "phone": "+998901118888",
                "course_interest": course.id,
                "branch": branch.id,
            },
            format="json",
        )
        assert r.status_code == 201
        expected = course.price * course.duration_months
        assert Decimal(r.data["expected_value"]) == expected

    def test_moving_a_lead_between_stages(self, auth, manager_user, lead):
        r = auth(manager_user).post(
            reverse("lead-move-stage", args=[lead.id]), {"stage": "contacted"}, format="json"
        )
        assert r.status_code == 200
        lead.refresh_from_db()
        assert lead.stage == "contacted"

    def test_marking_a_lead_lost_records_the_reason(self, auth, manager_user, lead):
        r = auth(manager_user).post(
            reverse("lead-move-stage", args=[lead.id]),
            {"stage": "lost", "lost_reason": "Narx qimmat"},
            format="json",
        )
        assert r.status_code == 200
        lead.refresh_from_db()
        assert lead.stage == "lost"
        assert lead.lost_reason == "Narx qimmat"
        assert lead.is_open is False

    def test_enrolled_stage_cannot_be_set_directly(self, auth, manager_user, lead):
        """Enrolling must go through convert, so a student record always exists."""
        r = auth(manager_user).post(
            reverse("lead-move-stage", args=[lead.id]), {"stage": "enrolled"}, format="json"
        )
        assert r.status_code == 400
        lead.refresh_from_db()
        assert lead.stage == "new"

    def test_adding_a_note_records_the_author(self, auth, manager_user, lead):
        r = auth(manager_user).post(
            reverse("lead-add-note", args=[lead.id]),
            {"text": "Sinov darsiga yozildi."},
            format="json",
        )
        assert r.status_code == 201
        note = LeadNote.objects.get(lead=lead)
        assert note.author == manager_user

    def test_pipeline_summary(self, auth, manager_user, lead):
        r = auth(manager_user).get(reverse("lead-pipeline"))
        assert r.status_code == 200
        assert r.data["total"] == 1
        assert r.data["pipeline_value"] == lead.expected_value
        stages = {s["stage"] for s in r.data["stages"]}
        assert stages == {s for s, _ in Lead.Stage.choices}


class TestLeadConversion:
    def test_convert_creates_a_linked_student(self, auth, manager_user, lead, group):
        r = auth(manager_user).post(
            reverse("lead-convert", args=[lead.id]),
            {
                "group": group.id,
                "date_of_birth": "2006-03-15",
                "gender": "male",
                "parent_name": "Otabek Mirzayev",
                "parent_phone": "+998901112244",
            },
            format="json",
        )
        assert r.status_code == 201, r.data

        lead.refresh_from_db()
        assert lead.stage == "enrolled"
        assert lead.converted_student is not None

        student = lead.converted_student
        assert student.first_name == "Kamron"
        assert student.last_name == "Mirzayev"
        assert student.phone == lead.phone
        assert student.group == group
        assert student.monthly_fee == group.course.price

    def test_converting_twice_is_refused(self, auth, manager_user, lead, group):
        url = reverse("lead-convert", args=[lead.id])
        payload = {"group": group.id, "date_of_birth": "2006-03-15", "gender": "male"}
        assert auth(manager_user).post(url, payload, format="json").status_code == 201
        assert auth(manager_user).post(url, payload, format="json").status_code == 409

    def test_cannot_convert_into_a_full_group(self, auth, manager_user, lead, group, branch):
        for i in range(group.capacity):
            Student.objects.create(
                first_name=f"S{i}", last_name="Test", gender="male",
                phone=f"+99890111222{i}", date_of_birth="2006-01-01",
                group=group, branch=branch, monthly_fee=Decimal("450000"),
            )
        r = auth(manager_user).post(
            reverse("lead-convert", args=[lead.id]),
            {"group": group.id, "date_of_birth": "2006-03-15", "gender": "male"},
            format="json",
        )
        assert r.status_code == 400
        assert "full" in str(r.data).lower()

    def test_conversion_notifies_staff(self, auth, manager_user, admin_user, lead, group):
        auth(manager_user).post(
            reverse("lead-convert", args=[lead.id]),
            {"group": group.id, "date_of_birth": "2006-03-15", "gender": "male"},
            format="json",
        )
        assert Notification.objects.filter(user=admin_user, type="student").exists()
        assert Notification.objects.filter(user=manager_user, type="student").exists()


class TestCommunications:
    def test_template_placeholders_are_filled(self, template, student):
        rendered = template.render(
            {"parent_name": "Anvar", "student_name": "Aziza", "amount": "450 000"}
        )
        assert "Anvar" in rendered and "Aziza" in rendered and "450 000" in rendered

    def test_sending_to_a_group_creates_one_message_per_student(
        self, auth, manager_user, student, group, template
    ):
        r = auth(manager_user).post(
            reverse("sentmessage-send"),
            {
                "channel": "sms",
                "audience": "group",
                "group": group.id,
                "template": template.id,
                "body": "Salom {student_name}!",
            },
            format="json",
        )
        assert r.status_code == 201, r.data
        assert len(r.data) == 1
        message = SentMessage.objects.get()
        assert student.first_name in message.body
        assert message.sent_by == manager_user

    def test_audience_group_requires_a_group(self, auth, manager_user):
        r = auth(manager_user).post(
            reverse("sentmessage-send"),
            {"channel": "sms", "audience": "group", "body": "Salom"},
            format="json",
        )
        assert r.status_code == 400
        assert "group" in r.data

    def test_debtor_audience_only_targets_students_who_owe(
        self, auth, manager_user, student, other_student, invoice
    ):
        r = auth(manager_user).post(
            reverse("sentmessage-send"),
            {"channel": "sms", "audience": "all-debtors", "body": "Qarzdorlik"},
            format="json",
        )
        assert r.status_code == 201
        assert len(r.data) == 1
        assert r.data[0]["student"] == student.id

    def test_empty_audience_is_rejected(self, auth, manager_user):
        r = auth(manager_user).post(
            reverse("sentmessage-send"),
            {"channel": "sms", "audience": "all-students", "body": "Salom"},
            format="json",
        )
        assert r.status_code == 400

    def test_teacher_cannot_send_messages(self, auth, teacher, group):
        r = auth(teacher.user).post(
            reverse("sentmessage-send"),
            {"channel": "sms", "audience": "group", "group": group.id, "body": "Salom"},
            format="json",
        )
        assert r.status_code == 403


class TestNotifications:
    def test_users_only_see_their_own_notifications(self, auth, admin_user, manager_user):
        Notification.objects.create(user=admin_user, title="Admin uchun")
        Notification.objects.create(user=manager_user, title="Menejer uchun")

        r = auth(admin_user).get(reverse("notification-list"))
        assert r.data["count"] == 1
        assert r.data["results"][0]["title"] == "Admin uchun"

    def test_marking_one_as_read(self, auth, admin_user):
        notification = Notification.objects.create(user=admin_user, title="Test")
        r = auth(admin_user).post(reverse("notification-mark-read", args=[notification.id]))
        assert r.status_code == 200
        assert r.data["read"] is True
        notification.refresh_from_db()
        assert notification.read_at is not None

    def test_marking_all_as_read(self, auth, admin_user):
        for i in range(3):
            Notification.objects.create(user=admin_user, title=f"N{i}")
        r = auth(admin_user).post(reverse("notification-mark-all-read"))
        assert r.status_code == 200
        assert r.data["marked"] == 3
        assert not Notification.objects.filter(user=admin_user, read_at__isnull=True).exists()

    def test_unread_filter(self, auth, admin_user):
        Notification.objects.create(user=admin_user, title="O'qilmagan")
        Notification.objects.create(
            user=admin_user, title="O'qilgan", read_at=timezone.now()
        )
        r = auth(admin_user).get(reverse("notification-list"), {"unread": "true"})
        assert r.data["count"] == 1

    def test_summary_counts(self, auth, admin_user):
        Notification.objects.create(user=admin_user, title="A", type="payment")
        Notification.objects.create(
            user=admin_user, title="B", type="lead", read_at=timezone.now()
        )
        r = auth(admin_user).get(reverse("notification-summary"))
        assert r.data["total"] == 2
        assert r.data["unread"] == 1
        assert r.data["by_type"] == {"payment": 1, "lead": 1}

    def test_notify_roles_fans_out_to_every_staff_member(self, admin_user, manager_user, teacher):
        count = Notification.notify_roles(
            ["admin", "manager"], type="system", title="E'lon", body="Matn"
        )
        assert count == 2
        assert not Notification.objects.filter(user=teacher.user).exists()


class TestEmployees:
    def test_only_admins_can_list_employees(self, auth, admin_user, manager_user, teacher):
        assert auth(admin_user).get(reverse("employee-list")).status_code == 200
        assert auth(manager_user).get(reverse("employee-list")).status_code == 403
        assert auth(teacher.user).get(reverse("employee-list")).status_code == 403

    def test_students_are_excluded_from_the_employee_list(
        self, auth, admin_user, student_user, manager_user
    ):
        r = auth(admin_user).get(reverse("employee-list"))
        emails = {row["email"] for row in r.data["results"]}
        assert student_user.email not in emails
        assert manager_user.email in emails

    def test_creating_an_employee(self, auth, admin_user, branch):
        r = auth(admin_user).post(
            reverse("employee-list"),
            {
                "first_name": "Dilnoza", "last_name": "Rasulova",
                "email": "d.rasulova@eduflow.uz", "role": "manager",
                "branch": branch.id, "password": "secure12345",
            },
            format="json",
        )
        assert r.status_code == 201, r.data

    def test_an_employee_cannot_be_created_with_the_student_role(self, auth, admin_user):
        r = auth(admin_user).post(
            reverse("employee-list"),
            {
                "first_name": "A", "last_name": "B", "email": "x@eduflow.uz",
                "role": "student", "password": "secure12345",
            },
            format="json",
        )
        assert r.status_code == 400
        assert "role" in r.data

    def test_delete_deactivates_rather_than_removing(self, auth, admin_user, manager_user):
        r = auth(admin_user).delete(reverse("employee-detail", args=[manager_user.id]))
        assert r.status_code == 204
        manager_user.refresh_from_db()
        assert manager_user.is_active is False  # payroll history survives


class TestReports:
    @pytest.mark.parametrize(
        "report",
        ["students", "attendance", "revenue", "debt", "teachers", "courses", "leads", "branches"],
    )
    def test_every_report_returns_the_shared_envelope(self, auth, admin_user, report, student, lead):
        r = auth(admin_user).get(reverse("report", args=[report]))
        assert r.status_code == 200, r.data
        for key in ["report", "headers", "rows", "chart", "total", "total_label", "money"]:
            assert key in r.data, f"{report} is missing '{key}'"
        assert r.data["report"] == report

    def test_unknown_report_is_rejected(self, auth, admin_user):
        assert auth(admin_user).get(reverse("report", args=["nonsense"])).status_code == 400

    def test_teachers_cannot_read_reports(self, auth, teacher):
        assert auth(teacher.user).get(reverse("report", args=["revenue"])).status_code == 403

    def test_debt_report_totals_match_the_invoices(self, auth, admin_user, invoice):
        r = auth(admin_user).get(reverse("report", args=["debt"]))
        assert r.data["total"] == invoice.amount_due
        assert r.data["money"] is True
