from django.contrib import admin

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


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ["name", "address", "manager", "rooms", "status"]
    list_filter = ["status"]
    search_fields = ["name", "address"]


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "duration_months", "price", "status"]
    list_filter = ["category", "status"]
    search_fields = ["name"]


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ["user", "specialization", "branch", "rating", "status"]
    list_filter = ["status", "branch"]
    search_fields = ["user__first_name", "user__last_name", "specialization"]
    autocomplete_fields = ["user"]


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ["name", "course", "teacher", "room", "capacity", "status", "branch"]
    list_filter = ["status", "branch", "course"]
    search_fields = ["name", "room"]


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ["full_name", "phone", "group", "branch", "status", "enrollment_date"]
    list_filter = ["status", "branch", "group"]
    search_fields = ["first_name", "last_name", "phone", "parent_phone"]
    date_hierarchy = "enrollment_date"


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ["group", "date", "start_time", "end_time", "room", "canceled"]
    list_filter = ["canceled", "group__branch"]
    date_hierarchy = "date"


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ["student", "lesson", "status", "marked_by"]
    list_filter = ["status"]
    search_fields = ["student__first_name", "student__last_name"]


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ["name", "group", "date", "max_score", "status"]
    list_filter = ["status", "group__branch"]
    search_fields = ["name"]


@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = ["student", "exam", "score"]
    search_fields = ["student__first_name", "student__last_name", "exam__name"]
