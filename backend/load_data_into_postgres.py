import os
import sys
import django
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
dump_file = BASE_DIR / 'sqlite_backup.json'

def load_postgres():
    # Set DATABASE_URL for local PostgreSQL 18 on port 5433 with lowercase smart_meeting_tracker
    os.environ['DATABASE_URL'] = 'postgres://postgres:Shlesh%4017@localhost:5433/smart_meeting_tracker'
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_meeting_tracker.settings')
    django.setup()

    from django.core.management import call_command
    print("🚀 Step 1: Running Django migrations on PostgreSQL 18 (smart_meeting_tracker on port 5433)...")
    call_command('migrate')

    print("🧹 Clearing old PostgreSQL test data to prevent duplicate key conflicts...")
    try:
        call_command('flush', interactive=False)
    except Exception as e:
        print(f"Notice during flush: {e}")

    print("📥 Step 2: Loading all backed-up local data into PostgreSQL 18...")
    if dump_file.exists():
        call_command('loaddata', str(dump_file))
        print("\n🎉 SUCCESS! All your real local users, meetings, decisions, and action items have been loaded into PostgreSQL 18!")
    else:
        print(f"❌ Backup file {dump_file.name} not found! Please run export first.")

if __name__ == '__main__':
    load_postgres()
