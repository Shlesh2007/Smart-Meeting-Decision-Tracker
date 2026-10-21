from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('actions', '0003_alter_actionitem_assigned_to'),
    ]

    operations = [
        migrations.AddField(
            model_name='actionitem',
            name='dependency_rule',
            field=models.CharField(
                choices=[('ALL', 'Require All Prerequisites (AND)'), ('ANY', 'Require At Least One Prerequisite (OR)')],
                default='ALL',
                max_length=10
            ),
        ),
    ]
