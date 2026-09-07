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
