from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
from django.db.models import Q
from .models import Decision, DecisionHistory
from .serializers import DecisionSerializer, DecisionHistorySerializer

class DecisionViewSet(viewsets.ModelViewSet):
    serializer_class = DecisionSerializer
    permission_classes = (permissions.IsAuthenticated,)
    filterset_fields = ('discussion', 'status', 'decided_by')

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Decision.objects.none()
        try:
            from apps.authentication.views import get_organization_member_ids
            member_ids = get_organization_member_ids(user, request=self.request)
            return Decision.objects.filter(
                Q(decided_by_id__in=member_ids) |
                Q(discussion__meeting__created_by_id__in=member_ids) |
                Q(discussion__meeting__participants__id__in=member_ids)
            ).distinct().select_related('discussion', 'decided_by').prefetch_related('history')
        except Exception:
            return Decision.objects.all().select_related('discussion', 'decided_by').prefetch_related('history')

    def perform_create(self, serializer):
        user = self.request.user
        if not user or not user.is_authenticated:
            raise PermissionDenied("Authentication required to record decisions.")
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
        
        # If transitioning from NO_DECISION (initial placeholder), this is the initial Version 1 decision!
        if instance.status == Decision.Status.NO_DECISION and not instance.history.exists():
            new_version = 1
        else:
            new_version = instance.version + 1
        
        # Preserve original author (decided_by) while incrementing version
        updated_decision = serializer.save(
            version=new_version,
            decision_date=timezone.now()
        )
        
        # Save New Version Snapshot to History with changed_by tracking
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
        history_records = list(decision.history.all().order_by('version'))

        # Self-heal records where Version 1 was skipped due to the placeholder off-by-one bug
        if history_records:
            min_v = history_records[0].version
            if min_v > 1:
                offset = min_v - 1
                for r in history_records:
                    r.version -= offset
                    r.save(update_fields=['version'])
                if decision.version >= min_v:
                    decision.version -= offset
                    decision.save(update_fields=['version'])
                history_records = list(decision.history.all().order_by('version'))
        elif decision.status != Decision.Status.NO_DECISION:
            # If no history snapshot exists for an active decision, synthesize Version 1
            rec = DecisionHistory.objects.create(
                decision=decision,
                version=1,
                status=decision.status,
                decision_text=decision.decision,
                reason=decision.reason,
                changed_by=decision.decided_by,
                changed_at=decision.decision_date or decision.created_at
            )
            history_records = [rec]

        # Return history sorted newest first
        history_records.sort(key=lambda r: r.version, reverse=True)
        serializer = DecisionHistorySerializer(history_records, many=True)
        return Response(serializer.data)
