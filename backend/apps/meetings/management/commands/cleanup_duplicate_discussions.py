from django.core.management.base import BaseCommand
from apps.meetings.models import Meeting
from apps.discussions.models import Discussion
from apps.decisions.models import Decision
from apps.actions.models import ActionItem

class Command(BaseCommand):
    help = "Consolidate duplicate 'General Action Items' discussions and decisions per meeting."

    def handle(self, *args, **options):
        meetings = Meeting.objects.all()
        merged_decisions_count = 0
        deleted_discussions_count = 0

        for meeting in meetings:
            # Find all discussions titled 'General Action Items' for this meeting
            gen_discussions = list(Discussion.objects.filter(meeting=meeting, title='General Action Items').order_by('created_at'))
            if len(gen_discussions) > 1:
                # Keep the primary (first) discussion
                primary_disc = gen_discussions[0]
                primary_dec = getattr(primary_disc, 'decision', None)
                
                if not primary_dec:
                    # If primary discussion doesn't have a decision, try to find one among duplicates or create one
                    for dup in gen_discussions[1:]:
                        if getattr(dup, 'decision', None):
                            primary_dec = dup.decision
                            # Move decision to primary_disc
                            primary_dec.discussion = primary_disc
                            primary_dec.save()
                            break

                if not primary_dec:
                    # Create a decision for primary discussion if none exists
                    primary_dec = Decision.objects.create(
                        discussion=primary_disc,
                        status=Decision.Status.DECISION_MADE,
                        decision='Action items recorded',
                        decided_by=meeting.created_by
                    )

                duplicate_discs = gen_discussions[1:]
                for dup in duplicate_discs:
                    dup_dec = getattr(dup, 'decision', None)
                    if dup_dec and dup_dec.id != primary_dec.id:
                        # Re-point all ActionItems from duplicate decision to primary decision
                        ActionItem.objects.filter(decision=dup_dec).update(decision=primary_dec)
                        merged_decisions_count += 1
                        dup_dec.delete()
                    dup.delete()
                    deleted_discussions_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"Successfully cleaned up {deleted_discussions_count} duplicate discussions and re-linked actions under primary decisions."
        ))
