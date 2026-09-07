from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
import django_filters
from django.utils import timezone
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
            today = timezone.now().date()
            return queryset.filter(due_date__lt=today).exclude(status__in=[ActionItem.Status.COMPLETED, ActionItem.Status.CANCELLED])
        return queryset

class ActionItemViewSet(viewsets.ModelViewSet):
    queryset = ActionItem.objects.all().select_related('assigned_to', 'created_by', 'decision').prefetch_related('dependencies')
    serializer_class = ActionItemSerializer
    permission_classes = (permissions.IsAuthenticated,)
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_class = ActionItemFilter
    search_fields = ('title', 'description')
    ordering_fields = ('due_date', 'priority', 'status', 'created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

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
