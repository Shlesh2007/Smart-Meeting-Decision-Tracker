from rest_framework import serializers
from .models import Discussion
from apps.authentication.serializers import UserSerializer

class DiscussionSerializer(serializers.ModelSerializer):
    created_by_detail = UserSerializer(source='created_by', read_only=True)
    decision = serializers.SerializerMethodField()

    class Meta:
        model = Discussion
        fields = (
            'id', 'meeting', 'title', 'description', 'priority',
            'created_by', 'created_by_detail', 'decision', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')

    def get_decision(self, obj):
        if hasattr(obj, 'decision'):
            from apps.decisions.serializers import DecisionSerializer
            return DecisionSerializer(obj.decision).data
        return None
