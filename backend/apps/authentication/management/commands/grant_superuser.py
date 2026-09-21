from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Grants is_staff and is_superuser status to all OWNER and ADMIN users.'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, help='Specific username to grant superuser to.')

    def handle(self, *args, **options):
        username = options.get('username')
        if username:
            users = User.objects.filter(username__iexact=username)
        else:
            users = User.objects.filter(role__in=[User.Role.OWNER, User.Role.ADMIN])

        count = 0
        for user in users:
            user.is_staff = True
            user.is_superuser = True
            user.save()
            count += 1
            self.stdout.write(self.style.SUCCESS(f'Successfully granted superuser & staff privileges to user: {user.username}'))

        if count == 0:
            self.stdout.write(self.style.WARNING('No matching users found.'))
