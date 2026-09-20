from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Shape matches the frontend `User` type in src/types/index.ts."""

    name = serializers.CharField(read_only=True)
    branchId = serializers.PrimaryKeyRelatedField(source="branch", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "first_name",
            "last_name",
            "email",
            "role",
            "phone",
            "avatar",
            "language",
            "branchId",
        ]
        read_only_fields = ["id", "role", "email"]


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds role/name claims and returns the user object alongside tokens."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["name"] = user.name
        token["email"] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, style={"input_type": "password"})
    password_confirm = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "password", "password_confirm", "phone"]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords don't match."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        # Self-registration always creates a student; staff accounts are
        # provisioned by an administrator.
        return User.objects.create_user(password=password, role="student", **validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_current_password(self, value: str) -> str:
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value


class GoogleAuthSerializer(serializers.Serializer):
    """The frontend sends the Google ID token it received from Google Sign-In."""

    id_token = serializers.CharField()
