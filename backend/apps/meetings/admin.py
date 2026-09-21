from django.contrib import admin
from .models import Meeting

@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'meeting_date', 'start_time', 'end_time', 'meeting_type', 'status', 'created_by')
    list_filter = ('meeting_type', 'status', 'meeting_date')
    search_fields = ('title', 'description', 'location', 'created_by__username', 'created_by__email')
    ordering = ('-meeting_date', '-start_time')
    filter_horizontal = ('participants',)
