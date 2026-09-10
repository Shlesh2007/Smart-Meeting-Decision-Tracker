from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
import django_filters
from django.utils import timezone
from django.db.models import Q
from .models import ActionItem
from .serializers import ActionItemSerializer

class ActionItemFilter(django_filters.FilterSet):
    overdue = django_filters.BooleanFilter(method='filter_overdue')
    decision = django_filters.NumberFilter(field_name='decision')
    assigned_to = django_filters.NumberFilter(field_name='assigned_to')
    priority = django_filters.CharFilter(field_name='priority')
    status = django_filters.CharFilter(field_name='status')
    due_date_lte = django_filters.DateFilter(field_name='due_date', lookup_expr='lte')
    due_date_gte = django_filters.DateFilter(field_name='due_date', lookup_expr='gte')

    class Meta:
        model = ActionItem
        fields = ['decision', 'assigned_to', 'priority', 'status', 'overdue', 'due_date_lte', 'due_date_gte']

    def filter_overdue(self, queryset, name, value):
        if value:
            today = timezone.localdate()
            return queryset.filter(due_date__lt=today).exclude(
                Q(status__iexact=ActionItem.Status.COMPLETED) | Q(status__iexact=ActionItem.Status.CANCELLED)
            )
        return queryset

class ActionItemViewSet(viewsets.ModelViewSet):
    queryset = ActionItem.objects.all().select_related('assigned_to', 'created_by', 'decision').prefetch_related('dependencies')
    serializer_class = ActionItemSerializer
    permission_classes = (permissions.IsAuthenticated,)
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_class = ActionItemFilter
    search_fields = ('title', 'description')
    ordering_fields = ('due_date', 'priority', 'status', 'created_at')

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ActionItem.objects.none()

        # OWNER and ADMIN view all org action items
        if user.is_admin_role:
            return ActionItem.objects.all().select_related('assigned_to', 'created_by', 'decision').prefetch_related('dependencies')

        # MANAGER views items created by them, assigned to them, or belonging to their team meetings
        if user.is_manager_role:
            return ActionItem.objects.filter(
                Q(created_by=user) |
                Q(assigned_to=user) |
                Q(decision__discussion__meeting__created_by=user) |
                Q(decision__discussion__meeting__team__members=user)
            ).distinct().select_related('assigned_to', 'created_by', 'decision').prefetch_related('dependencies')

        # MEMBER views items assigned to them or created by them
        return ActionItem.objects.filter(
            Q(assigned_to=user) | Q(created_by=user)
        ).distinct().select_related('assigned_to', 'created_by', 'decision').prefetch_related('dependencies')

    def perform_create(self, serializer):
        user = self.request.user
        # MEMBER role restriction on action item creation unless assigned to self
        assigned_to = serializer.validated_data.get('assigned_to')
        if not user.is_manager_role and assigned_to and assigned_to.id != user.id:
            raise permissions.PermissionDenied("MEMBER role cannot assign action items to other users.")
        serializer.save(created_by=user)

    def perform_update(self, serializer):
        action_item = self.get_object()
        user = self.request.user

        # OWNER and ADMIN can update any field
        if user.is_admin_role:
            serializer.save()
            return

        # MANAGER can update items created by them or assigned to their scope
        if user.is_manager_role:
            if action_item.created_by == user or action_item.assigned_to == user:
                serializer.save()
                return

        # MEMBER restrictions:
        # 1. MEMBER can only update action items assigned to them
        if action_item.assigned_to != user:
            raise permissions.PermissionDenied("MEMBER cannot modify action items assigned to another user.")

        # 2. MEMBER can ONLY update status field!
        sensitive_fields = ['title', 'description', 'due_date', 'priority', 'assigned_to', 'decision']
        validated_data = serializer.validated_data
        for field in sensitive_fields:
            if field in validated_data and validated_data[field] != getattr(action_item, field):
                raise permissions.PermissionDenied(f"MEMBER role is not authorized to modify sensitive field '{field}'. You may only update status.")

        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if not user.is_manager_role and instance.created_by != user:
            raise permissions.PermissionDenied("MEMBER role cannot delete action items.")
        instance.delete()

    @action(detail=False, methods=['get'])
    def my_actions(self, request):
        """
        Dedicated endpoint for logged in user's assigned actions
        """
        queryset = self.get_queryset().filter(assigned_to=request.user)
        filtered_qs = self.filter_queryset(queryset)
        page = self.paginate_queryset(filtered_qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(filtered_qs, many=True)
        return Response(serializer.data)
