from rest_framework import viewsets, permissions
from .models import Team
from .serializers import TeamSerializer
from apps.authentication.permissions import IsAdminOrReadOnly

class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all().order_by('-created_at')
    serializer_class = TeamSerializer
    permission_classes = (IsAdminOrReadOnly,)
    search_fields = ('name', 'description')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
