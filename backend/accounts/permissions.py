"""Role-based permissions mirroring the frontend permission matrix.

The frontend defines the same matrix in `src/lib/permissions.ts`; keeping the
two in sync is what makes the UI and the API agree on what a role may do.
"""

from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import Role

# module -> roles allowed to read it
MODULE_READ: dict[str, set[str]] = {
    "dashboard": {Role.ADMIN, Role.MANAGER, Role.TEACHER, Role.STUDENT},
    "students": {Role.ADMIN, Role.MANAGER, Role.TEACHER},
    "teachers": {Role.ADMIN, Role.MANAGER},
    "courses": {Role.ADMIN, Role.MANAGER, Role.TEACHER, Role.STUDENT},
    "groups": {Role.ADMIN, Role.MANAGER, Role.TEACHER},
    "schedule": {Role.ADMIN, Role.MANAGER, Role.TEACHER, Role.STUDENT},
    "attendance": {Role.ADMIN, Role.MANAGER, Role.TEACHER, Role.STUDENT},
    "exams": {Role.ADMIN, Role.MANAGER, Role.TEACHER, Role.STUDENT},
    "leads": {Role.ADMIN, Role.MANAGER},
    "communications": {Role.ADMIN, Role.MANAGER},
    "payments": {Role.ADMIN, Role.MANAGER, Role.STUDENT},
    "debts": {Role.ADMIN, Role.MANAGER},
    "salaries": {Role.ADMIN},
    "employees": {Role.ADMIN},
    "branches": {Role.ADMIN},
    "reports": {Role.ADMIN, Role.MANAGER},
}

# module -> roles allowed to create/update/delete
MODULE_WRITE: dict[str, set[str]] = {
    "dashboard": set(),
    "students": {Role.ADMIN, Role.MANAGER},
    "teachers": {Role.ADMIN, Role.MANAGER},
    "courses": {Role.ADMIN, Role.MANAGER},
    "groups": {Role.ADMIN, Role.MANAGER},
    "schedule": {Role.ADMIN, Role.MANAGER, Role.TEACHER},
    "attendance": {Role.ADMIN, Role.MANAGER, Role.TEACHER},
    "exams": {Role.ADMIN, Role.MANAGER, Role.TEACHER},
    "leads": {Role.ADMIN, Role.MANAGER},
    "communications": {Role.ADMIN, Role.MANAGER},
    "payments": {Role.ADMIN, Role.MANAGER},
    "debts": {Role.ADMIN, Role.MANAGER},
    "salaries": {Role.ADMIN},
    "employees": {Role.ADMIN},
    "branches": {Role.ADMIN},
    "reports": set(),
}


class ModulePermission(BasePermission):
    """Grants access based on the viewset's `module` attribute.

    Usage:
        class StudentViewSet(ModelViewSet):
            module = "students"
            permission_classes = [IsAuthenticated, ModulePermission]
    """

    message = "Your role does not have access to this module."

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not user or not user.is_authenticated:
            return False

        module = getattr(view, "module", None)
        if module is None:
            # No module declared — fall back to authenticated-only.
            return True

        table = MODULE_READ if request.method in SAFE_METHODS else MODULE_WRITE
        allowed = table.get(module, set())
        return user.role in allowed


class IsAdmin(BasePermission):
    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.is_admin)


class IsStaffRole(BasePermission):
    """Admin or manager."""

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user and request.user.is_authenticated and request.user.is_staff_role
        )


class IsSelfOrStaff(BasePermission):
    """Object-level: the owning user, or any admin/manager."""

    def has_object_permission(self, request, view, obj) -> bool:
        user = request.user
        if user.is_staff_role:
            return True
        owner = getattr(obj, "user", None)
        return owner == user or obj == user
