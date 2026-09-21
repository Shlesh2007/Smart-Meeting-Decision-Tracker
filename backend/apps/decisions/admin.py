from django.contrib import admin
from .models import Decision, DecisionHistory

@admin.register(Decision)
class DecisionAdmin(admin.ModelAdmin):
    list_display = ('id', 'discussion', 'status', 'decided_by', 'version', 'decision_date')
    list_filter = ('status', 'version')
    search_fields = ('decision', 'reason', 'discussion__title', 'decided_by__username')

@admin.register(DecisionHistory)
class DecisionHistoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'decision', 'version', 'changed_by', 'changed_at')
