from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        OWNER = 'OWNER', 'Owner'
        ADMIN = 'ADMIN', 'Admin'
        MANAGER = 'MANAGER', 'Manager'
        MEMBER = 'MEMBER', 'Member'

    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.MEMBER
    )
    department = models.CharField(max_length=100, blank=True, null=True)

    REQUIRED_FIELDS = ['email', 'first_name', 'last_name']

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"

    @property
    def is_owner_role(self):
        return self.role == self.Role.OWNER or self.is_superuser

    @property
    def is_admin_role(self):
        return self.role in [self.Role.OWNER, self.Role.ADMIN] or self.is_superuser

    @property
    def is_manager_role(self):
        return self.role in [self.Role.OWNER, self.Role.ADMIN, self.Role.MANAGER] or self.is_superuser

    @property
    def is_member_role(self):
        return True


class PasswordResetOTP(models.Model):
    email = models.EmailField()
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"OTP for {self.email}: {self.otp_code} (Verified: {self.is_verified})"
