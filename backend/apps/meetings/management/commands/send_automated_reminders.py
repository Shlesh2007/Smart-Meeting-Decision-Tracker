import logging
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from apps.meetings.models import Meeting
from smart_meeting_tracker.email_utils import send_brevo_transactional_email, build_meeting_email_html

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Automatically send email reminders for meetings scheduled 2 days and 1 day in advance.'

    def handle(self, *args, **options):
        today = date.today()
        target_2_days = today + timedelta(days=2)
        target_1_day = today + timedelta(days=1)

        meetings_2_days = Meeting.objects.filter(
            status=Meeting.Status.SCHEDULED,
            meeting_date=target_2_days
        )

        meetings_1_day = Meeting.objects.filter(
            status=Meeting.Status.SCHEDULED,
            meeting_date=target_1_day
        )

        sent_count = 0

        # Send 2-day advance reminders
        for meeting in meetings_2_days:
            sent_count += self._send_reminder(meeting, days_ahead=2)

        # Send 1-day advance reminders
        for meeting in meetings_1_day:
            sent_count += self._send_reminder(meeting, days_ahead=1)

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully sent {sent_count} automated reminder email(s) for upcoming meetings.'
            )
        )

    def _send_reminder(self, meeting, days_ahead):
        recipients = [p.email for p in meeting.participants.all() if p.email]
        if not recipients and meeting.created_by.email:
            recipients = [meeting.created_by.email]

        if not recipients:
            return 0

        time_frame_str = "2 days" if days_ahead == 2 else "1 day (tomorrow)"
        subject = f"⏰ Reminder ({time_frame_str}): Upcoming Meeting - {meeting.title}"
        text_body = (
            f"Hello,\n\n"
            f"This is an automated reminder that you have a meeting scheduled in {time_frame_str}:\n\n"
            f"  Title: {meeting.title}\n"
            f"  Date: {meeting.meeting_date}\n"
            f"  Time: {meeting.start_time} - {meeting.end_time}\n"
            f"  Location: {meeting.location or 'N/A'}\n"
            f"  Meeting Type: {meeting.get_meeting_type_display()}\n\n"
            f"Agenda / Description:\n{meeting.description or 'No description provided.'}\n\n"
            f"Please check Smart Meeting Decision Tracker for details.\n\n"
            f"Best regards,\nSmart Meeting Decision Tracker System"
        )
        html_body = build_meeting_email_html(meeting, title_prefix=f"Upcoming Meeting Reminder ({time_frame_str})")

        success, detail = send_brevo_transactional_email(subject, recipients, text_body, html_body)
        if success:
            return len(recipients)
        else:
            logger.error("Failed to send %d-day automated reminder for meeting %s: %s", days_ahead, meeting.id, detail)
            self.stderr.write(f"Failed to send reminder for meeting {meeting.id}: {detail}")
            return 0
