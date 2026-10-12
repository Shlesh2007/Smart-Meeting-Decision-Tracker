from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('actions', '0005_merge_20260929_1514'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='actionitem',
            options={'ordering': ['due_date', 'created_at']},
        ),
    ]
