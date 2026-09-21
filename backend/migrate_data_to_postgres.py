import os
import sys
import django
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
dump_file = BASE_DIR / 'sqlite_backup.json'

def export_sqlite():
    # Force SQLite DB settings for export
    os.environ['DATABASE_URL'] = ''
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_meeting_tracker.settings')
    django.setup()

    from django.core.management import call_command
    print("📦 Step 1: Exporting all current local data from SQLite...")
    with open(dump_file, 'w', encoding='utf-8') as f:
        call_command(
            'dumpdata',
            exclude=['contenttypes', 'auth.permission', 'admin.logentry', 'sessions.session'],
            natural_foreign=True,
            natural_primary=True,
            indent=2,
            stdout=f
        )
    print(f"✅ Export completed! Data saved to: {dump_file.name}")

if __name__ == '__main__':
    export_sqlite()
