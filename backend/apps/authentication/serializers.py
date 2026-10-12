from rest_framework import serializers
from django.contrib.auth import get_user_model
import re

User = get_user_model()

HUMAN_NAME_REGEX = re.compile(r"^[a-zA-Z\s'\-]{2,50}$")
USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9_-]{3,30}$")
SQL_DANGEROUS_REGEX = re.compile(
    r'(\b(select|delete|insert|update|drop|alter|create|truncate|exec|union|table|from|where|into)\b)|([;*<>\\/{}="`]|--)',
    re.IGNORECASE
)

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    is_oauth_user = serializers.BooleanField(read_only=True)
    has_organization = serializers.BooleanField(read_only=True)
    organization_name = serializers.SerializerMethodField()
    organization_owner = serializers.SerializerMethodField()
    unacknowledged_decision = serializers.SerializerMethodField()
    pending_request = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'role', 'department',
            'organization_name', 'organization_owner', 'date_joined', 'is_oauth_user', 'has_organization',
            'unacknowledged_decision', 'pending_request'
        )
        read_only_fields = (
            'id', 'date_joined', 'is_oauth_user', 'has_organization', 'unacknowledged_decision', 'pending_request'
        )

    def get_full_name(self, obj):
        fn = (obj.first_name or '').strip()
        if fn.startswith('Org:'):
            fn = ''
        ln = (obj.last_name or '').strip()
        full = f"{fn} {ln}".strip()
        return full or obj.username

    def get_organization_name(self, obj):
        try:
            return obj.organization_name
        except Exception:
            return 'SmartMeeting Workspace'

    def get_organization_owner(self, obj):
        try:
            if not obj.has_organization:
                return None
            from django.db import connection
            tables = set(connection.introspection.table_names())

            owner = None
            if 'authentication_organization' in tables:
                from .models import Organization
                owned_org = Organization.objects.filter(owner=obj).first()
                if owned_org:
                    owner = obj

            if not owner and 'authentication_organizationmembership' in tables:
                from .models import OrganizationMembership
                mem = OrganizationMembership.objects.filter(user=obj, is_active=True).first()
                if mem and mem.organization and mem.organization.owner:
                    owner = mem.organization.owner

            if not owner and 'authentication_organization' in tables:
                from .models import Organization
                if Organization.objects.count() == 1:
                    first_org = Organization.objects.first()
                    if first_org and first_org.owner:
                        owner = first_org.owner

            if not owner:
                owner = User.objects.filter(role=User.Role.OWNER).first()

            if owner:
                return {
                    'id': owner.id,
                    'full_name': owner.get_full_name() or owner.username,
                    'username': owner.username,
                    'email': owner.email,
                    'role': owner.role
                }
        except Exception:
            pass
        return None

    def get_unacknowledged_decision(self, obj):
        try:
            from django.db import connection
            tables = set(connection.introspection.table_names())
            if 'authentication_organizationjoinrequest' in tables:
                from .models import OrganizationJoinRequest
                unack_qs = OrganizationJoinRequest.objects.filter(
                    user=obj,
                    status__in=[OrganizationJoinRequest.Status.APPROVED, OrganizationJoinRequest.Status.REJECTED],
                    is_acknowledged=False
                ).order_by('-updated_at', '-id')
                unack_obj = unack_qs.first()
                if unack_obj:
                    org_id = unack_obj.organization.id if unack_obj.organization else None
                    return {
                        'id': unack_obj.id,
                        'organization_id': org_id,
                        'organization_name': unack_obj.organization_name,
                        'requested_department': unack_obj.requested_department,
                        'status': unack_obj.status,
                        'review_notes': unack_obj.review_notes,
                        'reviewed_by_name': unack_obj.reviewed_by.get_full_name() or unack_obj.reviewed_by.username if unack_obj.reviewed_by else None,
                        'created_at': unack_obj.created_at,
                        'updated_at': unack_obj.updated_at,
                        'remaining_unacknowledged_count': max(0, unack_qs.count() - 1)
                    }
        except Exception:
            pass
        return None

    def get_pending_request(self, obj):
        try:
            from django.db import connection
            tables = set(connection.introspection.table_names())
            if 'authentication_organizationjoinrequest' in tables:
                from .models import OrganizationJoinRequest
                pending_obj = OrganizationJoinRequest.objects.filter(
                    user=obj,
                    status=OrganizationJoinRequest.Status.PENDING
                ).order_by('-created_at').first()
                if pending_obj:
                    org_id = pending_obj.organization.id if pending_obj.organization else None
                    return {
                        'id': pending_obj.id,
                        'organization_id': org_id,
                        'organization_name': pending_obj.organization_name,
                        'requested_department': pending_obj.requested_department,
                        'status': pending_obj.status,
                        'created_at': pending_obj.created_at
                    }
        except Exception:
            pass
        return None

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if ret.get('first_name', '').startswith('Org:'):
            ret['first_name'] = ''
            ret['full_name'] = (ret.get('last_name') or '').strip() or instance.username
        if not ret.get('department') or not str(ret.get('department')).strip():
            ret['department'] = 'General Team'
        return ret

    def validate_role(self, value):
        request = self.context.get('request')
        if value == User.Role.OWNER:
            if not request or not request.user or not request.user.is_authenticated or not request.user.is_owner_role:
                raise serializers.ValidationError("Only the organization OWNER can assign the OWNER role.")
        return value


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'password', 'password_confirm', 'department')

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords do not match."})

        fn = (attrs.get('first_name') or '').strip()
        ln = (attrs.get('last_name') or '').strip()
        un = (attrs.get('username') or '').strip()
        em = (attrs.get('email') or '').strip()

        if fn:
            if len(fn) < 2 or len(fn) > 50:
                raise serializers.ValidationError({"first_name": "First name must be between 2 and 50 characters."})
            if SQL_DANGEROUS_REGEX.search(fn):
                raise serializers.ValidationError({"first_name": "First name contains invalid symbols or SQL syntax."})
            if not HUMAN_NAME_REGEX.match(fn):
                raise serializers.ValidationError({"first_name": "First name can only contain letters, spaces, hyphens, and apostrophes."})

        if ln:
            if len(ln) < 2 or len(ln) > 50:
                raise serializers.ValidationError({"last_name": "Last name must be between 2 and 50 characters."})
            if SQL_DANGEROUS_REGEX.search(ln):
                raise serializers.ValidationError({"last_name": "Last name contains invalid symbols or SQL syntax."})
            if not HUMAN_NAME_REGEX.match(ln):
                raise serializers.ValidationError({"last_name": "Last name can only contain letters, spaces, hyphens, and apostrophes."})

        if un:
            if len(un) < 3 or len(un) > 30:
                raise serializers.ValidationError({"username": "Username must be between 3 and 30 characters."})
            if SQL_DANGEROUS_REGEX.search(un):
                raise serializers.ValidationError({"username": "Username contains invalid symbols or SQL syntax."})
            if not USERNAME_REGEX.match(un):
                raise serializers.ValidationError({"username": "Username can only contain letters, numbers, underscores, and hyphens."})

        if em and SQL_DANGEROUS_REGEX.search(em):
            raise serializers.ValidationError({"email": "Email contains invalid characters or SQL syntax."})

        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        validated_data.pop('role', None)
        
        is_first_user = not User.objects.exists()
        assigned_role = User.Role.OWNER if is_first_user else User.Role.UNASSIGNED

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role=assigned_role,
            department=validated_data.get('department', '')
        )
        return user


from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        raw_username = attrs.get(self.username_field, '').strip()
        user = User.objects.filter(username__iexact=raw_username).first()
        if user:
            attrs[self.username_field] = user.username
        return super().validate(attrs)


from .models import DepartmentChangeRequest, OrganizationJoinRequest, OrganizationLeaveRequest, Organization, OrganizationMembership

class OrganizationSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    owner_email = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = ('id', 'name', 'owner', 'owner_name', 'owner_email', 'created_at', 'updated_at')

    def get_owner_name(self, obj):
        try:
            if hasattr(obj, 'owner') and obj.owner:
                return obj.owner.get_full_name() or obj.owner.username
        except Exception:
            pass
        return 'System Owner'

    def get_owner_email(self, obj):
        try:
            if hasattr(obj, 'owner') and obj.owner:
                return obj.owner.email
        except Exception:
            pass
        return None


class OrganizationMembershipSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)
    organization_detail = OrganizationSerializer(source='organization', read_only=True)

    class Meta:
        model = OrganizationMembership
        fields = ('id', 'user', 'user_detail', 'organization', 'organization_detail', 'role', 'is_active', 'created_at', 'updated_at')


class DepartmentChangeRequestSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)
    reviewed_by_detail = UserSerializer(source='reviewed_by', read_only=True)

    class Meta:
        model = DepartmentChangeRequest
        fields = (
            'id', 'user', 'user_detail', 'previous_department', 'requested_department', 'reason',
            'status', 'reviewed_by', 'reviewed_by_detail', 'review_notes',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'user', 'user_detail', 'previous_department', 'status', 'reviewed_by', 'reviewed_by_detail', 'created_at', 'updated_at')


class OrganizationJoinRequestSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)
    reviewed_by_detail = UserSerializer(source='reviewed_by', read_only=True)
    organization_detail = serializers.SerializerMethodField()

    class Meta:
        model = OrganizationJoinRequest
        fields = (
            'id', 'user', 'user_detail', 'organization_detail', 'organization_name', 'requested_department',
            'status', 'reviewed_by', 'reviewed_by_detail', 'review_notes', 'is_acknowledged', 'acknowledged_at',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'user', 'user_detail', 'status', 'reviewed_by', 'reviewed_by_detail', 'created_at', 'updated_at')

    def get_organization_detail(self, obj):
        try:
            if hasattr(obj, 'organization') and obj.organization:
                return OrganizationSerializer(obj.organization, context=self.context).data
        except Exception:
            pass
        return None


class OrganizationLeaveRequestSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)
    reviewed_by_detail = UserSerializer(source='reviewed_by', read_only=True)
    organization_detail = serializers.SerializerMethodField()

    class Meta:
        model = OrganizationLeaveRequest
        fields = (
            'id', 'user', 'user_detail', 'organization_detail', 'organization_name', 'reason',
            'status', 'reviewed_by', 'reviewed_by_detail', 'review_notes', 'is_acknowledged', 'acknowledged_at',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'user', 'user_detail', 'status', 'reviewed_by', 'reviewed_by_detail', 'created_at', 'updated_at')

    def get_organization_detail(self, obj):
        try:
            if hasattr(obj, 'organization') and obj.organization:
                return OrganizationSerializer(obj.organization, context=self.context).data
        except Exception:
            pass
        return None
