from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, timedelta
from apps.meetings.models import Meeting

User = get_user_model()

class DashboardAnalyticsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='analytics_user',
            email='user@example.com',
            password='Password123!',
            role='ADMIN'
        )
        self.client.force_authenticate(user=self.user)
        today = date.today()

        # Create meetings at different date offsets
        # Meeting 1: Today (0 days ago)
        Meeting.objects.create(
            title='Today Meeting',
            meeting_date=today,
            created_by=self.user
        )
        # Meeting 2: 5 days ago (Within 7D, 14D, 30D, All)
        Meeting.objects.create(
            title='5 Days Ago Meeting',
            meeting_date=today - timedelta(days=5),
            created_by=self.user
        )
        # Meeting 3: 10 days ago (Within 14D, 30D, All - OUTSIDE 7D)
        Meeting.objects.create(
            title='10 Days Ago Meeting',
            meeting_date=today - timedelta(days=10),
            created_by=self.user
        )
        # Meeting 4: 25 days ago (Within 30D, All - OUTSIDE 7D, 14D)
        Meeting.objects.create(
            title='25 Days Ago Meeting',
            meeting_date=today - timedelta(days=25),
            created_by=self.user
        )
        # Meeting 5: 60 days ago (Within All - OUTSIDE 7D, 14D, 30D)
        Meeting.objects.create(
            title='60 Days Ago Meeting',
            meeting_date=today - timedelta(days=60),
            created_by=self.user
        )

    def test_meeting_activity_filter_7d(self):
        response = self.client.get('/api/analytics/dashboard/?activity_period=7d')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['activity_period'], '7d')
        activity = response.data['meeting_activity']
        # Should include Today (0d) and 5d ago (2 meetings total)
        total_count = sum(item['count'] for item in activity)
        self.assertEqual(total_count, 2)

    def test_meeting_activity_filter_14d(self):
        response = self.client.get('/api/analytics/dashboard/?activity_period=14d')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['activity_period'], '14d')
        activity = response.data['meeting_activity']
        # Should include Today (0d), 5d ago, 10d ago (3 meetings total)
        total_count = sum(item['count'] for item in activity)
        self.assertEqual(total_count, 3)

    def test_meeting_activity_filter_30d(self):
        response = self.client.get('/api/analytics/dashboard/?activity_period=30d')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['activity_period'], '30d')
        activity = response.data['meeting_activity']
        # Should include Today (0d), 5d ago, 10d ago, 25d ago (4 meetings total)
        total_count = sum(item['count'] for item in activity)
        self.assertEqual(total_count, 4)

    def test_meeting_activity_filter_all(self):
        response = self.client.get('/api/analytics/dashboard/?activity_period=all')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['activity_period'], 'all')
        activity = response.data['meeting_activity']
        # Should include all 5 meetings
        total_count = sum(item['count'] for item in activity)
        self.assertEqual(total_count, 5)

    def test_default_period_is_today(self):
        response = self.client.get('/api/analytics/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['period'], 'today')
        self.assertEqual(response.data['metrics']['total_meetings'], 1)

