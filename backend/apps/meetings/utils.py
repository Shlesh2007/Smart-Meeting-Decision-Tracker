import logging
from django.utils import timezone
from django.db.models import Q

logger = logging.getLogger(__name__)

def auto_update_meeting_statuses():
    """
    Automatically updates Meeting statuses in database based on current date and time:
    - Meetings whose date/end_time has passed become 'COMPLETED' (unless CANCELLED).
    - Meetings currently active between start_time and end_time become 'IN_PROGRESS' (unless CANCELLED).
    - Meetings whose start_time is in the future become 'SCHEDULED' (unless CANCELLED).
    - Cancelled meetings remain 'CANCELLED' permanently.
    """
    try:
        from .models import Meeting

        now = timezone.localtime()
        current_date = now.date()
        current_time = now.time()

        # 1. Update past meetings to COMPLETED (where status is not CANCELLED)
        Meeting.objects.filter(
            status__in=[Meeting.Status.SCHEDULED, Meeting.Status.IN_PROGRESS]
        ).filter(
            Q(meeting_date__lt=current_date) | Q(meeting_date=current_date, end_time__lte=current_time)
        ).update(status=Meeting.Status.COMPLETED)

        # 2. Update currently active meetings to IN_PROGRESS (where status is SCHEDULED)
        Meeting.objects.filter(
            status=Meeting.Status.SCHEDULED,
            meeting_date=current_date,
            start_time__lte=current_time,
            end_time__gt=current_time
        ).update(status=Meeting.Status.IN_PROGRESS)

        # 3. Reset future meetings to SCHEDULED if they were marked IN_PROGRESS/COMPLETED prematurely
        Meeting.objects.filter(
            status__in=[Meeting.Status.IN_PROGRESS, Meeting.Status.COMPLETED]
        ).filter(
            Q(meeting_date__gt=current_date) | Q(meeting_date=current_date, start_time__gt=current_time)
        ).update(status=Meeting.Status.SCHEDULED)
    except Exception as exc:
        logger.error(f"Error during auto_update_meeting_statuses: {exc}")


