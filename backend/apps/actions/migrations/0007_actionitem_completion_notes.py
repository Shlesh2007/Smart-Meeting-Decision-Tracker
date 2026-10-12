# Generated for completion_notes field with database safety

from django.db import migrations, models, connection

def add_completion_notes_if_not_exists(apps, schema_editor):
    tables = set(connection.introspection.table_names())
    if 'actions_actionitem' in tables:
        columns = [c.name for c in connection.introspection.get_table_description(connection.cursor(), 'actions_actionitem')]
        if 'completion_notes' not in columns:
            with connection.cursor() as cursor:
                cursor.execute("ALTER TABLE actions_actionitem ADD COLUMN completion_notes text NULL;")

class Migration(migrations.Migration):

    dependencies = [
        ('actions', '0006_alter_actionitem_options_actionitem_completion_notes'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='actionitem',
                    name='completion_notes',
                    field=models.TextField(blank=True, null=True),
                ),
            ],
            database_operations=[
                migrations.RunPython(add_completion_notes_if_not_exists, reverse_code=migrations.RunPython.noop),
            ]
        )
    ]
