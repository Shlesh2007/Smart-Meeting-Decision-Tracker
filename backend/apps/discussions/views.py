from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from .models import Discussion
from .serializers import DiscussionSerializer

from smart_meeting_tracker.filters import ExactPhraseSearchFilter

class DiscussionViewSet(viewsets.ModelViewSet):
    queryset = Discussion.objects.all().select_related(
        'created_by', 'meeting', 'decision', 'decision__decided_by'
    ).prefetch_related('decision__history', 'decision__history__changed_by')
    serializer_class = DiscussionSerializer
    permission_classes = (permissions.IsAuthenticated,)
    filter_backends = (DjangoFilterBackend, ExactPhraseSearchFilter)
    filterset_fields = ('meeting', 'priority')
    search_fields = ('title', 'description')

    def perform_create(self, serializer):
        user = self.request.user
        if not user or not user.is_authenticated:
            raise PermissionDenied("Authentication required to create a discussion topic.")
        discussion = serializer.save(created_by=user)
        try:
            from apps.decisions.models import Decision
            Decision.objects.get_or_create(discussion=discussion, defaults={'decided_by': user, 'status': 'NO_DECISION'})
        except Exception:
            pass
