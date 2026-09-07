from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, timedelta, time
from apps.meetings.models import Meeting
from apps.discussions.models import Discussion
from apps.decisions.models import Decision
from apps.actions.models import ActionItem

User = get_user_model()

class ActionItemBusinessRulesTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='dev_lead',
            email='dev@example.com',
            password='password123',
            role='ADMIN'
        )
        self.client.force_authenticate(user=self.user)
        self.meeting = Meeting.objects.create(
            title='Tech Planning',
            meeting_date=date.today(),
            start_time=time(10, 0),
            end_time=time(11, 0),
            created_by=self.user
        )
        self.discussion = Discussion.objects.create(
            meeting=self.meeting,
            title='Elasticsearch POC',
            created_by=self.user
        )
        self.decision = Decision.objects.create(
            discussion=self.discussion,
            status='DECISION_MADE',
            decision='Implement Elasticsearch POC',
            decided_by=self.user
        )

    def test_rule_1_overdue_action(self):
        yesterday = date.today() - timedelta(days=1)
        overdue_action = ActionItem.objects.create(
            decision=self.decision,
            title='Research Elastic Options',
            due_date=yesterday,
            status='TODO',
            created_by=self.user,
            assigned_to=self.user
        )
        self.assertTrue(overdue_action.is_overdue)

        # Mark completed -> should no longer be overdue
        overdue_action.status = 'COMPLETED'
        overdue_action.save()
        self.assertFalse(overdue_action.is_overdue)

    def test_rule_2_dependency_validation(self):
        # Action 1: Research Search Options (Dependency)
        action1 = ActionItem.objects.create(
            decision=self.decision,
            title='Research Search Options',
            due_date=date.today() + timedelta(days=2),
            status='IN_PROGRESS',
            created_by=self.user,
            assigned_to=self.user
        )

        # Action 2: Create Search POC (Depends on Action 1)
        action2 = ActionItem.objects.create(
            decision=self.decision,
            title='Create Search POC',
            due_date=date.today() + timedelta(days=5),
            status='TODO',
            created_by=self.user,
            assigned_to=self.user
        )
        action2.dependencies.add(action1)

        # Attempt to mark Action 2 as COMPLETED while Action 1 is IN_PROGRESS -> Should be rejected by Backend!
        payload = {
            'decision': self.decision.id,
            'title': action2.title,
            'due_date': str(action2.due_date),
            'status': 'COMPLETED',
            'dependency_ids': [action1.id]
        }
        res = self.client.put(f'/api/actions/{action2.id}/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('status', res.data)

        # Now complete Action 1
        action1.status = 'COMPLETED'
        action1.save()

        # Retry completing Action 2 -> Should NOW SUCCEED!
        res_ok = self.client.put(f'/api/actions/{action2.id}/', payload, format='json')
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        self.assertEqual(res_ok.data['status'], 'COMPLETED')
