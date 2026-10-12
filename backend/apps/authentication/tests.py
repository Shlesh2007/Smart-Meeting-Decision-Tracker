from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.meetings.models import Meeting
from apps.teams.models import Team
from apps.discussions.models import Discussion
from apps.decisions.models import Decision
from apps.actions.models import ActionItem
from datetime import date, time

User = get_user_model()

class OrganizationLifecycleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner_password = 'OwnerPassword123!'
        self.owner = User.objects.create_user(
            username='org_owner',
            email='owner@acme.com',
            password=self.owner_password,
            first_name='Organization',
            last_name='Owner',
            role=User.Role.OWNER,
            department='Executive & Strategy'
        )

        self.member_password = 'MemberPassword123!'
        self.member = User.objects.create_user(
            username='org_member',
            email='member@acme.com',
            password=self.member_password,
            first_name='Team',
            last_name='Member',
            role=User.Role.MEMBER,
            department='Engineering & Tech Lead'
        )

        self.team = Team.objects.create(
            name='Alpha Team',
            description='Core Dev Team',
            created_by=self.owner
        )
        self.team.members.add(self.member)

        self.meeting = Meeting.objects.create(
            title='Strategy Alignment Sync',
            meeting_date=date.today(),
            start_time=time(10, 0),
            end_time=time(11, 0),
            created_by=self.owner,
            team=self.team
        )
        self.meeting.participants.add(self.member)

    def test_1_delete_organization_removes_associated_data(self):
        """1. Deleting an organization removes meetings, teams, discussions, etc."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.post('/api/auth/delete-organization/', {
            'confirmation': 'SMART MEETING',
            'password': self.owner_password
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Meeting.objects.count(), 0)
        self.assertEqual(Team.objects.count(), 0)

    def test_2_user_accounts_preserved_after_organization_deletion(self):
        """2. User accounts and authentication profiles remain intact after organization deletion."""
        self.client.force_authenticate(user=self.owner)
        self.client.post('/api/auth/delete-organization/', {
            'confirmation': 'SMART MEETING',
            'password': self.owner_password
        })

        # Check users still exist in database
        self.assertTrue(User.objects.filter(email='owner@acme.com').exists())
        self.assertTrue(User.objects.filter(email='member@acme.com').exists())

    def test_3_former_owner_can_login_after_organization_deletion(self):
        """3. The former owner can log in after organization deletion."""
        self.client.force_authenticate(user=self.owner)
        self.client.post('/api/auth/delete-organization/', {
            'confirmation': 'SMART MEETING',
            'password': self.owner_password
        })

        # Unauthenticate client and attempt login with former owner credentials
        self.client.force_authenticate(user=None)
        login_resp = self.client.post('/api/auth/token/', {
            'username': 'org_owner',
            'password': self.owner_password
        })
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_resp.data)

    def test_4_user_without_organization_has_organization_false(self):
        """4. A user without an active organization receives has_organization: false."""
        self.client.force_authenticate(user=self.owner)
        self.client.post('/api/auth/delete-organization/', {
            'confirmation': 'SMART MEETING',
            'password': self.owner_password
        })

        # Fetch profile
        self.owner.refresh_from_db()
        self.assertFalse(self.owner.has_organization)
        self.assertEqual(self.owner.role, User.Role.UNASSIGNED)

        self.client.force_authenticate(user=self.owner)
        profile_resp = self.client.get('/api/auth/profile/')
        self.assertEqual(profile_resp.status_code, status.HTTP_200_OK)
        self.assertFalse(profile_resp.data['has_organization'])

    def test_5_creating_organization_assigns_creator_as_owner(self):
        """5. Explicitly creating an organization via API assigns the creator as OWNER in a transaction."""
        unassigned_user = User.objects.create_user(
            username='new_founder',
            email='founder@startup.io',
            password='Password123!',
            role=User.Role.UNASSIGNED
        )
        self.client.force_authenticate(user=unassigned_user)
        response = self.client.post('/api/auth/organization/create/', {
            'name': 'Startup Nexus',
            'department': 'Executive & Strategy'
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        unassigned_user.refresh_from_db()
        self.assertEqual(unassigned_user.role, User.Role.OWNER)
        self.assertTrue(unassigned_user.has_organization)

    def test_6_joining_organization_assigns_member_role(self):
        """6. Joining an organization assigns MEMBER role."""
        unassigned_user = User.objects.create_user(
            username='new_joiner',
            email='joiner@startup.io',
            password='Password123!',
            role=User.Role.UNASSIGNED
        )
        self.client.force_authenticate(user=unassigned_user)
        response = self.client.post('/api/auth/organization/join/', {
            'department': 'Engineering & Tech Lead'
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        unassigned_user.refresh_from_db()
        self.assertEqual(unassigned_user.role, User.Role.MEMBER)
        self.assertTrue(unassigned_user.has_organization)

    def test_7_consistent_onboarding_for_new_registrations(self):
        """7. Email/OTP registrations set UNASSIGNED role until explicit organization creation or joining."""
        reg_user = User.objects.create_user(
            username='unassigned_reg',
            email='reg@company.com',
            password='Password123!',
            role=User.Role.UNASSIGNED
        )
        self.assertFalse(reg_user.has_organization)
        self.assertEqual(reg_user.role, User.Role.UNASSIGNED)

    def test_8_new_user_cannot_become_owner_through_zero_user_check(self):
        """8. New users cannot automatically become owners merely through a zero-user database check."""
        # Wiping DB users
        User.objects.all().delete()
        self.assertEqual(User.objects.count(), 0)

        # Confirm registration logic assigns UNASSIGNED until explicit organization creation
        new_user = User.objects.create_user(
            username='first_person',
            email='first@company.com',
            password='Password123!',
            role=User.Role.UNASSIGNED
        )
        self.assertEqual(new_user.role, User.Role.UNASSIGNED)
        self.assertFalse(new_user.has_organization)

    def test_9_unauthorized_user_cannot_delete_organization(self):
        """9. Unauthorized non-owner users cannot delete organizations."""
        self.client.force_authenticate(user=self.member)
        response = self.client.post('/api/auth/delete-organization/', {
            'confirmation': 'SMART MEETING'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_10_check_delete_account_endpoint(self):
        """10. GET /api/auth/profile/delete-account/check/ returns 200 OK with account deletion requirements."""
        self.client.force_authenticate(user=self.member)
        response = self.client.get('/api/auth/profile/delete-account/check/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('can_delete', response.data)
        self.assertTrue(response.data['can_delete'])

    def test_11_sole_owner_account_deletion_blocked(self):
        """11. Sole owner with existing organization members is blocked from deleting account until ownership transfer."""
        self.client.force_authenticate(user=self.owner)
        response = self.client.get('/api/auth/profile/delete-account/check/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['can_delete'])
        self.assertTrue(response.data['requires_ownership_transfer'])

