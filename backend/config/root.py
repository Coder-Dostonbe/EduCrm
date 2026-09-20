"""A friendly landing page for the API root.

Hitting http://localhost:8000/ used to return Django's raw 404, which looks
like a failure when it is really just the wrong port — the UI lives on the
frontend's port. This points visitors at the right places instead.
"""

from django.http import JsonResponse


def api_root(request):
    return JsonResponse(
        {
            "service": "EduFlow CRM API",
            "status": "running",
            "note": (
                "This is the backend API. The CRM interface runs separately "
                "on the frontend dev server — usually http://localhost:3000"
            ),
            "endpoints": {
                "docs": request.build_absolute_uri("/api/docs/"),
                "redoc": request.build_absolute_uri("/api/redoc/"),
                "schema": request.build_absolute_uri("/api/schema/"),
                "admin": request.build_absolute_uri("/admin/"),
                "login": request.build_absolute_uri("/api/auth/login/"),
            },
        },
        json_dumps_params={"indent": 2},
    )
