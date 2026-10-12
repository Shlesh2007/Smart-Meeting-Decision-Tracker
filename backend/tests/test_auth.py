from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()

class AuthenticationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.login_url = '/api/auth/token/'
        self.profile_url = '/api/auth/profile/'
        self.user_data = {
            'username': 'john_doe',
            'email': 'john@example.com',
            'first_name': 'John',
            'last_name': 'Doe',
            'password': 'password123',
            'password_confirm': 'password123',
            'role': 'MEMBER',
            'department': 'Engineering'
        }

    def test_user_registration(self):
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(User.objects.get().email, 'john@example.com')

    def test_user_login(self):
        User.objects.create_user(
            username='jane_doe',
            email='jane@example.com',
            password='password123'
        )
        login_payload = {
            'username': 'jane_doe',
            'password': 'password123'
        }
        response = self.client.post(self.login_url, login_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_protected_profile_access(self):
        user = User.objects.create_user(
            username='auth_user',
            email='auth@example.com',
            password='password123'
        )
        # Unauthenticated request should fail
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Authenticated request should succeed
        self.client.force_authenticate(user=user)
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'auth_user')

    def test_promote_member_to_owner_requires_password(self):
        from apps.authentication.models import Organization, OrganizationMembership

        owner = User.objects.create_user(
            username='org_owner',
            email='owner@example.com',
            password='OwnerSecretPassword123!',
            role=User.Role.OWNER
        )
        member = User.objects.create_user(
            username='org_member',
            email='member@example.com',
            password='MemberPassword123!',
            role=User.Role.MEMBER
        )
        org = Organization.objects.create(name='Acme Corp', owner=owner)
        OrganizationMembership.objects.create(user=owner, organization=org, role=User.Role.OWNER, is_active=True)
        OrganizationMembership.objects.create(user=member, organization=org, role=User.Role.MEMBER, is_active=True)

        user_url = f'/api/auth/users/{member.id}/'

        # Authenticate as owner
        self.client.force_authenticate(user=owner)

        # 1. Attempting without password should return 400 Bad Request
        res_no_pw = self.client.patch(user_url, {'role': 'OWNER'}, format='json')
        self.assertEqual(res_no_pw.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password is required', str(res_no_pw.data).lower())

        # 2. Attempting with wrong password should return 400 Bad Request
        res_wrong_pw = self.client.patch(user_url, {'role': 'OWNER', 'password': 'WrongPassword999'}, format='json')
        self.assertEqual(res_wrong_pw.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('incorrect password', str(res_wrong_pw.data).lower())

        # Target member role remains MEMBER
        member.refresh_from_db()
        self.assertEqual(member.role, User.Role.MEMBER)

        # 3. Attempting with correct owner password should succeed
        res_correct_pw = self.client.patch(user_url, {'role': 'OWNER', 'password': 'OwnerSecretPassword123!'}, format='json')
        self.assertEqual(res_correct_pw.status_code, status.HTTP_200_OK)

        # Target member role is now OWNER
        member.refresh_from_db()
        self.assertEqual(member.role, User.Role.OWNER)

    def test_promote_admin_to_owner_by_owner(self):
        from apps.authentication.models import Organization, OrganizationMembership

        owner = User.objects.create_user(
            username='org_owner_2',
            email='owner2@example.com',
            password='OwnerSecretPassword123!',
            role=User.Role.OWNER
        )
        admin_user = User.objects.create_user(
            username='org_admin',
            email='admin@example.com',
            password='AdminPassword123!',
            role=User.Role.ADMIN
        )
        org = Organization.objects.create(name='Beta Corp', owner=owner)
        OrganizationMembership.objects.create(user=owner, organization=org, role=User.Role.OWNER, is_active=True)
        OrganizationMembership.objects.create(user=admin_user, organization=org, role=User.Role.ADMIN, is_active=True)

        user_url = f'/api/auth/users/{admin_user.id}/'
        self.client.force_authenticate(user=owner)

        # Promoting ADMIN to OWNER with owner password should succeed (not 403 Forbidden)
        res = self.client.patch(user_url, {'role': 'OWNER', 'password': 'OwnerSecretPassword123!'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        admin_user.refresh_from_db()
        self.assertEqual(admin_user.role, User.Role.OWNER)


