import os
import sys
import django
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
dump_file = BASE_DIR / 'sqlite_backup.json'

def export_sqlite():
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

def import_postgres(postgres_url):
    if not dump_file.exists():
        print(f"❌ Backup file {dump_file.name} not found! Run export first.")
        return

    os.environ['DATABASE_URL'] = postgres_url
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_meeting_tracker.settings')
    django.setup()

    from django.core.management import call_command
    print(f"🚀 Step 2: Running migrations on PostgreSQL...")
    call_command('migrate')

    print(f"📥 Step 3: Importing backup data into PostgreSQL...")
    call_command('loaddata', str(dump_file))
    print("🎉 SUCCESS! All SQLite data has been migrated to PostgreSQL!")

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--import':
        pg_url = sys.argv[2] if len(sys.argv) > 2 else os.environ.get('DATABASE_URL', '')
        if not pg_url:
            print("❌ Please provide PostgreSQL DATABASE_URL. Example:")
            print("py migrate_data_to_postgres.py --import postgres://postgres:password@localhost:5432/smdt_db")
        else:
            import_postgres(pg_url)
    else:
        export_sqlite()
        print("\n👉 Next step to import into PostgreSQL:")
        print("Run: py migrate_data_to_postgres.py --import \"postgres://USER:PASSWORD@HOST:PORT/DBNAME\"")
