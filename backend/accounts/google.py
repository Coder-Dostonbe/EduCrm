"""Google ID-token verification without pulling in the full google-auth stack.

The frontend performs the Google Sign-In flow and posts the resulting ID token
to /api/auth/google/. We verify it against Google's tokeninfo endpoint, which
checks the signature, expiry and issuer for us.
"""

from __future__ import annotations

import requests
from django.conf import settings

TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
VALID_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


class GoogleAuthError(Exception):
    """Raised when the supplied ID token cannot be trusted."""


def verify_id_token(id_token: str) -> dict:
    """Return the token payload, or raise GoogleAuthError."""
    if not settings.GOOGLE_OAUTH_CLIENT_ID:
        raise GoogleAuthError(
            "Google sign-in is not configured on the server "
            "(GOOGLE_OAUTH_CLIENT_ID is empty)."
        )

    try:
        response = requests.get(TOKENINFO_URL, params={"id_token": id_token}, timeout=10)
    except requests.RequestException as exc:  # network failure
        raise GoogleAuthError(f"Could not reach Google to verify the token: {exc}") from exc

    if response.status_code != 200:
        raise GoogleAuthError("Google rejected this ID token.")

    payload = response.json()

    if payload.get("aud") != settings.GOOGLE_OAUTH_CLIENT_ID:
        raise GoogleAuthError("This token was issued for a different application.")

    if payload.get("iss") not in VALID_ISSUERS:
        raise GoogleAuthError("Unexpected token issuer.")

    if payload.get("email_verified") not in ("true", True):
        raise GoogleAuthError("This Google account has no verified email address.")

    allowed_domain = settings.GOOGLE_ALLOWED_DOMAIN
    if allowed_domain and payload.get("hd") != allowed_domain:
        raise GoogleAuthError(f"Only {allowed_domain} accounts may sign in.")

    return payload
