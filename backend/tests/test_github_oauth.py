from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock

User = get_user_model()

class GitHubOAuthTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.github_oauth_url = '/api/auth/oauth/github/'
        self.profile_url = '/api/auth/profile/'

    @patch('requests.get')
    @patch('requests.post')
    def test_github_oauth_basic_profile(self, mock_post, mock_get):
        # Mock GitHub token exchange
        mock_post_resp = MagicMock()
        mock_post_resp.status_code = 200
        mock_post_resp.json.return_value = {'access_token': 'gho_mock_token_123'}
        mock_post.return_value = mock_post_resp

        # Mock GitHub /user response (username: octocat, name: Monalisa Octocat)
        mock_get_resp = MagicMock()
        mock_get_resp.status_code = 200
        mock_get_resp.json.return_value = {
            'login': 'octocat',
            'name': 'Monalisa Octocat',
            'email': 'octocat@github.com'
        }
        mock_get.return_value = mock_get_resp

        response = self.client.post(self.github_oauth_url, {'code': 'mock_code_123'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user_data = response.data['user']

        # Requirement 2: Username and profile name set to GitHub login (octocat), not display name or default
        self.assertEqual(user_data['username'], 'octocat')
        self.assertEqual(user_data['full_name'], 'octocat')

        # Requirement 3: Email fetched from GitHub
        self.assertEqual(user_data['email'], 'octocat@github.com')

        # Requirement 5: User saved in DB
        db_user = User.objects.get(username='octocat')
        self.assertEqual(db_user.email, 'octocat@github.com')
        self.assertEqual(db_user.first_name, 'octocat')

    @patch('requests.get')
    @patch('requests.post')
    def test_github_oauth_private_email_fetching(self, mock_post, mock_get):
        # Mock GitHub token exchange
        mock_post_resp = MagicMock()
        mock_post_resp.status_code = 200
        mock_post_resp.json.return_value = {'access_token': 'gho_mock_token_123'}
        mock_post.return_value = mock_post_resp

        # Mock /user with missing email, and /user/emails with verified primary email
        def get_side_effect(url, headers=None, timeout=None):
            resp = MagicMock()
            resp.status_code = 200
            if 'api.github.com/user/emails' in url:
                resp.json.return_value = [
                    {'email': 'unverified@github.com', 'primary': False, 'verified': False},
                    {'email': 'verified_primary@github.com', 'primary': True, 'verified': True}
                ]
            else:
                resp.json.return_value = {
                    'login': 'private_cat',
                    'name': 'Private Cat',
                    'email': None
                }
            return resp

        mock_get.side_effect = get_side_effect

        response = self.client.post(self.github_oauth_url, {'code': 'mock_code_456'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user_data = response.data['user']

        self.assertEqual(user_data['username'], 'private_cat')
        self.assertEqual(user_data['email'], 'verified_primary@github.com')

    @patch('requests.get')
    @patch('requests.post')
    def test_github_oauth_private_email_unavailable_does_not_overwrite_valid_email(self, mock_post, mock_get):
        # Create existing user with valid email
        existing_user = User.objects.create_user(
            username='existing_cat',
            email='valid_user@example.com',
            first_name='Existing',
            password='password123'
        )

        mock_post_resp = MagicMock()
        mock_post_resp.status_code = 200
        mock_post_resp.json.return_value = {'access_token': 'gho_mock_token_789'}
        mock_post.return_value = mock_post_resp

        def get_side_effect(url, headers=None, timeout=None):
            resp = MagicMock()
            resp.status_code = 200
            if 'api.github.com/user/emails' in url:
                resp.json.return_value = [
                    {'email': 'existing_cat@users.noreply.github.com', 'primary': True, 'verified': True}
                ]
            else:
                resp.json.return_value = {
                    'login': 'existing_cat',
                    'name': 'Existing Cat Display',
                    'email': None
                }
            return resp

        mock_get.side_effect = get_side_effect

        response = self.client.post(self.github_oauth_url, {'code': 'mock_code_789'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user_data = response.data['user']

        # Requirement 2 & 4: Profile username set to GitHub login, existing valid email preserved
        self.assertEqual(user_data['username'], 'existing_cat')
        self.assertEqual(user_data['email'], 'valid_user@example.com')
        self.assertNotIn('@users.noreply.github.com', user_data['email'])

    @patch('requests.get')
    @patch('requests.post')
    def test_github_oauth_existing_user_no_duplicate_created(self, mock_post, mock_get):
        existing_user = User.objects.create_user(
            username='dev_user',
            email='dev@github.com',
            password='password123'
        )

        mock_post_resp = MagicMock()
        mock_post_resp.status_code = 200
        mock_post_resp.json.return_value = {'access_token': 'token_999'}
        mock_post.return_value = mock_post_resp

        mock_get_resp = MagicMock()
        mock_get_resp.status_code = 200
        mock_get_resp.json.return_value = {
            'login': 'dev_user',
            'email': 'dev@github.com'
        }
        mock_get.return_value = mock_get_resp

        response = self.client.post(self.github_oauth_url, {'code': 'mock_code_999'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(User.objects.count(), 1)

    def test_profile_api_returns_github_details(self):
        user = User.objects.create_user(
            username='octocat',
            email='octocat@github.com',
            first_name='octocat',
            last_name='',
            password='password123'
        )

        self.client.force_authenticate(user=user)
        response = self.client.get(self.profile_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'octocat')
        self.assertEqual(response.data['email'], 'octocat@github.com')
        self.assertEqual(response.data['full_name'], 'octocat')
