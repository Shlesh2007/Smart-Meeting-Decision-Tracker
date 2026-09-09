from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, UserProfileView, UserViewSet,
    RequestPasswordResetOTPView, VerifyPasswordResetOTPView, ConfirmPasswordResetView,
    RequestEmailChangeOTPView, VerifyEmailChangeOTPView, DeleteAccountView,
    GoogleOAuthView, GitHubOAuthView
)

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('profile/', UserProfileView.as_view(), name='auth_profile'),
    
    # Profile Email Change & Account Deletion Endpoints
    path('profile/request-email-change/', RequestEmailChangeOTPView.as_view(), name='auth_request_email_change_otp'),
    path('profile/verify-email-change/', VerifyEmailChangeOTPView.as_view(), name='auth_verify_email_change_otp'),
    path('profile/delete-account/', DeleteAccountView.as_view(), name='auth_delete_account'),

    # OTP Password Reset Endpoints
    path('password-reset/request-otp/', RequestPasswordResetOTPView.as_view(), name='auth_request_otp'),
    path('password-reset/verify-otp/', VerifyPasswordResetOTPView.as_view(), name='auth_verify_otp'),
    path('password-reset/confirm/', ConfirmPasswordResetView.as_view(), name='auth_confirm_password_reset'),

    # OAuth 2.0 Endpoints
    path('oauth/google/', GoogleOAuthView.as_view(), name='auth_oauth_google'),
    path('oauth/github/', GitHubOAuthView.as_view(), name='auth_oauth_github'),

    path('', include(router.urls)),
]

