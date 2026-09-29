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

    class RecurrencePattern(models.TextChoices):
        DAILY = 'DAILY', 'Daily'
        WEEKDAYS = 'WEEKDAYS', 'Weekdays (Mon-Fri)'
        WEEKLY = 'WEEKLY', 'Weekly'

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
    is_recurring = models.BooleanField(default=False)
    recurrence_pattern = models.CharField(
        max_length=20,
        choices=RecurrencePattern.choices,
        blank=True,
        null=True
    )
    recurrence_end_date = models.DateField(null=True, blank=True)
    recurrence_group_id = models.CharField(max_length=64, null=True, blank=True, db_index=True)
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

    def get_calculated_status(self, save_if_changed=False):
        if self.status == self.Status.CANCELLED:
            return self.Status.CANCELLED

        try:
            from django.utils import timezone
            from datetime import datetime, date, time

            m_date = self.meeting_date
            s_time = self.start_time
            e_time = self.end_time

            if isinstance(m_date, str):
                m_date = date.fromisoformat(m_date)
            if isinstance(s_time, str):
                s_time = time.fromisoformat(s_time)
            if isinstance(e_time, str):
                e_time = time.fromisoformat(e_time)

            if not m_date or not s_time or not e_time:
                return self.status

            now = timezone.localtime()
            tz = timezone.get_current_timezone()

            naive_start = datetime.combine(m_date, s_time)
            naive_end = datetime.combine(m_date, e_time)

            start_dt = timezone.make_aware(naive_start, tz) if timezone.is_naive(naive_start) else naive_start
            end_dt = timezone.make_aware(naive_end, tz) if timezone.is_naive(naive_end) else naive_end

            if now < start_dt:
                calc_status = self.Status.SCHEDULED
            elif start_dt <= now < end_dt:
                calc_status = self.Status.IN_PROGRESS
            else:
                calc_status = self.Status.COMPLETED

            if save_if_changed and self.pk and self.status != calc_status:
                self.status = calc_status
                Meeting.objects.filter(pk=self.pk).update(status=calc_status)

            return calc_status
        except Exception:
            return self.status or self.Status.SCHEDULED

