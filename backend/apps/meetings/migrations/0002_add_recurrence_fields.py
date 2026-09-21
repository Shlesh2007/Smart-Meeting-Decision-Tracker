from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('meetings', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='meeting',
            name='is_recurring',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='meeting',
            name='recurrence_pattern',
            field=models.CharField(
                blank=True,
                choices=[('DAILY', 'Daily'), ('WEEKDAYS', 'Weekdays (Mon-Fri)'), ('WEEKLY', 'Weekly')],
                max_length=20,
                null=True
            ),
        ),
        migrations.AddField(
            model_name='meeting',
            name='recurrence_end_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='meeting',
            name='recurrence_group_id',
            field=models.CharField(blank=True, db_index=True, max_length=64, null=True),
        ),
    ]
