from django.contrib import admin
from .models import Discussion

@admin.register(Discussion)
class DiscussionAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'meeting', 'priority', 'created_by', 'created_at')
    list_filter = ('priority', 'created_at')
    search_fields = ('title', 'description', 'meeting__title', 'created_by__username')
