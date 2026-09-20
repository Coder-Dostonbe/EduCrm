from django.urls import include, path
from rest_framework.routers import DefaultRouter

from accounts.employee_views import EmployeeViewSet

from .reports import ReportView
from .views import (
    AttendanceViewSet,
    BranchViewSet,
    CourseViewSet,
    DashboardView,
    ExamViewSet,
    GradeViewSet,
    GroupViewSet,
    LessonViewSet,
    StudentViewSet,
    TeacherViewSet,
)

router = DefaultRouter()
router.register("branches", BranchViewSet, basename="branch")
router.register("courses", CourseViewSet, basename="course")
router.register("teachers", TeacherViewSet, basename="teacher")
router.register("groups", GroupViewSet, basename="group")
router.register("students", StudentViewSet, basename="student")
router.register("lessons", LessonViewSet, basename="lesson")
router.register("attendance", AttendanceViewSet, basename="attendance")
router.register("exams", ExamViewSet, basename="exam")
router.register("grades", GradeViewSet, basename="grade")
router.register("employees", EmployeeViewSet, basename="employee")

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("reports/<str:report>/", ReportView.as_view(), name="report"),
    path("", include(router.urls)),
]
