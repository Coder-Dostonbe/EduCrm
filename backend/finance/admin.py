from django.contrib import admin

from .models import Invoice, Payment, Salary


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["invoice_no", "student", "amount", "method", "status", "date", "cashier"]
    list_filter = ["status", "method", "branch"]
    search_fields = ["invoice_no", "student__first_name", "student__last_name"]
    date_hierarchy = "date"
    readonly_fields = ["invoice_no"]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["student", "period", "amount_due", "due_date"]
    list_filter = ["period"]
    search_fields = ["student__first_name", "student__last_name"]


@admin.register(Salary)
class SalaryAdmin(admin.ModelAdmin):
    list_display = ["employee", "month", "base_salary", "bonus", "deductions", "status"]
    list_filter = ["status", "branch"]
    search_fields = ["employee__first_name", "employee__last_name"]
