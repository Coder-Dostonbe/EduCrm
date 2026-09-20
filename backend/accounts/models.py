from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _


class Role(models.TextChoices):
    ADMIN = "admin", _("Administrator")
    MANAGER = "manager", _("Manager")
    TEACHER = "teacher", _("Teacher")
    STUDENT = "student", _("Student")


class UserManager(BaseUserManager):
    """Email-based manager — the CRM logs in with email, not a username."""

    use_in_migrations = True

    def _create_user(self, email: str, password: str | None, **extra):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str | None = None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email: str, password: str | None = None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("role", Role.ADMIN)
        if extra.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra)


class User(AbstractUser):
    """Single account model for every role in the CRM."""

    username = None  # replaced by email
    email = models.EmailField(_("email address"), unique=True)
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.STUDENT)
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    language = models.CharField(
        max_length=2,
        choices=[("uz", "O'zbekcha"), ("ru", "Русский"), ("en", "English")],
        default="uz",
    )
    branch = models.ForeignKey(
        "core.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    google_sub = models.CharField(
        max_length=64, blank=True, db_index=True,
        help_text="Google account subject id, set when signing in with Google.",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    objects = UserManager()

    class Meta:
        ordering = ["first_name", "last_name"]
        indexes = [models.Index(fields=["role"])]

    def __str__(self) -> str:
        return f"{self.get_full_name() or self.email} ({self.role})"

    @property
    def name(self) -> str:
        return self.get_full_name() or self.email

    # Convenience flags used across permissions and querysets
    @property
    def is_admin(self) -> bool:
        return self.role == Role.ADMIN

    @property
    def is_manager(self) -> bool:
        return self.role == Role.MANAGER

    @property
    def is_teacher(self) -> bool:
        return self.role == Role.TEACHER

    @property
    def is_student(self) -> bool:
        return self.role == Role.STUDENT

    @property
    def is_staff_role(self) -> bool:
        """Admin or manager — the two roles with center-wide access."""
        return self.role in {Role.ADMIN, Role.MANAGER}
