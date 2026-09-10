import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Safely bootstrap or assign the primary OWNER role to an organization account (supports CLI args and cloud env vars)'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, help='Username for the OWNER account')
        parser.add_argument('--email', type=str, help='Email address for the OWNER account')
        parser.add_argument('--password', type=str, help='Password for the OWNER account')
        parser.add_argument('--first-name', type=str, default=None, help='First name')
        parser.add_argument('--last-name', type=str, default=None, help='Last name')

    def handle(self, *args, **options):
        username = options.get('username') or os.environ.get('INITIAL_OWNER_USERNAME')
        email = options.get('email') or os.environ.get('INITIAL_OWNER_EMAIL')
        password = options.get('password') or os.environ.get('INITIAL_OWNER_PASSWORD')
        first_name = options.get('first_name') or os.environ.get('INITIAL_OWNER_FIRST_NAME', 'Organization')
        last_name = options.get('last_name') or os.environ.get('INITIAL_OWNER_LAST_NAME', 'Owner')

        if not username or not email:
            self.stdout.write(self.style.NOTICE('No OWNER credentials provided via CLI or env vars (INITIAL_OWNER_USERNAME, INITIAL_OWNER_EMAIL). Skipping auto-owner creation.'))
            return

        user = User.objects.filter(email__iexact=email).first() or User.objects.filter(username__iexact=username).first()

        if user:
            user.role = User.Role.OWNER
            if password:
                user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Successfully updated existing user "{user.username}" to OWNER role.'))
        else:
            if not password:
                self.stdout.write(self.style.ERROR('Password is required (via --password or INITIAL_OWNER_PASSWORD env var) to create a new OWNER.'))
                return

            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role=User.Role.OWNER
            )
            self.stdout.write(self.style.SUCCESS(f'Successfully created new OWNER account "{user.username}" ({user.email}).'))
