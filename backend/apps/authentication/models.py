from django.contrib.auth.models import AbstractUser
from django.db import models

class Organization(models.Model):
    name = models.CharField(max_length=150, default='SmartMeeting Workspace')
    owner = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='owned_organizations'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} (Owner: {self.owner.username if self.owner else 'None'})"


class User(AbstractUser):
    class Role(models.TextChoices):
        OWNER = 'OWNER', 'Owner'
        ADMIN = 'ADMIN', 'Admin'
        MANAGER = 'MANAGER', 'Manager'
        MEMBER = 'MEMBER', 'Member'
        UNASSIGNED = 'UNASSIGNED', 'Unassigned'

    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.UNASSIGNED
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
        else:
            self.is_staff = False
            self.is_superuser = False
        super().save(*args, **kwargs)

    @property
    def organization_name(self):
        if self.role == self.Role.UNASSIGNED:
            return ''

        try:
            from django.db import connection
            tables = connection.introspection.table_names()
            if 'authentication_organization' in tables:
                org = Organization.objects.filter(owner=self).first()
                if org and org.name:
                    return org.name

                if 'authentication_organizationmembership' in tables:
                    from .models import OrganizationMembership
                    mem = OrganizationMembership.objects.filter(user=self, is_active=True).first()
                    if mem and mem.organization and mem.organization.name:
                        return mem.organization.name

                if 'authentication_organizationjoinrequest' in tables:
                    from .models import OrganizationJoinRequest
                    approved_req = OrganizationJoinRequest.objects.filter(
                        user=self, status=OrganizationJoinRequest.Status.APPROVED
                    ).order_by('-updated_at').first()
                    if approved_req and approved_req.organization_name:
                        return approved_req.organization_name

                if Organization.objects.count() == 1:
                    first_org = Organization.objects.first()
                    if first_org and first_org.name:
                        return first_org.name
        except Exception:
            pass

        return 'SmartMeeting Workspace'

    @property
    def has_organization(self):
        if self.role != self.Role.UNASSIGNED:
            return True
        try:
            from django.db import connection
            tables = connection.introspection.table_names()
            if 'authentication_organizationmembership' in tables:
                if self.organization_memberships.filter(is_active=True).exists():
                    return True
            if 'authentication_organization' in tables:
                if self.owned_organizations.exists():
                    return True
        except Exception:
            pass
        return False

    @property
    def is_owner_role(self):
        if self.role == self.Role.OWNER:
            return True
        if self.is_superuser and self.role not in [self.Role.ADMIN, self.Role.MANAGER, self.Role.MEMBER, self.Role.UNASSIGNED]:
            return True
        return False

    @property
    def is_admin_role(self):
        if self.role in [self.Role.OWNER, self.Role.ADMIN]:
            return True
        if self.is_superuser and self.role not in [self.Role.MANAGER, self.Role.MEMBER, self.Role.UNASSIGNED]:
            return True
        return False

    @property
    def is_manager_role(self):
        if self.role in [self.Role.OWNER, self.Role.ADMIN, self.Role.MANAGER]:
            return True
        if self.is_superuser and self.role not in [self.Role.MEMBER, self.Role.UNASSIGNED]:
            return True
        return False

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


class OrganizationMembership(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='organization_memberships'
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    role = models.CharField(
        max_length=20,
        choices=User.Role.choices,
        default=User.Role.MEMBER
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} in {self.organization.name} ({self.role})"


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
    previous_department = models.CharField(max_length=100, blank=True, default='')
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


class OrganizationJoinRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organization_join_requests')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='join_requests', null=True, blank=True)
    organization_name = models.CharField(max_length=150, default='SmartMeeting Workspace')
    requested_department = models.CharField(max_length=100, default='General Team')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_join_requests')
    review_notes = models.TextField(blank=True, default='')
    is_acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        org_title = self.organization.name if self.organization else self.organization_name
        return f"Join Request by {self.user.username} for {org_title} ({self.status})"
