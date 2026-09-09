from rest_framework import generics, viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import random
import requests
import logging
from .serializers import UserSerializer, RegisterSerializer
from .models import PasswordResetOTP
from .permissions import IsAdminUserRole

logger = logging.getLogger(__name__)
User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user, context=self.get_serializer_context()).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error("Registration exception: %s", str(e), exc_info=True)
            if hasattr(e, 'detail'):
                return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)
    search_fields = ('username', 'email', 'first_name', 'last_name', 'department')
    filterset_fields = ('role', 'department')

    def get_permissions(self):
        if self.action in ['destroy', 'create', 'update', 'partial_update']:
            return [IsAdminUserRole()]
        return [permissions.IsAuthenticated()]


# --- OTP PASSWORD RESET VIEWS ---

class RequestPasswordResetOTPView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        account = request.data.get('account', '').strip()
        if not account:
            return Response({'error': 'Please provide your email address or username.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=account).first() or User.objects.filter(username__iexact=account).first()
        if not user:
            return Response({'error': 'No registered account found with that email or username.'}, status=status.HTTP_404_NOT_FOUND)

        # Generate 6-digit random OTP
        otp_code = f"{random.randint(100000, 999999)}"
        expires_at = timezone.now() + timedelta(minutes=10)

        # Save to database
        PasswordResetOTP.objects.create(
            email=user.email,
            otp_code=otp_code,
            expires_at=expires_at
        )

        # Send Email
        subject = "SmartMeeting Tracker - Password Reset Verification Code"
        message_body = (
            f"Hello {user.first_name or user.username},\n\n"
            f"Your 6-digit OTP verification code for resetting your password is:\n\n"
            f"    {otp_code}\n\n"
            f"This code will expire in 10 minutes. If you did not request a password reset, please ignore this email.\n\n"
            f"Best regards,\nSmartMeeting Tracker Support Team"
        )
        try:
            send_mail(
                subject=subject,
                message=message_body,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', f'SmartMeeting Tracker <{user.email}>'),
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception as e:
            logger.error("Failed to send OTP email to %s: %s", user.email, str(e))
            return Response({
                'error': f'Failed to send OTP email: {str(e)}. Please check backend EMAIL_HOST_PASSWORD App Password.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'message': f'6-digit OTP code sent to {user.email}. Please check your email inbox.',
            'email': user.email
        }, status=status.HTTP_200_OK)


class VerifyPasswordResetOTPView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        email = request.data.get('email', '').strip()
        otp_code = request.data.get('otp_code', '').strip()

        if not email or not otp_code:
            return Response({'error': 'Email and OTP code are required.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = PasswordResetOTP.objects.filter(
            email__iexact=email,
            otp_code=otp_code,
            expires_at__gte=timezone.now()
        ).first()

        if not otp_record:
            return Response({'error': 'Invalid or expired OTP code. Please request a new OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record.is_verified = True
        otp_record.save()

        return Response({
            'message': 'OTP code verified successfully!',
            'verified': True
        }, status=status.HTTP_200_OK)


class ConfirmPasswordResetView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        email = request.data.get('email', '').strip()
        otp_code = request.data.get('otp_code', '').strip()
        new_password = request.data.get('new_password', '').strip()

        if not email or not otp_code or not new_password:
            return Response({'error': 'Email, OTP code, and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 6:
            return Response({'error': 'New password must be at least 6 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = PasswordResetOTP.objects.filter(
            email__iexact=email,
            otp_code=otp_code,
            is_verified=True
        ).first()

        if not otp_record:
            return Response({'error': 'OTP has not been verified yet or has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        user.set_password(new_password)
        user.save()

        # Delete used OTP record
        otp_record.delete()

        return Response({'message': 'Password has been reset successfully! You can now sign in.'}, status=status.HTTP_200_OK)


# --- OAUTH 2.0 VIEWS ---

class GoogleOAuthView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        try:
            credential = request.data.get('credential') or request.data.get('id_token') or request.data.get('access_token')
            email = request.data.get('email')
            name = request.data.get('name', 'Google User')

            if not credential and not email:
                return Response({'error': 'Google credential or token is required.'}, status=status.HTTP_400_BAD_REQUEST)

            # Verify Google token using userinfo endpoint (for access_token) or tokeninfo endpoint (for id_token)
            if credential and not email:
                try:
                    userinfo_resp = requests.get(
                        'https://www.googleapis.com/oauth2/v3/userinfo',
                        headers={'Authorization': f'Bearer {credential}'},
                        timeout=5
                    )
                    if userinfo_resp.status_code == 200:
                        data = userinfo_resp.json()
                        email = data.get('email')
                        name = data.get('name') or f"{data.get('given_name', '')} {data.get('family_name', '')}".strip() or name
                    else:
                        tokeninfo_resp = requests.get(f'https://oauth2.googleapis.com/tokeninfo?id_token={credential}', timeout=5)
                        if tokeninfo_resp.status_code == 200:
                            data = tokeninfo_resp.json()
                            email = data.get('email')
                            name = data.get('name', name)
                except Exception as e:
                    logger.warning("Google token verification warning: %s", str(e))

            if not email:
                email = f"google_user_{random.randint(1000, 9999)}@gmail.com"

            name_parts = name.split(' ', 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ''

            username_candidate = email.split('@')[0]
            user = User.objects.filter(email__iexact=email).first()

            if not user:
                base_username = username_candidate
                counter = 1
                while User.objects.filter(username=username_candidate).exists():
                    username_candidate = f"{base_username}_{counter}"
                    counter += 1

                random_password = f"oauth_{random.randint(100000, 999999)}_{random.randint(1000, 9999)}"
                user = User.objects.create_user(
                    username=username_candidate,
                    email=email,
                    password=random_password,
                    first_name=first_name,
                    last_name=last_name,
                    role=User.Role.MEMBER
                )

            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user, context={'request': request}).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'Logged in with Google OAuth successfully!'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error("Google OAuth Error: %s", str(e), exc_info=True)
            return Response({'error': f"OAuth processing failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class GitHubOAuthView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        try:
            code = request.data.get('code')
            email = request.data.get('email')
            username = request.data.get('username')
            full_name = request.data.get('full_name') or ''

            if not code and not email and not username:
                return Response({'error': 'GitHub authorization code or username is required.'}, status=status.HTTP_400_BAD_REQUEST)

            # Exchange code with GitHub API if code is provided
            if code:
                try:
                    client_id = getattr(settings, 'GITHUB_CLIENT_ID', '')
                    client_secret = getattr(settings, 'GITHUB_CLIENT_SECRET', '')
                    token_resp = requests.post(
                        'https://github.com/login/oauth/access_token',
                        headers={'Accept': 'application/json'},
                        data={'client_id': client_id, 'client_secret': client_secret, 'code': code},
                        timeout=5
                    )
                    if token_resp.status_code == 200:
                        token_json = token_resp.json()
                        access_token = token_json.get('access_token')
                        if not access_token and token_json.get('error'):
                            logger.error("GitHub OAuth Token Error: %s (%s)", token_json.get('error'), token_json.get('error_description'))

                        if access_token:
                            user_resp = requests.get(
                                'https://api.github.com/user',
                                headers={'Authorization': f'Bearer {access_token}', 'Accept': 'application/json'},
                                timeout=5
                            )
                            if user_resp.status_code == 200:
                                gh_data = user_resp.json()
                                username = gh_data.get('login') or username
                                full_name = gh_data.get('name') or full_name or username
                                email = gh_data.get('email')

                            # If primary email is private in GitHub settings, fetch from /user/emails
                            if not email:
                                try:
                                    emails_resp = requests.get(
                                        'https://api.github.com/user/emails',
                                        headers={'Authorization': f'Bearer {access_token}', 'Accept': 'application/json'},
                                        timeout=5
                                    )
                                    if emails_resp.status_code == 200:
                                        email_list = emails_resp.json()
                                        primary_email = next((e['email'] for e in email_list if e.get('primary') and e.get('verified')), None)
                                        if not primary_email and email_list:
                                            primary_email = email_list[0].get('email')
                                        if primary_email:
                                            email = primary_email
                                except Exception as ex:
                                    logger.warning("Failed to fetch GitHub private emails: %s", str(ex))
                except Exception as e:
                    logger.warning("GitHub OAuth API exchange warning: %s", str(e))

            if not username:
                username = email.split('@')[0] if email else f"github_user_{random.randint(1000, 9999)}"
            if not email:
                email = f"{username}@users.noreply.github.com"

            name_parts = (full_name or username).split(' ', 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ''

            user = User.objects.filter(email__iexact=email).first() or User.objects.filter(username__iexact=username).first()

            if not user:
                base_username = username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}_{counter}"
                    counter += 1

                random_password = f"oauth_{random.randint(100000, 999999)}_{random.randint(1000, 9999)}"
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=random_password,
                    first_name=first_name,
                    last_name=last_name,
                    role=User.Role.MEMBER
                )
            else:
                # Update existing user if it had a temporary placeholder username
                if 'github_user_' in user.username and 'github_user_' not in username:
                    user.username = username
                if not user.first_name or user.first_name.startswith('github_user_'):
                    user.first_name = first_name
                    user.last_name = last_name
                user.save()

            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user, context={'request': request}).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'Logged in with GitHub OAuth successfully!'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error("GitHub OAuth Error: %s", str(e), exc_info=True)
            return Response({'error': f"OAuth processing failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
