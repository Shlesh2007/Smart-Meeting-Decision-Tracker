from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source='notification_type', read_only=True)

    class Meta:
        model = Notification
        fields = (
            'id', 'title', 'subtitle', 'link', 'type',
            'notification_type', 'is_read', 'source_id', 'created_at'
        )
        read_only_fields = ('id', 'title', 'subtitle', 'link', 'type', 'notification_type', 'source_id', 'created_at')
