from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    LeadViewSet,
    MessageTemplateViewSet,
    NotificationViewSet,
    SentMessageViewSet,
)

router = DefaultRouter()
router.register("leads", LeadViewSet, basename="lead")
router.register("message-templates", MessageTemplateViewSet, basename="messagetemplate")
router.register("messages", SentMessageViewSet, basename="sentmessage")
router.register("notifications", NotificationViewSet, basename="notification")

urlpatterns = [path("", include(router.urls))]
