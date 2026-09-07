# Smart Meeting Decision Tracker — Comprehensive Code & File Knowledge Guide

> **Welcome!** This document is prepared specifically to help you understand, explain, and answer questions about every single file and code snippet in the Smart Meeting Decision Tracker (SMDT) project during company code reviews, technical evaluations, and pair-programming sessions.

---

## Table of Contents
1. [Overall Application Architecture](#1-overall-application-architecture)
2. [Data Flow: Step-by-Step Request Lifecycle](#2-data-flow-step-by-step-request-lifecycle)
3. [Backend Codebase Breakdown (Python & Django DRF)](#3-backend-codebase-breakdown)
   - `manage.py` & Configuration (`settings.py`, `urls.py`)
   - `authentication/` App (User, Roles, JWT)
   - `teams/` App
   - `meetings/` App
   - `discussions/` App
   - `decisions/` App (Version History Audit Snapshot)
   - `actions/` App (Action Dependencies & Overdue Rules)
   - `analytics/` App (Dashboard Metrics API)
   - `tests/` Suite
4. [Frontend Codebase Breakdown (Next.js 14 App Router & TypeScript)](#4-frontend-codebase-breakdown)
   - Types & Axios Services (`types/index.ts`, `services/api.ts`)
   - React Context (`AuthContext.tsx`)
   - Components (`Navbar`, `StatusBadge`, Modals, Skeletons)
   - App Router Pages (`login`, `register`, `dashboard`, `meetings`, `my-actions`, `admin`)
5. [Key Business Rules & How Code Enforces Them](#5-key-business-rules--how-code-enforces-them)
6. [Common Technical Review Questions & Answers](#6-common-technical-review-questions--answers)

---

## 1. Overall Application Architecture

SMDT follows a decoupled full-stack client-server architecture:

```
+------------------------------------+        REST API / JSON        +------------------------------------+
|  Next.js 14 App Router (Frontend)  |  <=========================>  |    Django REST Framework Backend   |
|  - React 18 & TypeScript           |      JWT Authorization        |  - Python 3.10                     |
|  - Ant Design & Tailwind CSS       |      Header: Bearer <Token>   |  - SimpleJWT & Permissions         |
|  - Axios API Client Services       |                               |  - ORM Models & DRF Serializers    |
+------------------------------------+                               +------------------------------------+
                                                                                       |
                                                                                       v
                                                                             +-------------------+
                                                                             | PostgreSQL/SQLite |
                                                                             +-------------------+
```

---

## 2. Data Flow: Step-by-Step Request Lifecycle

When a user performs an action (e.g. updating an action item status to `COMPLETED`):

1. **User Action**: The user clicks status dropdown in `frontend/src/app/my-actions/page.tsx`.
2. **Frontend Service**: `actionService.updateActionStatus(id, 'COMPLETED')` in `services/api.ts` makes a `PATCH` request to `/api/actions/{id}/` with the JWT token in `Authorization: Bearer <token>`.
3. **Backend Middleware**: Django checks CORS headers, parses JWT token in `settings.py`, and attaches the authenticated `request.user`.
4. **URL Router**: `smart_meeting_tracker/urls.py` routes the request to `apps/actions/urls.py` ➔ `ActionItemViewSet`.
5. **Viewset & Serializer Validation**:
   - `ActionItemSerializer.validate()` runs on the backend.
   - It retrieves all prerequisite actions in `dependencies.all()`.
   - **Rule 2 Check**: If any dependency status != `COMPLETED`, serializer raises `ValidationError("Cannot mark as Completed. Outstanding incomplete dependencies...")`.
   - Backend returns `HTTP 400 Bad Request` with exact error payload.
6. **Frontend Error Feedback**: Axios catches the 400 response and triggers an Ant Design Error Message notification displaying the exact lock error.

---

## 3. Backend Codebase Breakdown

### A. Core Project Configuration (`backend/smart_meeting_tracker/`)

#### 1. `settings.py`
- **Purpose**: Central configuration for Django, database, installed apps, REST Framework, SimpleJWT, and CORS.
- **Key Concepts**:
  - `AUTH_USER_MODEL = 'authentication.User'`: Tells Django to use our custom User model instead of the default user.
  - `REST_FRAMEWORK`: Configures SimpleJWT as default authentication class, requires authentication by default, sets pagination page size to 10.
  - `SIMPLE_JWT`: Access token lifetime set to 1 day; refresh token set to 7 days.
  - `DATABASES`: Dynamically selects PostgreSQL if `DB_ENGINE=postgresql` in `.env`, or defaults to zero-config `db.sqlite3` for local development.

#### 2. `urls.py`
- **Purpose**: Main routing hub that maps API prefixes (`/api/auth/`, `/api/meetings/`, `/api/actions/`, etc.) to app-specific URL routers.

---

### B. App 1: Authentication (`backend/apps/authentication/`)

#### `models.py` (`User`)
- Inherits from Django's `AbstractUser`.
- Adds custom `role` choices: `ADMIN` or `MEMBER`.
- Adds `department` field.
- Property `is_admin_role`: returns `True` if `role == 'ADMIN'` or `is_superuser`.

#### `serializers.py` (`UserSerializer`, `RegisterSerializer`)
- `RegisterSerializer`: Validates password confirmation matching, hashes password securely using `User.objects.create_user()`, and extracts custom fields.
- `UserSerializer`: Exposes full name dynamically via `get_full_name()`.

#### `permissions.py` (`IsAdminUserRole`, `IsAdminOrReadOnly`)
- Custom DRF permissions.
- `IsAdminUserRole`: Restricts endpoint access strictly to users with `ADMIN` role.
- `IsAdminOrReadOnly`: Allows read operations (`GET`) to all logged-in members, but restricts write operations (`POST`, `PUT`, `DELETE`) to Admins.

#### `views.py` (`RegisterView`, `UserProfileView`, `UserViewSet`)
- `RegisterView`: Generates JWT tokens immediately upon registration response so the user is auto-logged in.
- `UserProfileView`: Returns `/api/auth/profile/` for the requesting user.
- `UserViewSet`: Full CRUD for users with search & filter capabilities; write methods restricted to Admins.

---

### C. App 2: Teams (`backend/apps/teams/`)

#### `models.py` (`Team`)
- Fields: `name`, `description`, `created_by` (FK User), `members` (M2M User).
- Used to group participants into teams for meeting assignments.

#### `serializers.py` (`TeamSerializer`)
- Accepts `member_ids` list on write, automatically attaches `created_by = request.user`, and returns nested user details (`created_by_detail`, `members_detail`) on read.

---

### D. App 3: Meetings (`backend/apps/meetings/`)

#### `models.py` (`Meeting`)
- Fields: `title`, `description`, `meeting_date` (DateField), `start_time` (TimeField), `end_time` (TimeField), `location`, `meeting_type` (Enum), `status` (Enum), `created_by` (FK User), `participants` (M2M User), `team` (FK Team).
- `MeetingType` choices: `INTERNAL`, `CLIENT`, `PROJECT`, `REVIEW`, `PLANNING`, `OTHER`.
- `Status` choices: `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.

#### `serializers.py` (`MeetingSerializer`)
- Validates that `start_time < end_time`.
- Auto-adds creator as a participant if no participants are explicitly selected.

#### `views.py` (`MeetingViewSet`)
- Uses `django-filter` (`MeetingFilter`) allowing query filtering by:
  - `meeting_type`
  - `status`
  - `start_date` & `end_date` (date range)
  - `search` (title, description, location)
- Implements role-based querysets: Admins see all meetings; Members see meetings they created or participate in.

---

### E. App 4: Discussions (`backend/apps/discussions/`)

#### `models.py` (`Discussion`)
- Represents individual discussion points raised during a meeting.
- Fields: `meeting` (FK Meeting), `title`, `description`, `priority` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), `created_by` (FK User).

#### `serializers.py` (`DiscussionSerializer`)
- Embeds nested `decision` object if a decision has been recorded for this discussion point.

---

### F. App 5: Decisions & History (`backend/apps/decisions/`)

#### `models.py` (`Decision`, `DecisionHistory`)
- `Decision`:
  - Linked OneToOne with `Discussion`.
  - Statuses: `NO_DECISION`, `DECISION_MADE`, `DEFERRED`, `REJECTED`.
  - Fields: `decision` (text), `reason` (text), `decided_by` (FK User), `version` (auto-incrementing int).
- `DecisionHistory`:
  - Audit trail table preserving snapshots of past decision versions (Rule 3).
  - Fields: `decision` (FK Decision), `version` (int), `status`, `decision_text`, `reason`, `changed_by`, `changed_at`.

#### `views.py` (`DecisionViewSet`) — *Crucial Business Logic!*
- `perform_create()`: Saves new Decision with `version = 1`, and creates a corresponding `DecisionHistory` snapshot for version 1.
- `perform_update()`: Increments `version` by 1 (`instance.version + 1`), saves updated Decision, and creates a **NEW** `DecisionHistory` snapshot! Old version records remain untouched!
- `history` custom action: GET `/api/decisions/{id}/history/` returns all past version records sorted by version.

---

### G. App 6: Actions & Dependencies (`backend/apps/actions/`)

#### `models.py` (`ActionItem`)
- Fields: `decision` (FK Decision), `title`, `description`, `assigned_to` (FK User), `priority` (Enum), `due_date` (DateField), `status` (`TODO`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`, `CANCELLED`), `dependencies` (Self M2M `ActionItem`, `symmetrical=False`), `created_by`.
- **Property `is_overdue` (Rule 1)**: Returns `True` if `due_date < today` AND `status` is not `COMPLETED` or `CANCELLED`.

#### `serializers.py` (`ActionItemSerializer`) — *Mandatory Rule 2 Enforcement!*
- Custom `validate()` method:
  ```python
  if target_status == ActionItem.Status.COMPLETED:
      incomplete_deps = [dep for dep in proposed_deps if dep.status != ActionItem.Status.COMPLETED]
      if incomplete_deps:
          raise serializers.ValidationError({
              "status": f"Cannot mark as Completed. Outstanding incomplete dependencies: {titles}."
          })
  ```
  Prevents completing any action whose prerequisite actions are still pending.

#### `views.py` (`ActionItemViewSet`)
- Filterset `ActionItemFilter` supports filtering by `overdue=true`, `assigned_to`, `status`, `priority`, `decision`.
- `@action my_actions`: Dedicated endpoint `/api/actions/my_actions/` filtering actions assigned to the logged-in user.

---

### H. App 7: Analytics (`backend/apps/analytics/`)

#### `views.py` (`DashboardAnalyticsView`)
- Computes aggregated metrics for dashboard:
  - `total_meetings`, `upcoming_meetings`
  - `open_actions`, `completed_actions`, `overdue_actions`, `critical_actions`
  - `status_distribution` & `priority_distribution` dictionary counts
  - `meeting_activity` date timeline
  - `overdue_list` top 5 overdue items for immediate attention

---

### I. Automated Tests (`backend/tests/`)

- `test_auth.py`: Verifies user registration, JWT login, and profile access protection.
- `test_meetings.py`: Verifies meeting creation and query filter by meeting type.
- `test_decisions.py`: Verifies version history snapshot creation on decision updates (Rule 3).
- `test_actions.py`: Verifies Rule 1 (overdue flag calculation) and Rule 2 (blocking action completion when dependencies are incomplete).

---

## 4. Frontend Codebase Breakdown

### A. Core Setup (`types/index.ts`, `services/api.ts`, `AuthContext.tsx`)

#### `types/index.ts`
- Defines TypeScript interfaces matching Django API responses (`User`, `Team`, `Meeting`, `Discussion`, `Decision`, `DecisionHistory`, `ActionItem`, `DashboardData`). Ensures type safety across all React components.

#### `services/api.ts`
- Creates Axios instance pointing to `process.env.NEXT_PUBLIC_API_URL`.
- Injects `Authorization: Bearer <access_token>` from `localStorage` into every HTTP request.
- Exports modular API service objects (`authService`, `userService`, `meetingService`, `discussionService`, `decisionService`, `actionService`, `analyticsService`).

#### `AuthContext.tsx`
- React Context wrapping the app in `layout.tsx`.
- Provides `user` state, `loading` state, `login()`, `register()`, `logout()`, and `isAdmin` flag across all pages.

---

### B. Reusable Components (`frontend/src/components/`)

1. **`Navbar.tsx`**: Navigation bar with active tab highlighting, role tags (`ADMIN` / `MEMBER`), user dropdown, and responsive mobile drawer.
2. **`StatusBadge.tsx`**: Color-coded badges for meeting status, priority, action status, decision outcome, and red `OVERDUE` badges.
3. **`LoadingSkeleton.tsx`**: Ant Design skeleton loader for tables, cards, and detail pages.
4. **`EmptyState.tsx`**: Friendly zero-data placeholder component with action buttons.
5. **`DecisionHistoryModal.tsx`**: Ant Design Modal rendering an interactive version timeline showing full version audit history.
6. **`DiscussionModal.tsx`**: Form modal for adding discussion topics to a meeting.
7. **`DecisionModal.tsx`**: Form modal for recording or updating decisions.
8. **`ActionFormModal.tsx`**: Form modal for creating/editing action items with dependency multi-select.

---

### C. Pages (`frontend/src/app/`)

1. **`login/page.tsx` & `register/page.tsx`**: Responsive authentication forms.
2. **`dashboard/page.tsx`**: Metric statistic cards, completion rate progress bar, status/priority distribution bars, meeting activity chart, and urgent overdue alerts drawer.
3. **`meetings/page.tsx`**: Searchable meeting directory with type filters, status filters, date range pickers, pagination, and skeleton loading states.
4. **`meetings/new/page.tsx`**: Create meeting form with participant multi-select and date/time range pickers.
5. **`meetings/[id]/page.tsx`**: Complete meeting detail view displaying hierarchy: `Meeting Info` ➔ `Participants` ➔ `Discussions` ➔ `Decisions` ➔ `Action Items` with history modal triggers.
6. **`my-actions/page.tsx`**: Personal action item board with status tabs (`Todo`, `In Progress`, `Blocked`, `Completed`, `Overdue`), inline status changers, and dependency lock error notifications.
7. **`admin/page.tsx`**: Admin panel for viewing users, elevating roles, and creating teams.

---

## 5. Key Business Rules & How Code Enforces Them

| Business Rule | Backend Enforcement Location | Frontend Enforcement Location |
| :--- | :--- | :--- |
| **Rule 1 — Overdue Actions** | `ActionItem.is_overdue` model property (`due_date < today` & `status != COMPLETED`) | Highlighted with red tags, overdue dashboard counters, and red text on `my-actions/` page. |
| **Rule 2 — Action Dependencies** | `ActionItemSerializer.validate()` raises `ValidationError` if prerequisite actions are incomplete when status set to `COMPLETED`. | Dependency tags show locked icons (`🔒`) and notifications display clear lock error messages if backend rejects transition. |
| **Rule 3 — Decision History** | `DecisionViewSet.perform_update()` increments version and saves snapshot to `DecisionHistory`. | `DecisionHistoryModal.tsx` displays version timeline with diff text and timestamps. |
| **Rule 4 — Backend Permissions** | `IsAdminUserRole` & `IsAdminOrReadOnly` in `authentication/permissions.py`. | UI conditionally renders Admin navigation links and restricts forbidden actions. |

---

## 6. Common Technical Review Questions & Answers

### Q1: Why use DRF serializers instead of handling JSON manually?
> **Answer**: DRF serializers provide data validation, field deserialization, relational data nesting, and automatic error formatting out of the box. This keeps our views clean and ensures business rules (like action dependency checks) are validated before data hits the database.

### Q2: How does decision history snapshotting work without losing data?
> **Answer**: Instead of overwriting the existing decision record in-place, `DecisionViewSet.perform_update()` increments the `version` counter and creates a new row in the `DecisionHistory` table. This preserves all previous decision versions for complete audit compliance (Rule 3).

### Q3: How is the action dependency rule validated?
> **Answer**: Inside `ActionItemSerializer.validate()`, when a user updates an action item status to `COMPLETED`, we query all prerequisite actions linked via the `dependencies` Many-to-Many field. If any prerequisite action has a status other than `COMPLETED`, the serializer raises a `ValidationError` (400 Bad Request), preventing invalid state transitions.

### Q4: How is security handled on the frontend and backend?
> **Answer**: We use JWT (JSON Web Tokens) with `djangorestframework-simplejwt`. The frontend stores tokens in `localStorage` and injects them into the `Authorization: Bearer <token>` header using an Axios request interceptor. Backend DRF permission classes verify the token and enforce role-based access control (`ADMIN` vs `MEMBER`) on every API request.
