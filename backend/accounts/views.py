from django.contrib.auth import get_user_model
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .google import GoogleAuthError, verify_id_token
from .permissions import MODULE_READ, MODULE_WRITE
from .serializers import (
    ChangePasswordSerializer,
    EmailTokenObtainPairSerializer,
    GoogleAuthSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


def tokens_for(user) -> dict:
    refresh = RefreshToken.for_user(user)
    refresh["role"] = user.role
    refresh["name"] = user.name
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
        "user": UserSerializer(user).data,
    }


class LoginView(TokenObtainPairView):
    """POST email + password -> access/refresh tokens and the user object."""

    serializer_class = EmailTokenObtainPairSerializer
    permission_classes = [AllowAny]


class RegisterView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=RegisterSerializer,
        responses={201: OpenApiResponse(description="Tokens and the created user")},
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(tokens_for(user), status=status.HTTP_201_CREATED)


class GoogleLoginView(APIView):
    """Exchange a Google ID token for EduFlow JWTs.

    An account is created on first sign-in (as a student); existing accounts
    are matched by email and linked to the Google subject id.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        request=GoogleAuthSerializer,
        responses={200: OpenApiResponse(description="Tokens and the user")},
    )
    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            payload = verify_id_token(serializer.validated_data["id_token"])
        except GoogleAuthError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_401_UNAUTHORIZED)

        email = payload["email"].lower()
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": payload.get("given_name", ""),
                "last_name": payload.get("family_name", ""),
                "role": "student",
                "google_sub": payload.get("sub", ""),
            },
        )
        if not created and not user.google_sub:
            user.google_sub = payload.get("sub", "")
            user.save(update_fields=["google_sub"])

        if not user.is_active:
            return Response(
                {"detail": "This account is disabled."}, status=status.HTTP_403_FORBIDDEN
            )

        return Response(tokens_for(user))


class MeView(APIView):
    """Current user — the frontend calls this on boot to restore the session."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses=UserSerializer)
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    @extend_schema(request=UserSerializer, responses=UserSerializer)
    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=ChangePasswordSerializer, responses={204: None})
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class PermissionMatrixView(APIView):
    """Exposes the role matrix so the UI can render it from a single source."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "read": {mod: sorted(roles) for mod, roles in MODULE_READ.items()},
                "write": {mod: sorted(roles) for mod, roles in MODULE_WRITE.items()},
            }
        )
