from rest_framework import permissions

class IsOwnerUserRole(permissions.BasePermission):
    """
    Allows access only to OWNER users or superusers.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_owner_role)


class IsAdminUserRole(permissions.BasePermission):
    """
    Allows access to OWNER or ADMIN users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin_role)


class IsManagerUserRole(permissions.BasePermission):
    """
    Allows access to OWNER, ADMIN, or MANAGER users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_manager_role)


class IsMemberUserRole(permissions.BasePermission):
    """
    Allows access to any authenticated user.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to allow admins/owners to edit or delete objects, but members to read.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return bool(request.user and request.user.is_authenticated and request.user.is_admin_role)


class CanManageUsersPermission(permissions.BasePermission):
    """
    Permission for user administration endpoints:
    - OWNER can manage all non-owners.
    - ADMIN can manage MANAGER & MEMBER roles.
    - MANAGER & MEMBER cannot manage users.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        # Only OWNER or ADMIN can create, update, delete users
        return request.user.is_admin_role

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True

        # Nobody can modify superusers unless superuser
        if obj.is_superuser and not request.user.is_superuser:
            return False

        # OWNER accounts protection
        if obj.role == 'OWNER' or getattr(obj, 'is_owner_role', False):
            # ADMIN cannot modify or delete OWNER
            if not request.user.is_owner_role:
                return False
            # OWNER cannot delete or demote themselves if they are the only OWNER
            if request.user.id == obj.id:
                if request.method == 'DELETE':
                    return False

        # ADMIN hierarchy check: ADMIN cannot modify other ADMINs or OWNERs
        if not request.user.is_owner_role and request.user.is_admin_role:
            if obj.role in ['OWNER', 'ADMIN']:
                return False

        return True
