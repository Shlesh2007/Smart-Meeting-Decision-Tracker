from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
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
