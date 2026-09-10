# Implementation Plan - Complete Role-Based Access Control (RBAC) System

Implement a comprehensive, enterprise-grade Role-Based Access Control (RBAC) system for the **Smart Meeting & Decision Tracker** across backend models, DRF API endpoints, object-level permissions, management commands, frontend routing, and UI views.

---

## Role Hierarchy & Definitions

```
OWNER (Primary Organization Owner)
  ├── ADMIN (System Administrator)
  ├── MANAGER (Team / Meeting Lead)
  └── MEMBER (Regular Member / Participant)
```

| Role | Target Permissions | Key Restrictions |
| :--- | :--- | :--- |
| **OWNER** | Full company/org control, user role management (assign ADMIN/MANAGER/MEMBER), delete users, view all meetings/actions/analytics | Single OWNER per organization. Cannot demote self unless ownership transferred. Cannot be modified or deleted by ADMIN. |
| **ADMIN** | Manage allowed users (MANAGER, MEMBER), create/manage all meetings, view all meetings & action items, manage teams, assign action items | Cannot delete/modify OWNER, cannot change OWNER role, cannot promote self or others to OWNER, cannot delete company. |
| **MANAGER** | Create & manage team meetings, assign action items to team members, view team meetings & action items, view team analytics | Cannot manage org settings, cannot create ADMIN/OWNER users, cannot modify ADMIN/OWNER accounts, cannot manage outside scope. |
| **MEMBER** | View participating/team meetings, add discussions, create decisions, view assigned action items, update **own** action item status | Cannot manage users, cannot change roles, cannot view all org meetings/actions, cannot edit other users' action items or sensitive fields (due date, assignee). |

---

## User Review Required

> [!IMPORTANT]
> - **Public Registration Protection:** Public signup will strictly default to `MEMBER`. Even if a user posts `{"role": "ADMIN"}` in public registration, the backend will reject/strip it and force `role = MEMBER`.
> - **Initial OWNER Creation:** Created via Django Management Command (`python manage.py create_owner --username=... --email=... --password=...`) or Django superuser bootstrap. No public endpoint can create an `OWNER`.
> - **Database Migration:** The `role` field on `User` model will be updated safely from `max_length=10` to `max_length=20` with choices `OWNER`, `ADMIN`, `MANAGER`, `MEMBER`. Existing users with role `MEMBER` or `ADMIN` will remain untouched.

---

## Proposed Changes

### 1. Backend Database & User Model (`backend/apps/authentication`)

#### [MODIFY] [models.py](file:///d:/SMDT/backend/apps/authentication/models.py)
- Extend `User.Role` text choices: `OWNER = 'OWNER'`, `ADMIN = 'ADMIN'`, `MANAGER = 'MANAGER'`, `MEMBER = 'MEMBER'`.
- Set `max_length=20`, default `Role.MEMBER`.
- Add helper properties:
  - `is_owner_role`: Returns `True` if `role == OWNER` or `is_superuser`.
  - `is_admin_role`: Returns `True` if `role in [OWNER, ADMIN]` or `is_superuser`.
  - `is_manager_role`: Returns `True` if `role in [OWNER, ADMIN, MANAGER]` or `is_superuser`.

#### [NEW] Migration `0003_alter_user_role.py`
- Django migration to update `role` field `max_length` and choices without data loss.

#### [NEW] [create_owner.py](file:///d:/SMDT/backend/apps/authentication/management/commands/create_owner.py)
- Django management command to safely bootstrap or create an `OWNER` account.

---

### 2. Backend Permissions & API Enforcements (`backend/apps/authentication/permissions.py`)

#### [MODIFY] [permissions.py](file:///d:/SMDT/backend/apps/authentication/permissions.py)
Create reusable granular DRF permission classes:
- `IsOwnerUserRole`
- `IsAdminUserRole`
- `IsManagerUserRole`
- `IsMemberUserRole`
- `CanManageUsersPermission`: Checks hierarchy (OWNER can manage all non-owners; ADMIN can manage MANAGER/MEMBER; MANAGER/MEMBER forbidden).
- `CanManageMeetingPermission`: Checks meeting creation/editing authorization.
- `CanUpdateActionItemPermission`: Enforces that `MEMBER` can ONLY update status on their assigned action items, while blocking edits to `assigned_to`, `due_date`, or other users' items.

#### [MODIFY] [serializers.py](file:///d:/SMDT/backend/apps/authentication/serializers.py)
- `RegisterSerializer`: Hardcode `role = User.Role.MEMBER` during public registration creation so public users cannot supply `role: "ADMIN"`.
- `UserSerializer`: Prevent non-OWNER users from assigning the `OWNER` role.

#### [MODIFY] [views.py](file:///d:/SMDT/backend/apps/authentication/views.py)
- `UserViewSet`: Enforce hierarchy in `get_permissions()`, `perform_create()`, `perform_update()`, `perform_destroy()`.
  - Block ADMIN from deleting or modifying OWNER.
  - Block demoting the last OWNER.

---

### 3. Meetings, Actions & Analytics Permissions (`backend/apps`)

#### [MODIFY] [apps/meetings/views.py](file:///d:/SMDT/backend/apps/meetings/views.py)
- `MeetingViewSet.get_queryset()`:
  - `OWNER` & `ADMIN`: Return all org meetings.
  - `MANAGER`: Return meetings created by manager, team meetings where manager is a member, or participant meetings.
  - `MEMBER`: Return meetings where participant, creator, or team member.
- `perform_update()` & `perform_destroy()`: Enforce that `MEMBER` cannot edit/delete meetings created by others; `MANAGER` can edit team meetings.

#### [MODIFY] [apps/actions/views.py](file:///d:/SMDT/backend/apps/actions/views.py)
- `ActionItemViewSet`:
  - `get_queryset()`: Scope querysets based on role.
  - `perform_update()`: Object-level authorization check. If user is `MEMBER`:
    - Ensure `request.user == action_item.assigned_to`.
    - Restrict editable fields strictly to `status`. If `MEMBER` attempts to alter `assigned_to`, `due_date`, `priority`, or `decision`, raise `PermissionDenied (403)`.

#### [MODIFY] [apps/analytics/views.py](file:///d:/SMDT/backend/apps/analytics/views.py)
- `DashboardAnalyticsView`:
  - Scope analytics calculations strictly by user role (`OWNER`/`ADMIN` -> org-wide; `MANAGER` -> team-wide; `MEMBER` -> assigned/participating only).

---

### 4. Frontend Role Integration & UI Hardening (`frontend/src`)

#### [MODIFY] [AuthContext.jsx](file:///d:/SMDT/frontend/src/context/AuthContext.jsx)
- Expose role check helpers: `isOwner`, `isAdmin`, `isManager`, `isMember`, `hasRole(roleArray)`.

#### [MODIFY] [Navbar.jsx](file:///d:/SMDT/frontend/src/components/Navbar.jsx)
- Update navigation menu:
  - **Admin Management:** Visible only to `OWNER` and `ADMIN`.

#### [MODIFY] [Admin.jsx](file:///d:/SMDT/frontend/src/pages/Admin.jsx)
- User Management UI:
  - Protect page from `MANAGER` and `MEMBER` roles (redirect to dashboard with error alert).
  - Hide/disable `OWNER` creation option for `ADMIN` users (only allow `MANAGER` and `MEMBER` role assignment).
  - Add visual shield/lock badge on `OWNER` accounts preventing `ADMIN` from editing/deleting them.

#### [MODIFY] [MyActions.jsx](file:///d:/SMDT/frontend/src/pages/MyActions.jsx)
- Restrict status updates according to permissions.

---

## Verification Plan

### Automated Tests
1. **RBAC Unit & API Tests (`backend/tests/test_rbac.py`)**:
   - `test_public_registration_defaults_to_member`: Verify `POST /api/auth/register/` with `role: "ADMIN"` creates `MEMBER`.
   - `test_owner_creation_command`: Verify `python manage.py create_owner` creates an `OWNER`.
   - `test_admin_cannot_modify_or_delete_owner`: Verify `ADMIN` gets `403 Forbidden` attempting to delete or edit `OWNER`.
   - `test_member_cannot_manage_users`: Verify `MEMBER` gets `403 Forbidden` on `/api/auth/users/`.
   - `test_member_cannot_modify_others_action_items`: Verify `MEMBER` gets `403 Forbidden` when attempting to edit due date or another member's action item.
   - `test_manager_meeting_permissions`: Verify `MANAGER` can manage team meetings but not org settings.

### Manual Verification
1. Run Django migrations: `python manage.py migrate`.
2. Create initial owner using command: `python manage.py create_owner --username=owner1 --email=owner@company.com --password=Password123`.
3. Register a public user on frontend -> verify assigned role is `MEMBER`.
4. Log in as `OWNER` -> verify full access to User Management, role promotion to `ADMIN`, `MANAGER`, `MEMBER`.
5. Log in as `ADMIN` -> verify User Management allows creating `MANAGER`/`MEMBER`, but `OWNER` row is protected and cannot assign `OWNER` role.
6. Log in as `MEMBER` -> verify Admin page returns access denied, user can only update status of their own action items.
