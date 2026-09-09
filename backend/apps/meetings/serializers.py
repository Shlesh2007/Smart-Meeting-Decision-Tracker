from rest_framework import serializers
from .models import Meeting
from apps.authentication.serializers import UserSerializer
from apps.teams.serializers import TeamSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class MeetingSerializer(serializers.ModelSerializer):
    created_by_detail = UserSerializer(source='created_by', read_only=True)
    participants_detail = UserSerializer(source='participants', many=True, read_only=True)
    team_detail = TeamSerializer(source='team', read_only=True)
    participant_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        many=True,
        write_only=True,
        source='participants',
        required=False
    )
    discussions_count = serializers.SerializerMethodField()

    class Meta:
        model = Meeting
        fields = (
            'id', 'title', 'description', 'meeting_date', 'start_time', 'end_time',
            'location', 'meeting_type', 'status', 'created_by', 'created_by_detail',
            'participants', 'participants_detail', 'participant_ids', 'team', 'team_detail',
            'discussions_count', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')

    def get_discussions_count(self, obj):
        return obj.discussions.count()

    def validate(self, attrs):
        start_time = attrs.get('start_time', self.instance.start_time if self.instance else None)
        end_time = attrs.get('end_time', self.instance.end_time if self.instance else None)
        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})

        # Lock terminal meeting states (COMPLETED / CANCELLED) for non-admin users
        if self.instance and self.instance.status in ['COMPLETED', 'CANCELLED']:
            new_status = attrs.get('status')
            request = self.context.get('request')
            is_admin = bool(request and request.user and request.user.is_admin_role)
            if new_status and new_status != self.instance.status and not is_admin:
                raise serializers.ValidationError({
                    "status": f"Meeting is already marked as {self.instance.status}. Status cannot be reverted."
                })

        return attrs

    def create(self, validated_data):
        participants = validated_data.pop('participants', [])
        team = validated_data.get('team')
        validated_data['created_by'] = self.context['request'].user
        meeting = Meeting.objects.create(**validated_data)
        
        if participants:
            meeting.participants.set(participants)
            if team:
                # Also include all team members
                for member in team.members.all():
                    meeting.participants.add(member)
        elif team:
            # Auto add all team members as participants
            meeting.participants.set(team.members.all())
        else:
            # Auto add creator
            meeting.participants.add(self.context['request'].user)
            
        return meeting
