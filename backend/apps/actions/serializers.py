from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ActionItem
from apps.authentication.serializers import UserSerializer

User = get_user_model()

class ActionItemSerializer(serializers.ModelSerializer):
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        many=True,
        required=False
    )
    assigned_to_detail = UserSerializer(source='assigned_to', many=True, read_only=True)
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

    meeting_id = serializers.SerializerMethodField()
    meeting_title = serializers.SerializerMethodField()
    discussion_id = serializers.SerializerMethodField()
    discussion_title = serializers.SerializerMethodField()
    completion_notes = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    dependency_rule = serializers.ChoiceField(
        choices=ActionItem.DependencyRule.choices,
        default=ActionItem.DependencyRule.ALL,
        required=False
    )

    class Meta:
        model = ActionItem
        fields = (
            'id', 'decision', 'meeting_id', 'meeting_title', 'discussion_id', 'discussion_title', 'title', 'description', 'completion_notes', 'assigned_to', 'assigned_to_detail',
            'priority', 'due_date', 'status', 'is_overdue', 'dependencies', 'dependency_details',
            'dependency_ids', 'dependency_rule', 'created_by', 'created_by_detail', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'meeting_id', 'meeting_title', 'discussion_id', 'discussion_title', 'dependencies', 'created_by', 'created_at', 'updated_at')

    def get_meeting_id(self, obj):
        try:
            if obj and hasattr(obj, 'decision') and obj.decision:
                discussion = getattr(obj.decision, 'discussion', None)
                if discussion:
                    meeting = getattr(discussion, 'meeting', None)
                    if meeting:
                        return meeting.id
        except Exception:
            return None
        return None

    def get_meeting_title(self, obj):
        try:
            if obj and hasattr(obj, 'decision') and obj.decision:
                discussion = getattr(obj.decision, 'discussion', None)
                if discussion:
                    meeting = getattr(discussion, 'meeting', None)
                    if meeting:
                        return meeting.title
        except Exception:
            return ''
        return ''

    def get_discussion_id(self, obj):
        try:
            if obj and hasattr(obj, 'decision') and obj.decision:
                discussion = getattr(obj.decision, 'discussion', None)
                if discussion:
                    return discussion.id
        except Exception:
            return None
        return None

    def get_discussion_title(self, obj):
        try:
            if obj and hasattr(obj, 'decision') and obj.decision:
                discussion = getattr(obj.decision, 'discussion', None)
                if discussion:
                    return discussion.title
        except Exception:
            return ''
        return ''

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['dependency_rule'] = getattr(instance, 'dependency_rule', ActionItem.DependencyRule.ALL)
        if ret.get('description'):
            ret['description'] = ret['description'].replace('\n[DEPENDENCY_RULE:ANY]', '').replace('[DEPENDENCY_RULE:ANY]', '').strip()
        # If assigned_to_detail is empty, fallback to created_by_detail so action items never show as unassigned
        try:
            if not ret.get('assigned_to_detail') and ret.get('created_by_detail'):
                ret['assigned_to_detail'] = [ret['created_by_detail']]
                if getattr(instance, 'created_by_id', None):
                    ret['assigned_to'] = [instance.created_by_id]
        except Exception:
            pass
        return ret

    def to_internal_value(self, data):
        if isinstance(data, dict) and 'assigned_to' in data and not isinstance(data['assigned_to'], list):
            data = data.copy()
            if data['assigned_to'] is not None:
                data['assigned_to'] = [data['assigned_to']]
            else:
                data['assigned_to'] = []
        return super().to_internal_value(data)

    def get_completion_notes(self, obj):
        try:
            return getattr(obj, 'completion_notes', '') or ''
        except Exception:
            return ''

    def get_dependency_details(self, obj):
        try:
            return [
                {
                    'id': dep.id,
                    'title': dep.title,
                    'status': dep.status,
                    'is_completed': dep.status == ActionItem.Status.COMPLETED,
                    'is_cancelled': dep.status == ActionItem.Status.CANCELLED
                }
                for dep in obj.dependencies.all()
            ]
        except Exception:
            return []

    def validate(self, attrs):
        target_status = attrs.get('status', getattr(self.instance, 'status', ActionItem.Status.TODO) if self.instance else ActionItem.Status.TODO)
        
        try:
            decision = attrs.get('decision')
            if not decision and self.instance:
                try:
                    decision = self.instance.decision
                except Exception:
                    decision = None

            if decision and hasattr(decision, 'discussion') and decision.discussion:
                meeting = getattr(decision.discussion, 'meeting', None)
                if meeting and getattr(meeting, 'status', None) == 'CANCELLED':
                    raise serializers.ValidationError({
                        "non_field_errors": ["Action items cannot be created or updated for a cancelled meeting."]
                    })
        except serializers.ValidationError:
            raise
        except Exception:
            pass

        if self.instance and getattr(self.instance, 'status', None) in [ActionItem.Status.COMPLETED, ActionItem.Status.CANCELLED]:
            if 'status' in attrs and attrs['status'] != self.instance.status:
                raise serializers.ValidationError({
                    "status": "Completed or Cancelled action items are locked and cannot be changed back to another status."
                })

        # Determine current or proposed dependencies
        try:
            if 'dependencies' in attrs:
                proposed_deps = attrs['dependencies']
            elif self.instance:
                proposed_deps = list(self.instance.dependencies.all())
            else:
                proposed_deps = []

            # Check self-dependency
            if self.instance and self.instance in proposed_deps:
                raise serializers.ValidationError({"dependencies": "An action item cannot depend on itself."})

            # Check rule
            rule = attrs.get('dependency_rule') or (getattr(self.instance, 'dependency_rule', ActionItem.DependencyRule.ALL) if self.instance else ActionItem.DependencyRule.ALL)

            # Check if prerequisites are satisfied
            if rule == ActionItem.DependencyRule.ANY:
                is_satisfied = any(getattr(dep, 'status', None) == ActionItem.Status.COMPLETED for dep in proposed_deps) if proposed_deps else True
            else:
                is_satisfied = all(getattr(dep, 'status', None) == ActionItem.Status.COMPLETED for dep in proposed_deps) if proposed_deps else True

            # 1. On creation: If dependencies are not satisfied, automatically set status to BLOCKED; otherwise default to TODO
            if not self.instance:
                if not is_satisfied and attrs.get('status') != ActionItem.Status.CANCELLED:
                    attrs['status'] = ActionItem.Status.BLOCKED
                elif 'status' not in attrs:
                    attrs['status'] = ActionItem.Status.TODO

            target_status = attrs.get('status', getattr(self.instance, 'status', ActionItem.Status.TODO) if self.instance else ActionItem.Status.TODO)

            # 2. On update / manual status change: Cannot change status to TODO, IN_PROGRESS, or COMPLETED while prerequisites are incomplete
            if not is_satisfied and self.instance and 'status' in attrs and attrs['status'] in [ActionItem.Status.TODO, ActionItem.Status.IN_PROGRESS, ActionItem.Status.COMPLETED]:
                incomplete_deps = [dep for dep in proposed_deps if getattr(dep, 'status', None) != ActionItem.Status.COMPLETED]
                titles = ", ".join([f"'{getattr(dep, 'title', str(dep))}' ({getattr(dep, 'status', 'Unknown')})" for dep in incomplete_deps])
                status_label = "Todo" if target_status == ActionItem.Status.TODO else ("In Progress" if target_status == ActionItem.Status.IN_PROGRESS else "Completed")
                rule_desc = "At least one prerequisite must be completed" if rule == ActionItem.DependencyRule.ANY else "All prerequisite dependencies must be completed"
                raise serializers.ValidationError({
                    "status": f"Cannot set status to {status_label}. {rule_desc}. Incomplete prerequisites: {titles}."
                })
        except serializers.ValidationError:
            raise
        except Exception:
            pass

        return attrs

    def create(self, validated_data):
        rule = validated_data.pop('dependency_rule', ActionItem.DependencyRule.ALL)
        dependencies = validated_data.pop('dependencies', [])
        assigned_to_users = validated_data.pop('assigned_to', [])
        
        req = self.context.get('request')
        if 'created_by' not in validated_data or not getattr(validated_data.get('created_by'), 'is_authenticated', False):
            if req and hasattr(req, 'user') and req.user and req.user.is_authenticated:
                validated_data['created_by'] = req.user

        if 'created_by' not in validated_data or not getattr(validated_data.get('created_by'), 'is_authenticated', False):
            raise serializers.ValidationError({"created_by": "Authentication is required to create action items."})
        
        if req and 'completion_notes' in req.data and 'completion_notes' not in validated_data:
            validated_data['completion_notes'] = req.data['completion_notes']

        # Persist rule in description metadata if ANY
        if rule == ActionItem.DependencyRule.ANY:
            desc = validated_data.get('description') or ''
            if '[DEPENDENCY_RULE:ANY]' not in desc:
                desc = (desc + '\n[DEPENDENCY_RULE:ANY]').strip()
                validated_data['description'] = desc

        # Auto-set status to BLOCKED if created with unsatisfied dependencies
        try:
            if rule == ActionItem.DependencyRule.ANY:
                is_satisfied = any(getattr(dep, 'status', None) == ActionItem.Status.COMPLETED for dep in dependencies) if dependencies else True
            else:
                is_satisfied = all(getattr(dep, 'status', None) == ActionItem.Status.COMPLETED for dep in dependencies) if dependencies else True

            if not is_satisfied and validated_data.get('status') != ActionItem.Status.CANCELLED:
                validated_data['status'] = ActionItem.Status.BLOCKED
        except Exception:
            pass

        action = ActionItem.objects.create(**validated_data)
        action.dependency_rule = rule
        
        if dependencies:
            try:
                action.dependencies.set(dependencies)
            except Exception:
                pass

        if assigned_to_users:
            try:
                action.assigned_to.set(assigned_to_users)
            except Exception:
                pass

        return action

    def update(self, instance, validated_data):
        rule = validated_data.pop('dependency_rule', None)
        dependencies = validated_data.pop('dependencies', None)
        assigned_to_users = validated_data.pop('assigned_to', None)

        if rule is not None:
            instance.dependency_rule = rule
            desc = validated_data.get('description', instance.description) or ''
            if rule == ActionItem.DependencyRule.ANY:
                if '[DEPENDENCY_RULE:ANY]' not in desc:
                    desc = (desc + '\n[DEPENDENCY_RULE:ANY]').strip()
                    validated_data['description'] = desc
            else:
                desc = desc.replace('\n[DEPENDENCY_RULE:ANY]', '').replace('[DEPENDENCY_RULE:ANY]', '').strip()
                validated_data['description'] = desc

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        req = self.context.get('request')
        if req and 'completion_notes' in req.data:
            instance.completion_notes = req.data['completion_notes']

        if dependencies is not None:
            try:
                instance.dependencies.set(dependencies)
            except Exception:
                pass

        if assigned_to_users is not None:
            try:
                instance.assigned_to.set(assigned_to_users)
            except Exception:
                try:
                    if assigned_to_users:
                        first_user = assigned_to_users[0] if isinstance(assigned_to_users, (list, tuple)) else assigned_to_users
                        instance.assigned_to_id = getattr(first_user, 'id', first_user)
                except Exception:
                    pass

        # Re-evaluate instance status against its dependencies
        try:
            current_deps = instance.dependencies.all()
            effective_rule = getattr(instance, 'dependency_rule', ActionItem.DependencyRule.ALL)
            if effective_rule == ActionItem.DependencyRule.ANY:
                is_satisfied = any(getattr(dep, 'status', None) == ActionItem.Status.COMPLETED for dep in current_deps) if current_deps.exists() else True
            else:
                is_satisfied = all(getattr(dep, 'status', None) == ActionItem.Status.COMPLETED for dep in current_deps) if current_deps.exists() else True

            if not is_satisfied and instance.status not in [ActionItem.Status.CANCELLED, ActionItem.Status.BLOCKED]:
                instance.status = ActionItem.Status.BLOCKED
        except Exception:
            pass

        instance.save()

        # Trigger cascading cancellation or auto-unblocking
        if instance.status == ActionItem.Status.CANCELLED:
            try:
                instance.cascade_cancellation()
            except Exception:
                pass
        else:
            try:
                instance.unblock_dependents()
            except Exception:
                pass

        return instance
