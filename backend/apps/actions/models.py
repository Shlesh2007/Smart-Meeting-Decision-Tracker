from django.db import models
from django.conf import settings
from django.utils import timezone

class ActionItem(models.Model):
    class Priority(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'
        CRITICAL = 'CRITICAL', 'Critical'

    class Status(models.TextChoices):
        TODO = 'TODO', 'Todo'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        BLOCKED = 'BLOCKED', 'Blocked'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class DependencyRule(models.TextChoices):
        ALL = 'ALL', 'Require All Prerequisites (AND)'
        ANY = 'ANY', 'Require At Least One Prerequisite (OR)'

    decision = models.ForeignKey(
        'decisions.Decision',
        on_delete=models.CASCADE,
        related_name='action_items'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    completion_notes = models.TextField(blank=True, null=True)
    assigned_to = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='assigned_actions'
    )
    priority = models.CharField(
        max_length=15,
        choices=Priority.choices,
        default=Priority.MEDIUM
    )
    due_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.TODO
    )
    dependencies = models.ManyToManyField(
        'self',
        symmetrical=False,
        blank=True,
        related_name='dependent_actions'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_actions'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['due_date', 'created_at']

    def __str__(self):
        return f"{self.title} ({self.status})"

    @property
    def dependency_rule(self):
        val = getattr(self, '_dependency_rule_cache', None)
        if val in [self.DependencyRule.ALL, self.DependencyRule.ANY]:
            return val
        if hasattr(self, '__dict__') and 'dependency_rule' in self.__dict__:
            val = self.__dict__['dependency_rule']
            if val in [self.DependencyRule.ALL, self.DependencyRule.ANY]:
                return val
        if self.description and '[DEPENDENCY_RULE:ANY]' in self.description:
            return self.DependencyRule.ANY
        return self.DependencyRule.ALL

    @dependency_rule.setter
    def dependency_rule(self, value):
        val = str(value).upper().strip() if value else 'ALL'
        self._dependency_rule_cache = self.DependencyRule.ANY if val == 'ANY' else self.DependencyRule.ALL

    @property
    def is_overdue(self):
        """
        Rule 1 — Overdue Actions:
        Due Date < Current Date AND Status != Completed (and not cancelled)
        """
        if not self.due_date:
            return False
        return (self.due_date < timezone.localdate()) and (self.status.upper() not in [self.Status.COMPLETED, self.Status.CANCELLED])

    def unblock_dependents(self):
        """
        When this action item status changes (e.g. marked COMPLETED), re-evaluate all dependent actions:
        - For ALL rule: unblocked if ALL prerequisites are COMPLETED.
        - For ANY rule: unblocked if AT LEAST ONE prerequisite is COMPLETED.
        - Any BLOCKED action whose rule is satisfied transitions to TODO.
        - Any TODO action whose rule is NOT satisfied transitions to BLOCKED.
        """
        for dep_action in self.dependent_actions.exclude(status=self.Status.CANCELLED):
            rule = getattr(dep_action, 'dependency_rule', self.DependencyRule.ALL)
            if rule == self.DependencyRule.ANY:
                is_satisfied = dep_action.dependencies.filter(status=self.Status.COMPLETED).exists()
            else:
                is_satisfied = not dep_action.dependencies.exclude(status=self.Status.COMPLETED).exists()

            if is_satisfied and dep_action.status == self.Status.BLOCKED:
                dep_action.status = self.Status.TODO
                dep_action.save(update_fields=['status', 'updated_at'])
            elif not is_satisfied and dep_action.status == self.Status.TODO:
                dep_action.status = self.Status.BLOCKED
                dep_action.save(update_fields=['status', 'updated_at'])

    def cascade_cancellation(self, origin_action=None, visited=None):
        """
        Recursively cancel downstream actions that depend on this cancelled action.
        Follows the dependency_rule (ALL vs ANY):
        1. When an action is cancelled, identify all its dependent actions.
        2. Recursively identify downstream actions that depend on those actions.
        3. Cancel all affected actions automatically.
        4. Record the cancellation reason, such as:
           "Cancelled automatically because prerequisite Action '...' was cancelled."
        5. For multiple prerequisites:
           - If rule == ALL: cancellation of any required prerequisite invalidates the action -> cancel.
           - If rule == ANY: only cancel if ALL alternative prerequisites are cancelled.
        """
        if visited is None:
            visited = set()
        if self.id in visited:
            return
        visited.add(self.id)

        try:
            from apps.notifications.models import Notification
        except Exception:
            Notification = None

        origin = origin_action or self
        downstream_actions = list(self.dependent_actions.exclude(status=self.Status.CANCELLED))

        for downstream in downstream_actions:
            should_cancel = False
            cancel_reason = ""

            rule = getattr(downstream, 'dependency_rule', self.DependencyRule.ALL)

            if rule == self.DependencyRule.ALL:
                # If ANY prerequisite is cancelled, this action is invalidated and cancelled
                should_cancel = True
                cancel_reason = f"Cancelled automatically because prerequisite Action '{self.title}' (ID: #{self.id}) was cancelled."
            elif rule == self.DependencyRule.ANY:
                # Only cancel if ALL alternative prerequisites are now cancelled
                has_viable_prereq = downstream.dependencies.exclude(status=self.Status.CANCELLED).exists()
                if not has_viable_prereq:
                    should_cancel = True
                    cancel_reason = f"Cancelled automatically because all alternative prerequisites were cancelled (prerequisite Action '{self.title}' ID: #{self.id} was cancelled)."
                else:
                    # Alternative viable prerequisites remain. Log audit note but do NOT cancel.
                    timestamp = timezone.now().strftime('%Y-%m-%d %H:%M')
                    note = f"[{timestamp} Dependency Notice]: Prerequisite Action '{self.title}' (ID: #{self.id}) was cancelled, but this action remains active via alternative prerequisite(s)."
                    curr_notes = (downstream.completion_notes or "").strip()
                    if note not in curr_notes:
                        downstream.completion_notes = (curr_notes + "\n" + note).strip() if curr_notes else note
                        downstream.save(update_fields=['completion_notes', 'updated_at'])

            if should_cancel:
                downstream.status = self.Status.CANCELLED
                timestamp = timezone.now().strftime('%Y-%m-%d %H:%M')
                audit_note = f"[{timestamp} Cancellation Notice]: {cancel_reason}"
                curr_notes = (downstream.completion_notes or "").strip()
                downstream.completion_notes = (curr_notes + "\n" + audit_note).strip() if curr_notes else audit_note
                downstream.save(update_fields=['status', 'completion_notes', 'updated_at'])

                # Create in-app notifications for assigned users
                if Notification:
                    try:
                        meeting_id = None
                        if hasattr(downstream, 'decision') and downstream.decision:
                            disc = getattr(downstream.decision, 'discussion', None)
                            if disc and getattr(disc, 'meeting', None):
                                meeting_id = disc.meeting.id

                        for u in downstream.assigned_to.all():
                            Notification.objects.create(
                                user=u,
                                title=f"Action Cancelled: {downstream.title}",
                                subtitle=cancel_reason,
                                link=f"/meetings/{meeting_id}" if meeting_id else "/my-actions",
                                notification_type=Notification.NotificationType.GENERAL,
                                source_id=f"cascade_cancel_{downstream.id}"
                            )
                    except Exception:
                        pass

                # Recursively cascade cancellation downstream
                downstream.cascade_cancellation(origin_action=origin, visited=visited)

