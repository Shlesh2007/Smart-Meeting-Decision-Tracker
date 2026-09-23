import os
import sys
import django
from pathlib import Path

# Setup Django environment
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_meeting_tracker.settings')
django.setup()

from django.db import connection
from django.contrib.auth import get_user_model
from apps.meetings.models import Meeting
from apps.actions.models import ActionItem

User = get_user_model()

def check_db_connection():
    print("=" * 60)
    print("🔍 DJANGO DATABASE CONNECTION VERIFICATION")
    print("=" * 60)

    db_settings = connection.settings_dict
    engine = db_settings.get('ENGINE', '')
    host = db_settings.get('HOST', '')
    port = db_settings.get('PORT', '')
    name = db_settings.get('NAME', '')
    user = db_settings.get('USER', '')

    print(f"🔹 Database Engine  : {engine}")
    print(f"🔹 Database Host    : {host or 'localhost'}")
    print(f"🔹 Database Port    : {port or 'default'}")
    print(f"🔹 Database Name    : {name}")
    print(f"🔹 Database User    : {user}")

    if 'postgresql' not in engine.lower():
        print("\n❌ CRITICAL: Django is NOT connected to PostgreSQL! Active engine is SQLite.")
        return False

    print("\n✅ SUCCESS: Django is connected to PostgreSQL!")

    # Verify query counts
    try:
        user_count = User.objects.count()
        meeting_count = Meeting.objects.count()
        action_count = ActionItem.objects.count()

        print(f"\n📊 Current PostgreSQL Table Record Counts:")
        print(f"   - Users      : {user_count}")
        print(f"   - Meetings   : {meeting_count}")
        print(f"   - ActionItems: {action_count}")

        latest_meeting = Meeting.objects.order_by('-created_at').first()
        if latest_meeting:
            print(f"\n📅 Latest PostgreSQL Meeting Record:")
            print(f"   - ID        : {latest_meeting.id}")
            print(f"   - Title     : {latest_meeting.title}")
            print(f"   - Date/Time : {latest_meeting.meeting_date} {latest_meeting.start_time}")
            print(f"   - Created At: {latest_meeting.created_at}")

        return True
    except Exception as e:
        print(f"\n❌ Error querying PostgreSQL models: {e}")
        return False

if __name__ == '__main__':
    check_db_connection()
