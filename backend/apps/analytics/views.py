from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.utils import timezone
from django.db.models import Count, Q
from apps.meetings.models import Meeting
from apps.actions.models import ActionItem
from apps.decisions.models import Decision

class DashboardAnalyticsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        today = timezone.now().date()
        user = request.user

        # Filter meetings and actions based on role & participation
        if user.is_admin_role:
            meetings_qs = Meeting.objects.all()
            actions_qs = ActionItem.objects.all()
        else:
            meetings_qs = Meeting.objects.filter(
                Q(created_by=user) | Q(participants=user) | Q(team__members=user)
            ).distinct()
            actions_qs = ActionItem.objects.filter(
                Q(assigned_to=user) | Q(created_by=user) |
                Q(decision__discussion__meeting__participants=user) |
                Q(decision__discussion__meeting__created_by=user) |
                Q(decision__discussion__meeting__team__members=user)
            ).distinct()

        total_meetings = meetings_qs.count()
        upcoming_meetings = meetings_qs.filter(meeting_date__gte=today, status=Meeting.Status.SCHEDULED).count()

        open_actions = actions_qs.filter(status__in=[
            ActionItem.Status.TODO, ActionItem.Status.IN_PROGRESS, ActionItem.Status.BLOCKED
        ]).count()
        
        completed_actions = actions_qs.filter(status=ActionItem.Status.COMPLETED).count()
        
        overdue_actions = actions_qs.filter(
            due_date__lt=today
        ).exclude(status__in=[ActionItem.Status.COMPLETED, ActionItem.Status.CANCELLED]).count()
        
        critical_actions = actions_qs.filter(
            priority=ActionItem.Priority.CRITICAL
        ).exclude(status__in=[ActionItem.Status.COMPLETED, ActionItem.Status.CANCELLED]).count()

        # Status distribution
        status_counts = actions_qs.values('status').annotate(count=Count('id'))
        status_distribution = {item['status']: item['count'] for item in status_counts}

        # Priority distribution
        priority_counts = actions_qs.values('priority').annotate(count=Count('id'))
        priority_distribution = {item['priority']: item['count'] for item in priority_counts}

        # Meeting Activity over time (grouped by date)
        meeting_activity = meetings_qs.values('meeting_date').annotate(count=Count('id')).order_by('meeting_date')[:15]

        # Recent Overdue List for Quick Action
        overdue_items = actions_qs.filter(
            due_date__lt=today
        ).exclude(status__in=[ActionItem.Status.COMPLETED, ActionItem.Status.CANCELLED]).select_related('assigned_to')[:5]

        overdue_list = [
            {
                'id': item.id,
                'title': item.title,
                'due_date': item.due_date,
                'priority': item.priority,
                'status': item.status,
                'assigned_to': item.assigned_to.get_full_name() if item.assigned_to else 'Unassigned'
            } for item in overdue_items
        ]

        return Response({
            'metrics': {
                'total_meetings': total_meetings,
                'upcoming_meetings': upcoming_meetings,
                'open_actions': open_actions,
                'completed_actions': completed_actions,
                'overdue_actions': overdue_actions,
                'critical_actions': critical_actions,
            },
            'status_distribution': status_distribution,
            'priority_distribution': priority_distribution,
            'meeting_activity': list(meeting_activity),
            'overdue_list': overdue_list
        })
