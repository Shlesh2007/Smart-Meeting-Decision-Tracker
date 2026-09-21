import logging
from django.utils import timezone
from django.db.models import Q

logger = logging.getLogger(__name__)

def auto_update_meeting_statuses():
    """
    Automatically updates Meeting statuses based on current date and time:
    - Meetings whose date/end_time has passed become 'COMPLETED' (unless CANCELLED).
    - Meetings whose date and start_time match the current window become 'IN_PROGRESS'.
    """
    try:
        from .models import Meeting

        now = timezone.localtime()
        current_date = now.date()
        current_time = now.time()

        # 1. Update past meetings to COMPLETED (where status is SCHEDULED or IN_PROGRESS)
        Meeting.objects.filter(
            Q(status__in=[Meeting.Status.SCHEDULED, Meeting.Status.IN_PROGRESS]),
            Q(meeting_date__lt=current_date) | Q(meeting_date=current_date, end_time__lte=current_time)
        ).update(status=Meeting.Status.COMPLETED)

        # 2. Update currently active meetings to IN_PROGRESS (where status is SCHEDULED)
        Meeting.objects.filter(
            status=Meeting.Status.SCHEDULED,
            meeting_date=current_date,
            start_time__lte=current_time,
            end_time__gt=current_time
        ).update(status=Meeting.Status.IN_PROGRESS)
    except Exception as exc:
        logger.error(f"Error during auto_update_meeting_statuses: {exc}")

