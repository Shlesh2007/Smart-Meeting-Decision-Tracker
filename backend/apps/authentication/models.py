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
    department = models.CharField(max_length=100, default='General Team', blank=True, null=True)
    google_access_token = models.TextField(blank=True, null=True)
    google_refresh_token = models.TextField(blank=True, null=True)
    google_token_expires_at = models.DateTimeField(blank=True, null=True)

    REQUIRED_FIELDS = ['email', 'first_name', 'last_name']

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"

    def save(self, *args, **kwargs):
        if not self.department or not str(self.department).strip():
            self.department = 'General Team'
        if self.role in [self.Role.OWNER, self.Role.ADMIN]:
            self.is_staff = True
            self.is_superuser = True
        super().save(*args, **kwargs)

    @property
    def is_owner_role(self):
        return self.role == self.Role.OWNER or (self.is_superuser and self.role != self.Role.MEMBER)

    @property
    def is_admin_role(self):
        return self.role in [self.Role.OWNER, self.Role.ADMIN] or (self.is_superuser and self.role != self.Role.MEMBER)

    @property
    def is_manager_role(self):
        return self.role in [self.Role.OWNER, self.Role.ADMIN, self.Role.MANAGER] or (self.is_superuser and self.role != self.Role.MEMBER)

    @property
    def is_member_role(self):
        return self.role == self.Role.MEMBER

    @property
    def is_oauth_user(self):
        if self.google_access_token or self.google_refresh_token:
            return True
        username_lower = (self.username or '').lower()
        email_lower = (self.email or '').lower()
        if username_lower.startswith('google_') or username_lower.startswith('github_'):
            return True
        if '@users.noreply.github.com' in email_lower:
            return True
        if not self.has_usable_password():
            return True
        return False


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


class DepartmentChangeRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='department_requests')
    requested_department = models.CharField(max_length=100)
    reason = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_department_requests')
    review_notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Request by {self.user.username} for {self.requested_department} ({self.status})"

