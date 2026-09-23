from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0004_departmentchangerequest'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='google_access_token',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='google_refresh_token',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='google_token_expires_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
