import os
import django
from pathlib import Path
import dotenv

BASE_DIR = Path(__file__).resolve().parent
dotenv.load_dotenv(BASE_DIR / '.env')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_meeting_tracker.settings')
django.setup()

from django.db import connection

print("Resetting PostgreSQL tables for fresh clean migration...")
with connection.cursor() as cursor:
    cursor.execute("DROP SCHEMA public CASCADE;")
    cursor.execute("CREATE SCHEMA public;")
    cursor.execute("GRANT ALL ON SCHEMA public TO postgres;")
    cursor.execute("GRANT ALL ON SCHEMA public TO public;")

print("PostgreSQL public schema reset successfully! You can now run 'python manage.py migrate'.")
