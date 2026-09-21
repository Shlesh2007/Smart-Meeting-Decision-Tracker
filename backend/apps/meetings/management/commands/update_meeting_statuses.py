from django.core.management.base import BaseCommand
from apps.meetings.utils import auto_update_meeting_statuses

class Command(BaseCommand):
    help = 'Automatically update meeting statuses (SCHEDULED -> IN_PROGRESS -> COMPLETED) based on current date & time.'

    def handle(self, *args, **options):
        auto_update_meeting_statuses()
        self.stdout.write(self.style.SUCCESS('Successfully updated meeting statuses based on current date and time.'))
