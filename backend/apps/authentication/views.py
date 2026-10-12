from rest_framework import generics, viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.db import transaction, connection
from django.db.models import Q
from django.core.mail import get_connection, EmailMessage
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import random
import requests
import logging
import re
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import UserSerializer, RegisterSerializer, CustomTokenObtainPairSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

from .models import PasswordResetOTP
from .permissions import CanManageUsersPermission
from smart_meeting_tracker.email_utils import send_brevo_transactional_email

logger = logging.getLogger(__name__)
User = get_user_model()

HUMAN_NAME_REGEX = re.compile(r"^[a-zA-Z\s'\-]{2,50}$")
USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9_-]{3,30}$")
SQL_DANGEROUS_REGEX = re.compile(
    r'(\b(select|delete|insert|update|drop|alter|create|truncate|exec|union|table|from|where|into)\b)|([;*<>\\/{}="`]|--)',
    re.IGNORECASE
)

def validate_registration_inputs(first_name, last_name, username, email, password=None, password_confirm=None, check_passwords=True):
    errors = {}

    fn = (first_name or '').strip()
    if not fn:
        errors['first_name'] = ['First name is required.']
    elif len(fn) < 2 or len(fn) > 50:
        errors['first_name'] = ['First name must be between 2 and 50 characters long.']
    elif SQL_DANGEROUS_REGEX.search(fn):
        errors['first_name'] = ['First name contains invalid symbols or SQL syntax. Please enter a valid name.']
    elif not HUMAN_NAME_REGEX.match(fn):
        errors['first_name'] = ['First name can only contain letters, spaces, hyphens, and apostrophes.']

    ln = (last_name or '').strip()
    if not ln:
        errors['last_name'] = ['Last name is required.']
    elif len(ln) < 2 or len(ln) > 50:
        errors['last_name'] = ['Last name must be between 2 and 50 characters long.']
    elif SQL_DANGEROUS_REGEX.search(ln):
        errors['last_name'] = ['Last name contains invalid symbols or SQL syntax. Please enter a valid name.']
    elif not HUMAN_NAME_REGEX.match(ln):
        errors['last_name'] = ['Last name can only contain letters, spaces, hyphens, and apostrophes.']

    un = (username or '').strip()
    if not un:
        errors['username'] = ['Username is required.']
    elif len(un) < 3 or len(un) > 30:
        errors['username'] = ['Username must be between 3 and 30 characters long.']
    elif SQL_DANGEROUS_REGEX.search(un):
        errors['username'] = ['Username contains invalid symbols or SQL syntax.']
    elif not USERNAME_REGEX.match(un):
        errors['username'] = ['Username can only contain letters, numbers, underscores, and hyphens.']

    em = (email or '').strip().lower()
    if not em:
        errors['email'] = ['Email address is required.']
    elif '@' not in em or '.' not in em or len(em) > 100:
        errors['email'] = ['Please enter a valid email address format.']
    elif SQL_DANGEROUS_REGEX.search(em):
        errors['email'] = ['Email address contains invalid characters or SQL syntax.']

    if check_passwords:
        if not password:
            errors['password'] = ['Password is required.']
        elif len(password) < 6:
            errors['password'] = ['Password must be at least 6 characters long.']

        if password_confirm is not None:
            if not password_confirm:
                errors['password_confirm'] = ['Please confirm your password.']
            elif password != password_confirm:
                errors['password_confirm'] = ['Passwords do not match.']

    return errors

class RequestRegisterOTPView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        username = request.data.get('username', '').strip()
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        password = request.data.get('password', '')
        password_confirm = request.data.get('password_confirm', '')

        errors = validate_registration_inputs(first_name, last_name, username, email, password, password_confirm, check_passwords=True)
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username__iexact=username).exists():
            return Response({'username': ['A user with that username already exists.']}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=email).exists():
            return Response({'email': ['A user with this email address already exists.']}, status=status.HTTP_400_BAD_REQUEST)

        # Generate 6-digit OTP code
        otp_code = f"{random.randint(100000, 999999)}"
        expires_at = timezone.now() + timedelta(minutes=10)

        PasswordResetOTP.objects.create(
            email=email,
            otp_code=otp_code,
            expires_at=expires_at
        )

        if getattr(settings, 'DEBUG', False):
            print("\n" + "=" * 50)
            print(f"🔑 [LOCAL DEV REGISTER OTP]: {otp_code}")
            print(f"📧 Target Email: {email}")
            print("=" * 50 + "\n")

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

        email_sent, last_error = send_brevo_transactional_email(subject, [email], message_body, html_body)

        if not email_sent:
            return Response({'error': f'Failed to deliver email OTP: {last_error}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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

        errors = validate_registration_inputs(first_name, last_name, username, email, password, check_passwords=True)
        if not otp_code:
            errors['otp_code'] = ['OTP verification code is required.']

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

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

        # Grant OWNER role if database has no users (e.g. new deployment or after Organization deletion)
        is_first_user = not User.objects.exists()
        assigned_role = User.Role.OWNER if is_first_user else User.Role.UNASSIGNED

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=assigned_role,
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

def get_user_active_organization(user, request=None):
    if not user or not user.is_authenticated:
        return None

    tables = set(connection.introspection.table_names())
    user_org_ids = set()
    if 'authentication_organization' in tables:
        from .models import Organization
        user_org_ids.update(Organization.objects.filter(owner=user).values_list('id', flat=True))

    if 'authentication_organizationmembership' in tables:
        from .models import OrganizationMembership
        user_org_ids.update(
            OrganizationMembership.objects.filter(user=user, is_active=True).values_list('organization_id', flat=True)
        )

    header_org_id = request.headers.get('X-Organization-ID') if request else None
    active_org_id = None

    if header_org_id:
        try:
            h_id = int(header_org_id)
            if h_id in user_org_ids:
                active_org_id = h_id
        except (ValueError, TypeError):
            pass

    if active_org_id is None and user_org_ids:
        active_org_id = sorted(list(user_org_ids))[0]

    if active_org_id is None and 'authentication_organization' in tables:
        from .models import Organization
        if Organization.objects.count() == 1:
            active_org_id = Organization.objects.values_list('id', flat=True).first()

    if active_org_id and 'authentication_organization' in tables:
        from .models import Organization
        return Organization.objects.filter(id=active_org_id).first()

    return None


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = (CanManageUsersPermission,)
    search_fields = ('username', 'email', 'first_name', 'last_name', 'department')
    filterset_fields = ('role', 'department')

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return User.objects.none()

        tables = set(connection.introspection.table_names())
        
        # 1. Base queryset: exclude UNASSIGNED (unapproved) users
        qs = User.objects.exclude(role=User.Role.UNASSIGNED).order_by('-date_joined')

        # 2. Scope strictly to active organization members
        target_org = get_user_active_organization(user, request=self.request)

        # 3. Filter users strictly to those belonging to target_org
        if target_org:
            member_user_ids = set()
            if 'authentication_organizationmembership' in tables:
                from .models import OrganizationMembership
                member_user_ids.update(
                    OrganizationMembership.objects.filter(organization=target_org, is_active=True)
                    .values_list('user_id', flat=True)
                )
            if target_org.owner_id:
                member_user_ids.add(target_org.owner_id)

            qs = qs.filter(id__in=member_user_ids)
        else:
            qs = User.objects.none()

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        role_to_assign = serializer.validated_data.get('role', User.Role.MEMBER)
        
        # ADMIN cannot create OWNER or ADMIN users
        if not user.is_owner_role and user.is_admin_role:
            if role_to_assign in [User.Role.OWNER, User.Role.ADMIN]:
                raise permissions.PermissionDenied("ADMIN cannot create OWNER or ADMIN accounts.")

        if role_to_assign == User.Role.OWNER:
            if not user.is_owner_role:
                raise permissions.PermissionDenied("Only the current OWNER can assign the OWNER role.")
            password = self.request.data.get('password')
            from rest_framework import serializers as drf_serializers
            if not user.is_oauth_user:
                if not password:
                    raise drf_serializers.ValidationError({'error': 'Owner password is required to assign Owner role.'})
                if not user.check_password(password):
                    raise drf_serializers.ValidationError({'error': 'Incorrect password. Ownership assignment failed.'})
            elif user.has_usable_password() and password:
                if not user.check_password(password):
                    raise drf_serializers.ValidationError({'error': 'Incorrect password. Ownership assignment failed.'})

        serializer.save()

    def perform_update(self, serializer):
        target_user = self.get_object()
        caller = self.request.user

        # ADMIN cannot modify OWNER
        if target_user.role == User.Role.OWNER and not caller.is_owner_role:
            raise permissions.PermissionDenied("ADMIN cannot modify the OWNER account.")

        # An OWNER cannot modify another OWNER account
        if target_user.role == User.Role.OWNER and caller.id != target_user.id:
            raise permissions.PermissionDenied("An OWNER cannot modify or demote another OWNER's account.")

        # ADMIN cannot modify other ADMIN accounts
        if target_user.role == User.Role.ADMIN and not caller.is_owner_role and caller.id != target_user.id:
            raise permissions.PermissionDenied("ADMIN cannot modify another ADMIN account.")

        new_role = serializer.validated_data.get('role')
        if new_role and new_role == User.Role.OWNER and not caller.is_owner_role:
            raise permissions.PermissionDenied("Only the current OWNER can assign the OWNER role.")

        # Require owner password verification when promoting another member to OWNER
        if new_role == User.Role.OWNER and target_user.role != User.Role.OWNER:
            password = self.request.data.get('password')
            from rest_framework import serializers as drf_serializers
            if not caller.is_oauth_user:
                if not password:
                    raise drf_serializers.ValidationError({'error': 'Owner password is required to assign Owner role.'})
                if not caller.check_password(password):
                    raise drf_serializers.ValidationError({'error': 'Incorrect password. Ownership assignment failed.'})
            elif caller.has_usable_password() and password:
                if not caller.check_password(password):
                    raise drf_serializers.ValidationError({'error': 'Incorrect password. Ownership assignment failed.'})

        # Prevent removing ownership if caller is the only OWNER
        if target_user.role == User.Role.OWNER and new_role and new_role != User.Role.OWNER:
            owner_count = User.objects.filter(role=User.Role.OWNER).count()
            if owner_count <= 1:
                from rest_framework import serializers as drf_serializers
                raise drf_serializers.ValidationError({'role': 'The organization must have at least one OWNER. Ownership cannot be removed.'})

        updated_user = serializer.save()

        # If user's role was changed to OWNER, update OrganizationMembership as well
        if new_role == User.Role.OWNER:
            tables = set(connection.introspection.table_names())
            if 'authentication_organizationmembership' in tables:
                try:
                    from .models import OrganizationMembership, Organization
                    user_org = Organization.objects.filter(owner=caller).first()
                    if not user_org:
                        mem = OrganizationMembership.objects.filter(user=caller, is_active=True).first()
                        if mem:
                            user_org = mem.organization

                    if user_org:
                        OrganizationMembership.objects.update_or_create(
                            user=updated_user,
                            organization=user_org,
                            defaults={'role': User.Role.OWNER, 'is_active': True}
                        )
                except Exception as ex:
                    logger.warning("Failed to update OrganizationMembership on owner promotion: %s", str(ex))

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

class LookupAccountView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        account = request.data.get('account', '').strip()
        if not account:
            return Response({'found': False}, status=status.HTTP_200_OK)

        user = User.objects.filter(email__iexact=account).first() or User.objects.filter(username__iexact=account).first()
        if not user:
            return Response({'found': False}, status=status.HTTP_200_OK)

        return Response({
            'found': True,
            'email': user.email,
            'username': user.username,
            'full_name': user.get_full_name() or user.username,
            'role': user.role
        }, status=status.HTTP_200_OK)


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

        if getattr(settings, 'DEBUG', False):
            print("\n" + "=" * 50)
            print(f"🔑 [LOCAL DEV PASSWORD RESET OTP]: {otp_code}")
            print(f"📧 Target Email: {user.email}")
            print("=" * 50 + "\n")

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

        email_sent, last_error = send_brevo_transactional_email(subject, [user.email], message_body, html_body)

        if not email_sent:
            is_dev = getattr(settings, 'DEBUG', False)
            if is_dev:
                print(f"\n🔑 ===========================================")
                print(f"🔑 [LOCAL DEV OTP PASSWORD RESET]: {otp_code}")
                print(f"🔑 Target Email: {user.email}")
                print(f"🔑 Brevo Delivery Note: {last_error}")
                print(f"🔑 ===========================================\n")
                return Response({
                    'message': f'6-digit OTP code generated for {user.email}. (Local Dev Mode: Code is {otp_code}). Delivery Note: {last_error}',
                    'otp_code': otp_code,
                    'email': user.email,
                    'username': user.username,
                    'full_name': user.get_full_name() or user.username,
                    'role': user.role
                }, status=status.HTTP_200_OK)

            return Response({'error': f'Brevo Email Delivery Failed: {last_error}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'message': f'6-digit OTP code sent to {user.email}. Please check your email inbox.',
            'email': user.email,
            'username': user.username,
            'full_name': user.get_full_name() or user.username,
            'role': user.role
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

        return Response({'message': 'Password has been reset successfully! You can now Login.'}, status=status.HTTP_200_OK)


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

                is_first_user = not User.objects.exists()
                assigned_role = User.Role.OWNER if is_first_user else User.Role.UNASSIGNED

                random_password = f"oauth_{random.randint(100000, 999999)}_{random.randint(1000, 9999)}"
                user = User.objects.create_user(
                    username=username_candidate,
                    email=email,
                    password=random_password,
                    first_name=first_name,
                    last_name=last_name,
                    role=assigned_role
                )

            # Store / update Google OAuth tokens on User instance
            access_token = request.data.get('access_token') or credential
            refresh_token = request.data.get('refresh_token') or request.data.get('google_refresh_token')
            expires_in = request.data.get('expires_in')

            if access_token:
                user.google_access_token = access_token
            if refresh_token:
                user.google_refresh_token = refresh_token
            if expires_in:
                try:
                    user.google_token_expires_at = timezone.now() + timedelta(seconds=int(expires_in))
                except (ValueError, TypeError):
                    pass
            user.save()

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

            if not code and not email and not username:
                return Response({'error': 'GitHub authorization code or username is required.'}, status=status.HTTP_400_BAD_REQUEST)

            gh_access_token = None
            gh_login = None
            gh_email = None
            token_error_msg = None

            # Exchange code with GitHub API if code is provided
            if code:
                try:
                    client_id = getattr(settings, 'GITHUB_CLIENT_ID', '') or 'Ov23li85R8iyZCz0Yn3h'
                    client_secret = getattr(settings, 'GITHUB_CLIENT_SECRET', '')
                    headers = {
                        'Accept': 'application/json',
                        'User-Agent': 'SmartMeetingTracker/1.0'
                    }
                    token_resp = requests.post(
                        'https://github.com/login/oauth/access_token',
                        headers=headers,
                        data={'client_id': client_id, 'client_secret': client_secret, 'code': code},
                        timeout=10
                    )
                    if token_resp.status_code == 200:
                        token_json = token_resp.json()
                        gh_access_token = token_json.get('access_token')
                        if not gh_access_token and token_json.get('error'):
                            err_desc = token_json.get('error_description') or token_json.get('error')
                            if 'client_secret' in str(err_desc).lower() or 'incorrect' in str(err_desc).lower() or not client_secret or 'your_github_client_secret' in str(client_secret).lower():
                                token_error_msg = "GitHub OAuth Error: GITHUB_CLIENT_SECRET is missing or set to placeholder in backend/.env. Please replace 'your_github_client_secret_here' with your real GitHub Client Secret generated from GitHub Developer Settings."
                            else:
                                token_error_msg = f"GitHub OAuth Error: {err_desc}"
                            logger.error("GitHub OAuth Token Error: %s", err_desc)

                        if gh_access_token:
                            auth_headers = {
                                'Authorization': f'Bearer {gh_access_token}',
                                'Accept': 'application/json',
                                'User-Agent': 'SmartMeetingTracker/1.0'
                            }
                            user_resp = requests.get(
                                'https://api.github.com/user',
                                headers=auth_headers,
                                timeout=10
                            )
                            if user_resp.status_code == 200:
                                gh_data = user_resp.json()
                                gh_login = gh_data.get('login')
                                gh_email = gh_data.get('email')

                            # If primary email is private or missing in basic /user response, fetch from /user/emails
                            if not gh_email:
                                try:
                                    emails_resp = requests.get(
                                        'https://api.github.com/user/emails',
                                        headers=auth_headers,
                                        timeout=10
                                    )
                                    if emails_resp.status_code == 200:
                                        email_list = emails_resp.json()
                                        if isinstance(email_list, list):
                                            selected = next((e['email'] for e in email_list if e.get('primary') and e.get('verified') and e.get('email')), None)
                                            if not selected:
                                                selected = next((e['email'] for e in email_list if e.get('verified') and e.get('email')), None)
                                            if not selected and email_list:
                                                selected = next((e['email'] for e in email_list if e.get('email')), None)
                                            if selected:
                                                gh_email = selected
                                except Exception as ex:
                                    logger.warning("Failed to fetch GitHub private emails: %s", str(ex))
                    else:
                        token_error_msg = f"GitHub returned HTTP {token_resp.status_code} during token exchange. Please verify GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in backend .env."
                except Exception as e:
                    logger.warning("GitHub OAuth API exchange warning: %s", str(e))
                    token_error_msg = f"GitHub API connection failed: {str(e)}"

            target_github_username = (gh_login or username or '').strip()
            target_github_email = (gh_email or email or '').strip()

            # Sanitize email: filter out placeholder emails like @users.noreply.github.com
            if target_github_email and '@users.noreply.github.com' in target_github_email.lower():
                target_github_email = ''

            if not target_github_username and not target_github_email:
                err_text = token_error_msg or 'Failed to retrieve GitHub profile details. The authorization code may be invalid, expired, or already used.'
                return Response({'error': err_text}, status=status.HTTP_400_BAD_REQUEST)

            user = None
            if target_github_email:
                user = User.objects.filter(email__iexact=target_github_email).first()

            if not user and target_github_username:
                user = User.objects.filter(username__iexact=target_github_username).first()

            if user:
                # Update existing user's username and profile name to GitHub login username
                if target_github_username:
                    if 'github_user_' in user.username or user.username != target_github_username:
                        if not User.objects.filter(username__iexact=target_github_username).exclude(id=user.id).exists():
                            user.username = target_github_username

                    # Set user's profile name to GitHub login username (Requirement 2)
                    user.first_name = target_github_username
                    user.last_name = ''

                # Update user's email if valid email was fetched from GitHub (Requirement 4: do NOT overwrite with empty value)
                if target_github_email:
                    if not User.objects.filter(email__iexact=target_github_email).exclude(id=user.id).exists():
                        user.email = target_github_email

                user.save()
            else:
                # Create new user with profile name set to GitHub login username
                base_username = target_github_username or (target_github_email.split('@')[0] if target_github_email else f"github_user_{random.randint(1000, 9999)}")
                final_username = base_username
                counter = 1
                while User.objects.filter(username__iexact=final_username).exists():
                    final_username = f"{base_username}_{counter}"
                    counter += 1

                final_email = target_github_email
                if not final_email:
                    # Do not store placeholder email for unavailable email
                    final_email = ''

                is_first_user = not User.objects.exists()
                assigned_role = User.Role.OWNER if is_first_user else User.Role.UNASSIGNED

                random_password = f"oauth_{random.randint(100000, 999999)}_{random.randint(1000, 9999)}"
                user = User.objects.create_user(
                    username=final_username,
                    email=final_email,
                    password=random_password,
                    first_name=final_username,
                    last_name='',
                    role=assigned_role
                )

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

        if getattr(settings, 'DEBUG', False):
            print("\n" + "=" * 50)
            print(f"🔑 [LOCAL DEV EMAIL CHANGE OTP]: {otp_code}")
            print(f"📧 Target Email: {new_email}")
            print("=" * 50 + "\n")

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
            is_dev = getattr(settings, 'DEBUG', False)
            if is_dev:
                print(f"\n🔑 ===========================================")
                print(f"🔑 [LOCAL DEV OTP EMAIL CHANGE]: {otp_code}")
                print(f"🔑 Target Email: {new_email}")
                print(f"🔑 ===========================================\n")
                return Response({
                    'message': f'6-digit OTP code generated for {new_email}. (Local Dev Mode: Code is {otp_code})',
                    'new_email': new_email
                }, status=status.HTTP_200_OK)

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


class CheckDeleteAccountView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        return self._check(request)

    def post(self, request):
        return self._check(request)

    def _check(self, request):
        user = request.user
        other_users = User.objects.exclude(id=user.id)
        other_users_count = other_users.count()

        total_owners = User.objects.filter(role=User.Role.OWNER).count()
        total_admins_and_owners = User.objects.filter(role__in=[User.Role.OWNER, User.Role.ADMIN]).count()

        can_delete = True
        requires_ownership_transfer = False
        requires_admin_assignment = False
        message = ""

        # Sole Owner check: Require transferring ownership first if other users exist in system
        if user.role == User.Role.OWNER and total_owners <= 1 and other_users_count > 0:
            can_delete = False
            requires_ownership_transfer = True
            message = (
                "You can't delete your account yet. "
                "You are currently the only owner of this organization. "
                "Transfer ownership to another user before deleting your account."
            )
        # Sole Admin check: Require admin assignment first if other users exist in system
        elif user.role == User.Role.ADMIN and total_admins_and_owners <= 1 and other_users_count > 0:
            can_delete = False
            requires_admin_assignment = True
            message = (
                "You can't delete your account yet. "
                "You are currently the only administrator. "
                "Transfer ownership or promote another user to Administrator before deleting your account."
            )

        eligible_users_qs = other_users.order_by('-role', 'first_name', 'username')
        eligible_users = [
            {
                'id': u.id,
                'username': u.username,
                'full_name': u.get_full_name() or u.username,
                'email': u.email,
                'role': u.role
            }
            for u in eligible_users_qs
        ]

        return Response({
            'can_delete': can_delete,
            'requires_ownership_transfer': requires_ownership_transfer,
            'requires_admin_assignment': requires_admin_assignment,
            'message': message,
            'role': user.role,
            'is_oauth_user': user.is_oauth_user,
            'eligible_users': eligible_users
        }, status=status.HTTP_200_OK)


class TransferOwnershipView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user = request.user
        target_user_id = request.data.get('target_user_id')

        if not (user.is_admin_role or user.role in [User.Role.OWNER, User.Role.ADMIN]):
            return Response({'error': 'Only Organization Owners and Admins can transfer ownership/admin rights.'}, status=status.HTTP_403_FORBIDDEN)

        if not target_user_id:
            return Response({'error': 'Please select a target user to receive ownership.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.exclude(id=user.id).get(id=target_user_id)
        except User.DoesNotExist:
            return Response({'error': 'Selected user was not found.'}, status=status.HTTP_404_NOT_FOUND)

        if user.role == User.Role.OWNER:
            password = request.data.get('password')
            if not user.is_oauth_user:
                if not password:
                    return Response({'error': 'Owner password is required to transfer ownership.'}, status=status.HTTP_400_BAD_REQUEST)
                if not user.check_password(password):
                    return Response({'error': 'Incorrect password. Ownership transfer failed.'}, status=status.HTTP_400_BAD_REQUEST)
            elif user.has_usable_password() and password:
                if not user.check_password(password):
                    return Response({'error': 'Incorrect password. Ownership transfer failed.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            if user.role == User.Role.OWNER:
                target_user.role = User.Role.OWNER
                target_user.is_staff = True
                target_user.is_superuser = True
                target_user.save()

                user.role = User.Role.ADMIN
                user.save()
            else:
                target_user.role = User.Role.ADMIN
                target_user.is_staff = True
                target_user.save()

        target_name = target_user.get_full_name() or target_user.username
        logger.info("Ownership/Admin rights transferred from %s to %s", user.email, target_user.email)

        return Response({
            'message': f'Ownership rights successfully transferred to {target_name} ({target_user.email})! You can now proceed with account deletion if desired.',
            'target_user': {
                'id': target_user.id,
                'name': target_name,
                'role': target_user.role
            }
        }, status=status.HTTP_200_OK)


class DeleteAccountView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        return CheckDeleteAccountView()._check(request)

    def post(self, request):
        return self.delete(request)

    def delete(self, request):
        try:
            user = request.user
            password = request.data.get('password', '')
            confirmation = str(request.data.get('confirmation', '')).strip()

            # ALL users must type exact text 'DELETE'
            if confirmation != 'DELETE':
                return Response({'error': 'Please type "DELETE" to confirm account deletion.'}, status=status.HTTP_400_BAD_REQUEST)

            # For email/password users, verify password
            if not user.is_oauth_user:
                if not password:
                    return Response({'error': 'Password is required to confirm account deletion.'}, status=status.HTTP_400_BAD_REQUEST)
                if not user.check_password(password):
                    return Response({'error': 'Incorrect password. Account deletion failed.'}, status=status.HTTP_400_BAD_REQUEST)

            other_users = User.objects.exclude(id=user.id)
            other_users_count = other_users.count()
            total_owners = User.objects.filter(role=User.Role.OWNER).count()
            total_admins_and_owners = User.objects.filter(role__in=[User.Role.OWNER, User.Role.ADMIN]).count()

            # Server-side sole owner/admin enforcement: Ask owner to first transfer ownership then delete
            if user.role == User.Role.OWNER and total_owners <= 1 and other_users_count > 0:
                return Response({
                    'error': 'You can\'t delete your account yet. You are currently the only owner of this organization. Transfer ownership to another user before deleting your account.',
                    'requires_ownership_transfer': True
                }, status=status.HTTP_409_CONFLICT)

            if user.role == User.Role.ADMIN and total_admins_and_owners <= 1 and other_users_count > 0:
                return Response({
                    'error': 'You can\'t delete your account yet. You are currently the only administrator. Assign another administrator before deleting your account.',
                    'requires_admin_assignment': True
                }, status=status.HTTP_409_CONFLICT)

            user_email = user.email

            # Introspect available DB tables to prevent PostgreSQL transaction aborts
            from django.db import connection
            tables = set(connection.introspection.table_names())

            fallback_user = other_users.filter(role=User.Role.OWNER).first() \
                or other_users.filter(role=User.Role.ADMIN).first() \
                or other_users.filter(role=User.Role.MANAGER).first() \
                or other_users.first()

            # 1. Organization ownership disassociation
            if 'authentication_organization' in tables:
                try:
                    from .models import Organization
                    Organization.objects.filter(owner=user).update(owner=fallback_user)
                except Exception as e:
                    logger.warning("Org owner cleanup warning: %s", str(e))

            # 2. Reassign created resources to fallback user
            if fallback_user:
                if 'meetings_meeting' in tables:
                    try:
                        from apps.meetings.models import Meeting
                        Meeting.objects.filter(created_by=user).update(created_by=fallback_user)
                    except Exception:
                        pass

                if 'discussions_discussion' in tables:
                    try:
                        from apps.discussions.models import Discussion
                        Discussion.objects.filter(created_by=user).update(created_by=fallback_user)
                    except Exception:
                        pass

                if 'decisions_decision' in tables:
                    try:
                        from apps.decisions.models import Decision
                        Decision.objects.filter(decided_by=user).update(decided_by=fallback_user)
                    except Exception:
                        pass

                if 'actions_actionitem' in tables:
                    try:
                        from apps.actions.models import ActionItem
                        ActionItem.objects.filter(created_by=user).update(created_by=fallback_user)
                    except Exception:
                        pass

                if 'teams_team' in tables:
                    try:
                        from apps.teams.models import Team
                        Team.objects.filter(created_by=user).update(created_by=fallback_user)
                    except Exception:
                        pass

            # 3. ManyToMany cleanup
            try:
                for meeting in user.attended_meetings.all():
                    meeting.participants.remove(user)
            except Exception:
                pass

            try:
                for action in user.assigned_actions.all():
                    action.assigned_to.remove(user)
            except Exception:
                pass

            try:
                for team in user.teams.all():
                    team.members.remove(user)
            except Exception:
                pass

            # 4. Personal records cleanup
            if 'authentication_organizationjoinrequest' in tables:
                try:
                    from .models import OrganizationJoinRequest
                    OrganizationJoinRequest.objects.filter(user=user).delete()
                    OrganizationJoinRequest.objects.filter(reviewed_by=user).update(reviewed_by=None)
                except Exception:
                    pass

            if 'authentication_departmentchangerequest' in tables:
                try:
                    from .models import DepartmentChangeRequest
                    DepartmentChangeRequest.objects.filter(user=user).delete()
                    DepartmentChangeRequest.objects.filter(reviewed_by=user).update(reviewed_by=None)
                except Exception:
                    pass

            if 'authentication_passwordresetotp' in tables:
                try:
                    from .models import PasswordResetOTP
                    PasswordResetOTP.objects.filter(email__iexact=user_email).delete()
                except Exception:
                    pass

            if 'notifications_notification' in tables:
                try:
                    from apps.notifications.models import Notification
                    Notification.objects.filter(user=user).delete()
                except Exception:
                    pass

            # 5. Delete the user record cleanly (with fallback for un-migrated CASCADE tables)
            try:
                user.delete()
            except Exception as delete_err:
                logger.warning("Standard ORM user.delete() CASCADE warning: %s. Executing direct database deletion.", str(delete_err))
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute("DELETE FROM authentication_user WHERE id = %s", [user.id])

            logger.info("User account %s permanently deleted from database with resources preserved.", user_email)

            return Response({
                'message': 'Your account has been deleted.'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error("Failed to delete user account: %s", str(e), exc_info=True)
            return Response({
                'error': f'Failed to delete account: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DeleteOrganizationView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        return self.delete(request)

    def delete(self, request):
        from apps.meetings.models import Meeting
        from apps.discussions.models import Discussion
        from apps.decisions.models import Decision
        from apps.actions.models import ActionItem
        from apps.teams.models import Team
        from apps.notifications.models import Notification

        user = request.user
        password = request.data.get('password', '')
        confirmation = str(request.data.get('confirmation', '')).strip().upper()

        if not (user.role == User.Role.OWNER or user.is_owner_role):
            return Response({'error': 'Only the Organization Owner can perform organization deletion.'}, status=status.HTTP_403_FORBIDDEN)

        if confirmation != 'SMART MEETING':
            return Response({'error': 'Please type "SMART MEETING" to confirm organization deletion.'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.is_oauth_user:
            if not password:
                return Response({'error': 'Password is required to confirm organization deletion.'}, status=status.HTTP_400_BAD_REQUEST)
            if not user.check_password(password):
                return Response({'error': 'Incorrect password. Organization deletion failed.'}, status=status.HTTP_400_BAD_REQUEST)

        owner_email = user.email

        with transaction.atomic():
            try:
                from .models import Organization
                Organization.objects.all().delete()
            except Exception:
                pass
            Notification.objects.all().delete()
            DepartmentChangeRequest.objects.all().delete()
            PasswordResetOTP.objects.all().delete()
            ActionItem.objects.all().delete()
            Decision.objects.all().delete()
            Discussion.objects.all().delete()
            Meeting.objects.all().delete()
            Team.objects.all().delete()

            # Revoke organization roles and permissions without deleting User accounts!
            for u in User.objects.all():
                u.role = User.Role.UNASSIGNED
                u.department = 'General Team'
                if u.first_name and u.first_name.startswith('Org:'):
                    u.first_name = ''
                u.is_staff = False
                u.is_superuser = False
                u.save()

        logger.info("Organization permanently deleted by Owner %s. All user accounts preserved.", owner_email)

        return Response({
            'message': 'Your organization and all associated data have been permanently deleted.',
            'has_organization': False
        }, status=status.HTTP_200_OK)


def ensure_database_migrated():
    try:
        tables = set(connection.introspection.table_names())
        
        # 1. Ensure authentication_organizationjoinrequest columns exist
        if 'authentication_organizationjoinrequest' in tables:
            columns = [c.name for c in connection.introspection.get_table_description(connection.cursor(), 'authentication_organizationjoinrequest')]
            with connection.cursor() as cursor:
                if 'is_acknowledged' not in columns:
                    try:
                        cursor.execute("ALTER TABLE authentication_organizationjoinrequest ADD COLUMN is_acknowledged boolean NOT NULL DEFAULT FALSE;")
                    except Exception as ex:
                        logger.warning("Add is_acknowledged column warning: %s", str(ex))
                if 'acknowledged_at' not in columns:
                    try:
                        cursor.execute("ALTER TABLE authentication_organizationjoinrequest ADD COLUMN acknowledged_at timestamp with time zone NULL;")
                    except Exception as ex:
                        logger.warning("Add acknowledged_at column warning: %s", str(ex))

        # 2. Ensure actions_actionitem columns exist
        if 'actions_actionitem' in tables:
            columns = [c.name for c in connection.introspection.get_table_description(connection.cursor(), 'actions_actionitem')]
            if 'completion_notes' not in columns:
                with connection.cursor() as cursor:
                    try:
                        cursor.execute("ALTER TABLE actions_actionitem ADD COLUMN completion_notes text NULL;")
                    except Exception as ex:
                        logger.warning("Add completion_notes column warning: %s", str(ex))

        # 3. Trigger Django migrate command for migration state consistency
        try:
            from django.core.management import call_command
            call_command('migrate', interactive=False)
        except Exception as mig_err:
            logger.warning("Auto-migration command note: %s", str(mig_err))
    except Exception as e:
        logger.warning("Auto-migration execution note: %s", str(e))


class CreateOrganizationView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        try:
            ensure_database_migrated()
            user = request.user
            org_name = request.data.get('name', '').strip()
            department = request.data.get('department', '').strip() or 'Executive & Strategy'

            if not org_name:
                return Response({'error': 'Organization name is required.'}, status=status.HTTP_400_BAD_REQUEST)

            if len(org_name) < 3 or len(org_name) > 150:
                return Response({'error': 'Organization name must be between 3 and 150 characters.'}, status=status.HTTP_400_BAD_REQUEST)

            tables = set(connection.introspection.table_names())

            with transaction.atomic():
                from .models import Organization, OrganizationMembership
                org = Organization.objects.create(name=org_name, owner=user)
                
                if 'authentication_organizationmembership' in tables:
                    try:
                        OrganizationMembership.objects.create(
                            user=user,
                            organization=org,
                            role=User.Role.OWNER,
                            is_active=True
                        )
                    except Exception as mem_err:
                        logger.warning("Failed to create OrganizationMembership record: %s", str(mem_err))

                user.role = User.Role.OWNER
                user.department = department
                if user.first_name and user.first_name.startswith('Org:'):
                    user.first_name = ''
                user.save()

            logger.info("User %s created organization '%s' (ID: %s) and assigned as OWNER.", user.email, org_name, org.id)

            from .serializers import OrganizationSerializer, UserSerializer
            return Response({
                'message': f"Organization '{org_name}' created successfully!",
                'organization': OrganizationSerializer(org, context={'request': request}).data,
                'user': UserSerializer(user, context={'request': request}).data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error("CreateOrganizationView error: %s", str(e), exc_info=True)
            return Response({'error': f"Failed to create organization: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


from .models import DepartmentChangeRequest, OrganizationJoinRequest
from .serializers import UserSerializer, RegisterSerializer, CustomTokenObtainPairSerializer, DepartmentChangeRequestSerializer, OrganizationJoinRequestSerializer, OrganizationSerializer

class JoinOrganizationView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        try:
            ensure_database_migrated()
            user = request.user
            department = request.data.get('department', '').strip() or 'General Team'
            org_id = request.data.get('organization_id') or request.data.get('organization')
            org_name = request.data.get('organization_name', '').strip()

            from .models import Organization, OrganizationMembership, OrganizationJoinRequest

            tables = set(connection.introspection.table_names())
            has_membership_table = 'authentication_organizationmembership' in tables
            has_join_req_table = 'authentication_organizationjoinrequest' in tables
            has_org_fk_col = False
            if has_join_req_table:
                try:
                    columns = [c.name for c in connection.introspection.get_table_description(connection.cursor(), 'authentication_organizationjoinrequest')]
                    has_org_fk_col = 'organization_id' in columns
                except Exception:
                    pass

            org = None
            if org_id and 'authentication_organization' in tables:
                try:
                    org = Organization.objects.filter(id=org_id).first()
                except Exception:
                    pass
            if not org and org_name and 'authentication_organization' in tables:
                try:
                    org = Organization.objects.filter(name__iexact=org_name).first()
                except Exception:
                    pass

            if not org and 'authentication_organization' in tables:
                try:
                    org = Organization.objects.first()
                except Exception:
                    pass

            if not org and not org_name:
                return Response({'error': 'Please select an organization to join.'}, status=status.HTTP_400_BAD_REQUEST)

            target_org_name = org.name if org else (org_name or 'SmartMeeting Workspace')

            # Check active membership
            if org and has_membership_table:
                try:
                    if OrganizationMembership.objects.filter(user=user, organization=org, is_active=True).exists():
                        return Response({
                            'error': f'You are already an active member of "{target_org_name}".'
                        }, status=status.HTTP_400_BAD_REQUEST)
                except Exception:
                    pass

            # Check pending join request
            if has_join_req_table:
                try:
                    existing_pending = OrganizationJoinRequest.objects.filter(
                        user=user,
                        status=OrganizationJoinRequest.Status.PENDING
                    )
                    if org and has_org_fk_col:
                        existing_pending = existing_pending.filter(Q(organization=org) | Q(organization_name__iexact=target_org_name))
                    else:
                        existing_pending = existing_pending.filter(organization_name__iexact=target_org_name)

                    if existing_pending.exists():
                        pending_obj = existing_pending.first()
                        return Response({
                            'error': f'You already have a pending join request for "{pending_obj.organization_name}". Please wait for an Administrator or Owner to approve your request.',
                            'pending': True,
                            'request_id': pending_obj.id
                        }, status=status.HTTP_400_BAD_REQUEST)
                except Exception as e:
                    logger.warning("Check pending join request warning: %s", str(e))

            # Create join request
            create_kwargs = {
                'user': user,
                'organization_name': target_org_name,
                'requested_department': department,
                'status': OrganizationJoinRequest.Status.PENDING
            }
            if org and has_org_fk_col:
                create_kwargs['organization'] = org

            join_req = None
            try:
                join_req = OrganizationJoinRequest.objects.create(**create_kwargs)
            except Exception as e:
                logger.warning("Join request creation with FK warning: %s. Retrying without FK.", str(e))
                join_req = OrganizationJoinRequest.objects.create(
                    user=user,
                    organization_name=target_org_name,
                    requested_department=department,
                    status=OrganizationJoinRequest.Status.PENDING
                )

            logger.info("User %s submitted a join request for organization '%s' (ID: %s, Department: %s).", user.email, target_org_name, org.id if org else 'N/A', department)

            if join_req:
                try:
                    from apps.notifications.models import Notification
                    source_id = f"join-request-{join_req.id}"
                    req_user_name = user.get_full_name() or user.username
                    recipients = set()
                    if org and org.owner:
                        recipients.add(org.owner)
                    if org and 'authentication_organizationmembership' in tables:
                        admin_mems = OrganizationMembership.objects.filter(
                            organization=org,
                            role__in=[User.Role.OWNER, User.Role.ADMIN],
                            is_active=True
                        ).select_related('user')
                        for mem in admin_mems:
                            recipients.add(mem.user)
                    if not recipients:
                        for admin_u in User.objects.filter(role__in=[User.Role.OWNER, User.Role.ADMIN]):
                            recipients.add(admin_u)

                    for recipient in recipients:
                        if recipient.id != user.id:
                            Notification.objects.get_or_create(
                                user=recipient,
                                source_id=source_id,
                                defaults={
                                    'title': f"New Join Request: {req_user_name}",
                                    'subtitle': f"Requested to join {target_org_name} ({department})",
                                    'link': '/admin?tab=organization_join_requests',
                                    'notification_type': Notification.NotificationType.GENERAL,
                                    'is_read': False
                                }
                            )
                except Exception as notif_err:
                    logger.warning("Failed to create join request notification: %s", str(notif_err))

            req_data = None
            if join_req:
                try:
                    req_data = OrganizationJoinRequestSerializer(join_req, context={'request': request}).data
                except Exception:
                    req_data = {'id': join_req.id, 'organization_name': target_org_name, 'status': join_req.status}

            return Response({
                'message': 'Your request has been submitted successfully. You will receive an email notification once your request is reviewed and accepted.',
                'pending': True,
                'request_id': join_req.id if join_req else None,
                'request': req_data,
                'user': UserSerializer(user, context={'request': request}).data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error("JoinOrganizationView error: %s", str(e), exc_info=True)
            return Response({'error': f"Failed to submit organization join request: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


class OrganizationStatusView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        try:
            ensure_database_migrated()
            from .models import Organization, OrganizationMembership
            user = request.user
            tables = set(connection.introspection.table_names())

            user_org = None
            if 'authentication_organization' in tables:
                user_org = Organization.objects.filter(owner=user).first()

            if not user_org and 'authentication_organizationmembership' in tables:
                mem = OrganizationMembership.objects.filter(user=user, is_active=True).first()
                if mem:
                    user_org = mem.organization

            header_org_id = request.headers.get('X-Organization-ID')
            if not user_org and header_org_id and 'authentication_organization' in tables:
                try:
                    user_org = Organization.objects.filter(id=header_org_id).first()
                except Exception:
                    pass

            if not user_org and 'authentication_organization' in tables and Organization.objects.count() == 1:
                user_org = Organization.objects.first()

            if user_org:
                owner = user_org.owner
                org_name = user_org.name
                member_ids = set()
                if 'authentication_organizationmembership' in tables:
                    member_ids.update(
                        OrganizationMembership.objects.filter(organization=user_org, is_active=True)
                        .values_list('user_id', flat=True)
                    )
                if user_org.owner_id:
                    member_ids.add(user_org.owner_id)

                active_members_qs = User.objects.filter(id__in=member_ids).exclude(role=User.Role.UNASSIGNED)
            else:
                owner = User.objects.filter(role=User.Role.OWNER).first()
                org_name = user.organization_name or 'SmartMeeting Workspace'
                active_members_qs = User.objects.filter(role__in=[User.Role.OWNER, User.Role.ADMIN, User.Role.MANAGER, User.Role.MEMBER])

            total_members = active_members_qs.count()
            has_active_org = user_org is not None or total_members > 0

            raw_depts = list(
                active_members_qs.exclude(department__isnull=True)
                .exclude(department__exact='')
                .values_list('department', flat=True)
                .distinct()
            )
            existing_departments = sorted(list(set(raw_depts))) if raw_depts else ['Executive & Strategy', 'Engineering & Tech Lead', 'General Team']

            all_organizations = []
            tables = set(connection.introspection.table_names())
            if 'authentication_organization' in tables:
                try:
                    for org in Organization.objects.all().select_related('owner'):
                        all_organizations.append({
                            'id': org.id,
                            'name': org.name,
                            'owner_name': org.owner.get_full_name() or org.owner.username if org.owner else 'System Owner',
                            'owner_email': org.owner.email if org.owner else None,
                        })
                except Exception as e:
                    logger.warning("Organization list lookup warning: %s", str(e))

            if not all_organizations and has_active_org:
                all_organizations.append({
                    'id': 1,
                    'name': org_name or 'SmartMeeting Workspace',
                    'owner_name': owner.get_full_name() or owner.username if owner else 'Organization Owner',
                    'owner_email': owner.email if owner else None,
                })

            user_pending_request = None
            user_unacknowledged_decision = None
            if user.is_authenticated and 'authentication_organizationjoinrequest' in tables:
                try:
                    from .models import OrganizationJoinRequest
                    pending_obj = OrganizationJoinRequest.objects.filter(user=user, status=OrganizationJoinRequest.Status.PENDING).first()
                    if pending_obj:
                        user_pending_request = {
                            'id': pending_obj.id,
                            'organization_id': getattr(pending_obj, 'organization_id', None),
                            'organization_name': pending_obj.organization_name,
                            'requested_department': pending_obj.requested_department,
                            'status': pending_obj.status,
                            'created_at': pending_obj.created_at
                        }

                    unack_qs = OrganizationJoinRequest.objects.filter(
                        user=user,
                        status__in=[OrganizationJoinRequest.Status.APPROVED, OrganizationJoinRequest.Status.REJECTED],
                        is_acknowledged=False
                    ).order_by('-updated_at', '-id')
                    unack_obj = unack_qs.first()
                    if unack_obj:
                        user_unacknowledged_decision = {
                            'id': unack_obj.id,
                            'organization_id': unack_obj.organization.id if unack_obj.organization else None,
                            'organization_name': unack_obj.organization_name,
                            'requested_department': unack_obj.requested_department,
                            'status': unack_obj.status,
                            'review_notes': unack_obj.review_notes,
                            'reviewed_by_name': unack_obj.reviewed_by.get_full_name() or unack_obj.reviewed_by.username if unack_obj.reviewed_by else None,
                            'created_at': unack_obj.created_at,
                            'updated_at': unack_obj.updated_at,
                            'remaining_unacknowledged_count': max(0, unack_qs.count() - 1)
                        }
                except Exception as e:
                    logger.warning("Join request status lookup warning: %s", str(e))

            return Response({
                'has_active_organization': has_active_org,
                'organization_name': org_name,
                'owner_name': owner.get_full_name() or owner.username if owner else None,
                'owner_email': owner.email if owner else None,
                'total_active_members': total_members,
                'existing_departments': existing_departments,
                'all_organizations': all_organizations,
                'user_pending_request': user_pending_request,
                'user_unacknowledged_decision': user_unacknowledged_decision
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error("OrganizationStatusView error: %s", str(e), exc_info=True)
            return Response({
                'has_active_organization': True,
                'organization_name': 'SmartMeeting Workspace',
                'owner_name': None,
                'owner_email': None,
                'total_active_members': 1,
                'existing_departments': ['Executive & Strategy', 'Engineering & Tech Lead', 'General Team'],
                'all_organizations': [],
                'user_pending_request': None
            }, status=status.HTTP_200_OK)


from rest_framework.decorators import action

class DepartmentChangeRequestViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentChangeRequestSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return DepartmentChangeRequest.objects.none()

        try:
            qs = DepartmentChangeRequest.objects.all().select_related('user', 'reviewed_by')
            if user.is_admin_role or user.is_manager_role:
                tables = set(connection.introspection.table_names())
                user_org = get_user_active_organization(user, request=self.request)
                if user_org:
                    member_user_ids = set()
                    if 'authentication_organizationmembership' in tables:
                        from .models import OrganizationMembership
                        member_user_ids.update(
                            OrganizationMembership.objects.filter(organization=user_org, is_active=True)
                            .values_list('user_id', flat=True)
                        )
                    if user_org.owner_id:
                        member_user_ids.add(user_org.owner_id)

                    qs = qs.filter(Q(user_id__in=member_user_ids) | Q(user=user))
                else:
                    qs = qs.filter(user=user)
                return qs.order_by('-created_at')
            return qs.filter(user=user).order_by('-created_at')
        except Exception as e:
            logger.error("Failed to fetch DepartmentChangeRequest queryset: %s", str(e))
            return DepartmentChangeRequest.objects.none()

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            logger.error("Error listing department change requests: %s", str(e))
            return Response([], status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        user = self.request.user
        prev_dept = user.department or 'General Team'
        serializer.save(
            user=user,
            previous_department=prev_dept,
            status=DepartmentChangeRequest.Status.PENDING
        )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        user = request.user
        if not (user.is_admin_role or user.is_manager_role):
            return Response({'error': 'Only Admins and Managers can approve department change requests.'}, status=status.HTTP_403_FORBIDDEN)

        req_obj = self.get_object()
        if req_obj.status != DepartmentChangeRequest.Status.PENDING:
            return Response({'error': f'Request is already {req_obj.status}.'}, status=status.HTTP_400_BAD_REQUEST)

        req_obj.status = DepartmentChangeRequest.Status.APPROVED
        req_obj.reviewed_by = user
        req_obj.review_notes = request.data.get('review_notes', '')
        req_obj.save()

        # Update member's department
        target_user = req_obj.user
        target_user.department = req_obj.requested_department
        target_user.save()

        return Response({
            'message': f'Department request approved! Updated {target_user.username}\'s department to "{req_obj.requested_department}".',
            'data': DepartmentChangeRequestSerializer(req_obj, context={'request': request}).data
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        user = request.user
        if not (user.is_admin_role or user.is_manager_role):
            return Response({'error': 'Only Admins and Managers can reject department change requests.'}, status=status.HTTP_403_FORBIDDEN)

        req_obj = self.get_object()
        if req_obj.status != DepartmentChangeRequest.Status.PENDING:
            return Response({'error': f'Request is already {req_obj.status}.'}, status=status.HTTP_400_BAD_REQUEST)

        req_obj.status = DepartmentChangeRequest.Status.REJECTED
        req_obj.reviewed_by = user
        req_obj.review_notes = request.data.get('review_notes', '')
        req_obj.save()

        return Response({
            'message': 'Department change request rejected.',
            'data': DepartmentChangeRequestSerializer(req_obj, context={'request': request}).data
        })


class OrganizationJoinRequestViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizationJoinRequestSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return OrganizationJoinRequest.objects.none()

        try:
            qs = OrganizationJoinRequest.objects.all().select_related('user', 'reviewed_by', 'organization')
            if user.is_admin_role or user.is_manager_role:
                user_org = get_user_active_organization(user, request=self.request)
                if user_org:
                    org_filter = Q(organization=user_org) | Q(organization_name__iexact=user_org.name)
                    if user_org.owner and user_org.owner.organization_name:
                        org_filter |= Q(organization_name__iexact=user_org.owner.organization_name)
                    qs = qs.filter(org_filter | Q(user=user))
                else:
                    qs = qs.filter(user=user)
                return qs.order_by('-created_at')
            return qs.filter(user=user).order_by('-created_at')
        except Exception as e:
            logger.error("Failed to fetch OrganizationJoinRequest queryset: %s", str(e))
            return OrganizationJoinRequest.objects.none()

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            logger.error("Error listing organization join requests: %s", str(e))
            return Response([], status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        user = request.user
        if not (user.is_admin_role or user.is_manager_role):
            return Response({'error': 'Only Admins and Owners can approve organization join requests.'}, status=status.HTTP_403_FORBIDDEN)

        req_obj = self.get_object()
        if req_obj.status != OrganizationJoinRequest.Status.PENDING:
            return Response({'error': f'Join request is already {req_obj.status}.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            req_obj.status = OrganizationJoinRequest.Status.APPROVED
            req_obj.reviewed_by = user
            req_obj.review_notes = request.data.get('review_notes', '')
            req_obj.save()

            target_user = req_obj.user
            target_org = req_obj.organization
            if not target_org and req_obj.organization_name:
                from .models import Organization
                target_org = Organization.objects.filter(name__iexact=req_obj.organization_name).first()

            if target_org:
                from .models import OrganizationMembership
                membership, created = OrganizationMembership.objects.get_or_create(
                    user=target_user,
                    organization=target_org,
                    defaults={'role': User.Role.MEMBER, 'is_active': True}
                )
                if not created:
                    membership.is_active = True
                    membership.role = User.Role.MEMBER
                    membership.save()

            target_user.role = User.Role.MEMBER
            if req_obj.requested_department:
                target_user.department = req_obj.requested_department
            target_user.save()

        # Send email notification to user via Brevo
        try:
            org_title = req_obj.organization_name or (target_org.name if target_org else 'SmartMeeting Workspace')
            
            # Create in-app notification for user
            try:
                from apps.notifications.models import Notification
                Notification.objects.create(
                    user=target_user,
                    title="🎉 Organization Join Request Approved!",
                    subtitle=f"Your request to join {org_title} (Department: {req_obj.requested_department}) has been approved.",
                    link="/dashboard",
                    notification_type=Notification.NotificationType.GENERAL,
                    is_read=False
                )
            except Exception as notif_err:
                logger.warning("Failed to create approval in-app notification: %s", str(notif_err))

            subject = f"✅ Organization Join Request Approved - {org_title}"
            recipient_name = target_user.first_name or target_user.username
            text_body = (
                f"Hello {recipient_name},\n\n"
                f"Great news! Your request to join '{org_title}' has been approved by an Administrator.\n\n"
                f"You can now log in and access all workspace features.\n\n"
                f"Best regards,\nSmartMeeting Tracker Team"
            )
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px;">
              <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
                <h2 style="color: #0f172a; margin-top: 0;">🎉 Join Request Approved!</h2>
                <p>Hello <strong>{recipient_name}</strong>,</p>
                <p>Your request to join <strong>{org_title}</strong> (Department: {req_obj.requested_department}) has been approved by an Organization Administrator.</p>
                <p>You can now access the full dashboard and collaborate with your team.</p>
                <br>
                <p style="color: #64748b; font-size: 12px;">SmartMeeting Decision Tracker Team</p>
              </div>
            </body>
            </html>
            """
            send_brevo_transactional_email(subject, [target_user.email], text_body, html_body)
        except Exception as mail_err:
            logger.error("Failed to send approval email notification: %s", str(mail_err))

        logger.info("Admin %s approved join request for %s", user.email, target_user.email)

        return Response({
            'message': f'Approved! {target_user.get_full_name() or target_user.username} has joined the organization as a MEMBER and an email notification has been dispatched.',
            'data': OrganizationJoinRequestSerializer(req_obj, context={'request': request}).data
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        user = request.user
        if not (user.is_admin_role or user.is_manager_role):
            return Response({'error': 'Only Admins and Owners can reject organization join requests.'}, status=status.HTTP_403_FORBIDDEN)

        req_obj = self.get_object()
        if req_obj.status != OrganizationJoinRequest.Status.PENDING:
            return Response({'error': f'Join request is already {req_obj.status}.'}, status=status.HTTP_400_BAD_REQUEST)

        req_obj.status = OrganizationJoinRequest.Status.REJECTED
        req_obj.reviewed_by = user
        req_obj.review_notes = request.data.get('review_notes', '')
        req_obj.save()

        # Send rejection email notification via Brevo
        try:
            target_user = req_obj.user
            org_title = req_obj.organization_name or 'SmartMeeting Workspace'
            
            # Create in-app notification for user
            try:
                from apps.notifications.models import Notification
                Notification.objects.create(
                    user=target_user,
                    title="Organization Join Request Update",
                    subtitle=f"Your request to join {org_title} was reviewed by an Administrator.",
                    link="/onboarding",
                    notification_type=Notification.NotificationType.GENERAL,
                    is_read=False
                )
            except Exception as notif_err:
                logger.warning("Failed to create rejection in-app notification: %s", str(notif_err))

            subject = f"Organization Join Request Update - {org_title}"
            recipient_name = target_user.first_name or target_user.username
            text_body = (
                f"Hello {recipient_name},\n\n"
                f"Your request to join '{org_title}' was reviewed by an Administrator and was not accepted at this time.\n\n"
                f"If you have questions, please contact your organization administrator.\n\n"
                f"Best regards,\nSmartMeeting Tracker Team"
            )
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px;">
              <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
                <h2 style="color: #0f172a; margin-top: 0;">Organization Join Request Status</h2>
                <p>Hello <strong>{recipient_name}</strong>,</p>
                <p>Your request to join <strong>{org_title}</strong> was reviewed by an Administrator and was not approved at this time.</p>
                <br>
                <p style="color: #64748b; font-size: 12px;">SmartMeeting Decision Tracker Team</p>
              </div>
            </body>
            </html>
            """
            send_brevo_transactional_email(subject, [target_user.email], text_body, html_body)
        except Exception as mail_err:
            logger.error("Failed to send rejection email notification: %s", str(mail_err))

        logger.info("Admin %s rejected join request for %s", user.email, req_obj.user.email)

        return Response({
            'message': f'Organization join request for {req_obj.user.email} has been rejected and an email notification has been dispatched.',
            'data': OrganizationJoinRequestSerializer(req_obj, context={'request': request}).data
        })

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        user = request.user
        req_obj = self.get_object()
        if req_obj.user != user and not (user.is_admin_role or user.is_manager_role):
            return Response({'error': 'You can only acknowledge your own join request decision.'}, status=status.HTTP_403_FORBIDDEN)

        req_obj.is_acknowledged = True
        req_obj.acknowledged_at = timezone.now()
        req_obj.save()

        logger.info("User %s acknowledged join request #%s (Status: %s)", user.email, req_obj.id, req_obj.status)

        return Response({
            'message': 'Join request decision acknowledged successfully.',
            'data': OrganizationJoinRequestSerializer(req_obj, context={'request': request}).data
        }, status=status.HTTP_200_OK)




