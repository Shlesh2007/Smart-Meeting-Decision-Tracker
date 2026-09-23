from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class GoogleMeetValidationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.validate_url = '/api/meetings/validate-meet-url/'
        
        # Create test user with Google OAuth token
        self.user = User.objects.create_user(
            username='meet_user',
            email='meet_user@example.com',
            password='password123',
            google_access_token='mock_google_access_token_123',
            google_refresh_token='mock_google_refresh_token_456'
        )
        self.client.force_authenticate(user=self.user)

    def test_missing_meet_url_payload(self):
        """Request without meet_url returns 400 Bad Request"""
        response = self.client.post(self.validate_url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['valid'])
        self.assertIn('required', response.data['message'].lower())

    def test_http_scheme_instead_of_https(self):
        """URL using HTTP instead of HTTPS returns 400 Bad Request"""
        payload = {'meet_url': 'http://meet.google.com/abc-defg-hij'}
        response = self.client.post(self.validate_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['valid'])
        self.assertIn('https', response.data['message'].lower())

    def test_invalid_domain(self):
        """URL with domain other than meet.google.com returns 400 Bad Request"""
        payload = {'meet_url': 'https://zoom.us/abc-defg-hij'}
        response = self.client.post(self.validate_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['valid'])
        self.assertIn('hostname', response.data['message'].lower())

    def test_malformed_meeting_code(self):
        """URL with malformed meeting code returns 400 Bad Request"""
        payload = {'meet_url': 'https://meet.google.com/invalid_code_123'}
        response = self.client.post(self.validate_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['valid'])
        self.assertIn('format', response.data['message'].lower())

    @patch('requests.get')
    def test_google_api_200_valid_space(self, mock_get):
        """Google API returns 200 -> Meet space exists and is verified"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'name': 'spaces/abc-defg-hij',
            'meetingUri': 'https://meet.google.com/abc-defg-hij',
            'meetingCode': 'abc-defg-hij',
            'activeConference': None
        }
        mock_get.return_value = mock_response

        payload = {'meet_url': 'https://meet.google.com/abc-defg-hij'}
        response = self.client.post(self.validate_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['valid'])
        self.assertEqual(response.data['meeting_code'], 'abc-defg-hij')
        self.assertEqual(response.data['meeting_uri'], 'https://meet.google.com/abc-defg-hij')
        self.assertFalse(response.data['active'])

    @patch('requests.get')
    def test_google_api_200_active_conference(self, mock_get):
        """Google API returns 200 with activeConference -> active flag is True"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'name': 'spaces/abc-defg-hij',
            'meetingUri': 'https://meet.google.com/abc-defg-hij',
            'meetingCode': 'abc-defg-hij',
            'activeConference': {'conference': 'spaces/abc-defg-hij/conferences/xyz123'}
        }
        mock_get.return_value = mock_response

        payload = {'meet_url': 'https://meet.google.com/abc-defg-hij'}
        response = self.client.post(self.validate_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['valid'])
        self.assertTrue(response.data['active'])

    @patch('requests.get')
    def test_google_api_404_space_not_found(self, mock_get):
        """Google API returns 404 -> Meet space was not found"""
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response

        payload = {'meet_url': 'https://meet.google.com/abc-defg-hij'}
        response = self.client.post(self.validate_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data['valid'])
        self.assertEqual(response.data['message'], 'Google Meet space was not found')

    @patch('requests.get')
    def test_google_api_403_forbidden_missing_scope(self, mock_get):
        """Google API returns 403 -> Permission / scope missing"""
        mock_response = MagicMock()
        mock_response.status_code = 403
        mock_get.return_value = mock_response

        payload = {'meet_url': 'https://meet.google.com/abc-defg-hij'}
        response = self.client.post(self.validate_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(response.data['valid'])
        self.assertIn('missing', response.data['message'].lower())

    @patch('requests.post')
    @patch('requests.get')
    def test_google_api_401_token_refresh_retry_success(self, mock_get, mock_post):
        """Google API returns 401 -> Token refresh succeeds and retry returns 200"""
        # First GET returns 401, second GET returns 200
        get_resp_401 = MagicMock()
        get_resp_401.status_code = 401

        get_resp_200 = MagicMock()
        get_resp_200.status_code = 200
        get_resp_200.json.return_value = {
            'name': 'spaces/abc-defg-hij',
            'meetingUri': 'https://meet.google.com/abc-defg-hij',
            'meetingCode': 'abc-defg-hij',
            'activeConference': None
        }
        mock_get.side_effect = [get_resp_401, get_resp_200]

        # Token refresh POST returns 200 with new access_token
        post_resp_200 = MagicMock()
        post_resp_200.status_code = 200
        post_resp_200.json.return_value = {
            'access_token': 'new_refreshed_access_token_789',
            'expires_in': 3600
        }
        mock_post.return_value = post_resp_200

        with self.settings(GOOGLE_CLIENT_ID='test_client_id', GOOGLE_CLIENT_SECRET='test_client_secret'):
            payload = {'meet_url': 'https://meet.google.com/abc-defg-hij'}
            response = self.client.post(self.validate_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['valid'])
        
        # Verify user token was updated in database
        self.user.refresh_from_db()
        self.assertEqual(self.user.google_access_token, 'new_refreshed_access_token_789')

    @patch('requests.post')
    @patch('requests.get')
    def test_google_api_401_token_refresh_failure(self, mock_get, mock_post):
        """Google API returns 401 -> Token refresh fails -> Returns 401"""
        get_resp_401 = MagicMock()
        get_resp_401.status_code = 401
        mock_get.return_value = get_resp_401

        post_resp_400 = MagicMock()
        post_resp_400.status_code = 400
        mock_post.return_value = post_resp_400

        with self.settings(GOOGLE_CLIENT_ID='test_client_id', GOOGLE_CLIENT_SECRET='test_client_secret'):
            payload = {'meet_url': 'https://meet.google.com/abc-defg-hij'}
            response = self.client.post(self.validate_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data['valid'])
        self.assertIn('invalid or expired', response.data['message'].lower())

    def test_user_without_google_token(self):
        """Authenticated user without Google OAuth token gets 401"""
        no_token_user = User.objects.create_user(
            username='no_token_user',
            email='no_token@example.com',
            password='password123'
        )
        self.client.force_authenticate(user=no_token_user)
        payload = {'meet_url': 'https://meet.google.com/abc-defg-hij'}
        response = self.client.post(self.validate_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data['valid'])
