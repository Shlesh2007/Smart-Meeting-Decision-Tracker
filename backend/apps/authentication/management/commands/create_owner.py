from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Safely bootstrap or assign the primary OWNER role to an organization account'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, help='Username for the OWNER account')
        parser.add_argument('--email', type=str, help='Email address for the OWNER account')
        parser.add_argument('--password', type=str, help='Password for the OWNER account')
        parser.add_argument('--first-name', type=str, default='Organization', help='First name')
        parser.add_argument('--last-name', type=str, default='Owner', help='Last name')

    def handle(self, *args, **options):
        username = options.get('username')
        email = options.get('email')
        password = options.get('password')
        first_name = options.get('first_name')
        last_name = options.get('last_name')

        if not username or not email:
            raise CommandError('--username and --email are required.')

        user = User.objects.filter(email__iexact=email).first() or User.objects.filter(username__iexact=username).first()

        if user:
            user.role = User.Role.OWNER
            if password:
                user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Successfully updated existing user "{user.username}" to OWNER role.'))
        else:
            if not password:
                raise CommandError('--password is required when creating a new OWNER account.')

            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role=User.Role.OWNER
            )
            self.stdout.write(self.style.SUCCESS(f'Successfully created new OWNER account "{user.username}" ({user.email}).'))
