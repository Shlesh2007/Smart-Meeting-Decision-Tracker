from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'role', 'department', 'date_joined')
        read_only_fields = ('id', 'date_joined')

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

    def validate_role(self, value):
        request = self.context.get('request')
        # If someone is attempting to assign OWNER role, verify requesting user is OWNER or superuser
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
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        validated_data.pop('role', None)  # Ensure role input is stripped for public signup
        
        # Public registration ALWAYS assigns MEMBER role
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role=User.Role.MEMBER,
            department=validated_data.get('department', '')
        )
        return user


from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        raw_username = attrs.get(self.username_field, '').strip()
        password = attrs.get('password', '')

        DEMO_ACCOUNTS = {
            'organizer': ('password123', User.Role.MANAGER, 'Rohan', 'Mehta', 'organizer@smdt.in', 'Engineering & Tech Lead'),
            'member': ('password123', User.Role.MEMBER, 'Ananya', 'Iyer', 'member@smdt.in', 'Backend Infrastructure'),
            'admin': ('admin123', User.Role.ADMIN, 'Priya', 'Patel', 'priya.patel@smdt.in', 'Operations & Governance'),
            'owner': ('owner123', User.Role.OWNER, 'Aarav', 'Sharma', 'aarav.sharma@smdt.in', 'Executive & Strategy'),
            'manager': ('manager123', User.Role.MANAGER, 'Rohan', 'Mehta', 'rohan.mehta@smdt.in', 'Engineering & Tech Lead'),
            'member1': ('member123', User.Role.MEMBER, 'Ananya', 'Iyer', 'ananya.iyer@smdt.in', 'Backend Infrastructure'),
        }

        DEMO_EMAILS = {
            'organizer@smdt.in': 'organizer',
            'member@smdt.in': 'member',
            'priya.patel@smdt.in': 'admin',
            'aarav.sharma@smdt.in': 'owner',
            'rohan.mehta@smdt.in': 'manager',
            'ananya.iyer@smdt.in': 'member1',
        }

        user_key = raw_username.lower()
        if user_key in DEMO_EMAILS:
            user_key = DEMO_EMAILS[user_key]

        if user_key in DEMO_ACCOUNTS:
            expected_pass, role, first_name, last_name, email, dept = DEMO_ACCOUNTS[user_key]
            if password == expected_pass:
                # Find or provision user automatically
                user = User.objects.filter(username__iexact=user_key).first() or User.objects.filter(email__iexact=email).first()

                if not user:
                    user = User.objects.create_user(
                        username=user_key,
                        email=email,
                        password=expected_pass,
                        first_name=first_name,
                        last_name=last_name,
                        role=role,
                        department=dept
                    )
                else:
                    user.set_password(expected_pass)
                    user.role = role
                    user.save()

                attrs[self.username_field] = user.username
        else:
            # Support login by email address OR case-insensitive username
            user = User.objects.filter(email__iexact=raw_username).first() or User.objects.filter(username__iexact=raw_username).first()
            if user:
                attrs[self.username_field] = user.username

        return super().validate(attrs)


from .models import DepartmentChangeRequest

class DepartmentChangeRequestSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)
    reviewed_by_detail = UserSerializer(source='reviewed_by', read_only=True)

    class Meta:
        model = DepartmentChangeRequest
        fields = (
            'id', 'user', 'user_detail', 'requested_department', 'reason',
            'status', 'reviewed_by', 'reviewed_by_detail', 'review_notes',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'user', 'user_detail', 'status', 'reviewed_by', 'reviewed_by_detail', 'created_at', 'updated_at')


