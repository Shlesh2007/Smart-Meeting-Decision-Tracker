from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('actions', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='actionitem',
            name='completion_notes',
            field=models.TextField(blank=True, null=True),
        ),
    ]
