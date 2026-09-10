from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0002_passwordresetotp'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('OWNER', 'Owner'),
                    ('ADMIN', 'Admin'),
                    ('MANAGER', 'Manager'),
                    ('MEMBER', 'Member')
                ],
                default='MEMBER',
                max_length=20
            ),
        ),
    ]
