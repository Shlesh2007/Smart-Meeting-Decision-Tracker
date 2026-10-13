import logging
from datetime import timedelta, time
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction

from apps.authentication.models import Organization, OrganizationMembership
from apps.teams.models import Team
from apps.meetings.models import Meeting
from apps.discussions.models import Discussion
from apps.decisions.models import Decision, DecisionHistory
from apps.actions.models import ActionItem
from apps.notifications.models import Notification

logger = logging.getLogger(__name__)
User = get_user_model()

DEFAULT_PASSWORD = "Shlesh@17"

SEED_ORGANIZATIONS = [
    {
        "name": "Acme Technologies",
        "description": "Enterprise Cloud Infrastructure & Developer Platforms",
        "owner": {
            "username": "alex.turner",
            "email": "alex.turner@acme.io",
            "first_name": "Alex",
            "last_name": "Turner",
            "role": User.Role.OWNER,
            "department": "Executive & Strategy",
        },
        "users": [
            {
                "username": "david.miller",
                "email": "david.miller@acme.io",
                "first_name": "David",
                "last_name": "Miller",
                "role": User.Role.ADMIN,
                "department": "Engineering & Tech Lead",
            },
            {
                "username": "rachel.green",
                "email": "rachel.green@acme.io",
                "first_name": "Rachel",
                "last_name": "Green",
                "role": User.Role.MANAGER,
                "department": "Product Management",
            },
            {
                "username": "jordan.lee",
                "email": "jordan.lee@acme.io",
                "first_name": "Jordan",
                "last_name": "Lee",
                "role": User.Role.MEMBER,
                "department": "Engineering & Tech Lead",
            },
            {
                "username": "priya.patel",
                "email": "priya.patel@acme.io",
                "first_name": "Priya",
                "last_name": "Patel",
                "role": User.Role.MEMBER,
                "department": "DevOps & SRE",
            },
            {
                "username": "samuel.clark",
                "email": "samuel.clark@acme.io",
                "first_name": "Samuel",
                "last_name": "Clark",
                "role": User.Role.MEMBER,
                "department": "Product Management",
            },
        ],
        "teams": [
            {
                "name": "Platform Core & Infrastructure",
                "description": "Distributed cloud architecture, database reliability, and tenant partitioning.",
                "members": ["david.miller", "jordan.lee", "priya.patel"],
            },
            {
                "name": "Product Experience & APIs",
                "description": "Customer-facing web portals, GraphQL federation, and SDK developer experience.",
                "members": ["rachel.green", "samuel.clark", "jordan.lee"],
            },
        ],
        "meetings": [
            {
                "title": "Q4 Platform Architecture & Cloud Scalability Review",
                "description": "High-level review of database sharding, latency SLAs, and regional failover architecture.",
                "days_offset": -4,
                "start_time": time(10, 0),
                "end_time": time(11, 30),
                "location": "https://meet.google.com/acm-plat-arch",
                "meeting_type": Meeting.MeetingType.PROJECT,
                "status": Meeting.Status.COMPLETED,
                "team_name": "Platform Core & Infrastructure",
                "creator_username": "david.miller",
                "participant_usernames": ["alex.turner", "david.miller", "jordan.lee", "priya.patel"],
                "discussions": [
                    {
                        "title": "Database Partitioning & Sharding Strategy for High Throughput",
                        "description": "Evaluating horizontal tenant sharding vs read replica pooling to support 10x traffic growth.",
                        "priority": Discussion.Priority.CRITICAL,
                        "creator_username": "david.miller",
                        "decision": {
                            "status": Decision.Status.DECISION_MADE,
                            "decision": "Adopt Citus PostgreSQL extension for distributed horizontal sharding across tenant partitions.",
                            "reason": "Eliminates single node write bottlenecks while maintaining relational SQL semantics and transaction safety.",
                            "decided_by_username": "alex.turner",
                            "actions": [
                                {
                                    "key": "acme_act_1",
                                    "title": "Benchmark PostgreSQL partition performance with 10M synthetic records",
                                    "description": "Run automated k6 performance tests against partitioned staging cluster.",
                                    "priority": ActionItem.Priority.HIGH,
                                    "status": ActionItem.Status.COMPLETED,
                                    "days_due": -2,
                                    "assigned_usernames": ["jordan.lee"],
                                    "completion_notes": "Completed benchmarks. Partition pruning showed a 68% latency reduction.",
                                },
                                {
                                    "key": "acme_act_2",
                                    "title": "Draft database migration rollback runbook and tenant failover strategy",
                                    "description": "Comprehensive document outlining disaster recovery steps and data integrity checks.",
                                    "priority": ActionItem.Priority.HIGH,
                                    "status": ActionItem.Status.COMPLETED,
                                    "days_due": -1,
                                    "assigned_usernames": ["priya.patel"],
                                    "completion_notes": "Runbook approved by Lead SRE and verified against staging snapshot.",
                                    "depends_on": ["acme_act_1"],
                                },
                                {
                                    "key": "acme_act_3",
                                    "title": "Execute staging database migration and measure latency deltas",
                                    "description": "Migrate staging database to Citus cluster and verify p99 query latency.",
                                    "priority": ActionItem.Priority.CRITICAL,
                                    "status": ActionItem.Status.IN_PROGRESS,
                                    "days_due": 3,
                                    "assigned_usernames": ["jordan.lee", "priya.patel"],
                                    "completion_notes": "",
                                    "depends_on": ["acme_act_2"],
                                },
                                {
                                    "key": "acme_act_4",
                                    "title": "Production shard cluster deployment & cutover execution",
                                    "description": "Execute final zero-downtime cutover during scheduled maintenance window.",
                                    "priority": ActionItem.Priority.CRITICAL,
                                    "status": ActionItem.Status.BLOCKED,
                                    "days_due": 7,
                                    "assigned_usernames": ["david.miller", "priya.patel"],
                                    "completion_notes": "",
                                    "depends_on": ["acme_act_3"],
                                },
                            ],
                        },
                    },
                    {
                        "title": "Multi-Region Cloud Failover and RPO/RTO Targets",
                        "description": "Establishing recovery time and recovery point objectives across US-East and EU-Central regions.",
                        "priority": Discussion.Priority.HIGH,
                        "creator_username": "priya.patel",
                        "decision": {
                            "status": Decision.Status.DECISION_MADE,
                            "decision": "Mandate cross-region warm standbys with 15-minute RPO and automated Route53 health checks.",
                            "reason": "Guarantees enterprise tier SLA of 99.99% availability during cloud availability zone outages.",
                            "decided_by_username": "alex.turner",
                            "actions": [
                                {
                                    "key": "acme_act_5",
                                    "title": "Audit Terraform multi-region disaster recovery templates",
                                    "description": "Ensure infrastructure-as-code accurately reflects cross-region replica configurations.",
                                    "priority": ActionItem.Priority.HIGH,
                                    "status": ActionItem.Status.TODO,
                                    "days_due": -3,  # Overdue action item!
                                    "assigned_usernames": ["priya.patel"],
                                    "completion_notes": "",
                                }
                            ],
                        },
                    },
                ],
            },
            {
                "title": "Weekly Sprint Planning - Developer Experience & APIs",
                "description": "Bi-weekly sprint backlog refinement and developer tooling enhancement discussion.",
                "days_offset": 2,
                "start_time": time(14, 0),
                "end_time": time(15, 0),
                "location": "https://meet.google.com/acm-dev-sprint",
                "meeting_type": Meeting.MeetingType.PLANNING,
                "status": Meeting.Status.SCHEDULED,
                "team_name": "Product Experience & APIs",
                "creator_username": "rachel.green",
                "participant_usernames": ["rachel.green", "samuel.clark", "jordan.lee"],
                "discussions": [
                    {
                        "title": "GraphQL Subscriptions vs WebSocket API for Real-time Feeds",
                        "description": "Selecting optimal real-time communication protocol for live meeting action feeds.",
                        "priority": Discussion.Priority.MEDIUM,
                        "creator_username": "samuel.clark",
                        "decision": {
                            "status": Decision.Status.DEFERRED,
                            "decision": "Defer decision to next sprint pending benchmark results on mobile socket battery drain.",
                            "reason": "Need battery consumption data on iOS and Android client SDKs before committing.",
                            "decided_by_username": "rachel.green",
                            "actions": [],
                        },
                    }
                ],
            },
        ],
    },
    {
        "name": "Nexus Health Tech",
        "description": "Digital Health, Telemedicine & AI-Driven Clinical Diagnostics",
        "owner": {
            "username": "sarah.lin",
            "email": "sarah.lin@nexushealth.ai",
            "first_name": "Sarah",
            "last_name": "Lin",
            "role": User.Role.OWNER,
            "department": "Executive & Strategy",
        },
        "users": [
            {
                "username": "marcus.vance",
                "email": "marcus.vance@nexushealth.ai",
                "first_name": "Marcus",
                "last_name": "Vance",
                "role": User.Role.ADMIN,
                "department": "Clinical Operations",
            },
            {
                "username": "elena.gomez",
                "email": "elena.gomez@nexushealth.ai",
                "first_name": "Elena",
                "last_name": "Gomez",
                "role": User.Role.MANAGER,
                "department": "Data & AI Research",
            },
            {
                "username": "nathan.wu",
                "email": "nathan.wu@nexushealth.ai",
                "first_name": "Nathan",
                "last_name": "Wu",
                "role": User.Role.MEMBER,
                "department": "Data & AI Research",
            },
            {
                "username": "clara.oswald",
                "email": "clara.oswald@nexushealth.ai",
                "first_name": "Clara",
                "last_name": "Oswald",
                "role": User.Role.MEMBER,
                "department": "Regulatory & Privacy",
            },
        ],
        "teams": [
            {
                "name": "Clinical AI & Diagnostics",
                "description": "Deep learning models for medical imaging, diagnostic assistance, and clinical accuracy validation.",
                "members": ["elena.gomez", "nathan.wu"],
            },
            {
                "name": "Regulatory & HIPAA Compliance",
                "description": "Healthcare privacy standards, FDA documentation, and audit security compliance.",
                "members": ["marcus.vance", "clara.oswald"],
            },
        ],
        "meetings": [
            {
                "title": "Clinical AI Diagnostics Model Validation & FDA Review",
                "description": "Review of diagnostic model sensitivity, false positive mitigations, and FDA 510(k) pathway readiness.",
                "days_offset": -6,
                "start_time": time(11, 0),
                "end_time": time(12, 30),
                "location": "Boardroom A (Clinical Wing) & Zoom",
                "meeting_type": Meeting.MeetingType.REVIEW,
                "status": Meeting.Status.COMPLETED,
                "team_name": "Clinical AI & Diagnostics",
                "creator_username": "marcus.vance",
                "participant_usernames": ["sarah.lin", "marcus.vance", "elena.gomez", "nathan.wu", "clara.oswald"],
                "discussions": [
                    {
                        "title": "FDA 510(k) Pre-Market Notification Submission Requirements",
                        "description": "Documentation requirements for automated radiological image classification system.",
                        "priority": Discussion.Priority.CRITICAL,
                        "creator_username": "clara.oswald",
                        "decision": {
                            "status": Decision.Status.DECISION_MADE,
                            "decision": "Proceed with 510(k) submission using multi-center cohort validation dataset.",
                            "reason": "Cohort size exceeds FDA statistical power threshold with 98.4% diagnostic sensitivity.",
                            "decided_by_username": "sarah.lin",
                            "actions": [
                                {
                                    "key": "nexus_act_1",
                                    "title": "Compile blinded multi-center clinical validation data report",
                                    "description": "Assemble retrospective clinical trial results across 4 hospital partner sites.",
                                    "priority": ActionItem.Priority.HIGH,
                                    "status": ActionItem.Status.COMPLETED,
                                    "days_due": -3,
                                    "assigned_usernames": ["nathan.wu"],
                                    "completion_notes": "Completed. Report signed by principal medical investigator.",
                                },
                                {
                                    "key": "nexus_act_2",
                                    "title": "Finalize radiologist cross-validation dataset and inter-rater reliability scores",
                                    "description": "Calculate Cohen Kappa score across triple-read diagnostic scans.",
                                    "priority": ActionItem.Priority.CRITICAL,
                                    "status": ActionItem.Status.COMPLETED,
                                    "days_due": -1,
                                    "assigned_usernames": ["elena.gomez"],
                                    "completion_notes": "Cohen Kappa coefficient reached 0.92, surpassing required threshold.",
                                    "depends_on": ["nexus_act_1"],
                                },
                                {
                                    "key": "nexus_act_3",
                                    "title": "Assemble FDA 510(k) electronic technical documentation binder",
                                    "description": "Format clinical data into FDA eSTAR electronic submission structure.",
                                    "priority": ActionItem.Priority.CRITICAL,
                                    "status": ActionItem.Status.IN_PROGRESS,
                                    "days_due": 5,
                                    "assigned_usernames": ["clara.oswald", "marcus.vance"],
                                    "completion_notes": "",
                                    "depends_on": ["nexus_act_2"],
                                },
                            ],
                        },
                    },
                    {
                        "title": "Patient Data Anonymization Pipeline for LLM Training",
                        "description": "Removing PHI (Protected Health Information) from clinical notes prior to embedding ingestion.",
                        "priority": Discussion.Priority.HIGH,
                        "creator_username": "elena.gomez",
                        "decision": {
                            "status": Decision.Status.DECISION_MADE,
                            "decision": "Deploy on-premise NER (Named Entity Recognition) de-identification gateway.",
                            "reason": "Guarantees zero leakage of patient identifiers into commercial AI APIs.",
                            "decided_by_username": "sarah.lin",
                            "actions": [
                                {
                                    "key": "nexus_act_4",
                                    "title": "Penetration test patient data tokenization gateway",
                                    "description": "Execute adversarial prompt injection and PHI re-identification tests.",
                                    "priority": ActionItem.Priority.HIGH,
                                    "status": ActionItem.Status.TODO,
                                    "days_due": -5,  # Overdue action item!
                                    "assigned_usernames": ["nathan.wu"],
                                    "completion_notes": "",
                                }
                            ],
                        },
                    },
                ],
            },
            {
                "title": "Telehealth Patient Portal 2.0 Security Sync",
                "description": "End-to-end encryption architecture for video consultations and biometric patient check-ins.",
                "days_offset": 1,
                "start_time": time(15, 30),
                "end_time": time(16, 30),
                "location": "https://meet.google.com/nex-tele-sec",
                "meeting_type": Meeting.MeetingType.INTERNAL,
                "status": Meeting.Status.SCHEDULED,
                "team_name": "Regulatory & HIPAA Compliance",
                "creator_username": "marcus.vance",
                "participant_usernames": ["marcus.vance", "clara.oswald", "sarah.lin"],
                "discussions": [
                    {
                        "title": "WebRTC End-to-End Media Encryption Standards",
                        "description": "Evaluating Insertable Streams WebRTC encryption against browser interoperability limits.",
                        "priority": Discussion.Priority.HIGH,
                        "creator_username": "marcus.vance",
                        "decision": {
                            "status": Decision.Status.DECISION_MADE,
                            "decision": "Approve WebRTC Insertable Streams with per-session key ratchet.",
                            "reason": "Meets HIPAA §164.312 transmission security requirements while preserving sub-150ms video latency.",
                            "decided_by_username": "marcus.vance",
                            "actions": [
                                {
                                    "key": "nexus_act_5",
                                    "title": "Implement WebRTC Insertable Streams key ratchet in React client",
                                    "description": "Integrate crypto worker into client media pipeline.",
                                    "priority": ActionItem.Priority.HIGH,
                                    "status": ActionItem.Status.TODO,
                                    "days_due": 6,
                                    "assigned_usernames": ["clara.oswald"],
                                    "completion_notes": "",
                                }
                            ],
                        },
                    }
                ],
            },
        ],
    },
    {
        "name": "Apex Creative Studio",
        "description": "Digital Product Design, Brand Identity & Interactive Web Experiences",
        "owner": {
            "username": "maya.foster",
            "email": "maya.foster@apexstudio.com",
            "first_name": "Maya",
            "last_name": "Foster",
            "role": User.Role.OWNER,
            "department": "Executive & Strategy",
        },
        "users": [
            {
                "username": "liam.brooks",
                "email": "liam.brooks@apexstudio.com",
                "first_name": "Liam",
                "last_name": "Brooks",
                "role": User.Role.ADMIN,
                "department": "Client Strategy",
            },
            {
                "username": "sophia.chen",
                "email": "sophia.chen@apexstudio.com",
                "first_name": "Sophia",
                "last_name": "Chen",
                "role": User.Role.MANAGER,
                "department": "UI/UX Design",
            },
            {
                "username": "ethan.hunt",
                "email": "ethan.hunt@apexstudio.com",
                "first_name": "Ethan",
                "last_name": "Hunt",
                "role": User.Role.MEMBER,
                "department": "UI/UX Design",
            },
            {
                "username": "chloe.bennett",
                "email": "chloe.bennett@apexstudio.com",
                "first_name": "Chloe",
                "last_name": "Bennett",
                "role": User.Role.MEMBER,
                "department": "Frontend Experience",
            },
        ],
        "teams": [
            {
                "name": "Design Systems & Brand Strategy",
                "description": "Design tokens, component library accessibility, and brand consistency.",
                "members": ["sophia.chen", "ethan.hunt"],
            },
            {
                "name": "Creative Frontend & Prototyping",
                "description": "Interactive WebGL visualizers, micro-animations, and high-performance React frontends.",
                "members": ["liam.brooks", "chloe.bennett"],
            },
        ],
        "meetings": [
            {
                "title": "Brand Identity Refresh & Design System 3.0 Sync",
                "description": "Unveiling new design tokens, WCAG 2.1 AAA contrast guidelines, and React component kit.",
                "days_offset": -3,
                "start_time": time(13, 0),
                "end_time": time(14, 30),
                "location": "https://meet.google.com/apx-design-sys",
                "meeting_type": Meeting.MeetingType.REVIEW,
                "status": Meeting.Status.COMPLETED,
                "team_name": "Design Systems & Brand Strategy",
                "creator_username": "sophia.chen",
                "participant_usernames": ["maya.foster", "liam.brooks", "sophia.chen", "ethan.hunt", "chloe.bennett"],
                "discussions": [
                    {
                        "title": "WCAG 2.1 AAA Accessibility Compliance Across Web Components",
                        "description": "Auditing color tokens, focus rings, and screen-reader ARIA announcements.",
                        "priority": Discussion.Priority.HIGH,
                        "creator_username": "ethan.hunt",
                        "decision": {
                            "status": Decision.Status.DECISION_MADE,
                            "decision": "Enforce 7:1 contrast ratio across all text tokens and mandate visible keyboard focus rings.",
                            "reason": "Ensures design system achieves enterprise accessibility certification for government and fintech clients.",
                            "decided_by_username": "maya.foster",
                            "actions": [
                                {
                                    "key": "apex_act_1",
                                    "title": "Audit Figma design tokens and publish revised AAA color palette",
                                    "description": "Re-map dark and light mode color pairs in Figma Variables.",
                                    "priority": ActionItem.Priority.HIGH,
                                    "status": ActionItem.Status.COMPLETED,
                                    "days_due": -2,
                                    "assigned_usernames": ["ethan.hunt"],
                                    "completion_notes": "All 48 color tokens updated in Figma and verified via Stark accessibility plugin.",
                                },
                                {
                                    "key": "apex_act_2",
                                    "title": "Refactor Tailwind theme configuration to match new Figma design tokens",
                                    "description": "Export variables to tailwind.config.js and CSS variables.",
                                    "priority": ActionItem.Priority.HIGH,
                                    "status": ActionItem.Status.COMPLETED,
                                    "days_due": -1,
                                    "assigned_usernames": ["chloe.bennett"],
                                    "completion_notes": "Tailwind palette synced. Automated CSS bundle size remains under 24KB.",
                                    "depends_on": ["apex_act_1"],
                                },
                                {
                                    "key": "apex_act_3",
                                    "title": "Integrate axe-core automated accessibility tests in GitHub Actions CI",
                                    "description": "Block pull requests with accessibility violations in Storybook components.",
                                    "priority": ActionItem.Priority.MEDIUM,
                                    "status": ActionItem.Status.IN_PROGRESS,
                                    "days_due": 4,
                                    "assigned_usernames": ["chloe.bennett", "ethan.hunt"],
                                    "completion_notes": "",
                                    "depends_on": ["apex_act_2"],
                                },
                            ],
                        },
                    }
                ],
            },
            {
                "title": "Q4 Automotive Client 3D Interactive WebGL Showcase",
                "description": "Reviewing 3D car configurator performance, GLTF texture compression, and mobile frame rates.",
                "days_offset": 3,
                "start_time": time(16, 0),
                "end_time": time(17, 0),
                "location": "https://meet.google.com/apx-webgl-show",
                "meeting_type": Meeting.MeetingType.CLIENT,
                "status": Meeting.Status.SCHEDULED,
                "team_name": "Creative Frontend & Prototyping",
                "creator_username": "liam.brooks",
                "participant_usernames": ["liam.brooks", "chloe.bennett", "maya.foster"],
                "discussions": [
                    {
                        "title": "Three.js vs Babylon.js for WebGL 3D Model Rendering",
                        "description": "Evaluating 3D engine download footprint, shader flexibility, and mobile GPU support.",
                        "priority": Discussion.Priority.HIGH,
                        "creator_username": "chloe.bennett",
                        "decision": {
                            "status": Decision.Status.DECISION_MADE,
                            "decision": "Proceed with Three.js paired with Draco & KTX2 mesh texture compression.",
                            "reason": "Delivers sub-2.0s initial load time on 4G cellular and maintains steady 60fps on mid-tier mobile GPUs.",
                            "decided_by_username": "liam.brooks",
                            "actions": [
                                {
                                    "key": "apex_act_4",
                                    "title": "Benchmark mobile GPU frame rates across iOS Safari and Android Chrome",
                                    "description": "Profile render loops with 500k polygon vehicle mesh.",
                                    "priority": ActionItem.Priority.MEDIUM,
                                    "status": ActionItem.Status.TODO,
                                    "days_due": 7,
                                    "assigned_usernames": ["chloe.bennett"],
                                    "completion_notes": "",
                                }
                            ],
                        },
                    }
                ],
            },
        ],
    },
]


def seed_database(clean=False, password=DEFAULT_PASSWORD):
    """
    Seeds comprehensive, valid demonstration data for 3 distinct organizations.
    All users will have their password set to the specified password (default: Shlesh@17).
    """
    today = timezone.localdate()
    stats = {
        "organizations_created": 0,
        "users_created_or_updated": 0,
        "memberships_created": 0,
        "teams_created": 0,
        "meetings_created": 0,
        "discussions_created": 0,
        "decisions_created": 0,
        "action_items_created": 0,
        "notifications_created": 0,
    }

    with transaction.atomic():
        if clean:
            logger.info("Cleaning existing data before seeding...")
            Notification.objects.all().delete()
            ActionItem.objects.all().delete()
            DecisionHistory.objects.all().delete()
            Decision.objects.all().delete()
            Discussion.objects.all().delete()
            Meeting.objects.all().delete()
            Team.objects.all().delete()
            OrganizationMembership.objects.all().delete()
            Organization.objects.all().delete()

        created_users_by_username = {}
        action_items_by_key = {}

        for org_data in SEED_ORGANIZATIONS:
            # 1. Create or update Owner user
            owner_info = org_data["owner"]
            owner_user = User.objects.filter(username__iexact=owner_info["username"]).first() or \
                         User.objects.filter(email__iexact=owner_info["email"]).first()

            if not owner_user:
                owner_user = User.objects.create_user(
                    username=owner_info["username"],
                    email=owner_info["email"],
                    password=password,
                    first_name=owner_info["first_name"],
                    last_name=owner_info["last_name"],
                    role=User.Role.OWNER,
                    department=owner_info["department"],
                )
                stats["users_created_or_updated"] += 1
            else:
                owner_user.first_name = owner_info["first_name"]
                owner_user.last_name = owner_info["last_name"]
                owner_user.role = User.Role.OWNER
                owner_user.department = owner_info["department"]
                owner_user.set_password(password)
                owner_user.save()
                stats["users_created_or_updated"] += 1

            created_users_by_username[owner_user.username] = owner_user

            # 2. Create Organization
            org, org_created = Organization.objects.get_or_create(
                name=org_data["name"],
                defaults={"owner": owner_user}
            )
            if not org_created and org.owner != owner_user:
                org.owner = owner_user
                org.save()
            if org_created:
                stats["organizations_created"] += 1

            # 3. Create OrganizationMembership for Owner
            OrganizationMembership.objects.update_or_create(
                user=owner_user,
                organization=org,
                defaults={"role": User.Role.OWNER, "is_active": True}
            )
            stats["memberships_created"] += 1

            # 4. Create Org Users
            for u_info in org_data["users"]:
                u_obj = User.objects.filter(username__iexact=u_info["username"]).first() or \
                        User.objects.filter(email__iexact=u_info["email"]).first()

                if not u_obj:
                    u_obj = User.objects.create_user(
                        username=u_info["username"],
                        email=u_info["email"],
                        password=password,
                        first_name=u_info["first_name"],
                        last_name=u_info["last_name"],
                        role=u_info["role"],
                        department=u_info["department"],
                    )
                else:
                    u_obj.first_name = u_info["first_name"]
                    u_obj.last_name = u_info["last_name"]
                    u_obj.role = u_info["role"]
                    u_obj.department = u_info["department"]
                    u_obj.set_password(password)
                    u_obj.save()

                stats["users_created_or_updated"] += 1
                created_users_by_username[u_obj.username] = u_obj

                OrganizationMembership.objects.update_or_create(
                    user=u_obj,
                    organization=org,
                    defaults={"role": u_info["role"], "is_active": True}
                )
                stats["memberships_created"] += 1

            # 5. Create Teams
            teams_by_name = {}
            for t_info in org_data["teams"]:
                team, _ = Team.objects.update_or_create(
                    name=f"{t_info['name']} ({org.name})",
                    defaults={
                        "description": t_info["description"],
                        "created_by": owner_user,
                    }
                )
                stats["teams_created"] += 1
                teams_by_name[t_info["name"]] = team

                # Add members to team
                for m_uname in t_info["members"]:
                    m_user = created_users_by_username.get(m_uname)
                    if m_user:
                        team.members.add(m_user)

            # 6. Create Meetings, Discussions, Decisions, Actions
            for m_info in org_data["meetings"]:
                m_creator = created_users_by_username.get(m_info["creator_username"], owner_user)
                m_team = teams_by_name.get(m_info["team_name"])
                m_date = today + timedelta(days=m_info["days_offset"])

                meeting, m_created = Meeting.objects.get_or_create(
                    title=f"{m_info['title']} - {org.name}",
                    meeting_date=m_date,
                    defaults={
                        "description": m_info["description"],
                        "start_time": m_info["start_time"],
                        "end_time": m_info["end_time"],
                        "location": m_info["location"],
                        "meeting_type": m_info["meeting_type"],
                        "status": m_info["status"],
                        "created_by": m_creator,
                        "team": m_team,
                    }
                )
                if not m_created:
                    meeting.status = m_info["status"]
                    meeting.location = m_info["location"]
                    meeting.team = m_team
                    meeting.save()
                stats["meetings_created"] += 1

                # Participants
                for p_uname in m_info["participant_usernames"]:
                    p_user = created_users_by_username.get(p_uname)
                    if p_user:
                        meeting.participants.add(p_user)

                # Discussions
                for d_info in m_info["discussions"]:
                    d_creator = created_users_by_username.get(d_info["creator_username"], m_creator)
                    disc, _ = Discussion.objects.update_or_create(
                        meeting=meeting,
                        title=d_info["title"],
                        defaults={
                            "description": d_info["description"],
                            "priority": d_info["priority"],
                            "created_by": d_creator,
                        }
                    )
                    stats["discussions_created"] += 1

                    # Decision
                    dec_data = d_info.get("decision")
                    if dec_data:
                        dec_by = created_users_by_username.get(dec_data["decided_by_username"], owner_user)
                        dec, _ = Decision.objects.update_or_create(
                            discussion=disc,
                            defaults={
                                "status": dec_data["status"],
                                "decision": dec_data["decision"],
                                "reason": dec_data["reason"],
                                "decided_by": dec_by,
                                "version": 1,
                            }
                        )
                        stats["decisions_created"] += 1

                        # DecisionHistory Snapshot
                        DecisionHistory.objects.get_or_create(
                            decision=dec,
                            version=1,
                            defaults={
                                "status": dec.status,
                                "decision_text": dec.decision,
                                "reason": dec.reason,
                                "changed_by": dec_by,
                            }
                        )

                        # Action Items
                        for act_info in dec_data.get("actions", []):
                            act_due = today + timedelta(days=act_info["days_due"])
                            act_obj, _ = ActionItem.objects.update_or_create(
                                decision=dec,
                                title=act_info["title"],
                                defaults={
                                    "description": act_info["description"],
                                    "priority": act_info["priority"],
                                    "status": act_info["status"],
                                    "due_date": act_due,
                                    "completion_notes": act_info.get("completion_notes", ""),
                                    "created_by": dec_by,
                                }
                            )
                            stats["action_items_created"] += 1

                            for a_uname in act_info.get("assigned_usernames", []):
                                a_user = created_users_by_username.get(a_uname)
                                if a_user:
                                    act_obj.assigned_to.add(a_user)

                            action_items_by_key[act_info["key"]] = act_obj

            # 7. Wire up Action Item Dependencies
            for m_info in org_data["meetings"]:
                for d_info in m_info["discussions"]:
                    dec_data = d_info.get("decision")
                    if dec_data:
                        for act_info in dec_data.get("actions", []):
                            depends_on_keys = act_info.get("depends_on", [])
                            if depends_on_keys:
                                target_act = action_items_by_key.get(act_info["key"])
                                if target_act:
                                    for dep_key in depends_on_keys:
                                        dep_act = action_items_by_key.get(dep_key)
                                        if dep_act:
                                            target_act.dependencies.add(dep_act)

            # 8. Create Realistic In-App Notifications
            Notification.objects.get_or_create(
                user=owner_user,
                title=f"Welcome to {org.name}",
                defaults={
                    "subtitle": f"Your workspace '{org.name}' is primed with active teams and scheduled meetings.",
                    "link": "/dashboard",
                    "notification_type": Notification.NotificationType.GENERAL,
                    "is_read": False,
                    "source_id": f"welcome-{org.id}",
                }
            )
            stats["notifications_created"] += 1

            # Create notification for overdue action item if any
            for uname in [org_data["users"][0]["username"], owner_user.username]:
                u_obj = created_users_by_username.get(uname)
                if u_obj:
                    Notification.objects.get_or_create(
                        user=u_obj,
                        title="Critical Action Item Review",
                        defaults={
                            "subtitle": "Please review your pending action items and dependent tasks on the board.",
                            "link": "/my-actions",
                            "notification_type": Notification.NotificationType.CRITICAL,
                            "is_read": False,
                            "source_id": f"action-alert-{org.id}-{u_obj.id}",
                        }
                    )
                    stats["notifications_created"] += 1

    return stats
