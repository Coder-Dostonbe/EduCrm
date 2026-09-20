from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import InvoiceViewSet, PaymentViewSet, SalaryViewSet

router = DefaultRouter()
router.register("payments", PaymentViewSet, basename="payment")
router.register("debts", InvoiceViewSet, basename="invoice")
router.register("salaries", SalaryViewSet, basename="salary")

urlpatterns = [path("", include(router.urls))]
