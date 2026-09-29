from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenRefreshView
from apps.authentication.views import CustomTokenObtainPairView

def api_root_health_check(request):
    return JsonResponse({
        'status': 'online',
        'app': 'Smart Meeting Decision Tracker API',
        'version': '1.0.0',
        'message': 'API backend is running smoothly!',
        'total_endpoints_available': 30,
        'endpoints': {
            'authentication': [
                {'path': '/api/auth/token/', 'methods': ['POST'], 'description': 'Obtain JWT access and refresh tokens'},
                {'path': '/api/auth/token/refresh/', 'methods': ['POST'], 'description': 'Refresh expired JWT access token'},
                {'path': '/api/auth/register/', 'methods': ['POST'], 'description': 'Register new user account'},
                {'path': '/api/auth/register/request-otp/', 'methods': ['POST'], 'description': 'Request 6-digit email registration verification OTP'},
                {'path': '/api/auth/register/confirm/', 'methods': ['POST'], 'description': 'Confirm registration OTP & activate user account'},
                {'path': '/api/auth/profile/', 'methods': ['GET', 'PATCH'], 'description': 'Retrieve or update authenticated user profile'},
                {'path': '/api/auth/profile/request-email-change/', 'methods': ['POST'], 'description': 'Request 6-digit OTP to change email address'},
                {'path': '/api/auth/profile/verify-email-change/', 'methods': ['POST'], 'description': 'Confirm email address update via OTP'},
                {'path': '/api/auth/profile/delete-account/', 'methods': ['DELETE'], 'description': 'Delete user account'},
                {'path': '/api/auth/password-reset/request-otp/', 'methods': ['POST'], 'description': 'Request 6-digit password reset OTP email'},
                {'path': '/api/auth/password-reset/verify-otp/', 'methods': ['POST'], 'description': 'Verify password reset 6-digit OTP code'},
                {'path': '/api/auth/password-reset/confirm/', 'methods': ['POST'], 'description': 'Confirm new password update'},
                {'path': '/api/auth/oauth/google/', 'methods': ['POST'], 'description': 'Authenticate or sign up via Google OAuth 2.0'},
                {'path': '/api/auth/oauth/github/', 'methods': ['POST'], 'description': 'Authenticate or sign up via GitHub OAuth 2.0'},
                {'path': '/api/auth/users/', 'methods': ['GET', 'POST', 'PATCH', 'DELETE'], 'description': 'Admin management directory for organization users & roles'},
                {'path': '/api/auth/department-requests/', 'methods': ['GET', 'POST', 'PATCH'], 'description': 'Submit or review department transfer requests'}
            ],
            'teams': [
                {'path': '/api/teams/', 'methods': ['GET', 'POST'], 'description': 'List or create organization teams'},
                {'path': '/api/teams/{id}/', 'methods': ['GET', 'PUT', 'PATCH', 'DELETE'], 'description': 'Manage team details, members, & assignments'}
            ],
            'meetings': [
                {'path': '/api/meetings/', 'methods': ['GET', 'POST'], 'description': 'List meetings (supports search & filters) or schedule new meeting'},
                {'path': '/api/meetings/{id}/', 'methods': ['GET', 'PUT', 'PATCH', 'DELETE'], 'description': 'Retrieve, update, or cancel meeting details'},
                {'path': '/api/meetings/{id}/send-otp/', 'methods': ['POST'], 'description': 'Dispatch 6-digit check-in OTP for meeting entrance'},
                {'path': '/api/meetings/{id}/send-reminder/', 'methods': ['POST'], 'description': 'Send email reminder to invited meeting attendees'},
                {'path': '/api/meetings/validate-meet-url/', 'methods': ['POST'], 'description': 'Validate Google Meet URL format'}
            ],
            'discussions': [
                {'path': '/api/discussions/', 'methods': ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], 'description': 'List or record discussion topics for a meeting'}
            ],
            'decisions': [
                {'path': '/api/decisions/', 'methods': ['GET', 'POST', 'PUT', 'PATCH'], 'description': 'Record or update approved decisions for discussion topics'},
                {'path': '/api/decisions/{id}/history/', 'methods': ['GET'], 'description': 'Fetch immutable decision audit version history'}
            ],
            'actions': [
                {'path': '/api/actions/', 'methods': ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], 'description': 'List, create, or update action items & prerequisite locks'},
                {'path': '/api/actions/my_actions/', 'methods': ['GET'], 'description': 'Retrieve action items assigned to or created by current user'}
            ],
            'analytics': [
                {'path': '/api/analytics/dashboard/', 'methods': ['GET'], 'description': 'Fetch high-density dashboard KPIs, completion rates, & workload charts'}
            ],
            'notifications': [
                {'path': '/api/notifications/', 'methods': ['GET', 'POST', 'PATCH'], 'description': 'List or manage user notifications'},
                {'path': '/api/notifications/mark-all-read/', 'methods': ['POST'], 'description': 'Mark all unread notifications as read'}
            ]
        }
    }, json_dumps_params={'indent': 2})

urlpatterns = [
    path('', api_root_health_check),
    path('api/', api_root_health_check),
    path('admin/', admin.site.urls),
    
    # Auth endpoints
    path('api/auth/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),

    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/', include('apps.authentication.urls')),
    
    # Domain APIs
    path('api/teams/', include('apps.teams.urls')),
    path('api/meetings/', include('apps.meetings.urls')),
    path('api/discussions/', include('apps.discussions.urls')),
    path('api/decisions/', include('apps.decisions.urls')),
    path('api/actions/', include('apps.actions.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
]
