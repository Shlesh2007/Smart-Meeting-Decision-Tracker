from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
import django_filters
from django.db.models import Q
from .models import Meeting
from .serializers import MeetingSerializer
from apps.authentication.permissions import IsAdminOrReadOnly

class MeetingFilter(django_filters.FilterSet):
    start_date = django_filters.DateFilter(field_name='meeting_date', lookup_expr='gte')
    end_date = django_filters.DateFilter(field_name='meeting_date', lookup_expr='lte')
    meeting_type = django_filters.CharFilter(field_name='meeting_type')
    status = django_filters.CharFilter(field_name='status')

    class Meta:
        model = Meeting
        fields = ['status', 'meeting_type', 'start_date', 'end_date', 'team']

class MeetingViewSet(viewsets.ModelViewSet):
    queryset = Meeting.objects.all().prefetch_related('participants', 'discussions').order_by('-meeting_date', '-start_time')
    serializer_class = MeetingSerializer
    permission_classes = (permissions.IsAuthenticated,)
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_class = MeetingFilter
    search_fields = ('title', 'description', 'location')
    ordering_fields = ('meeting_date', 'created_at', 'title')

    def get_queryset(self):
        user = self.request.user
        # Admins can view ALL meetings across the organization
        if user.is_admin_role:
            return Meeting.objects.all().select_related('created_by', 'team').prefetch_related('participants', 'discussions')
        
        # Members can ONLY view meetings they created, are invited participants of, or belong to their assigned Team
        return Meeting.objects.filter(
            Q(created_by=user) | Q(participants=user) | Q(team__members=user)
        ).distinct().select_related('created_by', 'team').prefetch_related('participants', 'discussions')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        meeting = self.get_object()
        user = self.request.user
        if not user.is_admin_role and meeting.created_by != user:
            raise permissions.PermissionDenied("Only the meeting organizer or an Admin can edit meeting details.")
        serializer.save()


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.mail import send_mail
from django.conf import settings
from datetime import date
import random
import logging

logger = logging.getLogger(__name__)

class SendMeetingOTPView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, pk=None):
        try:
            meeting = Meeting.objects.get(pk=pk)
        except Meeting.DoesNotExist:
            return Response({'error': 'Meeting not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Check access permission
        if not request.user.is_admin_role and meeting.created_by != request.user and request.user not in meeting.participants.all():
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        # Check meeting status and date validation
        if meeting.status in ['COMPLETED', 'CANCELLED'] or meeting.meeting_date < date.today():
            return Response({'error': 'Cannot send OTP code for past or completed/cancelled meetings.'}, status=status.HTTP_400_BAD_REQUEST)

        recipients = [p.email for p in meeting.participants.all() if p.email]
        if not recipients and meeting.created_by.email:
            recipients = [meeting.created_by.email]

        if not recipients:
            return Response({'error': 'No participant email addresses available.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_code = f"{random.randint(100000, 999999)}"
        subject = f"Meeting Entry OTP Verification - {meeting.title}"
        body = (
            f"Hello,\n\n"
            f"You have received a verification OTP code for your upcoming meeting:\n\n"
            f"    Meeting: {meeting.title}\n"
            f"    Date: {meeting.meeting_date}\n"
            f"    Time: {meeting.start_time}\n"
            f"    Location: {meeting.location or 'Online'}\n\n"
            f"    Participant OTP Code: {otp_code}\n\n"
            f"Please present this OTP code to confirm your attendance.\n\n"
            f"Best regards,\nSmartMeeting Tracker Team"
        )

        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@smartmeetingtracker.com'),
                recipient_list=recipients,
                fail_silently=False,
            )
        except Exception as e:
            logger.error("Failed to send meeting OTP email: %s", str(e))

        return Response({
            'message': f'Meeting OTP code ({otp_code}) sent to {len(recipients)} participant(s).',
            'otp_code': otp_code,
            'recipients': recipients
        }, status=status.HTTP_200_OK)


class SendMeetingReminderView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, pk=None):
        try:
            meeting = Meeting.objects.get(pk=pk)
        except Meeting.DoesNotExist:
            return Response({'error': 'Meeting not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not request.user.is_admin_role and meeting.created_by != request.user and request.user not in meeting.participants.all():
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        # Check meeting status and date validation
        if meeting.status in ['COMPLETED', 'CANCELLED'] or meeting.meeting_date < date.today():
            return Response({'error': 'Cannot send reminder email for past or completed/cancelled meetings.'}, status=status.HTTP_400_BAD_REQUEST)

        recipients = [p.email for p in meeting.participants.all() if p.email]
        if not recipients and meeting.created_by.email:
            recipients = [meeting.created_by.email]

        if not recipients:
            return Response({'error': 'No participant email addresses available.'}, status=status.HTTP_400_BAD_REQUEST)

        subject = f"Reminder: Upcoming Meeting - {meeting.title}"
        body = (
            f"Hello,\n\n"
            f"This is a reminder for your upcoming meeting:\n\n"
            f"  Title: {meeting.title}\n"
            f"  Date: {meeting.meeting_date}\n"
            f"  Time: {meeting.start_time} - {meeting.end_time}\n"
            f"  Location: {meeting.location or 'N/A'}\n"
            f"  Status: {meeting.status}\n\n"
            f"Description / Agenda:\n{meeting.description or 'No description provided.'}\n\n"
            f"Please log in to SmartMeeting Tracker for more details.\n\n"
            f"Best regards,\nSmartMeeting Tracker Team"
        )

        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@smartmeetingtracker.com'),
                recipient_list=recipients,
                fail_silently=False,
            )
        except Exception as e:
            logger.error("Failed to send meeting reminder email: %s", str(e))

        return Response({
            'message': f'Meeting reminder email sent successfully to {len(recipients)} participant(s).',
            'recipients': recipients
        }, status=status.HTTP_200_OK)

