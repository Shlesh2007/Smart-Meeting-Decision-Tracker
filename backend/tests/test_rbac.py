from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.meetings.models import Meeting
from apps.actions.models import ActionItem
from datetime import date

User = get_user_model()

class RBACTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create test accounts for each role
        self.owner = User.objects.create_user(
            username='org_owner',
            email='owner@company.com',
            password='Password123!',
            role=User.Role.OWNER
        )

        self.admin = User.objects.create_user(
            username='org_admin',
            email='admin@company.com',
            password='Password123!',
            role=User.Role.ADMIN
        )

        self.manager = User.objects.create_user(
            username='org_manager',
            email='manager@company.com',
            password='Password123!',
            role=User.Role.MANAGER
        )

        self.member1 = User.objects.create_user(
            username='org_member1',
            email='member1@company.com',
            password='Password123!',
            role=User.Role.MEMBER
        )

        self.member2 = User.objects.create_user(
            username='org_member2',
            email='member2@company.com',
            password='Password123!',
            role=User.Role.MEMBER
        )

    # 1. PUBLIC REGISTRATION TESTS
    def test_public_registration_forces_member_role(self):
        url = '/api/auth/register/'
        payload = {
            'username': 'attacker',
            'email': 'attacker@company.com',
            'password': 'Password123!',
            'password_confirm': 'Password123!',
            'role': 'ADMIN'  # Attempt privilege escalation
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        
        created_user = User.objects.get(username='attacker')
        self.assertEqual(created_user.role, User.Role.MEMBER)
        self.assertNotEqual(created_user.role, User.Role.ADMIN)

    # 2. OWNER PERMISSIONS TESTS
    def test_owner_can_create_admin_and_manager(self):
        self.client.force_authenticate(user=self.owner)
        url = '/api/auth/users/'
        
        # Create ADMIN
        res_admin = self.client.post(url, {
            'username': 'new_admin',
            'email': 'newadmin@company.com',
            'first_name': 'New',
            'last_name': 'Admin',
            'role': 'ADMIN'
        }, format='json')
        self.assertEqual(res_admin.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_admin.data['role'], 'ADMIN')

    def test_admin_cannot_create_or_assign_owner_role(self):
        self.client.force_authenticate(user=self.admin)
        url = '/api/auth/users/'
        
        res = self.client.post(url, {
            'username': 'fake_owner',
            'email': 'fakeowner@company.com',
            'role': 'OWNER'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_cannot_modify_or_delete_owner(self):
        self.client.force_authenticate(user=self.admin)
        
        # Attempt to modify OWNER role
        res_update = self.client.patch(f'/api/auth/users/{self.owner.id}/', {'role': 'MEMBER'}, format='json')
        self.assertEqual(res_update.status_code, status.HTTP_403_FORBIDDEN)

        # Attempt to delete OWNER
        res_delete = self.client.delete(f'/api/auth/users/{self.owner.id}/')
        self.assertEqual(res_delete.status_code, status.HTTP_403_FORBIDDEN)

    # 3. MEMBER ACTION ITEM PERMISSIONS TESTS
    def test_member_can_update_own_action_status_only(self):
        action = ActionItem.objects.create(
            title='Member Task',
            assigned_to=self.member1,
            created_by=self.admin,
            due_date=date.today(),
            status='TODO'
        )

        self.client.force_authenticate(user=self.member1)
        url = f'/api/actions/{action.id}/'

        # Updating status -> Allowed
        res_status = self.client.patch(url, {'status': 'IN_PROGRESS'}, format='json')
        self.assertEqual(res_status.status_code, status.HTTP_200_OK)
        action.refresh_from_db()
        self.assertEqual(action.status, 'IN_PROGRESS')

        # Updating sensitive field (due_date) -> 403 Forbidden
        res_due = self.client.patch(url, {'due_date': '2030-01-01'}, format='json')
        self.assertEqual(res_due.status_code, status.HTTP_403_FORBIDDEN)

    def test_member_cannot_update_another_user_action_item(self):
        action = ActionItem.objects.create(
            title='Other Member Task',
            assigned_to=self.member2,
            created_by=self.admin,
            due_date=date.today(),
            status='TODO'
        )

        self.client.force_authenticate(user=self.member1)
        url = f'/api/actions/{action.id}/'

        res = self.client.patch(url, {'status': 'COMPLETED'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # 4. UNAUTHENTICATED & UNAUTHORIZED REQUESTS
    def test_unauthenticated_requests_return_401(self):
        res = self.client.get('/api/auth/users/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_member_accessing_user_management_returns_403(self):
        self.client.force_authenticate(user=self.member1)
        res = self.client.post('/api/auth/users/', {'username': 'test_user'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
