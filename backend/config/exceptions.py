"""Turn database integrity errors into clean, actionable API responses."""

from django.db.models import ProtectedError, RestrictedError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def _describe(protected) -> str:
    labels = sorted({obj._meta.verbose_name_plural.title() for obj in protected})
    return ", ".join(labels)


def api_exception_handler(exc, context):
    """Adds friendly handling for on_delete=PROTECT collisions.

    Without this, deleting a student who already has payments returns a 500;
    with it the client gets a 409 that says exactly what is in the way.
    """
    if isinstance(exc, (ProtectedError, RestrictedError)):
        related = getattr(exc, "protected_objects", None) or getattr(
            exc, "restricted_objects", []
        )
        return Response(
            {
                "detail": (
                    "This record still has related data and cannot be deleted. "
                    "Deactivate it instead, or remove the related records first."
                ),
                "blocked_by": _describe(related),
            },
            status=status.HTTP_409_CONFLICT,
        )

    return drf_exception_handler(exc, context)
