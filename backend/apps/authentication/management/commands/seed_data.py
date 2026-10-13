from django.core.management.base import BaseCommand
from apps.authentication.seeder import seed_database, DEFAULT_PASSWORD, SEED_ORGANIZATIONS

class Command(BaseCommand):
    help = 'Seeds realistic, production-valid demonstration data for 3 distinct organizations with all user passwords set to Shlesh@17.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clean',
            action='store_true',
            help='Clean up existing demonstration organizations, meetings, and actions before seeding.'
        )
        parser.add_argument(
            '--password',
            type=str,
            default=DEFAULT_PASSWORD,
            help=f'Password to assign to all created users (defaults to "{DEFAULT_PASSWORD}").'
        )

    def handle(self, *args, **options):
        clean = options.get('clean', False)
        password = options.get('password', DEFAULT_PASSWORD)

        self.stdout.write(self.style.NOTICE(f"🌱 Starting database seeding process..."))
        if clean:
            self.stdout.write(self.style.WARNING("⚠️  --clean specified: Existing records will be cleaned before seeding."))

        stats = seed_database(clean=clean, password=password)

        self.stdout.write(self.style.SUCCESS("\n🎉 Seeding Completed Successfully!"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        for key, val in stats.items():
            formatted_key = key.replace('_', ' ').capitalize()
            self.stdout.write(f"  • {formatted_key}: {val}")
        self.stdout.write(self.style.SUCCESS("=" * 60))

        self.stdout.write(self.style.NOTICE("\n🔑 Seeded Organizations & Logins:"))
        for org in SEED_ORGANIZATIONS:
            self.stdout.write(self.style.SUCCESS(f"\n🏢 Organization: {org['name']}"))
            self.stdout.write(f"   Industry: {org['description']}")
            self.stdout.write(f"   Owner:   {org['owner']['email']} (Username: {org['owner']['username']})")
            for u in org['users']:
                self.stdout.write(f"   {u['role']:<7}: {u['email']} (Username: {u['username']}, Dept: {u['department']})")

        self.stdout.write(self.style.WARNING(f"\n🔐 Password for ALL seeded users: {password}\n"))
