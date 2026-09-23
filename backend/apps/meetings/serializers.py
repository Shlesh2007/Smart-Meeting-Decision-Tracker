import uuid
from datetime import timedelta
from django.utils import timezone
from rest_framework import serializers
from .models import Meeting
from apps.authentication.serializers import UserSerializer
from apps.teams.serializers import TeamSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class MeetingSerializer(serializers.ModelSerializer):
    created_by_detail = UserSerializer(source='created_by', read_only=True)
    participants_detail = serializers.SerializerMethodField()
    team_detail = TeamSerializer(source='team', read_only=True)
    participant_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        many=True,
        write_only=True,
        source='participants',
        required=False
    )
    discussions_count = serializers.SerializerMethodField()
    update_series = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Meeting
        fields = (
            'id', 'title', 'description', 'meeting_date', 'start_time', 'end_time',
            'location', 'meeting_type', 'status', 'created_by', 'created_by_detail',
            'participants', 'participants_detail', 'participant_ids', 'team', 'team_detail',
            'is_recurring', 'recurrence_pattern', 'recurrence_end_date', 'recurrence_group_id',
            'discussions_count', 'update_series', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'status', 'created_by', 'created_at', 'updated_at', 'recurrence_group_id')

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['status'] = instance.get_calculated_status(save_if_changed=True)
        return ret

    def get_participants_detail(self, obj):
        parts = list(obj.participants.all())
        if not parts and obj.created_by:
            parts = [obj.created_by]
        return UserSerializer(parts, many=True).data

    def get_discussions_count(self, obj):
        return obj.discussions.count()


    def validate(self, attrs):
        meeting_date = attrs.get('meeting_date', self.instance.meeting_date if self.instance else None)
        start_time = attrs.get('start_time', self.instance.start_time if self.instance else None)
        end_time = attrs.get('end_time', self.instance.end_time if self.instance else None)

        # Validate that meeting date and start time cannot be in the past for new meetings
        if not self.instance and meeting_date and start_time:
            from datetime import datetime
            combined_dt = datetime.combine(meeting_date, start_time)
            if timezone.is_naive(combined_dt):
                combined_dt = timezone.make_aware(combined_dt)

            # Allow a 2-minute latency buffer for processing/clock drift
            current_time = timezone.now() - timedelta(minutes=2)
            if combined_dt < current_time:
                if meeting_date < timezone.localdate():
                    raise serializers.ValidationError({"meeting_date": "Meeting date cannot be scheduled in the past."})
                else:
                    raise serializers.ValidationError({"start_time": "Meeting start time cannot be scheduled in the past."})

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

        # Ensure meeting has either an assigned team or at least one individual participant
        team = attrs.get('team', self.instance.team if self.instance else None)
        participants = attrs.get('participants', list(self.instance.participants.all()) if (self.instance and self.instance.pk) else None)
        if not team and (participants is None or len(participants) == 0):
            raise serializers.ValidationError({
                "participant_ids": "Please select a team or invite at least one individual participant."
            })

        return attrs

    def create(self, validated_data):
        participants = validated_data.pop('participants', [])
        team = validated_data.get('team')
        user = self.context['request'].user
        validated_data['created_by'] = user

        is_recurring = validated_data.get('is_recurring', False)
        recurrence_pattern = validated_data.get('recurrence_pattern')
        recurrence_end_date = validated_data.get('recurrence_end_date')

        recurrence_group_id = None
        if is_recurring and recurrence_pattern:
            recurrence_group_id = str(uuid.uuid4())
            validated_data['recurrence_group_id'] = recurrence_group_id

        meeting = Meeting.objects.create(**validated_data)
        
        # Calculate full participant set
        all_participants = set(participants)
        if team:
            all_participants.update(team.members.all())
        all_participants.add(user)
        meeting.participants.set(all_participants)

        # Generate recurring series instances if enabled
        if is_recurring and recurrence_pattern:
            start_date = meeting.meeting_date
            max_end = start_date + timedelta(days=30)
            target_end_date = recurrence_end_date if recurrence_end_date else (start_date + timedelta(days=14))
            if target_end_date > max_end:
                target_end_date = max_end

            current_date = start_date + timedelta(days=1)
            generated_count = 0
            max_generation = 30

            while current_date <= target_end_date and generated_count < max_generation:
                should_create = False
                if recurrence_pattern == Meeting.RecurrencePattern.DAILY:
                    should_create = True
                elif recurrence_pattern == Meeting.RecurrencePattern.WEEKDAYS:
                    if current_date.weekday() < 5:
                        should_create = True
                elif recurrence_pattern == Meeting.RecurrencePattern.WEEKLY:
                    if current_date.weekday() == start_date.weekday():
                        should_create = True

                if should_create:
                    sub_meeting = Meeting.objects.create(
                        title=meeting.title,
                        description=meeting.description,
                        meeting_date=current_date,
                        start_time=meeting.start_time,
                        end_time=meeting.end_time,
                        location=meeting.location,
                        meeting_type=meeting.meeting_type,
                        status=Meeting.Status.SCHEDULED,
                        created_by=user,
                        team=team,
                        is_recurring=True,
                        recurrence_pattern=recurrence_pattern,
                        recurrence_end_date=target_end_date,
                        recurrence_group_id=recurrence_group_id,
                    )
                    sub_meeting.participants.set(all_participants)
                    generated_count += 1

                current_date += timedelta(days=1)
            
        return meeting

    def update(self, instance, validated_data):
        update_series = validated_data.pop('update_series', False)
        participants = validated_data.pop('participants', None)
        instance = super().update(instance, validated_data)
        if participants is not None:
            instance.participants.set(participants)
            # Always ensure organizer/creator is included as a participant
            if instance.created_by:
                instance.participants.add(instance.created_by)

        if update_series and instance.recurrence_group_id:
            future_meetings = Meeting.objects.filter(
                recurrence_group_id=instance.recurrence_group_id,
                meeting_date__gte=instance.meeting_date
            ).exclude(id=instance.id)

            for m in future_meetings:
                m.title = instance.title
                m.description = instance.description
                m.start_time = instance.start_time
                m.end_time = instance.end_time
                m.location = instance.location
                m.meeting_type = instance.meeting_type
                m.team = instance.team
                m.is_recurring = instance.is_recurring
                m.recurrence_pattern = instance.recurrence_pattern
                m.recurrence_end_date = instance.recurrence_end_date
                m.save()
                if participants is not None:
                    m.participants.set(participants)
                    if instance.created_by:
                        m.participants.add(instance.created_by)

        return instance
