from rest_framework import serializers
from .models import Decision, DecisionHistory
from apps.authentication.serializers import UserSerializer

class DecisionHistorySerializer(serializers.ModelSerializer):
    changed_by_detail = UserSerializer(source='changed_by', read_only=True)

    class Meta:
        model = DecisionHistory
        fields = (
            'id', 'decision', 'version', 'status', 'decision_text',
            'reason', 'changed_by', 'changed_by_detail', 'changed_at'
        )

class DecisionSerializer(serializers.ModelSerializer):
    decided_by_detail = UserSerializer(source='decided_by', read_only=True)
    history = DecisionHistorySerializer(many=True, read_only=True)
    action_items_count = serializers.SerializerMethodField()

    class Meta:
        model = Decision
        fields = (
            'id', 'discussion', 'status', 'decision', 'reason',
            'decided_by', 'decided_by_detail', 'decision_date', 'version',
            'history', 'action_items_count', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'decided_by', 'version', 'created_at', 'updated_at')

    def get_action_items_count(self, obj):
        return obj.action_items.count() if hasattr(obj, 'action_items') else 0

    def validate(self, attrs):
        status = attrs.get('status', self.instance.status if self.instance else Decision.Status.NO_DECISION)
        decision_text = attrs.get('decision', self.instance.decision if self.instance else '')
        reason_text = attrs.get('reason', self.instance.reason if self.instance else '')

        if status == Decision.Status.DECISION_MADE and not decision_text:
            raise serializers.ValidationError({"decision": "Decision details text is required when status is 'Decision Made'."})

        # Reject update if no changes were made to status, decision, or reason
        if self.instance:
            curr_status = self.instance.status
            curr_decision = (self.instance.decision or '').strip()
            curr_reason = (self.instance.reason or '').strip()

            new_status = status
            new_decision = (decision_text or '').strip()
            new_reason = (reason_text or '').strip()

            if curr_status == new_status and curr_decision == new_decision and curr_reason == new_reason:
                raise serializers.ValidationError({
                    "non_field_errors": ["No changes detected. Decision status, text details, and reason are identical to the current version."]
                })

        return attrs
