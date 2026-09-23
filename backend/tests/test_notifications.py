from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, timedelta
from apps.actions.models import ActionItem
from apps.meetings.models import Meeting
from apps.notifications.models import Notification

User = get_user_model()

class NotificationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='notif_user',
            email='notif@example.com',
            password='password123',
            role='ADMIN'
        )
        self.client.force_authenticate(user=self.user)

        # Create overdue action item
        self.overdue_action = ActionItem.objects.create(
            title='Fix Security Vulnerability',
            due_date=date.today() - timedelta(days=2),
            priority='HIGH',
            status='TODO',
            assigned_to=self.user,
            created_by=self.user
        )

        # Create upcoming meeting
        self.upcoming_meeting = Meeting.objects.create(
            title='Q3 Strategy Session',
            meeting_date=date.today() + timedelta(days=1),
            start_time='10:00:00',
            end_time='11:00:00',
            location='Conference Room A',
            meeting_type='PLANNING',
            status='SCHEDULED',
            created_by=self.user
        )

    def test_notifications_list_creates_and_returns_unread_items(self):
        response = self.client.get('/api/notifications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if 'results' in response.data else response.data
        self.assertGreaterEqual(len(results), 1)
        for notif in results:
            self.assertFalse(notif['is_read'])

    def test_mark_single_notification_as_read_persists_in_db(self):
        n1 = Notification.objects.create(
            user=self.user,
            title='Notification 1',
            subtitle='Sub 1',
            link='/my-actions',
            notification_type='overdue',
            is_read=False,
            source_id='test-1'
        )
        n2 = Notification.objects.create(
            user=self.user,
            title='Notification 2',
            subtitle='Sub 2',
            link='/meetings',
            notification_type='upcoming',
            is_read=False,
            source_id='test-2'
        )

        # Mark ONLY Notification 1 as read
        patch_res = self.client.patch(f'/api/notifications/{n1.id}/', {'is_read': True}, format='json')
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)

        # Verify DB state
        n1.refresh_from_db()
        n2.refresh_from_db()
        self.assertTrue(n1.is_read)
        self.assertFalse(n2.is_read)

    def test_re_fetching_notifications_retains_read_state(self):
        n1 = Notification.objects.create(
            user=self.user,
            title='Notification 1',
            subtitle='Sub 1',
            link='/my-actions',
            notification_type='overdue',
            is_read=False,
            source_id='test-1'
        )
        n2 = Notification.objects.create(
            user=self.user,
            title='Notification 2',
            subtitle='Sub 2',
            link='/meetings',
            notification_type='upcoming',
            is_read=False,
            source_id='test-2'
        )

        # Mark Notification 1 as read
        self.client.patch(f'/api/notifications/{n1.id}/', {'is_read': True}, format='json')

        # Re-fetch notifications (simulating refresh / navigation)
        get_res = self.client.get('/api/notifications/')
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        results = get_res.data['results'] if 'results' in get_res.data else get_res.data

        item1 = next(item for item in results if item['id'] == n1.id)
        item2 = next(item for item in results if item['id'] == n2.id)

        self.assertTrue(item1['is_read'])
        self.assertFalse(item2['is_read'])

    def test_mark_all_read(self):
        n1 = Notification.objects.create(user=self.user, title='N1', is_read=False, source_id='t-1')
        n2 = Notification.objects.create(user=self.user, title='N2', is_read=False, source_id='t-2')

        res = self.client.post('/api/notifications/mark-all-read/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        n1.refresh_from_db()
        n2.refresh_from_db()
        self.assertTrue(n1.is_read)
        self.assertTrue(n2.is_read)
