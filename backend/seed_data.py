#!/usr/bin/env python
"""
Standalone execution script to seed demonstration data for Smart Meeting Decision Tracker (SMDT).
Usage:
    python seed_data.py [--clean] [--password=<PASSWORD>]
"""
import os
import sys
import argparse

# Setup Django Environment
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_meeting_tracker.settings')

import django
django.setup()

from apps.authentication.seeder import seed_database, DEFAULT_PASSWORD, SEED_ORGANIZATIONS

def main():
    parser = argparse.ArgumentParser(description="Seed realistic valid data for 3 organizations in SMDT.")
    parser.add_argument("--clean", action="store_true", help="Clean existing demonstration data before seeding.")
    parser.add_argument("--password", type=str, default=DEFAULT_PASSWORD, help=f"Password for all users (default: {DEFAULT_PASSWORD}).")
    args = parser.parse_args()

    print("=" * 70)
    print("🌱 SMART MEETING DECISION TRACKER (SMDT) - DATA SEEDER")
    print("=" * 70)
    if args.clean:
        print("⚠️  Warning: --clean flag supplied. Wiping existing records...")

    stats = seed_database(clean=args.clean, password=args.password)

    print("\n✅ Seeding Complete! Summary:")
    print("-" * 50)
    for k, v in stats.items():
        print(f"  • {k.replace('_', ' ').title()}: {v}")
    print("-" * 50)

    print("\n🏢 Seeded Organizations & Accounts (Password for all: " + args.password + "):")
    for org in SEED_ORGANIZATIONS:
        print(f"\n📁 Organization: {org['name']} ({org['description']})")
        print(f"   👑 Owner:   {org['owner']['email']} (username: {org['owner']['username']})")
        for u in org['users']:
            print(f"   👤 {u['role']:<7}: {u['email']} (username: {u['username']}, dept: {u['department']})")

    print("\n" + "=" * 70)
    print("🚀 You can now log into the web application at http://localhost:3000 (or 5173)")
    print(f"   using any of the above emails/usernames and password '{args.password}'.")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    main()
