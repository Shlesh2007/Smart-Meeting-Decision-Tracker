from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, RequestRegisterOTPView, ConfirmRegisterView, UserProfileView, UserViewSet,
    LookupAccountView, RequestPasswordResetOTPView, VerifyPasswordResetOTPView, ConfirmPasswordResetView,
    RequestEmailChangeOTPView, VerifyEmailChangeOTPView, DeleteAccountView, CheckDeleteAccountView,
    TransferOwnershipView, DeleteOrganizationView, CreateOrganizationView, JoinOrganizationView,
    OrganizationStatusView, GoogleOAuthView, GitHubOAuthView, DepartmentChangeRequestViewSet,
    OrganizationJoinRequestViewSet, OrganizationLeaveRequestViewSet, SeedDataView
)

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')
router.register('department-requests', DepartmentChangeRequestViewSet, basename='department-request')
router.register('organization-join-requests', OrganizationJoinRequestViewSet, basename='organization-join-request')
router.register('organization-leave-requests', OrganizationLeaveRequestViewSet, basename='organization-leave-request')


urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('register/request-otp/', RequestRegisterOTPView.as_view(), name='auth_register_request_otp'),
    path('register/confirm/', ConfirmRegisterView.as_view(), name='auth_register_confirm'),
    path('profile/', UserProfileView.as_view(), name='auth_profile'),

    # Profile Account Deletion & Email Change Endpoints
    path('profile/request-email-change/', RequestEmailChangeOTPView.as_view(), name='auth_request_email_change_otp'),
    path('profile/verify-email-change/', VerifyEmailChangeOTPView.as_view(), name='auth_verify_email_change_otp'),
    path('profile/delete-account/check/', CheckDeleteAccountView.as_view(), name='auth_check_delete_account'),
    path('profile/transfer-ownership/', TransferOwnershipView.as_view(), name='auth_transfer_ownership'),
    path('profile/delete-account/', DeleteAccountView.as_view(), name='auth_delete_account'),
    
    # Organization Lifecycle Endpoints
    path('organization/create/', CreateOrganizationView.as_view(), name='auth_create_organization'),
    path('organization/join/', JoinOrganizationView.as_view(), name='auth_join_organization'),
    path('organization/status/', OrganizationStatusView.as_view(), name='auth_organization_status'),
    path('delete-organization/', DeleteOrganizationView.as_view(), name='auth_delete_organization'),
    path('seed-data/', SeedDataView.as_view(), name='auth_seed_data'),

    # OTP Password Reset Endpoints
    path('password-reset/lookup-account/', LookupAccountView.as_view(), name='auth_lookup_account'),
    path('password-reset/request-otp/', RequestPasswordResetOTPView.as_view(), name='auth_request_otp'),
    path('password-reset/verify-otp/', VerifyPasswordResetOTPView.as_view(), name='auth_verify_otp'),
    path('password-reset/confirm/', ConfirmPasswordResetView.as_view(), name='auth_confirm_password_reset'),

    # OAuth 2.0 Endpoints
    path('oauth/google/', GoogleOAuthView.as_view(), name='auth_oauth_google'),
    path('oauth/github/', GitHubOAuthView.as_view(), name='auth_oauth_github'),

    path('', include(router.urls)),
]


