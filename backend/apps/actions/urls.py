from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ActionItemViewSet

router = DefaultRouter()
router.register('', ActionItemViewSet, basename='action')

urlpatterns = [
    path('', include(router.urls)),
]
