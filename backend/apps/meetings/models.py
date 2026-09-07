from django.db import models
from django.conf import settings

class Meeting(models.Model):
    class MeetingType(models.TextChoices):
        INTERNAL = 'INTERNAL', 'Internal'
        CLIENT = 'CLIENT', 'Client'
        PROJECT = 'PROJECT', 'Project'
        REVIEW = 'REVIEW', 'Review'
        PLANNING = 'PLANNING', 'Planning'
        OTHER = 'OTHER', 'Other'

    class Status(models.TextChoices):
        SCHEDULED = 'SCHEDULED', 'Scheduled'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    meeting_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    location = models.CharField(max_length=255, default='Virtual / Zoom')
    meeting_type = models.CharField(
        max_length=20,
        choices=MeetingType.choices,
        default=MeetingType.INTERNAL
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_meetings'
    )
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='attended_meetings',
        blank=True
    )
    team = models.ForeignKey(
        'teams.Team',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='meetings'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-meeting_date', '-start_time']

    def __str__(self):
        return f"{self.title} ({self.meeting_date})"
