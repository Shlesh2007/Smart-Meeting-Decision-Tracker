import os
import random
from datetime import time, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.teams.models import Team
from apps.meetings.models import Meeting
from apps.discussions.models import Discussion
from apps.decisions.models import Decision, DecisionHistory
from apps.actions.models import ActionItem

User = get_user_model()

class Command(BaseCommand):
    help = 'Wipes existing meeting/action tracker data and seeds rich demo data with Indian names and a fully populated 30-day activity graph.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Wiping existing database records...'))

        # Clear existing objects in order
        ActionItem.objects.all().delete()
        DecisionHistory.objects.all().delete()
        Decision.objects.all().delete()
        Discussion.objects.all().delete()
        Meeting.objects.all().delete()
        Team.objects.all().delete()

        # Delete non-superusers
        User.objects.filter(is_superuser=False).delete()

        self.stdout.write(self.style.SUCCESS('Cleared database records.'))
        self.stdout.write(self.style.NOTICE('Creating Indian User accounts...'))

        # 1. Indian Users Creation
        users_data = [
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

        aarav = created_users['owner']
        priya = created_users['admin']
        rohan = created_users['manager']
        ananya = created_users['member1']
        vikram = created_users['member2']
        rajesh = created_users['member3']
        neha = created_users['member4']

        all_user_list = [aarav, priya, rohan, ananya, vikram, rajesh, neha]

        # 2. Teams
        tech_team = Team.objects.create(
            name='Tech & Architecture Division',
            description='Core infrastructure, API microservices, cloud deployments, and backend scalability.',
            created_by=aarav
        )
        tech_team.members.set(all_user_list)

        product_team = Team.objects.create(
            name='Product Strategy & Design Guild',
            description='User experience research, UI design system, mobile responsiveness, and client feature rollouts.',
            created_by=priya
        )
        product_team.members.set([priya, rohan, vikram, neha])

        data_team = Team.objects.create(
            name='Data Analytics & AI Cell',
            description='Analytics pipeline, automated decision metrics, and executive reporting models.',
            created_by=rohan
        )
        data_team.members.set([aarav, rohan, ananya, rajesh])

        self.stdout.write(self.style.SUCCESS('Teams created.'))

        # 3. Generating 30-Day Activity Schedule
        today = timezone.localdate()

        locations = [
            'Google Meet: https://meet.google.com/ind-smdt-prd (Protected)',
            'Google Meet: https://meet.google.com/ind-smdt-pub (Public)',
            '🏢 Bengaluru Innovation Hub - Room 4A',
            '🏢 Mumbai Executive Boardroom - Floor 12',
            '🏢 Hyderabad Tech Lab - Conference B',
            'Google Meet: https://meet.google.com/tech-sync-nam (Protected)',
        ]

        meeting_titles_pool = [
            ("Q3 Microservices Architecture Sync", Meeting.MeetingType.PROJECT, tech_team),
            ("Daily Engineering & Sprint Standup", Meeting.MeetingType.INTERNAL, tech_team),
            ("UI Component Library & Tablet Viewport Audit", Meeting.MeetingType.REVIEW, product_team),
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
            ("Tablet Viewport Touch Gesture Containment", "Configuring touch-action pan-y and momentum scrolling for 960x1440 screens.", Discussion.Priority.CRITICAL),
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
                m_count = 1
            else:
                m_count = 2

            if days_ago < 0:
                m_count = 1  # Upcoming meetings

            for i in range(m_count):
                title, m_type, team_obj = meeting_titles_pool[(days_ago + i) % len(meeting_titles_pool)]
                loc = locations[(days_ago + i) % len(locations)]
                creator = random.choice([aarav, priya, rohan])
                
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
                decision_maker = random.choice([aarav, priya, rohan])

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
                    version=1
                )

                # Create Action Item if decision made
                if dec_status == Decision.Status.DECISION_MADE:
                    assignee = random.choice([rohan, ananya, vikram, rajesh, neha])
                    
                    if days_ago > 10:
                        act_status = ActionItem.Status.COMPLETED
                        comp_notes = f"Completed deliverables for {disc_title.lower()}. Verification tests passed cleanly."
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
        self.stdout.write(self.style.SUCCESS('\n======================================================='))
        self.stdout.write(self.style.SUCCESS(' Successfully reset database & seeded 30-day activity data!'))
        self.stdout.write(self.style.SUCCESS('=======================================================\n'))
        self.stdout.write('Indian User Accounts Created:')
        self.stdout.write(' 👑 OWNER   : username="owner"    password="owner123"    (Aarav Sharma - CEO)')
        self.stdout.write(' 🛡️ ADMIN   : username="admin"    password="admin123"    (Priya Patel - Operations)')
        self.stdout.write(' ⚡ MANAGER : username="manager"  password="manager123"  (Rohan Mehta - Tech Lead)')
        self.stdout.write(' 👤 MEMBER  : username="member1"  password="member123"   (Ananya Iyer - Backend)')
        self.stdout.write(' 👤 MEMBER  : username="member2"  password="member234"   (Vikram Verma - Frontend)')
        self.stdout.write(' 👤 MEMBER  : username="member3"  password="member345"   (Rajesh Gupta - DevOps)')
        self.stdout.write(' 👤 MEMBER  : username="member4"  password="member456"   (Neha Joshi - QA & Security)')
        self.stdout.write('\nFeatured Locations & Metrics:')
        self.stdout.write(' • Google Meet: https://meet.google.com/ind-smdt-prd (Protected)')
        self.stdout.write(' • Google Meet: https://meet.google.com/ind-smdt-pub (Public)')
        self.stdout.write(' • 🏢 Bengaluru Innovation Hub - Room 4A')
        self.stdout.write(' • 🏢 Mumbai Executive Boardroom - Floor 12')
        self.stdout.write(f' • Total Meetings Created: {total_m} (Fully populating 30D timeline!)')
        self.stdout.write(f' • Total Action Items Created: {total_a}')
        self.stdout.write('=======================================================\n')
