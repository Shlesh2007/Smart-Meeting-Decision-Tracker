import os
import random
from datetime import time, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.authentication.models import DepartmentChangeRequest
from apps.teams.models import Team
from apps.meetings.models import Meeting
from apps.discussions.models import Discussion
from apps.decisions.models import Decision, DecisionHistory
from apps.actions.models import ActionItem
from apps.notifications.models import Notification

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds rich production-ready demo data into PostgreSQL ensuring all charts, tabs, action items, and audit logs are fully populated.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force re-seeding even if data already exists in the database',
        )

    def handle(self, *args, **options):
        force = options.get('force', False)
        if not force and Meeting.objects.exists() and User.objects.count() > 3:
            self.stdout.write(self.style.SUCCESS('Database already contains populated data. Skipping seed.'))
            return

        self.stdout.write(self.style.WARNING('Wiping existing PostgreSQL database records...'))

        # Clear existing objects in dependency order
        Notification.objects.all().delete()
        ActionItem.objects.all().delete()
        DecisionHistory.objects.all().delete()
        Decision.objects.all().delete()
        Discussion.objects.all().delete()
        Meeting.objects.all().delete()
        Team.objects.all().delete()
        DepartmentChangeRequest.objects.all().delete()

        # Delete non-superusers
        User.objects.filter(is_superuser=False).delete()

        self.stdout.write(self.style.SUCCESS('Cleared existing PostgreSQL records.'))
        self.stdout.write(self.style.NOTICE('Creating User accounts in PostgreSQL...'))

        # 1. User Accounts Creation
        users_data = [
            {
                'username': 'Shlesh',
                'email': 'shlesh.darji@smdt.in',
                'first_name': 'Shlesh',
                'last_name': 'Darji',
                'role': User.Role.OWNER,
                'department': 'Executive & Engineering Strategy',
                'password': 'Shlesh@17'
            },
            {
                'username': 'owner',
                'email': 'aarav.sharma@smdt.in',
                'first_name': 'Aarav',
                'last_name': 'Sharma',
                'role': User.Role.OWNER,
                'department': 'Executive & Strategy',
                'password': 'owner123'
            },
            {
                'username': 'admin',
                'email': 'priya.patel@smdt.in',
                'first_name': 'Priya',
                'last_name': 'Patel',
                'role': User.Role.ADMIN,
                'department': 'Operations & Governance',
                'password': 'admin123'
            },
            {
                'username': 'organizer',
                'email': 'organizer@smdt.in',
                'first_name': 'Rohan',
                'last_name': 'Mehta',
                'role': User.Role.MANAGER,
                'department': 'Engineering & Tech Lead',
                'password': 'password123'
            },
            {
                'username': 'member',
                'email': 'member@smdt.in',
                'first_name': 'Ananya',
                'last_name': 'Iyer',
                'role': User.Role.MEMBER,
                'department': 'Backend Infrastructure',
                'password': 'password123'
            },
            {
                'username': 'manager',
                'email': 'rohan.mehta@smdt.in',
                'first_name': 'Rohan',
                'last_name': 'Mehta',
                'role': User.Role.MANAGER,
                'department': 'Engineering & Tech Lead',
                'password': 'manager123'
            },
            {
                'username': 'member1',
                'email': 'ananya.iyer@smdt.in',
                'first_name': 'Ananya',
                'last_name': 'Iyer',
                'role': User.Role.MEMBER,
                'department': 'Backend Infrastructure',
                'password': 'member123'
            },
            {
                'username': 'member2',
                'email': 'vikram.verma@smdt.in',
                'first_name': 'Vikram',
                'last_name': 'Verma',
                'role': User.Role.MEMBER,
                'department': 'Frontend & Mobile Guild',
                'password': 'member234'
            },
            {
                'username': 'member3',
                'email': 'rajesh.gupta@smdt.in',
                'first_name': 'Rajesh',
                'last_name': 'Gupta',
                'role': User.Role.MEMBER,
                'department': 'DevOps & Cloud Systems',
                'password': 'member345'
            },
            {
                'username': 'member4',
                'email': 'neha.joshi@smdt.in',
                'first_name': 'Neha',
                'last_name': 'Joshi',
                'role': User.Role.MEMBER,
                'department': 'QA & Security Assurance',
                'password': 'member456'
            },
        ]

        created_users = {}
        for udata in users_data:
            pwd = udata.pop('password')
            uObj, _ = User.objects.get_or_create(
                username=udata['username'],
                defaults=udata
            )
            uObj.set_password(pwd)
            uObj.save()
            created_users[udata['username']] = uObj

        shlesh = created_users['Shlesh']
        aarav = created_users['owner']
        priya = created_users['admin']
        rohan = created_users['manager']
        ananya = created_users['member1']
        vikram = created_users['member2']
        rajesh = created_users['member3']
        neha = created_users['member4']

        all_user_list = [shlesh, aarav, priya, rohan, ananya, vikram, rajesh, neha]

        # 2. Teams Creation
        tech_team = Team.objects.create(
            name='Tech & Architecture Division',
            description='Core infrastructure, API microservices, cloud deployments, and backend scalability.',
            created_by=shlesh
        )
        tech_team.members.set(all_user_list)

        product_team = Team.objects.create(
            name='Product Strategy & Design Guild',
            description='User experience research, UI design system, mobile responsiveness, and client feature rollouts.',
            created_by=priya
        )
        product_team.members.set([shlesh, priya, rohan, vikram, neha])

        data_team = Team.objects.create(
            name='Data Analytics & AI Cell',
            description='Analytics pipeline, automated decision metrics, and executive reporting models.',
            created_by=rohan
        )
        data_team.members.set([shlesh, aarav, rohan, ananya, rajesh])

        self.stdout.write(self.style.SUCCESS('Teams created.'))

        # 3. Department Change Requests
        DepartmentChangeRequest.objects.create(
            user=ananya,
            requested_department='Data Analytics & AI Cell',
            reason='Requesting transfer to work on algorithmic analytics models and data visualization.',
            status=DepartmentChangeRequest.Status.PENDING,
        )
        DepartmentChangeRequest.objects.create(
            user=vikram,
            requested_department='Product Strategy & Design Guild',
            reason='Focusing full-time on Design Systems and frontend responsiveness.',
            status=DepartmentChangeRequest.Status.APPROVED,
            reviewed_by=shlesh,
            review_notes='Approved during quarterly team organization review.'
        )
        DepartmentChangeRequest.objects.create(
            user=neha,
            requested_department='Cybersecurity & Penetration Testing',
            reason='Specializing in automated OAuth security audits and REST API verification.',
            status=DepartmentChangeRequest.Status.PENDING,
        )

        self.stdout.write(self.style.SUCCESS('Department Change Requests created.'))

        # 4. Generating 30-Day Activity Schedule
        today = timezone.localdate()

        locations = [
            'Google Meet: https://meet.google.com/ind-smdt-prd (Protected)',
            'Google Meet: https://meet.google.com/ind-smdt-pub (Public)',
            'Bengaluru Innovation Hub - Room 4A',
            'Mumbai Executive Boardroom - Floor 12',
            'Hyderabad Tech Lab - Conference B',
            'Google Meet: https://meet.google.com/tech-sync-nam (Protected)',
        ]

        meeting_titles_pool = [
            ("Q3 Microservices Architecture Sync", Meeting.MeetingType.PROJECT, tech_team),
            ("Daily Engineering & Sprint Standup", Meeting.MeetingType.INTERNAL, tech_team),
            ("UI Component Library & Viewport Audit", Meeting.MeetingType.REVIEW, product_team),
            ("Cloud Cost & AWS vs GCP Vendor Evaluation", Meeting.MeetingType.PLANNING, tech_team),
            ("Data Analytics & Metrics Aggregation Review", Meeting.MeetingType.PROJECT, data_team),
            ("Client Onboarding & Enterprise SLA Planning", Meeting.MeetingType.CLIENT, product_team),
            ("Security Vulnerability & Patch Assessment", Meeting.MeetingType.REVIEW, tech_team),
            ("Mobile App Performance & Offline Sync", Meeting.MeetingType.PROJECT, product_team),
            ("AI Decision Recommendation Model Demo", Meeting.MeetingType.OTHER, data_team),
            ("Quarterly Governance & Executive Review", Meeting.MeetingType.PLANNING, tech_team),
        ]

        discussions_pool = [
            ("Elasticsearch Query Latency Optimization", "Discussion on reducing API search response time below 40ms.", Discussion.Priority.CRITICAL),
            ("Form Field Spacing & Full-Width Inputs", "Ensuring standard 16px space-y grid gaps and 100% width select fields.", Discussion.Priority.HIGH),
            ("Tablet Viewport Touch Gesture Containment", "Configuring touch-action pan-y and momentum scrolling for mobile screens.", Discussion.Priority.CRITICAL),
            ("RBAC Role Hierarchy & Manager Permissions", "Allowing admins to delegate manager roles while protecting owner accounts.", Discussion.Priority.MEDIUM),
            ("Redis Cache Layer Invalidation Strategy", "Setting up 10-minute cache TTL and instant event invalidation.", Discussion.Priority.HIGH),
            ("Database Indexing & PostgreSQL Partitioning", "Optimizing query execution plan for high transaction volume.", Discussion.Priority.MEDIUM),
            ("Dark Mode Palette & Contrast Compliance", "Auditing WCAG 2.1 color contrast standards for dark theme tags.", Discussion.Priority.LOW),
        ]

        created_actions = []

        # Create meetings spread across past 30 days (days 29 ago to today) and upcoming 5 days
        for days_ago in range(29, -6, -1):
            target_date = today - timedelta(days=days_ago)
            
            # Pattern meeting counts per day to create a rich, wavy graph
            if days_ago % 5 == 0:
                m_count = 3
            elif days_ago % 3 == 0:
                m_count = 2
            elif days_ago % 2 == 0:
                m_count = 2
            else:
                m_count = 1

            if days_ago < 0:
                m_count = 2  # Upcoming meetings

            for i in range(m_count):
                title, m_type, team_obj = meeting_titles_pool[(days_ago + i) % len(meeting_titles_pool)]
                loc = locations[(days_ago + i) % len(locations)]
                creator = random.choice([shlesh, aarav, priya, rohan])
                
                # Determine status
                if days_ago > 0:
                    status = Meeting.Status.COMPLETED if (days_ago + i) % 7 != 0 else Meeting.Status.CANCELLED
                elif days_ago == 0:
                    status = Meeting.Status.IN_PROGRESS if i == 0 else Meeting.Status.SCHEDULED
                else:
                    status = Meeting.Status.SCHEDULED

                st_hour = 9 + (i * 2) % 8
                m_obj = Meeting.objects.create(
                    title=f"{title} ({target_date.strftime('%b %d')})",
                    description=f"Detailed deliberation on {title.lower()} with cross-functional stakeholders.",
                    meeting_date=target_date,
                    start_time=time(st_hour, 0, 0),
                    end_time=time(st_hour + 1, 30, 0),
                    location=loc,
                    meeting_type=m_type,
                    status=status,
                    created_by=creator,
                    team=team_obj
                )
                m_participants = random.sample(all_user_list, k=random.randint(3, 6))
                m_obj.participants.set(m_participants)
                discussion_author = random.choice(m_participants)
                decision_maker = random.choice([shlesh, aarav, priya, rohan])

                # Create Discussion
                disc_title, disc_desc, disc_prio = discussions_pool[(days_ago + i) % len(discussions_pool)]
                disc = Discussion.objects.create(
                    meeting=m_obj,
                    title=f"{disc_title} - Session #{i+1}",
                    description=disc_desc,
                    priority=disc_prio,
                    created_by=discussion_author
                )

                # Create Decision
                dec_status = Decision.Status.DECISION_MADE
                if i % 3 == 1 and days_ago > 0:
                    dec_status = Decision.Status.DEFERRED
                elif i % 4 == 3 and days_ago > 0:
                    dec_status = Decision.Status.REJECTED

                dec = Decision.objects.create(
                    discussion=disc,
                    status=dec_status,
                    decision=f"Approved execution plan for {disc_title.lower()} following team review." if dec_status == Decision.Status.DECISION_MADE else f"Resolution for {disc_title.lower()} pending additional data.",
                    reason="Target alignment reached with consensus from lead architects and project stakeholders.",
                    decided_by=decision_maker,
                    version=2
                )

                # Audit History for Decision
                DecisionHistory.objects.create(
                    decision=dec,
                    version=1,
                    status=Decision.Status.DEFERRED if dec_status == Decision.Status.DECISION_MADE else Decision.Status.NO_DECISION,
                    decision_text=f"Initial draft review for {disc_title.lower()}.",
                    reason="Pending architectural validation from lead developers.",
                    changed_by=discussion_author,
                    changed_at=timezone.now() - timedelta(days=days_ago + 1)
                )

                # Create Action Item if decision made
                if dec_status == Decision.Status.DECISION_MADE:
                    assignee = random.choice(all_user_list)
                    
                    if days_ago > 10:
                        act_status = ActionItem.Status.COMPLETED
                        comp_notes = f"Completed deliverables for {disc_title.lower()}. All automated verification tests passed cleanly."
                    elif days_ago > 3:
                        act_status = random.choice([ActionItem.Status.COMPLETED, ActionItem.Status.IN_PROGRESS, ActionItem.Status.TODO])
                        comp_notes = "Deployed updates to staging environment and verified API response times." if act_status == ActionItem.Status.COMPLETED else ""
                    else:
                        act_status = random.choice([ActionItem.Status.IN_PROGRESS, ActionItem.Status.TODO, ActionItem.Status.BLOCKED])
                        comp_notes = ""

                    act_due = target_date + timedelta(days=random.randint(1, 7))

                    action = ActionItem.objects.create(
                        decision=dec,
                        title=f"Execute {disc_title} Implementation",
                        description=f"Follow-up task logged during {m_obj.title}.",
                        completion_notes=comp_notes,
                        assigned_to=assignee,
                        priority=disc_prio,
                        due_date=act_due,
                        status=act_status,
                        created_by=creator
                    )
                    
                    if created_actions and random.choice([True, False]):
                        prev_action = random.choice(created_actions[-5:])
                        if prev_action.id != action.id:
                            action.dependencies.add(prev_action)
                            if prev_action.status != ActionItem.Status.COMPLETED and act_status == ActionItem.Status.TODO:
                                action.status = ActionItem.Status.BLOCKED
                                action.save(update_fields=['status'])
                    
                    created_actions.append(action)

        total_m = Meeting.objects.count()
        total_a = ActionItem.objects.count()
        total_d = Decision.objects.count()
        total_req = DepartmentChangeRequest.objects.count()

        self.stdout.write(self.style.SUCCESS('\n======================================================='))
        self.stdout.write(self.style.SUCCESS(' Successfully reset PostgreSQL & seeded rich activity data!'))
        self.stdout.write(self.style.SUCCESS('=======================================================\n'))
        self.stdout.write('User Accounts Created in PostgreSQL:')
        self.stdout.write(' 👑 OWNER   : username="Shlesh"   password="Shlesh@17"   (Shlesh Darji - Executive)')
        self.stdout.write(' 👑 OWNER   : username="owner"    password="owner123"    (Aarav Sharma - CEO)')
        self.stdout.write(' 🛡️ ADMIN   : username="admin"    password="admin123"    (Priya Patel - Operations)')
        self.stdout.write(' ⚡ MANAGER : username="manager"  password="manager123"  (Rohan Mehta - Tech Lead)')
        self.stdout.write(' 👤 MEMBER  : username="member1"  password="member123"   (Ananya Iyer - Backend)')
        self.stdout.write(' 👤 MEMBER  : username="member2"  password="member234"   (Vikram Verma - Frontend)')
        self.stdout.write(' 👤 MEMBER  : username="member3"  password="member345"   (Rajesh Gupta - DevOps)')
        self.stdout.write(' 👤 MEMBER  : username="member4"  password="member456"   (Neha Joshi - QA & Security)')
        self.stdout.write('\nPostgreSQL Data Metrics:')
        self.stdout.write(f' • Total Meetings Created: {total_m} (Fully populating 30D timeline!)')
        self.stdout.write(f' • Total Action Items Created: {total_a}')
        self.stdout.write(f' • Total Decisions & Logs Created: {total_d}')
        self.stdout.write(f' • Department Change Requests: {total_req}')
        self.stdout.write('=======================================================\n')
