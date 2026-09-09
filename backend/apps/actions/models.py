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

    decision = models.ForeignKey(
        'decisions.Decision',
        on_delete=models.CASCADE,
        related_name='action_items'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
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
        ordering = ['due_date', '-priority']

    def __str__(self):
        return f"{self.title} ({self.status})"

    @property
    def is_overdue(self):
        """
        Rule 1 — Overdue Actions:
        Due Date < Current Date AND Status != Completed (and not cancelled)
        """
        if not self.due_date:
            return False
        return (self.due_date < timezone.localdate()) and (self.status.upper() not in [self.Status.COMPLETED, self.Status.CANCELLED])
