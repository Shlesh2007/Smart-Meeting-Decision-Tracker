from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Discussion
from .serializers import DiscussionSerializer

from smart_meeting_tracker.filters import ExactPhraseSearchFilter

class DiscussionViewSet(viewsets.ModelViewSet):
    queryset = Discussion.objects.all().select_related('created_by', 'meeting', 'decision')
    serializer_class = DiscussionSerializer
    permission_classes = (permissions.IsAuthenticated,)
    filter_backends = (DjangoFilterBackend, ExactPhraseSearchFilter)
    filterset_fields = ('meeting', 'priority')
    search_fields = ('title', 'description')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
