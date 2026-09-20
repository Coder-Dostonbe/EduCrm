from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.db import models, transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.models import Branch, Student, TimeStampedModel


class Payment(TimeStampedModel):
    class Method(models.TextChoices):
        CASH = "cash", _("Cash")
        CARD = "card", _("Card")
        TRANSFER = "transfer", _("Bank transfer")
        ONLINE = "online", _("Online")

    class Status(models.TextChoices):
        PAID = "paid", _("Paid")
        PENDING = "pending", _("Pending")
        PARTIAL = "partial", _("Partial")
        OVERDUE = "overdue", _("Overdue")
        CANCELLED = "cancelled", _("Cancelled")

    invoice_no = models.CharField(max_length=32, unique=True, blank=True)
    student = models.ForeignKey(Student, on_delete=models.PROTECT, related_name="payments")
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=16, choices=Method.choices, default=Method.CASH)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PAID)
    date = models.DateField(default=timezone.localdate)
    cashier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="collected_payments",
    )
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-date", "-id"]
        indexes = [
            models.Index(fields=["date"]),
            models.Index(fields=["status"]),
            models.Index(fields=["branch", "date"]),
        ]

    def __str__(self) -> str:
        return f"{self.invoice_no} — {self.amount}"

    def save(self, *args, **kwargs):
        if not self.invoice_no:
            self.invoice_no = self._next_invoice_no()
        super().save(*args, **kwargs)

    @staticmethod
    def _next_invoice_no() -> str:
        """INV-<year>-<zero-padded sequence>, unique per year."""
        year = timezone.localdate().year
        prefix = f"INV-{year}-"
        with transaction.atomic():
            last = (
                Payment.objects.select_for_update()
                .filter(invoice_no__startswith=prefix)
                .order_by("-invoice_no")
                .values_list("invoice_no", flat=True)
                .first()
            )
            nxt = int(last.rsplit("-", 1)[1]) + 1 if last else 1
        return f"{prefix}{nxt:05d}"


class Invoice(TimeStampedModel):
    """What a student owes for one billing period.

    Payments are applied against invoices; the outstanding balance is what the
    Debts page reports, so debt is always derived, never stored by hand.
    """

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="invoices")
    period = models.DateField(help_text="First day of the billing month.")
    amount_due = models.DecimalField(max_digits=12, decimal_places=2)
    due_date = models.DateField()

    class Meta:
        ordering = ["-period"]
        constraints = [
            models.UniqueConstraint(fields=["student", "period"], name="unique_invoice_period")
        ]
        indexes = [models.Index(fields=["due_date"])]

    def __str__(self) -> str:
        return f"{self.student.full_name} — {self.period:%Y-%m}"

    @property
    def amount_paid(self) -> Decimal:
        total = self.student.payments.filter(
            status=Payment.Status.PAID,
            date__gte=self.period,
        ).aggregate(total=models.Sum("amount"))["total"]
        return total or Decimal("0")

    @property
    def balance(self) -> Decimal:
        return max(Decimal("0"), self.amount_due - self.amount_paid)

    @property
    def is_overdue(self) -> bool:
        return self.balance > 0 and self.due_date < timezone.localdate()

    @property
    def overdue_days(self) -> int:
        if not self.is_overdue:
            return 0
        return (timezone.localdate() - self.due_date).days


class Salary(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        PAID = "paid", _("Paid")

    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="salaries"
    )
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name="salaries")
    month = models.DateField(help_text="First day of the payroll month.")
    base_salary = models.DecimalField(max_digits=12, decimal_places=2)
    bonus = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    payment_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["-month"]
        verbose_name_plural = "salaries"
        constraints = [
            models.UniqueConstraint(fields=["employee", "month"], name="unique_salary_per_month")
        ]

    def __str__(self) -> str:
        return f"{self.employee.name} — {self.month:%Y-%m}"

    @property
    def total(self) -> Decimal:
        return self.base_salary + self.bonus - self.deductions
