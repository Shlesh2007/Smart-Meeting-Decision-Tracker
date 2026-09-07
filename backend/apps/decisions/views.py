from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Decision, DecisionHistory
from .serializers import DecisionSerializer, DecisionHistorySerializer

class DecisionViewSet(viewsets.ModelViewSet):
    queryset = Decision.objects.all().select_related('discussion', 'decided_by').prefetch_related('history')
    serializer_class = DecisionSerializer
    permission_classes = (permissions.IsAuthenticated,)
    filterset_fields = ('discussion', 'status', 'decided_by')

    def perform_create(self, serializer):
        user = self.request.user
        decision = serializer.save(decided_by=user, version=1, decision_date=timezone.now())
        
        # Save Version 1 History Snapshot
        DecisionHistory.objects.create(
            decision=decision,
            version=1,
            status=decision.status,
            decision_text=decision.decision,
            reason=decision.reason,
            changed_by=user,
            changed_at=timezone.now()
        )

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        new_version = instance.version + 1
        
        updated_decision = serializer.save(
            decided_by=user,
            version=new_version,
            decision_date=timezone.now()
        )
        
        # Save New Version Snapshot to History
        DecisionHistory.objects.create(
            decision=updated_decision,
            version=new_version,
            status=updated_decision.status,
            decision_text=updated_decision.decision,
            reason=updated_decision.reason,
            changed_by=user,
            changed_at=timezone.now()
        )

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        decision = self.get_object()
        history_records = decision.history.all()
        serializer = DecisionHistorySerializer(history_records, many=True)
        return Response(serializer.data)
