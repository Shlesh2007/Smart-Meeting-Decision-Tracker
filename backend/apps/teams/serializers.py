from rest_framework import serializers
from .models import Team
from apps.authentication.serializers import UserSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class TeamSerializer(serializers.ModelSerializer):
    created_by_detail = UserSerializer(source='created_by', read_only=True)
    members_detail = UserSerializer(source='members', many=True, read_only=True)
    member_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        many=True,
        write_only=True,
        source='members',
        required=False
    )

    class Meta:
        model = Team
        fields = (
            'id', 'name', 'description', 'created_by', 'created_by_detail',
            'members', 'members_detail', 'member_ids', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')

    def create(self, validated_data):
        members = validated_data.pop('members', [])
        validated_data['created_by'] = self.context['request'].user
        team = Team.objects.create(**validated_data)
        if members:
            team.members.set(members)
        return team
