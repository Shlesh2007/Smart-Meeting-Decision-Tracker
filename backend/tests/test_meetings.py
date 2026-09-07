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
