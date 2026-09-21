from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Q
from apps.meetings.models import Meeting
from apps.meetings.utils import auto_update_meeting_statuses
from apps.actions.models import ActionItem
from apps.decisions.models import Decision

class DashboardAnalyticsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        try:
            auto_update_meeting_statuses()
            today = timezone.localdate()
            user = request.user
            period = request.query_params.get('period', 'all_time').lower()
            search_query = request.query_params.get('search', '').strip()

            # Filter meetings and actions based on role hierarchy
            if user.is_admin_role:
                meetings_qs = Meeting.objects.all()
                actions_qs = ActionItem.objects.all()
            elif user.is_manager_role:
                meetings_qs = Meeting.objects.filter(
                    Q(created_by=user) | Q(participants=user) | Q(team__members=user)
                ).distinct()
                actions_qs = ActionItem.objects.filter(
                    Q(assigned_to=user) | Q(created_by=user) |
                    Q(decision__discussion__meeting__created_by=user) |
                    Q(decision__discussion__meeting__team__members=user)
                ).distinct()
            else:
                # MEMBER role: strictly personal metrics
                meetings_qs = Meeting.objects.filter(
                    Q(created_by=user) | Q(participants=user) | Q(team__members=user)
                ).distinct()
                actions_qs = ActionItem.objects.filter(
                    Q(assigned_to=user) | Q(created_by=user)
                ).distinct()

            # Apply time period filter
            if period == 'yesterday':
                y_date = today - timedelta(days=1)
                meetings_qs = meetings_qs.filter(meeting_date=y_date)
                actions_qs = actions_qs.filter(Q(due_date=y_date) | Q(created_at__date=y_date))
            elif period in ['last_7_days', 'past_week']:
                start_date = today - timedelta(days=7)
                meetings_qs = meetings_qs.filter(meeting_date__gte=start_date, meeting_date__lte=today)
                actions_qs = actions_qs.filter(Q(due_date__gte=start_date, due_date__lte=today) | Q(created_at__date__gte=start_date, created_at__date__lte=today))
            elif period in ['last_30_days', '30_days', 'past_month']:
                start_date = today - timedelta(days=30)
                meetings_qs = meetings_qs.filter(meeting_date__gte=start_date, meeting_date__lte=today)
                actions_qs = actions_qs.filter(Q(due_date__gte=start_date, due_date__lte=today) | Q(created_at__date__gte=start_date, created_at__date__lte=today))
            elif period == 'last_week':
                start_of_this_week = today - timedelta(days=today.weekday())
                start_of_last_week = start_of_this_week - timedelta(days=7)
                end_of_last_week = start_of_this_week - timedelta(days=1)
                meetings_qs = meetings_qs.filter(meeting_date__gte=start_of_last_week, meeting_date__lte=end_of_last_week)
                actions_qs = actions_qs.filter(Q(due_date__gte=start_of_last_week, due_date__lte=end_of_last_week) | Q(created_at__date__gte=start_of_last_week, created_at__date__lte=end_of_last_week))
            elif period == 'last_month':
                first_of_this_month = today.replace(day=1)
                last_day_of_last_month = first_of_this_month - timedelta(days=1)
                first_of_last_month = last_day_of_last_month.replace(day=1)
                meetings_qs = meetings_qs.filter(meeting_date__gte=first_of_last_month, meeting_date__lte=last_day_of_last_month)
                actions_qs = actions_qs.filter(Q(due_date__gte=first_of_last_month, due_date__lte=last_day_of_last_month) | Q(created_at__date__gte=first_of_last_month, created_at__date__lte=last_day_of_last_month))
            elif period in ['last_year', 'past_year']:
                start_date = today - timedelta(days=365)
                meetings_qs = meetings_qs.filter(meeting_date__gte=start_date, meeting_date__lte=today)
                actions_qs = actions_qs.filter(Q(due_date__gte=start_date, due_date__lte=today) | Q(created_at__date__gte=start_date, created_at__date__lte=today))
            elif period == 'custom':
                start_date_param = request.query_params.get('start_date')
                end_date_param = request.query_params.get('end_date')
                if start_date_param:
                    meetings_qs = meetings_qs.filter(meeting_date__gte=start_date_param)
                    actions_qs = actions_qs.filter(Q(due_date__gte=start_date_param) | Q(created_at__date__gte=start_date_param))
                if end_date_param:
                    meetings_qs = meetings_qs.filter(meeting_date__lte=end_date_param)
                    actions_qs = actions_qs.filter(Q(due_date__lte=end_date_param) | Q(created_at__date__lte=end_date_param))


            # Apply global search query filter
            if search_query:
                meetings_qs = meetings_qs.filter(
                    Q(title__icontains=search_query) | Q(description__icontains=search_query) | Q(location__icontains=search_query)
                )
                actions_qs = actions_qs.filter(
                    Q(title__icontains=search_query) | Q(description__icontains=search_query)
                )

            total_meetings = meetings_qs.count()
            upcoming_meetings = meetings_qs.filter(
                meeting_date__gte=today
            ).exclude(
                Q(status__iexact=Meeting.Status.COMPLETED) | Q(status__iexact=Meeting.Status.CANCELLED)
            ).count()

            open_actions = actions_qs.filter(
                Q(status__iexact=ActionItem.Status.TODO) |
                Q(status__iexact=ActionItem.Status.IN_PROGRESS) |
                Q(status__iexact=ActionItem.Status.BLOCKED)
            ).count()
            
            completed_actions = actions_qs.filter(
                status__iexact=ActionItem.Status.COMPLETED
            ).count()
            
            overdue_actions = actions_qs.filter(
                due_date__lt=today
            ).exclude(
                Q(status__iexact=ActionItem.Status.COMPLETED) | Q(status__iexact=ActionItem.Status.CANCELLED)
            ).count()
            
            critical_actions = actions_qs.filter(
                priority__iexact=ActionItem.Priority.CRITICAL
            ).exclude(
                Q(status__iexact=ActionItem.Status.COMPLETED) | Q(status__iexact=ActionItem.Status.CANCELLED)
            ).count()

            # Status distribution
            status_counts = actions_qs.values('status').annotate(count=Count('id', distinct=True))
            status_distribution = {item['status'].upper(): item['count'] for item in status_counts if item['status']}

            # Priority distribution
            priority_counts = actions_qs.values('priority').annotate(count=Count('id', distinct=True))
            priority_distribution = {item['priority'].upper(): item['count'] for item in priority_counts if item['priority']}

            # Meeting Activity over time (grouped by date, last 90 meeting dates sorted chronologically)
            recent_activity = list(meetings_qs.values('meeting_date').annotate(count=Count('id', distinct=True)).order_by('-meeting_date')[:90])
            meeting_activity = [
                {
                    'meeting_date': item['meeting_date'].strftime('%Y-%m-%d') if hasattr(item['meeting_date'], 'strftime') else str(item['meeting_date']),
                    'count': item['count']
                } for item in reversed(recent_activity) if item.get('meeting_date')
            ]

            # Recent Overdue List for Quick Action
            overdue_items = actions_qs.filter(
                due_date__lt=today
            ).exclude(
                Q(status__iexact=ActionItem.Status.COMPLETED) | Q(status__iexact=ActionItem.Status.CANCELLED)
            ).select_related('assigned_to')[:5]

            overdue_list = [
                {
                    'id': item.id,
                    'title': item.title,
                    'due_date': item.due_date.strftime('%Y-%m-%d') if hasattr(item.due_date, 'strftime') else str(item.due_date),
                    'priority': item.priority,
                    'status': item.status,
                    'assigned_to': (item.assigned_to.get_full_name() or item.assigned_to.username) if item.assigned_to else 'Unassigned'
                } for item in overdue_items
            ]

            return Response({
                'period': period,
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
                'meeting_activity': meeting_activity,
                'overdue_list': overdue_list
            })
        except Exception as e:
            return Response({'detail': f"Analytics query error: {str(e)}"}, status=500)


