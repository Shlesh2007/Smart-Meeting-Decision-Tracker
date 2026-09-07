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

    class Meta:
        model = ActionItem
        fields = (
            'id', 'decision', 'title', 'description', 'assigned_to', 'assigned_to_detail',
            'priority', 'due_date', 'status', 'is_overdue', 'dependencies', 'dependency_details',
            'dependency_ids', 'created_by', 'created_by_detail', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'updated_at')

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

        # Rule 2: Dependency Validation on Status = COMPLETED
        if target_status == ActionItem.Status.COMPLETED:
            incomplete_deps = [dep for dep in proposed_deps if dep.status != ActionItem.Status.COMPLETED]
            if incomplete_deps:
                titles = ", ".join([f"'{dep.title}' ({dep.status})" for dep in incomplete_deps])
                raise serializers.ValidationError({
                    "status": f"Cannot mark as Completed. Outstanding incomplete dependencies: {titles}."
                })

        return attrs

    def create(self, validated_data):
        dependencies = validated_data.pop('dependencies', [])
        validated_data['created_by'] = self.context['request'].user
        action = ActionItem.objects.create(**validated_data)
        if dependencies:
            action.dependencies.set(dependencies)
        return action

    def update(self, instance, validated_data):
        dependencies = validated_data.pop('dependencies', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if dependencies is not None:
            instance.dependencies.set(dependencies)
        return instance
