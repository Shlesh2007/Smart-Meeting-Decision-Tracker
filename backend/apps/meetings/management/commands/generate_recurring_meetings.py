import logging
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from apps.meetings.models import Meeting

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Roll forward and automatically generate future meeting occurrences for active recurring meeting series.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days-ahead',
            type=int,
            default=14,
            help='Number of days ahead from today to maintain recurring meeting occurrences (default: 14).'
        )

    def handle(self, *args, **options):
        days_ahead = options['days_ahead']
        today = date.today()
        target_horizon = today + timedelta(days=days_ahead)

        # Get unique recurring group IDs
        recurring_groups = (
            Meeting.objects.filter(
                is_recurring=True,
                recurrence_group_id__isnull=False
            )
            .values_list('recurrence_group_id', flat=True)
            .distinct()
        )

        total_created = 0

        for group_id in recurring_groups:
            # Get latest instance in this series
            latest_instance = (
                Meeting.objects.filter(recurrence_group_id=group_id)
                .order_by('-meeting_date')
                .first()
            )

            if not latest_instance:
                continue

            # If the series has an explicit recurrence_end_date that has passed, skip
            if latest_instance.recurrence_end_date and latest_instance.recurrence_end_date < today:
                continue

            max_date = target_horizon
            if latest_instance.recurrence_end_date and latest_instance.recurrence_end_date < max_date:
                max_date = latest_instance.recurrence_end_date

            current_date = latest_instance.meeting_date + timedelta(days=1)
            participants = list(latest_instance.participants.all())
            created_for_group = 0

            while current_date <= max_date and created_for_group < 30:
                should_create = False
                pattern = latest_instance.recurrence_pattern

                if pattern == Meeting.RecurrencePattern.DAILY:
                    should_create = True
                elif pattern == Meeting.RecurrencePattern.WEEKDAYS:
                    if current_date.weekday() < 5:
                        should_create = True
                elif pattern == Meeting.RecurrencePattern.WEEKLY:
                    if current_date.weekday() == latest_instance.meeting_date.weekday():
                        should_create = True

                if should_create:
                    # Verify no duplicate instance already exists on this date
                    exists = Meeting.objects.filter(
                        recurrence_group_id=group_id,
                        meeting_date=current_date
                    ).exists()

                    if not exists:
                        new_meeting = Meeting.objects.create(
                            title=latest_instance.title,
                            description=latest_instance.description,
                            meeting_date=current_date,
                            start_time=latest_instance.start_time,
                            end_time=latest_instance.end_time,
                            location=latest_instance.location,
                            meeting_type=latest_instance.meeting_type,
                            status=Meeting.Status.SCHEDULED,
                            created_by=latest_instance.created_by,
                            team=latest_instance.team,
                            is_recurring=True,
                            recurrence_pattern=pattern,
                            recurrence_end_date=latest_instance.recurrence_end_date,
                            recurrence_group_id=group_id,
                        )
                        new_meeting.participants.set(participants)
                        created_for_group += 1
                        total_created += 1

                current_date += timedelta(days=1)

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully generated {total_created} forward recurring meeting instance(s).'
            )
        )
