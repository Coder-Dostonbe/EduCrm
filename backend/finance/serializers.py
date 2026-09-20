from rest_framework import serializers

from .models import Invoice, Payment, Salary


class PaymentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    cashier_name = serializers.CharField(source="cashier.name", read_only=True, default="")
    course_name = serializers.CharField(
        source="student.group.course.name", read_only=True, default=""
    )

    class Meta:
        model = Payment
        fields = [
            "id", "invoice_no", "student", "student_name", "course_name",
            "branch", "amount", "method", "status", "date",
            "cashier", "cashier_name", "note",
        ]
        read_only_fields = ["invoice_no", "cashier"]
        extra_kwargs = {
            # Defaults to the student's branch when the client omits it.
            "branch": {"required": False},
        }

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value

    def create(self, validated_data):
        # Branch follows the student unless explicitly supplied.
        if "branch" not in validated_data:
            validated_data["branch"] = validated_data["student"].branch
        return super().create(validated_data)


class InvoiceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_phone = serializers.CharField(source="student.phone", read_only=True)
    parent_phone = serializers.CharField(source="student.parent_phone", read_only=True)
    group_name = serializers.CharField(source="student.group.name", read_only=True, default="")
    course_name = serializers.CharField(
        source="student.group.course.name", read_only=True, default=""
    )
    amount_paid = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    overdue_days = serializers.IntegerField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id", "student", "student_name", "student_phone", "parent_phone",
            "group_name", "course_name", "period", "amount_due", "amount_paid",
            "balance", "due_date", "overdue_days", "is_overdue",
        ]


class SalarySerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.name", read_only=True)
    employee_role = serializers.CharField(source="employee.role", read_only=True)
    total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Salary
        fields = [
            "id", "employee", "employee_name", "employee_role", "branch",
            "month", "base_salary", "bonus", "deductions", "total",
            "status", "payment_date",
        ]
