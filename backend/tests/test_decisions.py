from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, time
from apps.meetings.models import Meeting
from apps.discussions.models import Discussion
from apps.decisions.models import Decision, DecisionHistory

User = get_user_model()

class DecisionHistoryTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='tech_lead',
            email='lead@example.com',
            password='password123',
            role='ADMIN'
        )
        self.client.force_authenticate(user=self.user)
        self.meeting = Meeting.objects.create(
            title='Architecture Review',
            meeting_date=date.today(),
            start_time=time(10, 0),
            end_time=time(11, 0),
            created_by=self.user
        )
        self.discussion = Discussion.objects.create(
            meeting=self.meeting,
            title='Database Performance Bottleneck',
            priority='HIGH',
            created_by=self.user
        )

    def test_decision_history_versioning(self):
        # 1. Initial Decision Creation (Version 1)
        decision_payload = {
            'discussion': self.discussion.id,
            'status': 'DECISION_MADE',
            'decision': 'Use REST API with Caching',
            'reason': 'Fastest to implement'
        }
        res1 = self.client.post('/api/decisions/', decision_payload, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        decision_id = res1.data['id']
        self.assertEqual(res1.data['version'], 1)

        # Verify history snapshot 1
        self.assertEqual(DecisionHistory.objects.filter(decision_id=decision_id).count(), 1)
        h1 = DecisionHistory.objects.get(decision_id=decision_id, version=1)
        self.assertEqual(h1.decision_text, 'Use REST API with Caching')

        # 2. Attempt Unchanged Update (Should be rejected with 400 Bad Request)
        unchanged_payload = {
            'discussion': self.discussion.id,
            'status': 'DECISION_MADE',
            'decision': 'Use REST API with Caching',
            'reason': 'Fastest to implement'
        }
        res_unchanged = self.client.put(f'/api/decisions/{decision_id}/', unchanged_payload, format='json')
        self.assertEqual(res_unchanged.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('No changes detected', str(res_unchanged.data))

        # 3. Update Decision with Actual Changes by Colleague (Version 2)
        colleague = User.objects.create_user(
            username='colleague_user',
            email='colleague@example.com',
            password='password123'
        )
        self.client.force_authenticate(user=colleague)

        update_payload = {
            'discussion': self.discussion.id,
            'status': 'DECISION_MADE',
            'decision': 'Migrate Search to Dedicated Microservice',
            'reason': 'Better horizontal scalability'
        }
        res2 = self.client.put(f'/api/decisions/{decision_id}/', update_payload, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['version'], 2)

        # 4. Verify Original Author (decided_by) is PRESERVED as tech_lead (self.user)
        self.assertEqual(res2.data['decided_by'], self.user.id)

        # 5. Verify history snapshot 2 preserved previous version and recorded changed_by as colleague!
        histories = DecisionHistory.objects.filter(decision_id=decision_id).order_by('version')
        self.assertEqual(histories.count(), 2)
        self.assertEqual(histories[0].decision_text, 'Use REST API with Caching')
        self.assertEqual(histories[0].changed_by, self.user)
        self.assertEqual(histories[1].decision_text, 'Migrate Search to Dedicated Microservice')
        self.assertEqual(histories[1].changed_by, colleague)
