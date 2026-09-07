from django.db import models
from django.conf import settings
from django.utils import timezone

class Decision(models.Model):
    class Status(models.TextChoices):
        NO_DECISION = 'NO_DECISION', 'No Decision'
        DECISION_MADE = 'DECISION_MADE', 'Decision Made'
        DEFERRED = 'DEFERRED', 'Deferred'
        REJECTED = 'REJECTED', 'Rejected'

    discussion = models.OneToOneField(
        'discussions.Discussion',
        on_delete=models.CASCADE,
        related_name='decision'
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NO_DECISION
    )
    decision = models.TextField(blank=True, null=True)
    reason = models.TextField(blank=True, null=True)
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='decisions_made'
    )
    decision_date = models.DateTimeField(default=timezone.now)
    version = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Decision v{self.version} for '{self.discussion.title}' ({self.status})"

class DecisionHistory(models.Model):
    decision = models.ForeignKey(
        Decision,
        on_delete=models.CASCADE,
        related_name='history'
    )
    version = models.IntegerField()
    status = models.CharField(max_length=20)
    decision_text = models.TextField(blank=True, null=True)
    reason = models.TextField(blank=True, null=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='decision_history_changes'
    )
    changed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-version']
        verbose_name_plural = 'Decision histories'

    def __str__(self):
        return f"v{self.version} of Decision {self.decision_id}"
