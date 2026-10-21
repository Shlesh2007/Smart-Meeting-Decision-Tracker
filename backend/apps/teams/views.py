from rest_framework import viewsets
from django.db.models import Q
from .models import Team
from .serializers import TeamSerializer
from apps.authentication.permissions import IsAdminOrReadOnly

class TeamViewSet(viewsets.ModelViewSet):
    serializer_class = TeamSerializer
    permission_classes = (IsAdminOrReadOnly,)
    search_fields = ('name', 'description')

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Team.objects.none()
        try:
            from apps.authentication.views import get_organization_member_ids
            member_ids = get_organization_member_ids(user, request=self.request)
            return Team.objects.filter(
                Q(created_by_id__in=member_ids) | Q(members__id__in=member_ids)
            ).distinct().order_by('-created_at')
        except Exception:
            return Team.objects.filter(
                Q(created_by=user) | Q(members=user)
            ).distinct().order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
