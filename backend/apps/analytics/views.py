from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.utils import timezone
from datetime import timedelta, date
from django.db.models import Count, Q
from apps.meetings.models import Meeting
from apps.meetings.utils import auto_update_meeting_statuses
from apps.actions.models import ActionItem

class DashboardAnalyticsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        try:
            auto_update_meeting_statuses()
            today = timezone.localdate()
            user = request.user
            period = request.query_params.get('period', 'today').lower()
            search_query = request.query_params.get('search', '').strip()
            activity_period_param = (
                request.query_params.get('activity_period') or
                request.query_params.get('activity_days') or
                request.query_params.get('meeting_activity_period') or
                request.query_params.get('meeting_activity_days') or
                request.query_params.get('meeting_activity') or
                '30d'
            ).lower().strip()

            # Filter meetings and actions based on role hierarchy
            try:
                if user.is_admin_role:
                    base_meetings_qs = Meeting.objects.all()
                    base_actions_qs = ActionItem.objects.all()
                elif user.is_manager_role:
                    base_meetings_qs = Meeting.objects.filter(
                        Q(created_by=user) | Q(participants=user) | Q(team__members=user)
                    ).distinct()
                    base_actions_qs = ActionItem.objects.filter(
                        Q(assigned_to=user) | Q(created_by=user) |
                        Q(decision__discussion__meeting__created_by=user) |
                        Q(decision__discussion__meeting__team__members=user)
                    ).distinct()
                else:
                    # MEMBER role: strictly personal metrics
                    base_meetings_qs = Meeting.objects.filter(
                        Q(created_by=user) | Q(participants=user) | Q(team__members=user)
                    ).distinct()
                    base_actions_qs = ActionItem.objects.filter(
                        Q(assigned_to=user) | Q(created_by=user)
                    ).distinct()
                # Test query execution to ensure assigned_to table exists
                _ = base_actions_qs.count()
            except Exception:
                # Fallback if assigned_to ManyToMany table has not been migrated yet in DB
                if user.is_admin_role:
                    base_meetings_qs = Meeting.objects.all()
                    base_actions_qs = ActionItem.objects.all()
                else:
                    base_meetings_qs = Meeting.objects.filter(
                        Q(created_by=user) | Q(participants=user) | Q(team__members=user)
                    ).distinct()
                    base_actions_qs = ActionItem.objects.filter(created_by=user).distinct()

            meetings_qs = base_meetings_qs
            actions_qs = base_actions_qs

            # Apply time period filter to overall dashboard metrics (only if no active search_query is provided)
            if not search_query:
                if period in ['today', 'this_day']:
                    meetings_qs = meetings_qs.filter(meeting_date=today)
                    actions_qs = actions_qs.filter(Q(due_date=today) | Q(created_at__date=today))
                elif period == 'yesterday':
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
                    last_year_val = today.year - 1
                    start_of_last_year = date(last_year_val, 1, 1)
                    end_of_last_year = date(last_year_val, 12, 31)
                    meetings_qs = meetings_qs.filter(meeting_date__gte=start_of_last_year, meeting_date__lte=end_of_last_year)
                    actions_qs = actions_qs.filter(Q(due_date__gte=start_of_last_year, due_date__lte=end_of_last_year) | Q(created_at__date__gte=start_of_last_year, created_at__date__lte=end_of_last_year))
                elif period == 'custom':
                    start_date_param = request.query_params.get('start_date')
                    end_date_param = request.query_params.get('end_date')
                    if start_date_param and end_date_param:
                        meetings_qs = meetings_qs.filter(meeting_date__gte=start_date_param, meeting_date__lte=end_date_param)
                        actions_qs = actions_qs.filter(
                            Q(due_date__gte=start_date_param, due_date__lte=end_date_param) |
                            Q(created_at__date__gte=start_date_param, created_at__date__lte=end_date_param)
                        )
                    elif start_date_param:
                        meetings_qs = meetings_qs.filter(meeting_date__gte=start_date_param)
                        actions_qs = actions_qs.filter(Q(due_date__gte=start_date_param) | Q(created_at__date__gte=start_date_param))
                    elif end_date_param:
                        meetings_qs = meetings_qs.filter(meeting_date__lte=end_date_param)
                        actions_qs = actions_qs.filter(Q(due_date__lte=end_date_param) | Q(created_at__date__lte=end_date_param))
                    else:
                        # Custom range selected without dates: return empty queryset to avoid showing misleading all-time metrics
                        meetings_qs = meetings_qs.none()
                        actions_qs = actions_qs.none()
                elif period in ['all', 'all_time', 'alltime']:
                    # All-time metrics: no date boundaries applied
                    pass

            # Apply global search query filter across meetings, discussions, decisions, and action items
            if search_query:
                meeting_search_q = (
                    Q(title__icontains=search_query) |
                    Q(description__icontains=search_query) |
                    Q(location__icontains=search_query) |
                    Q(discussions__title__icontains=search_query) |
                    Q(discussions__description__icontains=search_query) |
                    Q(discussions__decision__decision__icontains=search_query)
                )
                base_meetings_qs = base_meetings_qs.filter(meeting_search_q).distinct()
                meetings_qs = meetings_qs.filter(meeting_search_q).distinct()

                action_search_q = (
                    Q(title__icontains=search_query) |
                    Q(description__icontains=search_query) |
                    Q(completion_notes__icontains=search_query) |
                    Q(decision__decision__icontains=search_query) |
                    Q(decision__discussion__title__icontains=search_query) |
                    Q(decision__discussion__description__icontains=search_query)
                )
                base_actions_qs = base_actions_qs.filter(action_search_q).distinct()
                actions_qs = actions_qs.filter(action_search_q).distinct()

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

            # Meeting Activity filtering (Today, Yesterday, 7D, 14D, 30D, Last Week, Last Month, Last Year, All)
            activity_qs = base_meetings_qs
            if activity_period_param in ['today', 'this_day'] or (period in ['today', 'this_day'] and activity_period_param in ['today', '7d', '30d']):
                activity_period_clean = 'today'
                activity_qs = activity_qs.filter(meeting_date=today)
            elif activity_period_param == 'yesterday' or (period == 'yesterday' and activity_period_param in ['yesterday', '7d', '30d']):
                activity_period_clean = 'yesterday'
                y_date = today - timedelta(days=1)
                activity_qs = activity_qs.filter(meeting_date=y_date)
            elif activity_period_param == 'last_week' or (period == 'last_week' and activity_period_param in ['7d', 'last_week']):
                activity_period_clean = 'last_week'
                start_of_this_week = today - timedelta(days=today.weekday())
                activity_start_date = start_of_this_week - timedelta(days=7)
                activity_end_date = start_of_this_week - timedelta(days=1)
                activity_qs = activity_qs.filter(meeting_date__gte=activity_start_date, meeting_date__lte=activity_end_date)
            elif activity_period_param == 'last_month' or (period == 'last_month' and activity_period_param in ['30d', 'last_month']):
                activity_period_clean = 'last_month'
                first_of_this_month = today.replace(day=1)
                activity_end_date = first_of_this_month - timedelta(days=1)
                activity_start_date = activity_end_date.replace(day=1)
                activity_qs = activity_qs.filter(meeting_date__gte=activity_start_date, meeting_date__lte=activity_end_date)
            elif activity_period_param in ['last_year', 'past_year', '365d', '1y'] or (period in ['last_year', 'past_year'] and activity_period_param in ['30d', 'last_year', 'all']):
                activity_period_clean = 'last_year'
                activity_start_date = today - timedelta(days=365)
                activity_qs = activity_qs.filter(meeting_date__gte=activity_start_date, meeting_date__lte=today)
            elif activity_period_param in ['7d', '7', 'last_7_days']:
                activity_period_clean = '7d'
                activity_start_date = today - timedelta(days=6)
                activity_qs = activity_qs.filter(meeting_date__gte=activity_start_date, meeting_date__lte=today)
            elif activity_period_param in ['14d', '14', 'last_14_days']:
                activity_period_clean = '14d'
                activity_start_date = today - timedelta(days=13)
                activity_qs = activity_qs.filter(meeting_date__gte=activity_start_date, meeting_date__lte=today)
            elif activity_period_param in ['30d', '30', 'last_30_days', '30_days']:
                activity_period_clean = '30d'
                activity_start_date = today - timedelta(days=29)
                activity_qs = activity_qs.filter(meeting_date__gte=activity_start_date, meeting_date__lte=today)
            else:
                activity_period_clean = 'all'

            recent_activity = list(activity_qs.values('meeting_date').annotate(count=Count('id', distinct=True)).order_by('-meeting_date'))
            meeting_activity = [
                {
                    'meeting_date': item['meeting_date'].strftime('%Y-%m-%d') if hasattr(item['meeting_date'], 'strftime') else str(item['meeting_date']),
                    'count': item['count']
                } for item in reversed(recent_activity) if item.get('meeting_date')
            ]

            # Urgent & Overdue Action lists for Needs Attention widget
            target_actions_qs = base_actions_qs.filter(
                Q(title__icontains=search_query) | Q(description__icontains=search_query)
            ) if search_query else base_actions_qs

            try:
                urgent_items = list(target_actions_qs.filter(
                    Q(due_date__lt=today) |
                    Q(priority__iexact=ActionItem.Priority.CRITICAL) |
                    Q(priority__iexact=ActionItem.Priority.HIGH)
                ).exclude(
                    Q(status__iexact=ActionItem.Status.COMPLETED) | Q(status__iexact=ActionItem.Status.CANCELLED)
                ).select_related('created_by', 'decision__discussion__meeting').prefetch_related('assigned_to').order_by('due_date', '-priority')[:30])
            except Exception:
                urgent_items = list(target_actions_qs.filter(
                    Q(due_date__lt=today) |
                    Q(priority__iexact=ActionItem.Priority.CRITICAL) |
                    Q(priority__iexact=ActionItem.Priority.HIGH)
                ).exclude(
                    Q(status__iexact=ActionItem.Status.COMPLETED) | Q(status__iexact=ActionItem.Status.CANCELLED)
                ).order_by('due_date', '-priority')[:30])

            def serialize_action(item):
                try:
                    assigned_users = list(item.assigned_to.all())
                except Exception:
                    assigned_users = []

                if not assigned_users:
                    fallback_user = getattr(item, 'created_by', None) or user
                    if fallback_user and getattr(fallback_user, 'id', None):
                        try:
                            item.assigned_to.add(fallback_user)
                            assigned_users = [fallback_user]
                        except Exception:
                            assigned_users = [fallback_user]

                if assigned_users:
                    assigned_name = ', '.join([u.get_full_name() or u.username for u in assigned_users])
                    assigned_detail = [
                        {'id': u.id, 'full_name': u.get_full_name() or u.username, 'username': u.username}
                        for u in assigned_users
                    ]
                    assigned_ids = [u.id for u in assigned_users]
                else:
                    fallback_name = user.get_full_name() or user.username if user else 'Assigned Member'
                    assigned_name = fallback_name
                    assigned_detail = [{'id': user.id, 'full_name': fallback_name, 'username': user.username}] if user else []
                    assigned_ids = [user.id] if user else []

                meeting_id = None
                meeting_title = None
                try:
                    if hasattr(item, 'decision') and item.decision:
                        discussion = getattr(item.decision, 'discussion', None)
                        if discussion:
                            meeting = getattr(discussion, 'meeting', None)
                            if meeting:
                                meeting_id = meeting.id
                                meeting_title = meeting.title
                except Exception:
                    pass

                return {
                    'id': item.id,
                    'title': item.title,
                    'description': item.description or '',
                    'due_date': item.due_date.strftime('%Y-%m-%d') if (item.due_date and hasattr(item.due_date, 'strftime')) else str(item.due_date) if item.due_date else None,
                    'priority': item.priority,
                    'status': item.status,
                    'assigned_to': assigned_ids,
                    'assigned_to_name': assigned_name,
                    'assigned_to_detail': assigned_detail,
                    'meeting_id': meeting_id,
                    'meeting_title': meeting_title,
                    'created_at': item.created_at.strftime('%Y-%m-%d') if hasattr(item.created_at, 'strftime') else str(item.created_at)
                }

            urgent_list = [serialize_action(item) for item in urgent_items]

            try:
                overdue_items = list(target_actions_qs.filter(
                    due_date__lt=today
                ).exclude(
                    Q(status__iexact=ActionItem.Status.COMPLETED) | Q(status__iexact=ActionItem.Status.CANCELLED)
                ).select_related('created_by', 'decision__discussion__meeting').prefetch_related('assigned_to').order_by('due_date')[:15])
            except Exception:
                overdue_items = list(target_actions_qs.filter(
                    due_date__lt=today
                ).exclude(
                    Q(status__iexact=ActionItem.Status.COMPLETED) | Q(status__iexact=ActionItem.Status.CANCELLED)
                ).order_by('due_date')[:15])

            overdue_list = [serialize_action(item) for item in overdue_items]

            return Response({
                'period': period,
                'activity_period': activity_period_clean,
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
                'overdue_list': overdue_list,
                'urgent_list': urgent_list,
            })
        except Exception as e:
            return Response({'detail': f"Analytics query error: {str(e)}"}, status=500)


