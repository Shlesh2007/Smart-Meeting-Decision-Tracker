# Implementation Plan — Smart Meeting Decision Tracker (SMDT)

Building a full-stack **Smart Meeting Decision Tracker** using **Next.js 14+ (App Router)**, **React**, **TypeScript**, **Tailwind CSS**, **Ant Design**, **Django REST Framework (DRF)**, **SimpleJWT Authentication**, and **PostgreSQL / SQLite**.

This system handles the full meeting lifecycle:
```
Meeting ➔ Discussion ➔ Decision ➔ Action Items ➔ Assignment ➔ Progress ➔ Completion
```

---

## 1. Architectural Overview & Entity Schema

### Core Business Rules
1. **Rule 1 — Overdue Actions**: Actions with `due_date < current_date` AND `status != COMPLETED` are flagged overdue on backend and visually highlighted with overdue counters and warnings on frontend.
2. **Rule 2 — Action Dependencies**: Self-referential dependency relationship on Action Items (`Action A depends on Action B`). Backend prevents marking `Action A` as `COMPLETED` if `Action B` is not yet `COMPLETED`.
3. **Rule 3 — Decision History**: Updating a Decision creates an immutable snapshot in `DecisionHistory` with version numbering, keeping full audit logs of past decision states.
4. **Rule 4 — Role-Based Access Control (RBAC)**: Backend permissions restrict Admin vs Member capabilities. Admins can manage users/teams/all meetings/actions; Members can participate, create discussions, update assigned action items.

### Data Models & Relationships
```
[User] (Custom User Model with Role: ADMIN / MEMBER)
  │
  ├── [Team] (M2M Users as Members, Created By User)
  │
  ├── [Meeting] ──(M2M)──> [User] (Participants)
  │     │
  │     └── [Discussion] (FK Meeting, Priority: LOW/MEDIUM/HIGH/CRITICAL)
  │           │
  │           └── [Decision] (OneToOne Discussion, Status: NO_DECISION/DECISION_MADE/DEFERRED/REJECTED)
  │                 │
  │                 ├── [DecisionHistory] (FK Decision, Version #, Text, Reason, Changed By)
  │                 │
  │                 └── [ActionItem] (FK Decision, Assigned To User, Priority, Due Date, Status)
  │                       │
  │                       └── [ActionDependency] (Self-referential M2M ActionItem)
```

---

## 2. Technical Stack & File Structure

```
smart-meeting-tracker/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── smart_meeting_tracker/
│   │   ├── __init__.py
│   │   ├── settings.py           # Database, SimpleJWT, CORS, Installed Apps
│   │   ├── urls.py               # API Router routing
│   │   └── wsgi.py / asgi.py
│   ├── apps/
│   │   ├── authentication/       # User models, Registration, JWT Login, Profile views
│   │   ├── teams/                # Team model, serializers, views
│   │   ├── meetings/             # Meeting model, filters, serializers, views
│   │   ├── discussions/          # Discussion model, priority validation, views
│   │   ├── decisions/            # Decision & DecisionHistory models, versioning signals
│   │   ├── actions/              # ActionItem & ActionDependency models, dependency rule validation
│   │   └── analytics/            # Dashboard stats and charts API
│   └── tests/
│       ├── test_auth.py
│       ├── test_meetings.py
│       ├── test_decisions.py
│       └── test_actions.py       # Overdue calculation & dependency validation tests
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── next.config.mjs
│   ├── .env.example
│   └── src/
│       ├── app/
│       │   ├── layout.tsx        # Antd Registry + Auth Provider + TanStack Query / Context
│       │   ├── page.tsx          # Landing / Redirect
│       │   ├── login/page.tsx
│       │   ├── register/page.tsx
│       │   ├── dashboard/page.tsx
│       │   ├── meetings/
│       │   │   ├── page.tsx      # Meeting List (Search, Filter, Pagination, Skeletons)
│       │   │   ├── new/page.tsx  # Create Meeting
│       │   │   └── [id]/page.tsx # Meeting Detail (Discussions, Decisions, Actions, History)
│       │   ├── my-actions/
│       │   │   └── page.tsx      # Personal Action Board (Status updates, Dependency locks)
│       │   └── admin/
│       │       └── page.tsx      # User & Team Management
│       ├── components/           # Reusable UI components (Navbar, StatCards, StatusBadges, Modals)
│       ├── services/             # Axios API client & endpoints
│       ├── context/              # AuthContext & Theme/Notification Context
│       ├── types/                # TypeScript Interfaces for all API payloads
│       └── utils/                # Date helpers, error formatters
├── README.md                     # Comprehensive setup, run commands, ER diagram, rules
└── CODE_EXPLANATION_GUIDE.md     # Line-by-line guide explaining every file for team/interview review
```

---

## 3. User Review Required

> [!IMPORTANT]
> - SQLite is configured as the default zero-config database out of the box so you can run the project immediately without external Postgres dependencies, while `settings.py` includes standard environment-variable based PostgreSQL database settings for deployment.
> - Detailed explanations of each file and architecture are included in `CODE_EXPLANATION_GUIDE.md` so you can comfortably explain the whole system in detail during technical reviews.

---

## 4. Proposed Implementation Steps

### Phase 1: Backend Foundation & REST APIs
1. Configured Django project with DRF, SimpleJWT, CORS headers, and app architecture.
2. Custom User & Team Models with roles (`ADMIN`, `MEMBER`).
3. Meeting app with full CRUD, status management, filters (`django-filter`), and search.
4. Discussion & Decision app with automatic `DecisionHistory` versioning logic upon decision updates.
5. Action Item app with self-referential dependencies and strict backend validation preventing completion of dependent actions.
6. Analytics API returning aggregated dashboard metrics (total meetings, overdue actions, priority distribution, activity timeline).
7. Comprehensive backend test suite (7+ tests covering Auth, Meetings, Actions, Overdue check, Dependency locks, Version history, Permissions).

### Phase 2: Next.js Frontend Application
1. Next.js 14+ setup with Ant Design (`antd`), Tailwind CSS, Axios API client, and Auth Context.
2. Responsive Auth pages (Login & Registration) storing JWT tokens securely.
3. Interactive Dashboard with Ant Design Statistic cards, Recharts visual graphs, and quick overdue action lists.
4. Meeting List Page featuring server-side/API-driven search, status/type filters, date pickers, pagination, and skeleton loading states.
5. Rich Meeting Detail Page:
   - Meeting Header & Participant details.
   - Discussion creation & display.
   - Decision creation/editing with Version History modal.
   - Action item creation & inline status updates with dependency enforcement modal.
6. "My Actions" Page featuring status tabs (Todo, In Progress, Blocked, Completed, Overdue) and status change controls.
7. Admin Portal for user management & role elevation.
8. Frontend automated tests using Vitest / React Testing Library.

### Phase 3: Documentation & Educational Guide
1. Detailed `README.md` containing Setup Guide, Tech Stack, ER Diagram, Business Logic, and API Reference.
2. `.env.example` files for both frontend and backend.
3. `CODE_EXPLANATION_GUIDE.md` explaining the purpose, key functions, and logic of every single file in the project.

---

## 5. Verification Plan

### Automated Tests
- **Backend Tests**: Run `python manage.py test` to verify:
  1. User authentication & JWT generation.
  2. Meeting creation and access control permissions.
  3. Action creation and overdue flag logic.
  4. Dependency check validation (blocking completion if dependencies are incomplete).
  5. Decision history record creation on decision updates.
- **Frontend Tests**: Run `npm test` to verify component rendering and state updates.

### Manual Verification
- Test meeting flow: Create Meeting ➔ Add Discussion ➔ Make Decision ➔ Create Action Item with Dependency ➔ Attempt to complete dependent action (verify backend error) ➔ Complete primary action ➔ Complete dependent action (verify success).
- Test decision version history: Update decision text multiple times and view version timeline in modal.
- Test responsive layout across mobile, tablet, and desktop views.
