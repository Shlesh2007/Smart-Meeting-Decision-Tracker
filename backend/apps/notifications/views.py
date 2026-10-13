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
        try:
            self._sync_user_notifications(request.user)
        except Exception as e:
            pass
        return super().list(request, *args, **kwargs)

    def _sync_user_notifications(self, user):
        try:
            auto_update_meeting_statuses()
        except Exception:
            pass
        today = timezone.localdate()

        try:
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
            _ = actions_qs.count()
        except Exception:
            if user.is_admin_role:
                actions_qs = ActionItem.objects.all()
                meetings_qs = Meeting.objects.all()
            else:
                actions_qs = ActionItem.objects.filter(created_by=user).distinct()
                meetings_qs = Meeting.objects.filter(
                    Q(created_by=user) | Q(participants=user) | Q(team__members=user)
                ).distinct()

        # Sync Overdue Actions
        try:
            overdue_items = list(actions_qs.filter(
                due_date__lt=today
            ).exclude(
                Q(status__iexact=ActionItem.Status.COMPLETED) | Q(status__iexact=ActionItem.Status.CANCELLED)
            ).prefetch_related('assigned_to')[:5])
        except Exception:
            overdue_items = list(actions_qs.filter(
                due_date__lt=today
            ).exclude(
                Q(status__iexact=ActionItem.Status.COMPLETED) | Q(status__iexact=ActionItem.Status.CANCELLED)
            )[:5])

        for item in overdue_items:
            source_id = f"overdue-{item.id}"
            try:
                assigned_users = list(item.assigned_to.all())
                assigned_name = ', '.join([u.get_full_name() or u.username for u in assigned_users]) if assigned_users else 'Unassigned'
            except Exception:
                assigned_name = 'Unassigned'

            due_str = item.due_date.strftime('%Y-%m-%d') if hasattr(item.due_date, 'strftime') else str(item.due_date)
            
            target_link = f"/my-actions?action_id={item.id}"
            notif, created = Notification.objects.get_or_create(
                user=user,
                source_id=source_id,
                defaults={
                    'title': f"Overdue Action: {item.title}",
                    'subtitle': f"Assigned to {assigned_name} • Due {due_str}",
                    'link': target_link,
                    'notification_type': Notification.NotificationType.OVERDUE,
                    'is_read': False
                }
            )
            if not created and notif.link != target_link:
                notif.link = target_link
                notif.save(update_fields=['link'])

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
        # Mark stale notifications as read for already-approved or already-rejected requests
        try:
            from apps.authentication.models import OrganizationJoinRequest, OrganizationLeaveRequest, DepartmentChangeRequest

            # Mark join request notifications whose request is no longer PENDING as read
            pending_join_ids = set(OrganizationJoinRequest.objects.filter(status=OrganizationJoinRequest.Status.PENDING).values_list('id', flat=True))
            for jn in Notification.objects.filter(user=user, source_id__startswith="join-request-", is_read=False):
                try:
                    r_id = int(jn.source_id.split("join-request-")[1])
                    if r_id not in pending_join_ids:
                        jn.is_read = True
                        jn.save(update_fields=['is_read'])
                except Exception:
                    pass

            # Mark leave request notifications whose request is no longer PENDING as read
            pending_leave_ids = set(OrganizationLeaveRequest.objects.filter(status=OrganizationLeaveRequest.Status.PENDING).values_list('id', flat=True))
            for ln in Notification.objects.filter(user=user, source_id__startswith="leave-request-", is_read=False):
                try:
                    r_id = int(ln.source_id.split("leave-request-")[1])
                    if r_id not in pending_leave_ids:
                        ln.is_read = True
                        ln.save(update_fields=['is_read'])
                except Exception:
                    pass

            # Mark dept request notifications whose request is no longer PENDING as read
            pending_dept_ids = set(DepartmentChangeRequest.objects.filter(status=DepartmentChangeRequest.Status.PENDING).values_list('id', flat=True))
            for dn in Notification.objects.filter(user=user, source_id__startswith="dept-request-", is_read=False):
                try:
                    r_id = int(dn.source_id.split("dept-request-")[1])
                    if r_id not in pending_dept_ids:
                        dn.is_read = True
                        dn.save(update_fields=['is_read'])
                except Exception:
                    pass
        except Exception:
            pass

        # Sync Pending Organization Join & Leave Requests for Admins/Owners
        if user.is_admin_role or user.is_manager_role:
            try:
                from apps.authentication.models import OrganizationJoinRequest, OrganizationLeaveRequest
                from apps.authentication.views import get_user_active_organization
                user_org = get_user_active_organization(user)
                if user_org:
                    org_filter = Q(organization=user_org) | Q(organization_name__iexact=user_org.name)
                    if user_org.owner and user_org.owner.organization_name:
                        org_filter |= Q(organization_name__iexact=user_org.owner.organization_name)
                    pending_join_reqs = OrganizationJoinRequest.objects.filter(
                        org_filter,
                        status=OrganizationJoinRequest.Status.PENDING
                    ).select_related('user')

                    for req in pending_join_reqs:
                        req_user_name = req.user.get_full_name() or req.user.username if req.user else 'A member'
                        source_id = f"join-request-{req.id}"
                        target_link = '/admin?tab=organization_join_requests'
                        notif, created = Notification.objects.get_or_create(
                            user=user,
                            source_id=source_id,
                            defaults={
                                'title': f"New Join Request: {req_user_name}",
                                'subtitle': f"Requested {req.requested_department} in {req.organization_name}",
                                'link': target_link,
                                'notification_type': Notification.NotificationType.GENERAL,
                                'is_read': False
                            }
                        )
                        if not created and notif.link != target_link:
                            notif.link = target_link
                            notif.save(update_fields=['link'])

                    pending_leave_reqs = OrganizationLeaveRequest.objects.filter(
                        org_filter,
                        status=OrganizationLeaveRequest.Status.PENDING
                    ).select_related('user')

                    for req in pending_leave_reqs:
                        if req.user_id != user.id:
                            req_user_name = req.user.get_full_name() or req.user.username if req.user else 'A member'
                            source_id = f"leave-request-{req.id}"
                            target_link = '/admin?tab=leave_requests'
                            notif, created = Notification.objects.get_or_create(
                                user=user,
                                source_id=source_id,
                                defaults={
                                    'title': f"Leave Request: {req_user_name}",
                                    'subtitle': f"Requested to leave {req.organization_name}",
                                    'link': target_link,
                                    'notification_type': Notification.NotificationType.GENERAL,
                                    'is_read': False
                                }
                            )
                            if not created and notif.link != target_link:
                                notif.link = target_link
                                notif.save(update_fields=['link'])
            except Exception:
                pass

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'message': 'All notifications marked as read.'}, status=status.HTTP_200_OK)
