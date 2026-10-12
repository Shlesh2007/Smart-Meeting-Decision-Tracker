from django.core.management.base import BaseCommand
import random
from datetime import timedelta, date, time
from django.utils import timezone
from apps.authentication.models import User
from apps.teams.models import Team
from apps.meetings.models import Meeting
from apps.discussions.models import Discussion
from apps.decisions.models import Decision
from apps.actions.models import ActionItem

class Command(BaseCommand):
    help = 'Populates mock visualization data for a given username (Usage: python manage.py seed_data <username>)'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Username of the target user to populate data for')

    def handle(self, *args, **options):
        target_username = options['username'].strip()
        self.stdout.write(f"\n🚀 Seeding visualization data for user '@{target_username}'...")

        try:
            user = User.objects.get(username=target_username)
            self.stdout.write(self.style.SUCCESS(f"✅ Found existing user: '{user.username}'"))
            if user.role == User.Role.UNASSIGNED:
                user.role = User.Role.ADMIN
                user.save()
        except User.DoesNotExist:
            user = User.objects.create_user(
                username=target_username,
                email=f"{target_username}@example.com",
                first_name=target_username.capitalize(),
                last_name="User",
                role=User.Role.ADMIN,
                department="Engineering & Technology"
            )
            user.set_password("Password123!")
            user.save()
            self.stdout.write(self.style.SUCCESS(f"✨ Created new user '{user.username}' (Password: Password123!)"))

        teammates_data = [
            ("alex_dev", "Alex", "Rivers", "alex@example.com", User.Role.MEMBER, "Engineering"),
            ("sarah_pm", "Sarah", "Chen", "sarah@example.com", User.Role.MANAGER, "Product Management"),
            ("david_design", "David", "Miller", "david@example.com", User.Role.MEMBER, "UI/UX Design"),
            ("emily_qa", "Emily", "Watson", "emily@example.com", User.Role.MEMBER, "Quality Assurance"),
            ("michael_exec", "Michael", "Scott", "michael@example.com", User.Role.OWNER, "Executive Office"),
        ]

        team_users = [user]
        for uname, fname, lname, email, role, dept in teammates_data:
            tm, created = User.objects.get_or_create(
                username=uname,
                defaults={'first_name': fname, 'last_name': lname, 'email': email, 'role': role, 'department': dept}
            )
            if created:
                tm.set_password("Password123!")
                tm.save()
            team_users.append(tm)

        teams_info = [
            ("Engineering & Core Tech", "Core software development, infrastructure, and API services."),
            ("Product Strategy & Design", "Product roadmap planning, UX research, and interface design."),
            ("Cross-Functional Operations", "Company-wide alignment, retrospectives, and client deliverables.")
        ]

        created_teams = []
        for t_name, t_desc in teams_info:
            team_obj, _ = Team.objects.get_or_create(name=t_name, defaults={'description': t_desc, 'created_by': user})
            team_obj.members.set(team_users)
            created_teams.append(team_obj)

        today = timezone.localdate()

        meetings_data_templates = [
            (-28, "Q3 Architecture & Microservices Refactor Sync", Meeting.MeetingType.PROJECT, Meeting.Status.COMPLETED, "Virtual / Zoom Room A"),
            (-25, "Client Onboarding & Integration Workshop - Acme Corp", Meeting.MeetingType.CLIENT, Meeting.Status.COMPLETED, "Conference Room 3B"),
            (-21, "Bi-Weekly Product Design & UI/UX Audit", Meeting.MeetingType.REVIEW, Meeting.Status.COMPLETED, "Virtual / Google Meet"),
            (-18, "Sprint 14 Retrospective & Velocity Review", Meeting.MeetingType.INTERNAL, Meeting.Status.COMPLETED, "Main Boardroom"),
            (-14, "Security & Compliance Annual Assessment", Meeting.MeetingType.OTHER, Meeting.Status.COMPLETED, "Virtual / MS Teams"),
            (-10, "Database Performance & Indexing Optimization", Meeting.MeetingType.PLANNING, Meeting.Status.COMPLETED, "Engineering Hub"),
            (-7,  "Customer Success Feedback & Feature Requests", Meeting.MeetingType.CLIENT, Meeting.Status.COMPLETED, "Virtual / Zoom"),
            (-4,  "Mobile App v2.0 Release Planning & Milestones", Meeting.MeetingType.PLANNING, Meeting.Status.COMPLETED, "Product Strategy Room"),
            (-2,  "API Gateway & OAuth Integration Technical Review", Meeting.MeetingType.REVIEW, Meeting.Status.COMPLETED, "Virtual / Zoom"),
            (0,   "Daily Tech Lead Standup & Blocker Resolution", Meeting.MeetingType.INTERNAL, Meeting.Status.IN_PROGRESS, "Agile Standup Area"),
            (0,   "Q4 Roadmap & Resource Allocation Strategy", Meeting.MeetingType.PLANNING, Meeting.Status.SCHEDULED, "Executive Suite"),
            (3,   "Sprint 15 Planning & Capacity Estimation", Meeting.MeetingType.PLANNING, Meeting.Status.SCHEDULED, "Main Boardroom"),
            (6,   "Executive Leadership Monthly Briefing", Meeting.MeetingType.REVIEW, Meeting.Status.SCHEDULED, "Executive Suite"),
            (10,  "Client Roadmap Demo & Stakeholder Feedback", Meeting.MeetingType.CLIENT, Meeting.Status.SCHEDULED, "Virtual / Zoom"),
            (14,  "Infrastructure & Cloud Migration Review", Meeting.MeetingType.PROJECT, Meeting.Status.SCHEDULED, "Tech Innovation Lab"),
            (18,  "End of Month Team Retrospective & Celebration", Meeting.MeetingType.INTERNAL, Meeting.Status.SCHEDULED, "Social Lounge")
        ]

        discussions_sample_data = [
            ("Database Sharding & Read-Replica Strategy", "Evaluating PostgreSQL read replicas vs DynamoDB for high-throughput decision logging.", Discussion.Priority.CRITICAL),
            ("OAuth 2.0 Security & JWT Refresh Token Rotation", "Reviewing token expiration policies and Brevo SMTP email OTP verification.", Discussion.Priority.HIGH),
            ("Frontend Dashboard Chart Responsiveness", "Optimizing Recharts & Ant Design layout rendering across mobile and desktop breakpoints.", Discussion.Priority.MEDIUM),
            ("API Rate Limiting & Throttle Architecture", "Implementing Redis throttling for public endpoints to prevent abuse.", Discussion.Priority.HIGH),
            ("User Role Permissions & Access Control Guard", "Enforcing strict Owner/Admin/Manager/Member role hierarchy across endpoints.", Discussion.Priority.CRITICAL),
            ("Automated CI/CD Pipeline & Deployment Strategy", "Setting up Render build triggers and Vitest unit testing suites.", Discussion.Priority.MEDIUM),
            ("Dark Mode Theme Transition & Radial Reveal Effect", "Refining CSS view-transition animations and high-contrast color scheme.", Discussion.Priority.LOW)
        ]

        decisions_sample_data = [
            (Decision.Status.DECISION_MADE, "Adopted PostgreSQL read replicas with automatic connection pooling.", "Improves query throughput by 300% during peak traffic hours."),
            (Decision.Status.DECISION_MADE, "Approved JWT 24-hour access tokens with 7-day sliding refresh window.", "Balances security guidelines with smooth user UX."),
            (Decision.Status.DECISION_MADE, "Standardized on Ant Design ConfigProvider for responsive dark mode tokens.", "Ensures consistent colors across desktop and mobile screens."),
            (Decision.Status.DEFERRED, "Deferred Redis clustering implementation until Q4 traffic review.", "Current single-node cache handles current peak loads effectively."),
            (Decision.Status.REJECTED, "Rejected third-party analytics vendor in favor of custom Django API views.", "Protects user data privacy and cuts recurring SaaS vendor costs."),
            (Decision.Status.DECISION_MADE, "Mandated OTP email verification for password reset and registration.", "Prevents fake account creation and unauthorized account takeovers.")
        ]

        action_titles_pool = [
            ("Set up PostgreSQL read-replica connection pooling in settings.py", ActionItem.Priority.CRITICAL, ActionItem.Status.COMPLETED, -5),
            ("Configure Brevo SMTP API credentials for transactional emails", ActionItem.Priority.HIGH, ActionItem.Status.COMPLETED, -8),
            ("Implement frontend dark mode CSS overrides for Antd buttons", ActionItem.Priority.MEDIUM, ActionItem.Status.COMPLETED, -10),
            ("Fix GitHub OAuth icon visibility on light mode hover state", ActionItem.Priority.CRITICAL, ActionItem.Status.COMPLETED, -2),
            ("Audit API endpoints for role-based permission checks (Owner/Admin)", ActionItem.Priority.HIGH, ActionItem.Status.IN_PROGRESS, 2),
            ("Write Vitest component tests for Navbar notification popover", ActionItem.Priority.MEDIUM, ActionItem.Status.IN_PROGRESS, 4),
            ("Optimize Dashboard Recharts responsive layout container bounds", ActionItem.Priority.HIGH, ActionItem.Status.TODO, 5),
            ("Configure automated database backup cron job on Render backend", ActionItem.Priority.CRITICAL, ActionItem.Status.BLOCKED, -3),
            ("Refactor ActionItem model dependencies & unblock logic triggers", ActionItem.Priority.HIGH, ActionItem.Status.TODO, 8),
            ("Update user profile modal department request workflow UI", ActionItem.Priority.LOW, ActionItem.Status.COMPLETED, -12),
            ("Add search query filtering to Dashboard analytics endpoint", ActionItem.Priority.CRITICAL, ActionItem.Status.COMPLETED, -1),
            ("Conduct load testing on Django channels WebSocket notification server", ActionItem.Priority.HIGH, ActionItem.Status.TODO, 12),
            ("Design exportable PDF summary reports for completed meetings", ActionItem.Priority.MEDIUM, ActionItem.Status.TODO, 15),
            ("Resolve mobile bottom navigation bar z-index clipping issue", ActionItem.Priority.HIGH, ActionItem.Status.COMPLETED, -4),
            ("Verify password reset OTP rate-limiting protection endpoints", ActionItem.Priority.CRITICAL, ActionItem.Status.IN_PROGRESS, -2),
            ("Update meeting recurrence group calculation for bi-weekly events", ActionItem.Priority.LOW, ActionItem.Status.TODO, 18),
            ("Review OpenAPI Swagger documentation schemas for Actions API", ActionItem.Priority.MEDIUM, ActionItem.Status.CANCELLED, -6),
            ("Setup Sentry exception tracking and error boundary logging", ActionItem.Priority.HIGH, ActionItem.Status.TODO, 7),
        ]

        created_meetings_count = 0
        created_discussions_count = 0
        created_decisions_count = 0
        created_actions_count = 0
        all_created_actions = []

        for offset_days, m_title, m_type, m_status, m_loc in meetings_data_templates:
            m_date = today + timedelta(days=offset_days)
            s_time = time(hour=random.choice([9, 10, 11, 14, 15]), minute=0)
            e_time = time(hour=s_time.hour + 1, minute=30)
            chosen_team = random.choice(created_teams)

            meeting_obj = Meeting.objects.create(
                title=m_title,
                description=f"Strategic sync on {m_title.lower()} with cross-functional stakeholders.",
                meeting_date=m_date,
                start_time=s_time,
                end_time=e_time,
                location=m_loc,
                meeting_type=m_type,
                status=m_status,
                created_by=user,
                team=chosen_team
            )
            meeting_obj.participants.set(random.sample(team_users, k=random.randint(2, len(team_users))))
            created_meetings_count += 1

            disc_samples = random.sample(discussions_sample_data, k=2)
            for d_title, d_desc, d_prio in disc_samples:
                disc_obj = Discussion.objects.create(
                    meeting=meeting_obj,
                    title=f"{d_title} ({meeting_obj.meeting_date})",
                    description=d_desc,
                    priority=d_prio,
                    created_by=random.choice(team_users)
                )
                created_discussions_count += 1

                dec_status, dec_text, dec_reason = random.choice(decisions_sample_data)
                decision_obj = Decision.objects.create(
                    discussion=disc_obj,
                    status=dec_status,
                    decision=dec_text,
                    reason=dec_reason,
                    decided_by=user,
                    decision_date=timezone.now() - timedelta(days=abs(offset_days))
                )
                created_decisions_count += 1

                action_count = random.randint(1, 2)
                selected_action_templates = random.sample(action_titles_pool, k=action_count)
                
                for act_title, act_prio, act_status, act_due_offset in selected_action_templates:
                    act_due_date = today + timedelta(days=act_due_offset)
                    comp_notes = "Delivered successfully. Validated in production environment." if act_status == ActionItem.Status.COMPLETED else ""

                    action_obj = ActionItem.objects.create(
                        decision=decision_obj,
                        title=f"{act_title} [{meeting_obj.title[:20]}...]",
                        description=f"Action item derived from discussion '{disc_obj.title}'. Must be completed by target milestone.",
                        completion_notes=comp_notes,
                        priority=act_prio,
                        due_date=act_due_date,
                        status=act_status,
                        created_by=user
                    )

                    assignees = {user}
                    assignees.update(random.sample(team_users, k=random.randint(1, 2)))
                    action_obj.assigned_to.set(list(assignees))
                    all_created_actions.append(action_obj)
                    created_actions_count += 1

        if len(all_created_actions) >= 4:
            for i in range(2, len(all_created_actions), 3):
                prereq = all_created_actions[i - 1]
                dependent_act = all_created_actions[i]
                dependent_act.dependencies.add(prereq)
                if prereq.status != ActionItem.Status.COMPLETED and dependent_act.status == ActionItem.Status.TODO:
                    dependent_act.status = ActionItem.Status.BLOCKED
                    dependent_act.save()

        self.stdout.write(self.style.SUCCESS(f"\n🎉 Seeded data for '{user.username}':"))
        self.stdout.write(f"  • {created_meetings_count} Meetings")
        self.stdout.write(f"  • {created_discussions_count} Discussions")
        self.stdout.write(f"  • {created_decisions_count} Decisions")
        self.stdout.write(f"  • {created_actions_count} Action Items\n")
