from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MeetingViewSet, SendMeetingOTPView, SendMeetingReminderView, ValidateGoogleMeetUrlView

router = DefaultRouter()
router.register('', MeetingViewSet, basename='meeting')

urlpatterns = [
    path('validate-meet-url/', ValidateGoogleMeetUrlView.as_view(), name='validate_meet_url'),
    path('<int:pk>/send-otp/', SendMeetingOTPView.as_view(), name='meeting_send_otp'),
    path('<int:pk>/send-reminder/', SendMeetingReminderView.as_view(), name='meeting_send_reminder'),
    path('', include(router.urls)),
]

