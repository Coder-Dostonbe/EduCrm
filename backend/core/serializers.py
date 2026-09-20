from __future__ import annotations

from rest_framework import serializers

from accounts.serializers import UserSerializer

from .models import (
    Attendance,
    Branch,
    Course,
    Exam,
    Grade,
    Group,
    Lesson,
    Student,
    Teacher,
)


class AnnotatedCountMixin:
    """Prefers a queryset annotation, falling back to the model property.

    Lets list views stay a single query while detail/nested serialisation
    still works on plain instances.
    """

    @staticmethod
    def pick(obj, annotation: str, prop: str, default=0):
        value = getattr(obj, annotation, None)
        if value is not None:
            return value
        return getattr(obj, prop, default)


class BranchSerializer(AnnotatedCountMixin, serializers.ModelSerializer):
    manager_name = serializers.CharField(source="manager.name", read_only=True, default="")
    student_count = serializers.SerializerMethodField()
    group_count = serializers.SerializerMethodField()
    teacher_count = serializers.SerializerMethodField()
    monthly_revenue = serializers.SerializerMethodField()

    def get_student_count(self, obj) -> int:
        return getattr(obj, "students_total", 0)

    def get_group_count(self, obj) -> int:
        return getattr(obj, "groups_total", 0)

    def get_teacher_count(self, obj) -> int:
        return getattr(obj, "teachers_total", 0)

    def get_monthly_revenue(self, obj):
        return getattr(obj, "revenue_total", 0)

    class Meta:
        model = Branch
        fields = [
            "id", "name", "address", "phone", "manager", "manager_name",
            "rooms", "status", "student_count", "group_count", "teacher_count",
            "monthly_revenue",
        ]


class CourseSerializer(AnnotatedCountMixin, serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()
    group_count = serializers.SerializerMethodField()

    def get_student_count(self, obj) -> int:
        return self.pick(obj, "students_total", "student_count")

    def get_group_count(self, obj) -> int:
        return self.pick(obj, "groups_total", "group_count")

    class Meta:
        model = Course
        fields = [
            "id", "name", "category", "description", "curriculum",
            "duration_months", "price", "color", "status",
            "student_count", "group_count",
        ]


class TeacherSerializer(AnnotatedCountMixin, serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    name = serializers.CharField(source="user.name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    phone = serializers.CharField(source="user.phone", read_only=True)
    group_count = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()
    attendance_rate = serializers.SerializerMethodField()

    def get_group_count(self, obj) -> int:
        return getattr(obj, "groups_total", obj.groups.count())

    def get_student_count(self, obj) -> int:
        return self.pick(obj, "students_total", "student_count")

    def get_attendance_rate(self, obj) -> int:
        from core.models import Attendance

        records = Attendance.objects.filter(lesson__group__teacher=obj)
        total = records.count()
        if not total:
            return 0
        ok = records.filter(status__in=["present", "late"]).count()
        return round(ok / total * 100)

    class Meta:
        model = Teacher
        fields = [
            "id", "user", "name", "email", "phone", "branch", "specialization",
            "bio", "base_salary", "rating", "hire_date", "status",
            "group_count", "student_count", "attendance_rate",
        ]


class TeacherWriteSerializer(serializers.ModelSerializer):
    """Creating a teacher also provisions their login account."""

    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = Teacher
        fields = [
            "id", "branch", "specialization", "bio", "base_salary", "rating",
            "hire_date", "status", "first_name", "last_name", "email", "phone", "password",
        ]

    def create(self, validated_data):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user_fields = {
            "first_name": validated_data.pop("first_name"),
            "last_name": validated_data.pop("last_name"),
            "email": validated_data.pop("email"),
            "phone": validated_data.pop("phone", ""),
        }
        password = validated_data.pop("password", None)
        user = User.objects.create_user(role="teacher", password=password, **user_fields)
        user.branch = validated_data.get("branch")
        user.save(update_fields=["branch"])
        return Teacher.objects.create(user=user, **validated_data)

    def update(self, instance, validated_data):
        user = instance.user
        for field in ("first_name", "last_name", "email", "phone"):
            if field in validated_data:
                setattr(user, field, validated_data.pop(field))
        validated_data.pop("password", None)
        user.save()
        return super().update(instance, validated_data)


class GroupSerializer(AnnotatedCountMixin, serializers.ModelSerializer):
    course_name = serializers.CharField(source="course.name", read_only=True)
    course_color = serializers.CharField(source="course.color", read_only=True)
    teacher_name = serializers.CharField(source="teacher.user.name", read_only=True, default="")
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    student_count = serializers.SerializerMethodField()
    fill_rate = serializers.SerializerMethodField()

    def get_student_count(self, obj) -> int:
        return self.pick(obj, "students_total", "student_count")

    def get_fill_rate(self, obj) -> int:
        count = self.get_student_count(obj)
        return round(count / obj.capacity * 100) if obj.capacity else 0

    class Meta:
        model = Group
        fields = [
            "id", "name", "course", "course_name", "course_color",
            "teacher", "teacher_name", "branch", "branch_name", "room",
            "days", "start_time", "end_time", "capacity", "start_date",
            "status", "student_count", "fill_rate",
        ]

    def validate(self, attrs):
        start = attrs.get("start_time") or getattr(self.instance, "start_time", None)
        end = attrs.get("end_time") or getattr(self.instance, "end_time", None)
        if start and end and end <= start:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})
        valid_days = {key for key, _ in Group.WEEKDAYS}
        days = attrs.get("days")
        if days is not None:
            invalid = set(days) - valid_days
            if invalid:
                raise serializers.ValidationError(
                    {"days": f"Unknown weekday keys: {', '.join(sorted(invalid))}"}
                )
        return attrs


class StudentSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    group_name = serializers.CharField(source="group.name", read_only=True, default="")
    course = serializers.PrimaryKeyRelatedField(source="group.course", read_only=True)
    course_name = serializers.CharField(source="group.course.name", read_only=True, default="")
    attendance_rate = serializers.IntegerField(read_only=True)
    performance = serializers.IntegerField(read_only=True)
    debt = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, default=0)
    payment_status = serializers.CharField(read_only=True, default="paid")

    class Meta:
        model = Student
        fields = [
            "id", "first_name", "last_name", "full_name", "phone", "email",
            "date_of_birth", "gender", "address", "parent_name", "parent_phone",
            "group", "group_name", "course", "course_name", "branch",
            "enrollment_date", "monthly_fee", "status", "notes",
            "attendance_rate", "performance", "debt", "payment_status",
        ]
        extra_kwargs = {
            # Both default to the group's branch and course price on create.
            "branch": {"required": False},
            "monthly_fee": {"required": False},
        }

    def validate_group(self, group: Group | None):
        if group is None:
            return group
        # Block enrolment into a full group (edits that keep the group are fine).
        if self.instance is None or self.instance.group_id != group.id:
            if group.student_count >= group.capacity:
                raise serializers.ValidationError(
                    f"Group '{group.name}' is full ({group.capacity} seats)."
                )
        return group

    def create(self, validated_data):
        # Branch follows the group unless explicitly supplied.
        group = validated_data.get("group")
        if group and "branch" not in validated_data:
            validated_data["branch"] = group.branch
        if group and not validated_data.get("monthly_fee"):
            validated_data["monthly_fee"] = group.course.price
        return super().create(validated_data)


class LessonSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source="group.name", read_only=True)
    course_name = serializers.CharField(source="group.course.name", read_only=True)
    course_color = serializers.CharField(source="group.course.color", read_only=True)
    teacher_name = serializers.CharField(
        source="group.teacher.user.name", read_only=True, default=""
    )
    branch = serializers.PrimaryKeyRelatedField(source="group.branch", read_only=True)

    class Meta:
        model = Lesson
        fields = [
            "id", "group", "group_name", "course_name", "course_color",
            "teacher_name", "branch", "date", "start_time", "end_time",
            "room", "canceled",
        ]


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    date = serializers.DateField(source="lesson.date", read_only=True)
    group = serializers.PrimaryKeyRelatedField(source="lesson.group", read_only=True)
    marked_by_name = serializers.CharField(source="marked_by.name", read_only=True, default="")

    class Meta:
        model = Attendance
        fields = [
            "id", "student", "student_name", "lesson", "group", "date",
            "status", "marked_by", "marked_by_name", "note",
        ]
        read_only_fields = ["marked_by"]


class AttendanceBulkItemSerializer(serializers.Serializer):
    student = serializers.IntegerField()
    status = serializers.ChoiceField(choices=Attendance.Status.choices)
    note = serializers.CharField(required=False, allow_blank=True, default="")


class AttendanceBulkSerializer(serializers.Serializer):
    """Mark a whole group in one request — what the Attendance page does."""

    lesson = serializers.IntegerField()
    records = AttendanceBulkItemSerializer(many=True)


class ExamSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source="group.name", read_only=True)
    course_name = serializers.CharField(source="group.course.name", read_only=True)
    teacher_name = serializers.CharField(
        source="group.teacher.user.name", read_only=True, default=""
    )
    participants = serializers.IntegerField(read_only=True)
    average_percentage = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Exam
        fields = [
            "id", "name", "group", "group_name", "course_name", "teacher_name",
            "date", "max_score", "status", "participants", "average_percentage",
        ]


class GradeSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    exam_name = serializers.CharField(source="exam.name", read_only=True)
    max_score = serializers.DecimalField(
        source="exam.max_score", max_digits=6, decimal_places=2, read_only=True
    )
    percentage = serializers.IntegerField(read_only=True)

    class Meta:
        model = Grade
        fields = [
            "id", "student", "student_name", "exam", "exam_name",
            "score", "max_score", "percentage", "comment",
        ]

    def validate(self, attrs):
        exam = attrs.get("exam") or getattr(self.instance, "exam", None)
        score = attrs.get("score")
        if exam and score is not None and score > exam.max_score:
            raise serializers.ValidationError(
                {"score": f"Score cannot exceed the exam maximum ({exam.max_score})."}
            )
        return attrs
