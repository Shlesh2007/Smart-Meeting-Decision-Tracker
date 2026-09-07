from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MeetingViewSet, SendMeetingOTPView, SendMeetingReminderView

router = DefaultRouter()
router.register('', MeetingViewSet, basename='meeting')

urlpatterns = [
    path('<int:pk>/send-otp/', SendMeetingOTPView.as_view(), name='meeting_send_otp'),
    path('<int:pk>/send-reminder/', SendMeetingReminderView.as_view(), name='meeting_send_reminder'),
    path('', include(router.urls)),
]

