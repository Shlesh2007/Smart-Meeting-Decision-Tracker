from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

def api_root_health_check(request):
    return JsonResponse({
        'status': 'online',
        'app': 'Smart Meeting Decision Tracker API',
        'message': 'API backend is running smoothly on Render!',
        'endpoints': [
            '/api/auth/token/',
            '/api/auth/profile/',
            '/api/meetings/',
            '/api/actions/',
            '/api/analytics/dashboard/'
        ]
    })

urlpatterns = [
    path('', api_root_health_check),
    path('api/', api_root_health_check),
    path('admin/', admin.site.urls),
    
    # Auth endpoints
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/', include('apps.authentication.urls')),
    
    # Domain APIs
    path('api/teams/', include('apps.teams.urls')),
    path('api/meetings/', include('apps.meetings.urls')),
    path('api/discussions/', include('apps.discussions.urls')),
    path('api/decisions/', include('apps.decisions.urls')),
    path('api/actions/', include('apps.actions.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
]
