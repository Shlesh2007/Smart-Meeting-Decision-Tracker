from django.contrib import admin
from .models import ActionItem

@admin.register(ActionItem)
class ActionItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'decision', 'assigned_to', 'priority', 'due_date', 'status', 'created_by')
    list_filter = ('priority', 'status', 'due_date')
    search_fields = ('title', 'description', 'completion_notes', 'assigned_to__username')
    filter_horizontal = ('dependencies',)
