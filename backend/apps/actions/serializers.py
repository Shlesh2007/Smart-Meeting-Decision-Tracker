from rest_framework import serializers
from .models import ActionItem
from apps.authentication.serializers import UserSerializer

class ActionItemSerializer(serializers.ModelSerializer):
    assigned_to_detail = UserSerializer(source='assigned_to', read_only=True)
    created_by_detail = UserSerializer(source='created_by', read_only=True)
    is_overdue = serializers.ReadOnlyField()
    dependency_details = serializers.SerializerMethodField()
    dependency_ids = serializers.PrimaryKeyRelatedField(
        queryset=ActionItem.objects.all(),
        many=True,
        write_only=True,
        source='dependencies',
        required=False
    )

    meeting_id = serializers.ReadOnlyField(source='decision.discussion.meeting.id', default=None)
    meeting_title = serializers.ReadOnlyField(source='decision.discussion.meeting.title', default='')
    completion_notes = serializers.SerializerMethodField()

    class Meta:
        model = ActionItem
        fields = (
            'id', 'decision', 'meeting_id', 'meeting_title', 'title', 'description', 'completion_notes', 'assigned_to', 'assigned_to_detail',
            'priority', 'due_date', 'status', 'is_overdue', 'dependencies', 'dependency_details',
            'dependency_ids', 'created_by', 'created_by_detail', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'meeting_id', 'meeting_title', 'created_by', 'created_at', 'updated_at')

    def get_completion_notes(self, obj):
        try:
            return getattr(obj, 'completion_notes', '') or ''
        except Exception:
            return ''

    def get_dependency_details(self, obj):
        return [
            {
                'id': dep.id,
                'title': dep.title,
                'status': dep.status,
                'is_completed': dep.status == ActionItem.Status.COMPLETED
            }
            for dep in obj.dependencies.all()
        ]

    def validate(self, attrs):
        target_status = attrs.get('status', self.instance.status if self.instance else ActionItem.Status.TODO)
        
        # Determine current or proposed dependencies
        if 'dependencies' in attrs:
            proposed_deps = attrs['dependencies']
        elif self.instance:
            proposed_deps = self.instance.dependencies.all()
        else:
            proposed_deps = []

        # Check self-dependency
        if self.instance and self.instance in proposed_deps:
            raise serializers.ValidationError({"dependencies": "An action item cannot depend on itself."})

        # Rule 2: Dependency Validation on Status (IN_PROGRESS or COMPLETED)
        incomplete_deps = [dep for dep in proposed_deps if dep.status != ActionItem.Status.COMPLETED]
        if incomplete_deps and target_status in [ActionItem.Status.IN_PROGRESS, ActionItem.Status.COMPLETED]:
            titles = ", ".join([f"'{dep.title}' ({dep.status})" for dep in incomplete_deps])
            status_label = "In Progress" if target_status == ActionItem.Status.IN_PROGRESS else "Completed"
            raise serializers.ValidationError({
                "status": f"Cannot set status to {status_label}. Outstanding incomplete prerequisite dependencies: {titles}."
            })

        return attrs

    def create(self, validated_data):
        dependencies = validated_data.pop('dependencies', [])
        validated_data['created_by'] = self.context['request'].user
        req = self.context.get('request')
        if req and 'completion_notes' in req.data:
            validated_data['completion_notes'] = req.data['completion_notes']

        # Auto-set status to BLOCKED if created with incomplete dependencies
        has_incomplete = any(dep.status != ActionItem.Status.COMPLETED for dep in dependencies)
        if has_incomplete and validated_data.get('status') != ActionItem.Status.CANCELLED:
            validated_data['status'] = ActionItem.Status.BLOCKED

        action = ActionItem.objects.create(**validated_data)
        if dependencies:
            action.dependencies.set(dependencies)
        return action

    def update(self, instance, validated_data):
        dependencies = validated_data.pop('dependencies', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        req = self.context.get('request')
        if req and 'completion_notes' in req.data:
            instance.completion_notes = req.data['completion_notes']

        if dependencies is not None:
            instance.dependencies.set(dependencies)

        # Re-evaluate instance status against its dependencies
        current_deps = instance.dependencies.all()
        has_incomplete = any(dep.status != ActionItem.Status.COMPLETED for dep in current_deps)
        if has_incomplete and instance.status not in [ActionItem.Status.CANCELLED, ActionItem.Status.BLOCKED]:
            instance.status = ActionItem.Status.BLOCKED

        instance.save()

        # Trigger auto-unblocking for all dependent actions
        instance.unblock_dependents()

        return instance
