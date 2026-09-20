"""Employees module — staff accounts as the Employees page sees them.

Teachers have their own richer endpoint under /api/teachers/; this one covers
everyone on the payroll, including managers, cashiers and receptionists.
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import serializers, viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Role
from .permissions import ModulePermission

User = get_user_model()


class EmployeeSerializer(serializers.ModelSerializer):
    name = serializers.CharField(read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default="")
    hire_date = serializers.DateTimeField(source="date_joined", read_only=True)
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    salary = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "name", "first_name", "last_name", "email", "phone",
            "role", "branch", "branch_name", "hire_date", "is_active",
            "salary", "password",
        ]

    def get_salary(self, obj):
        """Most recent payroll figure, so the table has something to show."""
        latest = obj.salaries.order_by("-month").first()
        return latest.total if latest else None

    def validate_role(self, value: str) -> str:
        if value == Role.STUDENT:
            raise serializers.ValidationError(
                "Students are managed under /api/students/, not as employees."
            )
        return value

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        return User.objects.create_user(password=password, **validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=["password"])
        return user


class EmployeeViewSet(viewsets.ModelViewSet):
    module = "employees"
    permission_classes = [IsAuthenticated, ModulePermission]
    serializer_class = EmployeeSerializer
    filterset_fields = ["role", "branch", "is_active"]
    search_fields = ["first_name", "last_name", "email", "phone"]
    ordering_fields = ["first_name", "last_name", "date_joined", "role"]

    def get_queryset(self):
        qs = (
            User.objects.exclude(role=Role.STUDENT)
            .select_related("branch")
            .prefetch_related("salaries")
        )
        branch = self.request.query_params.get("branch")
        if branch and branch != "all":
            qs = qs.filter(branch=branch)
        return qs

    def perform_destroy(self, instance):
        """Deactivate rather than delete — payroll and audit history must survive."""
        instance.is_active = False
        instance.save(update_fields=["is_active"])
