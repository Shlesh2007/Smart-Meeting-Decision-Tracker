from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, time
from apps.meetings.models import Meeting

User = get_user_model()

class MeetingTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin_user',
            email='admin@example.com',
            password='password123',
            role='ADMIN'
        )
        self.member = User.objects.create_user(
            username='member_user',
            email='member@example.com',
            password='password123',
            role='MEMBER'
        )

    def test_meeting_creation(self):
        self.client.force_authenticate(user=self.admin)
        meeting_payload = {
            'title': 'API Performance Architecture',
            'description': 'Discuss high latency in search endpoints',
            'meeting_date': str(date.today()),
            'start_time': '10:00:00',
            'end_time': '11:00:00',
            'location': 'Conference Room A',
            'meeting_type': 'PROJECT',
            'status': 'SCHEDULED',
            'participant_ids': [self.admin.id, self.member.id]
        }
        response = self.client.post('/api/meetings/', meeting_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Meeting.objects.count(), 1)
        self.assertEqual(Meeting.objects.get().created_by, self.admin)

    def test_meeting_list_filtering(self):
        self.client.force_authenticate(user=self.admin)
        m1 = Meeting.objects.create(
            title='Client Review',
            meeting_date=date.today(),
            start_time=time(10, 0),
            end_time=time(11, 0),
            meeting_type='CLIENT',
            status='COMPLETED',
            created_by=self.admin
        )
        m2 = Meeting.objects.create(
            title='Sprint Planning',
            meeting_date=date.today(),
            start_time=time(14, 0),
            end_time=time(15, 0),
            meeting_type='PLANNING',
            status='SCHEDULED',
            created_by=self.admin
        )
        
        # Filter by type CLIENT
        response = self.client.get('/api/meetings/?meeting_type=CLIENT')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if 'results' in response.data else response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['title'], 'Client Review')

    def test_exact_phrase_search(self):
        self.client.force_authenticate(user=self.admin)
        Meeting.objects.create(
            title='Security Vulnerability & Patch Assessment',
            meeting_date=date.today(),
            start_time=time(10, 0),
            end_time=time(11, 0),
            created_by=self.admin
        )
        
        # Searching "Security" matches
        res_secu = self.client.get('/api/meetings/?search=Security')
        results_secu = res_secu.data['results'] if 'results' in res_secu.data else res_secu.data
        self.assertEqual(len(results_secu), 1)

        # Searching "secu c" (with trailing disconnected letter) should NOT match "Security Vulnerability & Patch Assessment"
        res_mismatch = self.client.get('/api/meetings/?search=secu c')
        results_mismatch = res_mismatch.data['results'] if 'results' in res_mismatch.data else res_mismatch.data
        self.assertEqual(len(results_mismatch), 0)

    def test_automatic_status_lifecycle_calculation(self):
        from datetime import timedelta
        from django.utils import timezone
        today = timezone.localdate()
        now = timezone.localtime()

        future_meeting = Meeting.objects.create(
            title='Tomorrow Meeting',
            meeting_date=today + timedelta(days=1),
            start_time=time(12, 0),
            end_time=time(13, 0),
            created_by=self.admin
        )
        self.assertEqual(future_meeting.get_calculated_status(), Meeting.Status.SCHEDULED)

        past_meeting = Meeting.objects.create(
            title='Yesterday Meeting',
            meeting_date=today - timedelta(days=1),
            start_time=time(12, 0),
            end_time=time(13, 0),
            created_by=self.admin
        )
        self.assertEqual(past_meeting.get_calculated_status(), Meeting.Status.COMPLETED)

        start_time_active = (now - timedelta(minutes=10)).time()
        end_time_active = (now + timedelta(minutes=50)).time()
        active_meeting = Meeting.objects.create(
            title='Active Meeting',
            meeting_date=today,
            start_time=start_time_active,
            end_time=end_time_active,
            created_by=self.admin
        )
        self.assertEqual(active_meeting.get_calculated_status(), Meeting.Status.IN_PROGRESS)

    def test_cancellation_permissions_and_persistence(self):
        from datetime import timedelta
        from django.utils import timezone
        today = timezone.localdate()

        creator = self.member
        other_user = User.objects.create_user(username='other_member', email='other@example.com', password='password123', role='MEMBER')

        meeting = Meeting.objects.create(
            title='Team Sync',
            meeting_date=today + timedelta(days=1),
            start_time=time(12, 0),
            end_time=time(13, 0),
            created_by=creator
        )

        # 1. Unauthenticated cancellation attempt -> 401
        self.client.logout()
        res_unauth = self.client.post(f'/api/meetings/{meeting.id}/cancel/')
        self.assertEqual(res_unauth.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Non-creator cancellation attempt -> 403 Forbidden
        self.client.force_authenticate(user=other_user)
        res_forbidden = self.client.post(f'/api/meetings/{meeting.id}/cancel/')
        self.assertEqual(res_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Creator cancellation attempt -> 200 OK
        self.client.force_authenticate(user=creator)
        res_cancel = self.client.post(f'/api/meetings/{meeting.id}/cancel/')
        self.assertEqual(res_cancel.status_code, status.HTTP_200_OK)
        self.assertEqual(res_cancel.data['status'], 'CANCELLED')

        # 4. Persistence check: GET request returns CANCELLED
        res_get = self.client.get(f'/api/meetings/{meeting.id}/')
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)
        self.assertEqual(res_get.data['status'], 'CANCELLED')

        # 5. Cancelling an already cancelled meeting -> 400 Bad Request
        res_re_cancel = self.client.post(f'/api/meetings/{meeting.id}/cancel/')
        self.assertEqual(res_re_cancel.status_code, status.HTTP_400_BAD_REQUEST)

    def test_recurring_meeting_date_validation(self):
        from datetime import timedelta
        self.client.force_authenticate(user=self.admin)
        today_str = str(date.today())

        # 1. Same start and end date -> 400 Bad Request
        payload_same_date = {
            'title': 'Daily Standup Mismatch',
            'meeting_date': today_str,
            'start_time': '10:00:00',
            'end_time': '11:00:00',
            'meeting_type': 'INTERNAL',
            'participant_ids': [self.admin.id],
            'is_recurring': True,
            'recurrence_pattern': 'DAILY',
            'recurrence_end_date': today_str
        }
        res_same = self.client.post('/api/meetings/', payload_same_date, format='json')
        self.assertEqual(res_same.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('recurrence_end_date', res_same.data)

        # 2. Weekly recurrence with less than 7 days end date -> 400 Bad Request
        payload_weekly_invalid = {
            'title': 'Weekly Sync Short End Date',
            'meeting_date': today_str,
            'start_time': '10:00:00',
            'end_time': '11:00:00',
            'meeting_type': 'INTERNAL',
            'participant_ids': [self.admin.id],
            'is_recurring': True,
            'recurrence_pattern': 'WEEKLY',
            'recurrence_end_date': str(date.today() + timedelta(days=3))
        }
        res_weekly = self.client.post('/api/meetings/', payload_weekly_invalid, format='json')
        self.assertEqual(res_weekly.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('recurrence_end_date', res_weekly.data)

        # 3. Daily recurrence with 2 days duration -> 201 Created
        payload_daily_valid = {
            'title': 'Daily Sync Valid',
            'meeting_date': today_str,
            'start_time': '10:00:00',
            'end_time': '11:00:00',
            'meeting_type': 'INTERNAL',
            'participant_ids': [self.admin.id],
            'is_recurring': True,
            'recurrence_pattern': 'DAILY',
            'recurrence_end_date': str(date.today() + timedelta(days=2))
        }
        res_daily = self.client.post('/api/meetings/', payload_daily_valid, format='json')
        self.assertEqual(res_daily.status_code, status.HTTP_201_CREATED)

    def test_send_meeting_otp_only_for_google_meet(self):
        from unittest.mock import patch
        self.client.force_authenticate(user=self.admin)

        # 1. Physical Conference Room Meeting -> Sending OTP is rejected with 400
        conf_meeting = Meeting.objects.create(
            title='In-Person Strategy',
            meeting_date=date.today(),
            start_time=time(10, 0),
            end_time=time(11, 0),
            location='Conference Room B - Floor 2',
            meeting_type='INTERNAL',
            status='SCHEDULED',
            created_by=self.admin
        )
        conf_meeting.participants.add(self.member)

        res_conf = self.client.post(f'/api/meetings/{conf_meeting.id}/send-otp/')
        self.assertEqual(res_conf.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('google meet', str(res_conf.data).lower())

        # 2. Virtual Google Meet Meeting WITHOUT password -> Sending password is rejected with 400
        meet_no_pass = Meeting.objects.create(
            title='Remote Sprint Review Public',
            meeting_date=date.today(),
            start_time=time(10, 0),
            end_time=time(11, 0),
            location='Google Meet: https://meet.google.com/abc-defg-hij (Public)',
            meeting_type='PROJECT',
            status='SCHEDULED',
            created_by=self.admin
        )
        meet_no_pass.participants.add(self.member)

        res_no_pass = self.client.post(f'/api/meetings/{meet_no_pass.id}/send-otp/')
        self.assertEqual(res_no_pass.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', str(res_no_pass.data).lower())

        # 3. Virtual Google Meet Meeting WITH password -> Sending password succeeds
        meet_with_pass = Meeting.objects.create(
            title='Remote Sprint Review Protected',
            meeting_date=date.today(),
            start_time=time(10, 0),
            end_time=time(11, 0),
            location='Google Meet: https://meet.google.com/abc-defg-hij (Pass: sprintSecret99)',
            meeting_type='PROJECT',
            status='SCHEDULED',
            created_by=self.admin
        )
        meet_with_pass.participants.add(self.member)

        with patch('apps.meetings.views.send_brevo_transactional_email', return_value=(True, 'Delivered')):
            res_meet = self.client.post(f'/api/meetings/{meet_with_pass.id}/send-otp/')
            self.assertEqual(res_meet.status_code, status.HTTP_200_OK)
            self.assertEqual(res_meet.data.get('password'), 'sprintSecret99')


