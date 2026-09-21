import os
import sys
import django
from datetime import date, timedelta, time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_meeting_tracker.settings')
django.setup()

from apps.authentication.models import User
from apps.teams.models import Team
from apps.meetings.models import Meeting
from apps.discussions.models import Discussion
from apps.decisions.models import Decision
from apps.actions.models import ActionItem

def seed_shlesh_user_and_data():
    print("🚀 Seeding user 'Shlesh' and associated sample data...")

    # 1. Create or update user Shlesh
    username = "Shlesh"
    password = "Shlesh@17"
    email = "shleshdarji317@gmail.com"

    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            'email': email,
            'first_name': 'Shlesh',
            'last_name': 'Darji',
            'role': User.Role.OWNER,
            'department': 'Engineering',
            'is_staff': True,
            'is_superuser': True,
        }
    )
    user.email = email
    user.first_name = 'Shlesh'
    user.last_name = 'Darji'
    user.role = User.Role.OWNER
    user.department = 'Engineering'
    user.is_staff = True
    user.is_superuser = True
    user.set_password(password)
    user.save()

    if created:
        print(f"✅ Created User '{username}' with password '{password}' (Role: OWNER / Superuser)")
    else:
        print(f"✅ Updated existing User '{username}' with password '{password}' (Role: OWNER / Superuser)")

    # 2. Create Teams
    team_eng, _ = Team.objects.get_or_create(
        name="Engineering & Core Platform",
        defaults={
            'description': 'Main development team responsible for Smart Meeting Decision Tracker architecture.',
            'created_by': user
        }
    )
    team_eng.members.add(user)

    team_prod, _ = Team.objects.get_or_create(
        name="Product & UI/UX Design",
        defaults={
            'description': 'Product managers and UI designers working on user experience.',
            'created_by': user
        }
    )
    team_prod.members.add(user)

    today = date.today()

    # 3. Create Sample Meetings
    meetings_data = [
        {
            "title": "Q3 Architecture & Security Baseline Review",
            "date": today - timedelta(days=5),
            "start": time(10, 0),
            "end": time(11, 30),
            "type": Meeting.MeetingType.REVIEW,
            "status": Meeting.Status.COMPLETED,
            "team": team_eng,
            "discussions": [
                {
                    "title": "Database Indexing & PostgreSQL Performance",
                    "agenda": "Review query optimization for decision log lookups.",
                    "notes": "Queries under high volume take ~120ms; index on meeting_date reduces time to 15ms.",
                    "decision": "Implement B-Tree indexes on meeting_date, assigned_to, and status fields.",
                    "status": Decision.Status.DECISION_MADE,
                    "reason": "Dramatic speed improvements for dashboard metric aggregation.",
                    "actions": [
                        {"title": "Apply database migration for composite index on meeting_date", "priority": ActionItem.Priority.HIGH, "status": ActionItem.Status.COMPLETED, "due": today - timedelta(days=2)},
                        {"title": "Benchmark API response latency post-indexing", "priority": ActionItem.Priority.MEDIUM, "status": ActionItem.Status.IN_PROGRESS, "due": today + timedelta(days=3)}
                    ]
                }
            ]
        },
        {
            "title": "Weekly Platform Standup & Deliverable Triage",
            "date": today - timedelta(days=2),
            "start": time(14, 0),
            "end": time(15, 0),
            "type": Meeting.MeetingType.INTERNAL,
            "status": Meeting.Status.COMPLETED,
            "team": team_eng,
            "discussions": [
                {
                    "title": "OAuth 2.0 Integration (Google & GitHub)",
                    "agenda": "Finalize social authentication flows for mobile & web.",
                    "notes": "Both Google and GitHub callback handlers are operational.",
                    "decision": "Approve OAuth 2.0 deployment with PKCE flow enabled for mobile.",
                    "status": Decision.Status.DECISION_MADE,
                    "reason": "Meets modern security compliance and improves user onboarding speed.",
                    "actions": [
                        {"title": "Verify mobile deep-link redirection for OAuth tokens", "priority": ActionItem.Priority.CRITICAL, "status": ActionItem.Status.TODO, "due": today + timedelta(days=2)}
                    ]
                }
            ]
        },
        {
            "title": "Sprint Planning: Mobile Native APK & Deployment",
            "date": today + timedelta(days=1),
            "start": time(11, 0),
            "end": time(12, 0),
            "type": Meeting.MeetingType.PLANNING,
            "status": Meeting.Status.SCHEDULED,
            "team": team_prod,
            "discussions": []
        }
    ]

    for mdata in meetings_data:
        meeting, m_created = Meeting.objects.get_or_create(
            title=mdata["title"],
            meeting_date=mdata["date"],
            defaults={
                'description': f'Discussion and execution tracking for {mdata["title"]}.',
                'start_time': mdata["start"],
                'end_time': mdata["end"],
                'meeting_type': mdata["type"],
                'status': mdata["status"],
                'created_by': user,
                'team': mdata["team"],
                'location': 'Virtual / Zoom'
            }
        )
        meeting.participants.add(user)

        for disc_data in mdata.get("discussions", []):
            disc, _ = Discussion.objects.get_or_create(
                meeting=meeting,
                title=disc_data["title"],
                defaults={
                    'agenda_item': disc_data["agenda"],
                    'discussion_notes': disc_data["notes"]
                }
            )
            decision, _ = Decision.objects.get_or_create(
                discussion=disc,
                defaults={
                    'status': disc_data["status"],
                    'decision': disc_data["decision"],
                    'reason': disc_data["reason"],
                    'decided_by': user,
                }
            )
            for act_data in disc_data.get("actions", []):
                ActionItem.objects.get_or_create(
                    decision=decision,
                    title=act_data["title"],
                    defaults={
                        'description': f'Action item generated from meeting decision: {act_data["title"]}',
                        'assigned_to': user,
                        'priority': act_data["priority"],
                        'due_date': act_data["due"],
                        'status': act_data["status"]
                    }
                )

    print("🎉 All sample data (Teams, Meetings, Decisions, Action Items) seeded successfully for Shlesh!")

if __name__ == '__main__':
    seed_shlesh_user_and_data()
