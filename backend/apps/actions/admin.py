from django.contrib import admin
from .models import ActionItem

@admin.register(ActionItem)
class ActionItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'decision', 'display_assigned_to', 'priority', 'due_date', 'status', 'created_by')
    list_filter = ('priority', 'status', 'due_date')
    search_fields = ('title', 'description', 'completion_notes', 'assigned_to__username')
    filter_horizontal = ('assigned_to', 'dependencies')

    @admin.display(description='Assigned To')
    def display_assigned_to(self, obj):
        return ", ".join([user.get_full_name() or user.username for user in obj.assigned_to.all()]) or "-"

