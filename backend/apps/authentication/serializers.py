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
