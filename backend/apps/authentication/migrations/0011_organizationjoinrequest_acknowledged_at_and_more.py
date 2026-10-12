# Generated for join request acknowledgment tracking with database safety

from django.db import migrations, models, connection

def add_acknowledged_fields_if_not_exists(apps, schema_editor):
    tables = set(connection.introspection.table_names())
    if 'authentication_organizationjoinrequest' in tables:
        columns = [c.name for c in connection.introspection.get_table_description(connection.cursor(), 'authentication_organizationjoinrequest')]
        with connection.cursor() as cursor:
            if 'is_acknowledged' not in columns:
                cursor.execute("ALTER TABLE authentication_organizationjoinrequest ADD COLUMN is_acknowledged boolean NOT NULL DEFAULT FALSE;")
            if 'acknowledged_at' not in columns:
                cursor.execute("ALTER TABLE authentication_organizationjoinrequest ADD COLUMN acknowledged_at timestamp with time zone NULL;")

class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0010_departmentchangerequest_and_more'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='organizationjoinrequest',
                    name='acknowledged_at',
                    field=models.DateTimeField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name='organizationjoinrequest',
                    name='is_acknowledged',
                    field=models.BooleanField(default=False),
                ),
            ],
            database_operations=[
                migrations.RunPython(add_acknowledged_fields_if_not_exists, reverse_code=migrations.RunPython.noop),
            ]
        )
    ]
