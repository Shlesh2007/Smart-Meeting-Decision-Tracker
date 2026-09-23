from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from .models import Notification
from .serializers import NotificationSerializer
from apps.actions.models import ActionItem
from apps.meetings.models import Meeting
from apps.meetings.utils import auto_update_meeting_statuses

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        self._sync_user_notifications(request.user)
        return super().list(request, *args, **kwargs)

    def _sync_user_notifications(self, user):
        auto_update_meeting_statuses()
        today = timezone.localdate()

        if user.is_admin_role:
            actions_qs = ActionItem.objects.all()
            meetings_qs = Meeting.objects.all()
        elif user.is_manager_role:
            actions_qs = ActionItem.objects.filter(
                Q(assigned_to=user) | Q(created_by=user) |
                Q(decision__discussion__meeting__created_by=user) |
                Q(decision__discussion__meeting__team__members=user)
            ).distinct()
            meetings_qs = Meeting.objects.filter(
                Q(created_by=user) | Q(participants=user) | Q(team__members=user)
            ).distinct()
        else:
            actions_qs = ActionItem.objects.filter(
                Q(assigned_to=user) | Q(created_by=user)
            ).distinct()
            meetings_qs = Meeting.objects.filter(
                Q(created_by=user) | Q(participants=user) | Q(team__members=user)
            ).distinct()

        # Sync Overdue Actions
        overdue_items = actions_qs.filter(
            due_date__lt=today
        ).exclude(
            Q(status__iexact=ActionItem.Status.COMPLETED) | Q(status__iexact=ActionItem.Status.CANCELLED)
        ).select_related('assigned_to')[:5]

        for item in overdue_items:
            source_id = f"overdue-{item.id}"
            assigned_name = (item.assigned_to.get_full_name() or item.assigned_to.username) if item.assigned_to else 'Unassigned'
            due_str = item.due_date.strftime('%Y-%m-%d') if hasattr(item.due_date, 'strftime') else str(item.due_date)
            
            Notification.objects.get_or_create(
                user=user,
                source_id=source_id,
                defaults={
                    'title': f"Overdue Action: {item.title}",
                    'subtitle': f"Assigned to {assigned_name} • Due {due_str}",
                    'link': '/my-actions?tab=OVERDUE',
                    'notification_type': Notification.NotificationType.OVERDUE,
                    'is_read': False
                }
            )

        # Sync Critical Actions Summary
        critical_count = actions_qs.filter(
            priority__iexact=ActionItem.Priority.CRITICAL
        ).exclude(
            Q(status__iexact=ActionItem.Status.COMPLETED) | Q(status__iexact=ActionItem.Status.CANCELLED)
        ).count()

        if critical_count > 0:
            source_id = f"critical-summary-{today}"
            Notification.objects.get_or_create(
                user=user,
                source_id=source_id,
                defaults={
                    'title': f"{critical_count} Critical Action Items",
                    'subtitle': 'High priority tasks requiring urgent resolution',
                    'link': '/my-actions?tab=CRITICAL',
                    'notification_type': Notification.NotificationType.CRITICAL,
                    'is_read': False
                }
            )

        # Sync Upcoming Meetings Summary
        upcoming_count = meetings_qs.filter(
            meeting_date__gte=today
        ).exclude(
            Q(status__iexact=Meeting.Status.COMPLETED) | Q(status__iexact=Meeting.Status.CANCELLED)
        ).count()

        if upcoming_count > 0:
            source_id = f"upcoming-summary-{today}"
            Notification.objects.get_or_create(
                user=user,
                source_id=source_id,
                defaults={
                    'title': f"{upcoming_count} Upcoming Meetings",
                    'subtitle': 'Scheduled sessions pending completion',
                    'link': '/meetings',
                    'notification_type': Notification.NotificationType.UPCOMING,
                    'is_read': False
                }
            )

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'message': 'All notifications marked as read.'}, status=status.HTTP_200_OK)
