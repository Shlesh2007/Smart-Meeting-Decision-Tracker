import datetime
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.teams.models import Team
from apps.meetings.models import Meeting
from apps.discussions.models import Discussion
from apps.decisions.models import Decision
from apps.actions.models import ActionItem

User = get_user_model()

class Command(BaseCommand):
    help = 'Populates the local database with rich sample data (Teams, Meetings, Discussions, Decisions, and Action Items)'

    def handle(self, *args, **options):
        self.stdout.write('Seeding sample data...')

        # 1. Get or Create Owner User
        user = User.objects.first()
        if not user:
            user = User.objects.create_user(
                username='admin',
                email='admin@example.com',
                password='Password123!',
                first_name='Admin',
                last_name='User',
                role=User.Role.OWNER if hasattr(User, 'Role') else 'OWNER'
            )
            self.stdout.write(self.style.SUCCESS(f'Created default admin user "admin" (Password: Password123!)'))

        # 2. Add all existing users in the database to team members and meeting participants
        all_users = list(User.objects.all())

        # Create Teams
        team_eng, _ = Team.objects.get_or_create(
            name='Engineering & Architecture',
            defaults={
                'description': 'Core software development, architecture, and cloud infrastructure team.',
                'created_by': user
            }
        )
        for u in all_users:
            team_eng.members.add(u)

        team_product, _ = Team.objects.get_or_create(
            name='Product & Operations',
            defaults={
                'description': 'Product strategy, roadmap planning, and operational alignment.',
                'created_by': user
            }
        )
        for u in all_users:
            team_product.members.add(u)

        # 3. Create Meetings
        meeting_1, _ = Meeting.objects.get_or_create(
            title='Q4 Product Strategy & Architecture Alignment',
            defaults={
                'description': 'Quarterly review to decide on backend framework upgrades, database scaling strategies, and UX redesign timelines.',
                'meeting_date': timezone.now().date(),
                'start_time': datetime.time(10, 0),
                'end_time': datetime.time(11, 30),
                'location': 'Conference Room A / Zoom',
                'meeting_type': Meeting.MeetingType.PLANNING,
                'status': Meeting.Status.IN_PROGRESS,
                'created_by': user,
                'team': team_eng
            }
        )
        for u in all_users:
            meeting_1.participants.add(u)

        meeting_2, _ = Meeting.objects.get_or_create(
            title='Sprint 42 Retrospective & Action Items',
            defaults={
                'description': 'Reviewing completed user stories, delivery bottlenecks, and CI/CD deployment pipeline improvements.',
                'meeting_date': timezone.now().date() - datetime.timedelta(days=2),
                'start_time': datetime.time(14, 0),
                'end_time': datetime.time(15, 0),
                'location': 'Google Meet',
                'meeting_type': Meeting.MeetingType.REVIEW,
                'status': Meeting.Status.COMPLETED,
                'created_by': user,
                'team': team_eng
            }
        )
        for u in all_users:
            meeting_2.participants.add(u)

        # 4. Create Discussions
        disc_1, _ = Discussion.objects.get_or_create(
            meeting=meeting_1,
            title='Database Migration to Cloud PostgreSQL',
            defaults={
                'description': 'Discussion on migrating local SQLite instances to managed cloud PostgreSQL for production concurrency.',
                'priority': Discussion.Priority.HIGH,
                'created_by': user
            }
        )

        disc_2, _ = Discussion.objects.get_or_create(
            meeting=meeting_1,
            title='Adopting JWT Token Refreshing in Frontend',
            defaults={
                'description': 'Evaluating auto-refreshing access tokens in Axios interceptors to reduce unexpected user logouts.',
                'priority': Discussion.Priority.MEDIUM,
                'created_by': user
            }
        )

        disc_3, _ = Discussion.objects.get_or_create(
            meeting=meeting_2,
            title='Automated CI/CD Test Pipeline Execution',
            defaults={
                'description': 'Speeding up GitHub Actions build pipeline for Django backend and Vite frontend.',
                'priority': Discussion.Priority.HIGH,
                'created_by': user
            }
        )

        # 5. Create Decisions
        dec_1, _ = Decision.objects.get_or_create(
            discussion=disc_1,
            defaults={
                'status': Decision.Status.DECISION_MADE,
                'decision': 'Approved migration to PostgreSQL managed database by end of month.',
                'reason': 'Ensures multi-region availability, automatic daily snapshots, and better query performance.',
                'decided_by': user
            }
        )

        dec_2, _ = Decision.objects.get_or_create(
            discussion=disc_2,
            defaults={
                'status': Decision.Status.DEFERRED,
                'decision': 'Postponing token refresh implementation until Sprint 44.',
                'reason': 'Current 1-day token expiration is sufficient for MVP launch.',
                'decided_by': user
            }
        )

        dec_3, _ = Decision.objects.get_or_create(
            discussion=disc_3,
            defaults={
                'status': Decision.Status.DECISION_MADE,
                'decision': 'Enable parallel test execution in pytest-xdist on GitHub Actions.',
                'reason': 'Reduces CI execution time from 6 minutes to under 90 seconds.',
                'decided_by': user
            }
        )

        # 6. Create Action Items for ALL users in the database
        for u in all_users:
            action_1, _ = ActionItem.objects.get_or_create(
                title=f'Provision PostgreSQL instance on cloud provider ({u.username})',
                defaults={
                    'decision': dec_1,
                    'description': 'Set up production database cluster and configure SSL connection strings in backend environment variables.',
                    'assigned_to': u,
                    'priority': ActionItem.Priority.HIGH,
                    'due_date': timezone.now().date() + datetime.timedelta(days=7),
                    'status': ActionItem.Status.IN_PROGRESS,
                    'created_by': user
                }
            )

            action_2, _ = ActionItem.objects.get_or_create(
                title=f'Run Django schema migrations on Cloud DB ({u.username})',
                defaults={
                    'decision': dec_1,
                    'description': 'Execute python manage.py migrate against the new database URL.',
                    'assigned_to': u,
                    'priority': ActionItem.Priority.HIGH,
                    'due_date': timezone.now().date() + datetime.timedelta(days=10),
                    'status': ActionItem.Status.BLOCKED,
                    'created_by': user
                }
            )
            action_2.dependencies.add(action_1)

            action_3, _ = ActionItem.objects.get_or_create(
                title=f'Configure pytest-xdist in GitHub Actions workflow ({u.username})',
                defaults={
                    'decision': dec_3,
                    'description': 'Update .github/workflows/ci.yml to include -n auto flag.',
                    'assigned_to': u,
                    'priority': ActionItem.Priority.MEDIUM,
                    'due_date': timezone.now().date() + datetime.timedelta(days=3),
                    'status': ActionItem.Status.COMPLETED,
                    'created_by': user
                }
            )

        self.stdout.write(self.style.SUCCESS('\nSample data seeded successfully!'))
        self.stdout.write(self.style.SUCCESS(f'Created/verified 2 Teams, 2 Meetings, 3 Discussions, 3 Decisions, and 3 Action Items.'))
