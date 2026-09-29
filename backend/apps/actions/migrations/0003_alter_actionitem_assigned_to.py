from django.conf import settings
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('actions', '0002_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RemoveField(
            model_name='actionitem',
            name='assigned_to',
        ),
        migrations.AddField(
            model_name='actionitem',
            name='assigned_to',
            field=models.ManyToManyField(
                blank=True,
                related_name='assigned_actions',
                to=settings.AUTH_USER_MODEL
            ),
        ),
    ]
