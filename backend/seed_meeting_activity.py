import os
import sys
import django
import random
from datetime import date, timedelta, time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_meeting_tracker.settings')
django.setup()

from apps.authentication.models import User
from apps.meetings.models import Meeting
from apps.discussions.models import Discussion
from apps.decisions.models import Decision
from apps.actions.models import ActionItem

def seed_rich_meeting_activity():
    user = User.objects.filter(role=User.Role.OWNER).first() or User.objects.first()
    if not user:
        print("❌ No user found in database. Please register a user first.")
        return

    today = date.today()
    print(f"🚀 Seeding rich meeting activity data relative to today ({today})...")

    # Defined meeting templates with realistic topics
    sample_meetings = [
        # Past 30 Days Activity Peaks
        (-28, "Q3 Product Architecture Sync", Meeting.MeetingType.PLANNING, Meeting.Status.COMPLETED, 3),
        (-25, "Client Onboarding & Portal Demo", Meeting.MeetingType.CLIENT, Meeting.Status.COMPLETED, 2),
        (-22, "UI/UX Accessibility Design Review", Meeting.MeetingType.INTERNAL, Meeting.Status.COMPLETED, 4),
        (-19, "Backend API & Security Vulnerability Audit", Meeting.MeetingType.REVIEW, Meeting.Status.COMPLETED, 1),
        (-16, "DevOps & CI/CD Pipeline Optimization", Meeting.MeetingType.PROJECT, Meeting.Status.COMPLETED, 3),
        (-13, "Weekly Cross-Team Standup & Sync", Meeting.MeetingType.INTERNAL, Meeting.Status.COMPLETED, 2),
        (-10, "PostgreSQL Database Clustering & Failover", Meeting.MeetingType.PROJECT, Meeting.Status.COMPLETED, 5),
        (-7,  "Customer Feedback & Support Triage", Meeting.MeetingType.CLIENT, Meeting.Status.COMPLETED, 2),
        (-4,  "Sprint Planning & Backlog Refinement", Meeting.MeetingType.PLANNING, Meeting.Status.COMPLETED, 4),
        (-2,  "Mobile Responsive Layout Audit", Meeting.MeetingType.REVIEW, Meeting.Status.COMPLETED, 2),
        (0,   "Executive Leadership & OKR Progress", Meeting.MeetingType.INTERNAL, Meeting.Status.IN_PROGRESS, 3),
        (3,   "Q4 Infrastructure Scaling & Capacity", Meeting.MeetingType.PROJECT, Meeting.Status.SCHEDULED, 2),
        (6,   "Enterprise SSO & OAuth Integration", Meeting.MeetingType.PLANNING, Meeting.Status.SCHEDULED, 3),
        (9,   "Monthly Retrospective & Team Demo", Meeting.MeetingType.REVIEW, Meeting.Status.SCHEDULED, 1),
    ]

    all_users = list(User.objects.all())
    created_count = 0
    for offset_days, base_title, meeting_type, status, count in sample_meetings:
        target_date = today + timedelta(days=offset_days)
        for i in range(count):
            title = f"{base_title} #{i+1}" if count > 1 else base_title
            meeting, created = Meeting.objects.get_or_create(
                title=title,
                meeting_date=target_date,
                defaults={
                    'description': f'Automated activity tracking session for {title}.',
                    'start_time': time(9 + (i * 2) % 8, 0),
                    'end_time': time(10 + (i * 2) % 8, 0),
                    'meeting_type': meeting_type,
                    'status': status,
                    'created_by': user,
                    'location': 'Virtual / Zoom'
                }
            )
            if all_users:
                num_parts = min(len(all_users), random.randint(2, 4))
                meeting.participants.set(random.sample(all_users, num_parts))

            if created:
                created_count += 1

    print(f"🎉 SUCCESS! Added {created_count} new meetings across past 30 days and upcoming dates.")
    print("Refresh your dashboard to see the rich meeting activity chart curve!")

if __name__ == '__main__':
    seed_rich_meeting_activity()
