from django.db import models
from django.conf import settings

class Notification(models.Model):
    class NotificationType(models.TextChoices):
        OVERDUE = 'overdue', 'Overdue Action'
        CRITICAL = 'critical', 'Critical Action'
        UPCOMING = 'upcoming', 'Upcoming Meeting'
        GENERAL = 'general', 'General Notification'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    title = models.CharField(max_length=255)
    subtitle = models.TextField(blank=True, default='')
    link = models.CharField(max_length=255, blank=True, default='')
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        default=NotificationType.GENERAL
    )
    is_read = models.BooleanField(default=False)
    source_id = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification({self.user.username} - {self.title} - is_read={self.is_read})"
