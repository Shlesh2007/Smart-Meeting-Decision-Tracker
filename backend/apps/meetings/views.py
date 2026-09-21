from rest_framework import viewsets, permissions, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
import django_filters
from django.db.models import Q
from datetime import date
import random
import logging

from .models import Meeting
from .serializers import MeetingSerializer
from .utils import auto_update_meeting_statuses
from apps.authentication.permissions import IsAdminOrReadOnly
from smart_meeting_tracker.email_utils import send_brevo_transactional_email, build_meeting_email_html

logger = logging.getLogger(__name__)


class MeetingFilter(django_filters.FilterSet):
    start_date = django_filters.DateFilter(field_name='meeting_date', lookup_expr='gte')
    end_date = django_filters.DateFilter(field_name='meeting_date', lookup_expr='lte')
    meeting_type = django_filters.CharFilter(field_name='meeting_type')
    status = django_filters.CharFilter(field_name='status')
    is_recurring = django_filters.BooleanFilter(field_name='is_recurring')
    recurrence_group_id = django_filters.CharFilter(field_name='recurrence_group_id')

    class Meta:
        model = Meeting
        fields = ['status', 'meeting_type', 'start_date', 'end_date', 'team', 'is_recurring', 'recurrence_group_id']


from smart_meeting_tracker.filters import ExactPhraseSearchFilter

class MeetingViewSet(viewsets.ModelViewSet):
    queryset = Meeting.objects.all().prefetch_related('participants', 'discussions').order_by('-meeting_date', '-start_time')
    serializer_class = MeetingSerializer
    permission_classes = (permissions.IsAuthenticated,)
    filter_backends = (DjangoFilterBackend, ExactPhraseSearchFilter, filters.OrderingFilter)
    filterset_class = MeetingFilter
    search_fields = ('title', 'description', 'location')
    ordering_fields = ('meeting_date', 'created_at', 'title')

    def get_queryset(self):
        # Auto-update meeting statuses based on current date & time window
        auto_update_meeting_statuses()

        user = self.request.user
        # Admins can view ALL meetings across the organization
        if user.is_admin_role:
            return Meeting.objects.all().select_related('created_by', 'team').prefetch_related('participants', 'discussions')
        
        # Members can ONLY view meetings they created, are invited participants of, or belong to their assigned Team
        return Meeting.objects.filter(
            Q(created_by=user) | Q(participants=user) | Q(team__members=user)
        ).distinct().select_related('created_by', 'team').prefetch_related('participants', 'discussions')

    def perform_create(self, serializer):
        meeting = serializer.save(created_by=self.request.user, status=Meeting.Status.SCHEDULED)
        
        # Automatically dispatch meeting invitation email with Google Meet link & entry OTP code
        recipients = list(set([p.email for p in meeting.participants.all() if p.email] + ([meeting.created_by.email] if meeting.created_by.email else [])))
        if recipients:
            try:
                otp_code = f"{random.randint(100000, 999999)}"
                subject = f"📅 Meeting Invitation: {meeting.title}"
                text_body = (
                    f"Hello,\n\n"
                    f"You have been invited to a new meeting on SmartMeeting Decision Tracker:\n\n"
                    f"  Title: {meeting.title}\n"
                    f"  Date: {meeting.meeting_date}\n"
                    f"  Time: {meeting.start_time} - {meeting.end_time}\n"
                    f"  Location / Meet Link: {meeting.location or 'Online'}\n"
                    f"  Organizer: {meeting.created_by.get_full_name() or meeting.created_by.username}\n\n"
                    f"  Participant Entry OTP Code: {otp_code}\n\n"
                    f"Agenda / Description:\n{meeting.description or 'No description provided.'}\n\n"
                    f"Best regards,\nSmartMeeting Tracker Team"
                )
                html_body = build_meeting_email_html(meeting, otp_code=otp_code, title_prefix="New Meeting Invitation")
                send_brevo_transactional_email(subject, recipients, text_body, html_body)
            except Exception as email_err:
                logger.error(f"Failed to dispatch meeting invitation email: {email_err}")

    def perform_update(self, serializer):
        meeting = self.get_object()
        user = self.request.user

        # Prevent modifying meeting details when meeting is IN_PROGRESS, COMPLETED, or CANCELLED
        updated_fields = set(serializer.validated_data.keys())
        is_only_status_update = updated_fields == {'status'} or updated_fields == set()

        if not user.is_admin_role and meeting.status != Meeting.Status.SCHEDULED and not is_only_status_update:
            raise permissions.PermissionDenied(
                "Meeting details cannot be edited once the meeting is In Progress, Completed, or Cancelled."
            )
        
        # OWNER / ADMIN can update any meeting
        if user.is_admin_role:
            serializer.save()
            return

        # MANAGER can update meetings they created or team meetings they belong to
        if user.is_manager_role:
            if meeting.created_by == user or (meeting.team and meeting.team.members.filter(id=user.id).exists()):
                serializer.save()
                return

        # MEMBER can only update meetings they created
        if meeting.created_by != user:
            raise permissions.PermissionDenied("Only the meeting organizer, team manager, or an Admin/Owner can edit meeting details.")

        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if not user.is_admin_role and instance.created_by != user:
            raise permissions.PermissionDenied("Only the meeting organizer or an Admin/Owner can delete this meeting.")
        instance.delete()


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
        subject = f"🔑 Meeting Entry OTP Verification - {meeting.title}"
        text_body = (
            f"Hello,\n\n"
            f"You have received a verification OTP code for your upcoming meeting:\n\n"
            f"    Meeting: {meeting.title}\n"
            f"    Date: {meeting.meeting_date}\n"
            f"    Time: {meeting.start_time} - {meeting.end_time}\n"
            f"    Location: {meeting.location or 'Online'}\n\n"
            f"    Participant OTP Code: {otp_code}\n\n"
            f"Please present this OTP code to confirm your attendance.\n\n"
            f"Best regards,\nSmartMeeting Tracker Team"
        )
        html_body = build_meeting_email_html(meeting, otp_code=otp_code, title_prefix="Meeting Entry OTP Code")

        success, detail = send_brevo_transactional_email(subject, recipients, text_body, html_body)
        if not success:
            return Response({'error': f'Failed to deliver meeting OTP email: {detail}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'message': f'Meeting OTP code ({otp_code}) sent successfully to {len(recipients)} participant(s).',
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

        subject = f"⏰ Reminder: Upcoming Meeting - {meeting.title}"
        text_body = (
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
        html_body = build_meeting_email_html(meeting, title_prefix="Upcoming Meeting Reminder")

        success, detail = send_brevo_transactional_email(subject, recipients, text_body, html_body)
        if not success:
            return Response({'error': f'Failed to deliver meeting reminder email: {detail}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'message': f'Meeting reminder email sent successfully to {len(recipients)} participant(s).',
            'recipients': recipients
        }, status=status.HTTP_200_OK)
