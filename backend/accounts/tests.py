import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

User = get_user_model()
pytestmark = pytest.mark.django_db


class TestLogin:
    def test_login_returns_tokens_and_user(self, api, admin_user):
        r = api.post(
            reverse("auth-login"),
            {"email": "admin@test.uz", "password": "pass12345"},
            format="json",
        )
        assert r.status_code == 200
        assert "access" in r.data and "refresh" in r.data
        assert r.data["user"]["role"] == "admin"
        assert r.data["user"]["name"] == "Sardor Alimov"

    def test_wrong_password_is_rejected(self, api, admin_user):
        r = api.post(
            reverse("auth-login"),
            {"email": "admin@test.uz", "password": "wrong"},
            format="json",
        )
        assert r.status_code == 401

    def test_inactive_user_cannot_log_in(self, api, admin_user):
        admin_user.is_active = False
        admin_user.save(update_fields=["is_active"])
        r = api.post(
            reverse("auth-login"),
            {"email": "admin@test.uz", "password": "pass12345"},
            format="json",
        )
        assert r.status_code == 401

    def test_refresh_issues_a_new_access_token(self, api, admin_user):
        login = api.post(
            reverse("auth-login"),
            {"email": "admin@test.uz", "password": "pass12345"},
            format="json",
        )
        r = api.post(reverse("auth-refresh"), {"refresh": login.data["refresh"]}, format="json")
        assert r.status_code == 200
        assert "access" in r.data


class TestRegistration:
    def test_self_registration_creates_a_student(self, api):
        r = api.post(
            reverse("auth-register"),
            {
                "email": "new@test.uz",
                "first_name": "Yangi",
                "last_name": "Foydalanuvchi",
                "password": "verysecure123",
                "password_confirm": "verysecure123",
            },
            format="json",
        )
        assert r.status_code == 201
        assert r.data["user"]["role"] == "student"
        assert User.objects.filter(email="new@test.uz").exists()

    def test_mismatched_passwords_are_rejected(self, api):
        r = api.post(
            reverse("auth-register"),
            {
                "email": "bad@test.uz",
                "first_name": "A",
                "last_name": "B",
                "password": "verysecure123",
                "password_confirm": "different123",
            },
            format="json",
        )
        assert r.status_code == 400
        assert "password_confirm" in r.data

    def test_registration_cannot_self_assign_admin(self, api):
        """A client sending role=admin must still land as a student."""
        r = api.post(
            reverse("auth-register"),
            {
                "email": "sneaky@test.uz",
                "first_name": "A",
                "last_name": "B",
                "password": "verysecure123",
                "password_confirm": "verysecure123",
                "role": "admin",
            },
            format="json",
        )
        assert r.status_code == 201
        assert User.objects.get(email="sneaky@test.uz").role == "student"


class TestMe:
    def test_me_requires_authentication(self, api):
        assert api.get(reverse("auth-me")).status_code == 401

    def test_me_returns_current_user(self, auth, teacher):
        r = auth(teacher.user).get(reverse("auth-me"))
        assert r.status_code == 200
        assert r.data["email"] == "teacher@test.uz"
        assert r.data["role"] == "teacher"

    def test_user_can_update_own_profile(self, auth, teacher):
        r = auth(teacher.user).patch(
            reverse("auth-me"), {"first_name": "Jasurbek"}, format="json"
        )
        assert r.status_code == 200
        teacher.user.refresh_from_db()
        assert teacher.user.first_name == "Jasurbek"

    def test_role_cannot_be_escalated_via_profile_update(self, auth, student_user):
        r = auth(student_user).patch(reverse("auth-me"), {"role": "admin"}, format="json")
        assert r.status_code == 200
        student_user.refresh_from_db()
        assert student_user.role == "student"


class TestChangePassword:
    def test_password_change_requires_the_current_password(self, auth, admin_user):
        r = auth(admin_user).post(
            reverse("auth-change-password"),
            {"current_password": "wrong", "new_password": "brandnew12345"},
            format="json",
        )
        assert r.status_code == 400

    def test_password_change_succeeds(self, auth, admin_user):
        r = auth(admin_user).post(
            reverse("auth-change-password"),
            {"current_password": "pass12345", "new_password": "brandnew12345"},
            format="json",
        )
        assert r.status_code == 204
        admin_user.refresh_from_db()
        assert admin_user.check_password("brandnew12345")


class TestGoogleLogin:
    def test_missing_client_id_is_reported(self, api, settings):
        settings.GOOGLE_OAUTH_CLIENT_ID = ""
        r = api.post(reverse("auth-google"), {"id_token": "whatever"}, format="json")
        assert r.status_code == 401
        assert "not configured" in r.data["detail"]

    def test_existing_account_is_linked_by_email(self, api, settings, monkeypatch, admin_user):
        settings.GOOGLE_OAUTH_CLIENT_ID = "test-client-id"
        monkeypatch.setattr(
            "accounts.views.verify_id_token",
            lambda token: {
                "email": "admin@test.uz",
                "sub": "google-123",
                "given_name": "Sardor",
                "family_name": "Alimov",
            },
        )
        r = api.post(reverse("auth-google"), {"id_token": "fake"}, format="json")
        assert r.status_code == 200
        assert r.data["user"]["role"] == "admin"  # role preserved, not downgraded
        admin_user.refresh_from_db()
        assert admin_user.google_sub == "google-123"

    def test_new_google_account_is_created_as_student(self, api, settings, monkeypatch):
        settings.GOOGLE_OAUTH_CLIENT_ID = "test-client-id"
        monkeypatch.setattr(
            "accounts.views.verify_id_token",
            lambda token: {
                "email": "fresh@gmail.com",
                "sub": "google-999",
                "given_name": "Yangi",
                "family_name": "Talaba",
            },
        )
        r = api.post(reverse("auth-google"), {"id_token": "fake"}, format="json")
        assert r.status_code == 200
        assert r.data["user"]["role"] == "student"
        assert User.objects.filter(email="fresh@gmail.com").exists()
