from rest_framework import generics, viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.core.mail import send_mail, get_connection, EmailMessage
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import random
import requests
import logging
from .serializers import UserSerializer, RegisterSerializer
from .models import PasswordResetOTP
from .permissions import IsAdminUserRole, CanManageUsersPermission, IsOwnerUserRole, IsManagerUserRole

logger = logging.getLogger(__name__)
User = get_user_model()

class RequestRegisterOTPView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        username = request.data.get('username', '').strip()
        first_name = request.data.get('first_name', '').strip()
        password = request.data.get('password', '')
        password_confirm = request.data.get('password_confirm', '')

        if not email or not username or not password:
            return Response({'error': 'Username, email, and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if password != password_confirm:
            return Response({'password': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(password) < 6:
            return Response({'password': 'Password must be at least 6 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username__iexact=username).exists():
            return Response({'username': 'A user with that username already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=email).exists():
            return Response({'email': 'A user with this email address already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate 6-digit OTP code
        otp_code = f"{random.randint(100000, 999999)}"
        expires_at = timezone.now() + timedelta(minutes=10)

        PasswordResetOTP.objects.create(
            email=email,
            otp_code=otp_code,
            expires_at=expires_at
        )

        subject = "SmartMeeting Tracker - Account Registration Verification Code"
        recipient_name = first_name or username

        message_body = (
            f"Hello {recipient_name},\n\n"
            f"Thank you for signing up for SmartMeeting Decision Tracker!\n"
            f"Your 6-digit OTP verification code to complete registration is: {otp_code}\n\n"
            f"This code will expire in 10 minutes.\n\n"
            f"Best regards,\nSmartMeeting Tracker Team"
        )

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
            .container {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
            .header {{ background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 28px 32px; text-align: left; }}
            .header h1 {{ color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; tracking-tight; }}
            .header p {{ color: #93c5fd; margin: 4px 0 0 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }}
            .body-content {{ padding: 32px; }}
            .greeting {{ font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; }}
            .text {{ font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 18px; }}
            .otp-box {{ background-color: #f0f9ff; border: 2px dashed #0284c7; border-radius: 12px; padding: 22px; text-align: center; margin: 24px 0; }}
            .otp-code {{ font-size: 36px; font-weight: 900; font-family: 'Courier New', Courier, monospace; letter-spacing: 10px; color: #0369a1; display: inline-block; margin: 0; }}
            .badge {{ display: inline-block; background-color: #fef2f2; color: #dc2626; border: 1px solid #fecaca; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; margin-top: 12px; }}
            .footer {{ background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚡ SmartMeeting Decision Tracker</h1>
              <p>Account Registration Verification</p>
            </div>
            <div class="body-content">
              <p class="greeting">Hello {recipient_name},</p>
              <p class="text">Thank you for registering your SmartMeeting Decision Tracker account. Use the 6-digit verification code below to verify your email address and activate your account:</p>
              
              <div class="otp-box">
                <div class="otp-code">{otp_code}</div>
                <div><span class="badge">⏰ Code expires in 10 minutes</span></div>
              </div>

              <p class="text" style="font-size: 13px; color: #64748b;">
                If you did not attempt to register an account, please ignore this email.
              </p>
              <p class="text" style="margin-bottom: 0;">
                Best regards,<br>
                <strong style="color: #1e293b;">SmartMeeting Decision Tracker Team</strong>
              </p>
            </div>
            <div class="footer">
              This is an automated security notification sent by SmartMeeting Decision Tracker.<br>
              © {timezone.now().year} SmartMeeting Tracker. All rights reserved.
            </div>
          </div>
        </body>
        </html>
        """

        email_sent = False
        last_error = None

        brevo_api_key = getattr(settings, 'EMAIL_HOST_PASSWORD', '')
        sender_email = getattr(settings, 'EMAIL_HOST_USER', 'shleshdarji317@gmail.com')

        try:
            api_headers = {
                'accept': 'application/json',
                'api-key': brevo_api_key,
                'content-type': 'application/json',
            }
            api_payload = {
                'sender': {'name': 'SmartMeeting Tracker', 'email': sender_email},
                'to': [{'email': email}],
                'subject': subject,
                'htmlContent': html_body,
                'textContent': message_body
            }
            resp = requests.post('https://api.brevo.com/v3/smtp/email', json=api_payload, headers=api_headers, timeout=8)
            if resp.status_code in (200, 201, 202):
                email_sent = True
                logger.info("Registration Verification OTP delivered to %s via Brevo API", email)
            else:
                logger.warning("Brevo API returned %s: %s", resp.status_code, resp.text)
                last_error = f"Brevo API HTTP {resp.status_code}"
        except Exception as api_err:
            logger.warning("Brevo API call failed for registration: %s", str(api_err))
            last_error = str(api_err)

        if not email_sent:
            brevo_host = getattr(settings, 'EMAIL_HOST', 'smtp-relay.brevo.com')
            configured_port = int(getattr(settings, 'EMAIL_PORT', 587))
            brevo_ports = [
                (configured_port, configured_port != 465, configured_port == 465),
                (2525, True, False),
                (587, True, False),
            ]
            for port, use_tls, use_ssl in brevo_ports:
                try:
                    connection = get_connection(
                        backend='django.core.mail.backends.smtp.EmailBackend',
                        host=brevo_host,
                        port=port,
                        username=sender_email,
                        password=brevo_api_key,
                        use_tls=use_tls,
                        use_ssl=use_ssl,
                        timeout=5,
                    )
                    mail = EmailMessage(
                        subject=subject,
                        body=html_body,
                        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', f'SmartMeeting Tracker <{sender_email}>'),
                        to=[email],
                        connection=connection,
                    )
                    mail.content_subtype = "html"
                    mail.send(fail_silently=False)
                    email_sent = True
                    break
                except Exception as e:
                    logger.warning("SMTP fallback failed: %s", str(e))

        if not email_sent:
            return Response({'error': f'Failed to deliver email OTP: {last_error or "Delivery Error"}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'message': f'6-digit OTP verification code sent to {email}. Please check your email inbox.',
            'email': email
        }, status=status.HTTP_200_OK)


class ConfirmRegisterView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        username = request.data.get('username', '').strip()
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        password = request.data.get('password', '')
        department = request.data.get('department', '').strip()
        otp_code = request.data.get('otp_code', '').strip()

        if not email or not username or not password or not otp_code:
            return Response({'error': 'Email, username, password, and OTP code are required.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = PasswordResetOTP.objects.filter(
            email__iexact=email,
            otp_code=otp_code,
            expires_at__gte=timezone.now()
        ).first()

        if not otp_record:
            return Response({'error': 'Invalid or expired OTP verification code.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username__iexact=username).exists():
            return Response({'username': 'A user with that username already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=email).exists():
            return Response({'email': 'A user with this email address already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create user with role MEMBER (explicitly enforced for public signup)
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=User.Role.MEMBER,
            department=department
        )

        # Delete used OTP
        otp_record.delete()

        # Generate JWT Tokens
        refresh = RefreshToken.for_user(user)

        return Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'message': 'Account registered and email verified successfully!'
        }, status=status.HTTP_201_CREATED)


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

    def update(self, request, *args, **kwargs):
        if 'email' in request.data and request.data['email'].strip().lower() != request.user.email.lower():
            return Response(
                {'error': 'Email address cannot be updated directly. Please use the "Change Email" OTP verification flow.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().update(request, *args, **kwargs)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = (CanManageUsersPermission,)
    search_fields = ('username', 'email', 'first_name', 'last_name', 'department')
    filterset_fields = ('role', 'department')

    def perform_create(self, serializer):
        user = self.request.user
        role_to_assign = serializer.validated_data.get('role', User.Role.MEMBER)
        
        # ADMIN cannot create OWNER or ADMIN users
        if not user.is_owner_role and user.is_admin_role:
            if role_to_assign in [User.Role.OWNER, User.Role.ADMIN]:
                raise permissions.PermissionDenied("ADMIN cannot create OWNER or ADMIN accounts.")

        serializer.save()

    def perform_update(self, serializer):
        target_user = self.get_object()
        caller = self.request.user

        # ADMIN cannot modify OWNER
        if target_user.role == User.Role.OWNER and not caller.is_owner_role:
            raise permissions.PermissionDenied("ADMIN cannot modify the OWNER account.")

        # ADMIN cannot modify other ADMIN accounts
        if target_user.role == User.Role.ADMIN and not caller.is_owner_role and caller.id != target_user.id:
            raise permissions.PermissionDenied("ADMIN cannot modify another ADMIN account.")

        new_role = serializer.validated_data.get('role')
        if new_role and new_role == User.Role.OWNER and not caller.is_owner_role:
            raise permissions.PermissionDenied("Only the current OWNER can assign the OWNER role.")

        # Prevent removing ownership if caller is the only OWNER
        if target_user.role == User.Role.OWNER and new_role and new_role != User.Role.OWNER:
            owner_count = User.objects.filter(role=User.Role.OWNER).count()
            if owner_count <= 1:
                from rest_framework import serializers as drf_serializers
                raise drf_serializers.ValidationError({'role': 'The organization must have at least one OWNER. Ownership cannot be removed.'})

        serializer.save()

    def perform_destroy(self, instance):
        caller = self.request.user
        if instance.role == User.Role.OWNER:
            if not caller.is_owner_role:
                raise permissions.PermissionDenied("ADMIN cannot delete the OWNER account.")
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError({'error': 'OWNER account cannot be deleted directly.'})

        if instance.role == User.Role.ADMIN and not caller.is_owner_role:
            raise permissions.PermissionDenied("ADMIN cannot delete another ADMIN account.")

        instance.delete()


# --- OTP PASSWORD RESET VIEWS ---

class RequestPasswordResetOTPView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        account = request.data.get('account', '').strip()
        if not account:
            return Response({'error': 'Please provide your email address or username.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=account).first() or User.objects.filter(username__iexact=account).first()
        if not user:
            return Response({
                'error': f'No registered account found with email/username "{account}". Please Sign Up first to create your account on the live database.'
            }, status=status.HTTP_404_NOT_FOUND)

        # Generate 6-digit random OTP
        otp_code = f"{random.randint(100000, 999999)}"
        expires_at = timezone.now() + timedelta(minutes=10)

        # Save to database
        PasswordResetOTP.objects.create(
            email=user.email,
            otp_code=otp_code,
            expires_at=expires_at
        )

        # Send Executive HTML Email
        subject = "SmartMeeting Tracker - Password Reset Verification Code"
        recipient_name = user.first_name or user.username
        
        message_body = (
            f"Hello {recipient_name},\n\n"
            f"Your 6-digit OTP verification code for resetting your password is: {otp_code}\n\n"
            f"This code will expire in 10 minutes. If you did not request a password reset, please ignore this email.\n\n"
            f"Best regards,\nSmartMeeting Decision Tracker Support Team"
        )

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
            .container {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
            .header {{ background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 28px 32px; text-align: left; }}
            .header h1 {{ color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; tracking-tight; }}
            .header p {{ color: #93c5fd; margin: 4px 0 0 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }}
            .body-content {{ padding: 32px; }}
            .greeting {{ font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; }}
            .text {{ font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 18px; }}
            .otp-box {{ background-color: #f0f9ff; border: 2px dashed #0284c7; border-radius: 12px; padding: 22px; text-align: center; margin: 24px 0; }}
            .otp-code {{ font-size: 36px; font-weight: 900; font-family: 'Courier New', Courier, monospace; letter-spacing: 10px; color: #0369a1; display: inline-block; margin: 0; }}
            .badge {{ display: inline-block; background-color: #fef2f2; color: #dc2626; border: 1px solid #fecaca; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; margin-top: 12px; }}
            .footer {{ background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚡ SmartMeeting Decision Tracker</h1>
              <p>Security & Verification Portal</p>
            </div>
            <div class="body-content">
              <p class="greeting">Hello {recipient_name},</p>
              <p class="text">We received a request to reset the password for your SmartMeeting Decision Tracker account. Use the 6-digit verification code below to proceed:</p>
              
              <div class="otp-box">
                <div class="otp-code">{otp_code}</div>
                <div><span class="badge">⏰ Code expires in 10 minutes</span></div>
              </div>

              <p class="text" style="font-size: 13px; color: #64748b;">
                If you did not request a password reset, please ignore this message or contact support if you suspect unauthorized activity.
              </p>
              <p class="text" style="margin-bottom: 0;">
                Best regards,<br>
                <strong style="color: #1e293b;">SmartMeeting Decision Tracker Team</strong>
              </p>
            </div>
            <div class="footer">
              This is an automated security notification sent by SmartMeeting Decision Tracker.<br>
              © {timezone.now().year} SmartMeeting Tracker. All rights reserved.
            </div>
          </div>
        </body>
        </html>
        """

        # 1. Primary Attempt: Brevo HTTPS REST API (Bypasses all cloud/ISP SMTP port blocks)
        email_sent = False
        last_error = None

        brevo_api_key = getattr(settings, 'EMAIL_HOST_PASSWORD', '')
        sender_email = getattr(settings, 'EMAIL_HOST_USER', 'shleshdarji317@gmail.com')

        try:
            api_headers = {
                'accept': 'application/json',
                'api-key': brevo_api_key,
                'content-type': 'application/json',
            }
            api_payload = {
                'sender': {'name': 'SmartMeeting Tracker', 'email': sender_email},
                'to': [{'email': user.email}],
                'subject': subject,
                'htmlContent': html_body,
                'textContent': message_body
            }
            resp = requests.post('https://api.brevo.com/v3/smtp/email', json=api_payload, headers=api_headers, timeout=8)
            if resp.status_code in (200, 201, 202):
                email_sent = True
                logger.info("OTP Email successfully delivered to %s via Brevo HTTPS API", user.email)
            else:
                logger.warning("Brevo API returned %s: %s", resp.status_code, resp.text)
                api_error_detail = resp.text
                try:
                    err_json = resp.json()
                    api_error_detail = err_json.get('message', resp.text)
                except Exception:
                    pass
                last_error = f"Brevo API HTTP {resp.status_code}: {api_error_detail}"
        except Exception as api_err:
            logger.warning("Brevo API call failed: %s", str(api_err))
            last_error = f"Brevo Network Error: {str(api_err)}"

        # 2. Secondary Fallback: Brevo Multi-Port SMTP Relay (587, 2525, 465)
        if not email_sent:
            brevo_host = getattr(settings, 'EMAIL_HOST', 'smtp-relay.brevo.com')
            configured_port = int(getattr(settings, 'EMAIL_PORT', 587))
            brevo_ports = [
                (configured_port, configured_port != 465, configured_port == 465),
                (2525, True, False),
                (587, True, False),
                (465, False, True),
            ]

            seen_ports = set()
            unique_ports = []
            for p, tls, ssl in brevo_ports:
                if p not in seen_ports:
                    seen_ports.add(p)
                    unique_ports.append((p, tls, ssl))

            smtp_errors = []
            for port, use_tls, use_ssl in unique_ports:
                try:
                    connection = get_connection(
                        backend='django.core.mail.backends.smtp.EmailBackend',
                        host=brevo_host,
                        port=port,
                        username=sender_email,
                        password=brevo_api_key,
                        use_tls=use_tls,
                        use_ssl=use_ssl,
                        timeout=getattr(settings, 'EMAIL_TIMEOUT', 5),
                    )
                    mail = EmailMessage(
                        subject=subject,
                        body=html_body,
                        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', f'SmartMeeting Tracker <{user.email}>'),
                        to=[user.email],
                        connection=connection,
                    )
                    mail.content_subtype = "html"
                    mail.send(fail_silently=False)
                    email_sent = True
                    logger.info("OTP Email successfully sent to %s via Brevo SMTP port %s", user.email, port)
                    break
                except Exception as e:
                    smtp_errors.append(f"Port {port}: {str(e)}")
                    logger.warning("Brevo SMTP attempt to %s via port %s failed: %s", user.email, port, str(e))

        if not email_sent:
            err_str = str(last_error) if last_error else "Unknown Brevo Delivery Error"
            user_msg = f"Brevo Email Delivery Failed: {err_str}"
            return Response({'error': user_msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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


# --- OTP EMAIL CHANGE VIEWS ---

class RequestEmailChangeOTPView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        new_email = request.data.get('new_email', '').strip().lower()
        if not new_email:
            return Response({'error': 'Please provide a new email address.'}, status=status.HTTP_400_BAD_REQUEST)

        if '@' not in new_email or '.' not in new_email:
            return Response({'error': 'Please enter a valid email address.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_email == request.user.email.lower():
            return Response({'error': 'The new email address is identical to your current email address.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=new_email).exclude(id=request.user.id).exists():
            return Response({'error': 'This email address is already registered to another account.'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate 6-digit random OTP
        otp_code = f"{random.randint(100000, 999999)}"
        expires_at = timezone.now() + timedelta(minutes=10)

        # Store OTP record for new_email
        PasswordResetOTP.objects.create(
            email=new_email,
            otp_code=otp_code,
            expires_at=expires_at
        )

        subject = "SmartMeeting Tracker - Verify Your New Email Address"
        recipient_name = request.user.first_name or request.user.username

        message_body = (
            f"Hello {recipient_name},\n\n"
            f"You requested to update your SmartMeeting Decision Tracker account email to: {new_email}\n"
            f"Your 6-digit OTP verification code is: {otp_code}\n\n"
            f"This code will expire in 10 minutes. If you did not request this email change, please ignore this message.\n\n"
            f"Best regards,\nSmartMeeting Decision Tracker Team"
        )

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
            .container {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
            .header {{ background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 28px 32px; text-align: left; }}
            .header h1 {{ color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; tracking-tight; }}
            .header p {{ color: #93c5fd; margin: 4px 0 0 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }}
            .body-content {{ padding: 32px; }}
            .greeting {{ font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; }}
            .text {{ font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 18px; }}
            .otp-box {{ background-color: #f0f9ff; border: 2px dashed #0284c7; border-radius: 12px; padding: 22px; text-align: center; margin: 24px 0; }}
            .otp-code {{ font-size: 36px; font-weight: 900; font-family: 'Courier New', Courier, monospace; letter-spacing: 10px; color: #0369a1; display: inline-block; margin: 0; }}
            .badge {{ display: inline-block; background-color: #fef2f2; color: #dc2626; border: 1px solid #fecaca; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; margin-top: 12px; }}
            .footer {{ background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚡ SmartMeeting Decision Tracker</h1>
              <p>Email Change Verification</p>
            </div>
            <div class="body-content">
              <p class="greeting">Hello {recipient_name},</p>
              <p class="text">We received a request to update your SmartMeeting Decision Tracker account email to <strong>{new_email}</strong>. Use the 6-digit verification code below to confirm this change:</p>
              
              <div class="otp-box">
                <div class="otp-code">{otp_code}</div>
                <div><span class="badge">⏰ Code expires in 10 minutes</span></div>
              </div>

              <p class="text" style="font-size: 13px; color: #64748b;">
                If you did not request this email change, please ignore this message or contact support if you suspect unauthorized activity.
              </p>
              <p class="text" style="margin-bottom: 0;">
                Best regards,<br>
                <strong style="color: #1e293b;">SmartMeeting Decision Tracker Team</strong>
              </p>
            </div>
            <div class="footer">
              This is an automated security notification sent by SmartMeeting Decision Tracker.<br>
              © {timezone.now().year} SmartMeeting Tracker. All rights reserved.
            </div>
          </div>
        </body>
        </html>
        """

        # Dispatch via Brevo HTTPS REST API (with SMTP fallback)
        email_sent = False
        last_error = None

        brevo_api_key = getattr(settings, 'EMAIL_HOST_PASSWORD', '')
        sender_email = getattr(settings, 'EMAIL_HOST_USER', 'shleshdarji317@gmail.com')

        try:
            api_headers = {
                'accept': 'application/json',
                'api-key': brevo_api_key,
                'content-type': 'application/json',
            }
            api_payload = {
                'sender': {'name': 'SmartMeeting Tracker', 'email': sender_email},
                'to': [{'email': new_email}],
                'subject': subject,
                'htmlContent': html_body,
                'textContent': message_body
            }
            resp = requests.post('https://api.brevo.com/v3/smtp/email', json=api_payload, headers=api_headers, timeout=8)
            if resp.status_code in (200, 201, 202):
                email_sent = True
                logger.info("Email Change OTP delivered to %s via Brevo HTTPS API", new_email)
            else:
                logger.warning("Brevo API returned %s: %s", resp.status_code, resp.text)
                api_error_detail = resp.text
                try:
                    err_json = resp.json()
                    api_error_detail = err_json.get('message', resp.text)
                except Exception:
                    pass
                last_error = f"Brevo API HTTP {resp.status_code}: {api_error_detail}"
        except Exception as api_err:
            logger.warning("Brevo API call failed for email change: %s", str(api_err))
            last_error = f"Brevo Network Error: {str(api_err)}"

        if not email_sent:
            brevo_host = getattr(settings, 'EMAIL_HOST', 'smtp-relay.brevo.com')
            configured_port = int(getattr(settings, 'EMAIL_PORT', 587))
            brevo_ports = [
                (configured_port, configured_port != 465, configured_port == 465),
                (2525, True, False),
                (587, True, False),
                (465, False, True),
            ]
            seen_ports = set()
            unique_ports = []
            for p, tls, ssl in brevo_ports:
                if p not in seen_ports:
                    seen_ports.add(p)
                    unique_ports.append((p, tls, ssl))

            for port, use_tls, use_ssl in unique_ports:
                try:
                    connection = get_connection(
                        backend='django.core.mail.backends.smtp.EmailBackend',
                        host=brevo_host,
                        port=port,
                        username=sender_email,
                        password=brevo_api_key,
                        use_tls=use_tls,
                        use_ssl=use_ssl,
                        timeout=getattr(settings, 'EMAIL_TIMEOUT', 5),
                    )
                    mail = EmailMessage(
                        subject=subject,
                        body=html_body,
                        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', f'SmartMeeting Tracker <{sender_email}>'),
                        to=[new_email],
                        connection=connection,
                    )
                    mail.content_subtype = "html"
                    mail.send(fail_silently=False)
                    email_sent = True
                    logger.info("Email Change OTP sent to %s via Brevo SMTP port %s", new_email, port)
                    break
                except Exception as e:
                    logger.warning("Brevo SMTP attempt to %s via port %s failed: %s", new_email, port, str(e))

        if not email_sent:
            err_str = str(last_error) if last_error else "Unknown Brevo Delivery Error"
            return Response({'error': f"Brevo Email Delivery Failed: {err_str}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'message': f'6-digit OTP verification code sent to {new_email}. Please check your email inbox.',
            'new_email': new_email
        }, status=status.HTTP_200_OK)


class VerifyEmailChangeOTPView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        new_email = request.data.get('new_email', '').strip().lower()
        otp_code = request.data.get('otp_code', '').strip()

        if not new_email or not otp_code:
            return Response({'error': 'New email and OTP code are required.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = PasswordResetOTP.objects.filter(
            email__iexact=new_email,
            otp_code=otp_code,
            expires_at__gte=timezone.now()
        ).first()

        if not otp_record:
            return Response({'error': 'Invalid or expired OTP code. Please request a new OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=new_email).exclude(id=request.user.id).exists():
            return Response({'error': 'This email address is already registered to another account.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        user.email = new_email
        user.save()

        # Delete used OTP
        otp_record.delete()

        return Response({
            'message': f'Your email address has been updated successfully to {new_email}!',
            'user': UserSerializer(user, context={'request': request}).data
        }, status=status.HTTP_200_OK)


class DeleteAccountView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def delete(self, request):
        user = request.user
        password = request.data.get('password', '')
        confirmation = request.data.get('confirmation', '').strip()

        # If user has a set password, verify it
        if user.has_usable_password():
            if not password:
                return Response({'error': 'Password is required to confirm account deletion.'}, status=status.HTTP_400_BAD_REQUEST)
            if not user.check_password(password):
                return Response({'error': 'Incorrect password. Account deletion failed.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # For OAuth users without password
            if confirmation.upper() != 'DELETE':
                return Response({'error': 'Please type "DELETE" to confirm account deletion.'}, status=status.HTTP_400_BAD_REQUEST)

        user_email = user.email
        # Delete all associated OTP records from PostgreSQL database
        PasswordResetOTP.objects.filter(email__iexact=user_email).delete()

        # Permanently delete user record from PostgreSQL database
        user.delete()

        logger.info("User account %s permanently deleted from PostgreSQL database.", user_email)

        return Response({
            'message': 'Your account has been deleted successfully.'
        }, status=status.HTTP_200_OK)


