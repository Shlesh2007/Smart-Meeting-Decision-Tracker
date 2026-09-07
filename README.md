# Smart Meeting Decision Tracker (SMDT)

A full-stack enterprise application designed to manage the end-to-end lifecycle of organizational meetings: **Meeting ➔ Discussion ➔ Decision ➔ Action Items ➔ Assignment ➔ Progress ➔ Completion**.

---

## 1. Project Overview
The Smart Meeting Decision Tracker (SMDT) empowers teams to conduct productive meetings, capture key discussion points, record definitive decisions, and enforce follow-up action accountability through dependency validation and version-audited decision tracking.

---

## 2. Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **UI Library**: Ant Design (`antd`)
- **Styling**: Tailwind CSS & CSS Modules
- **Language**: TypeScript
- **HTTP Client**: Axios (with JWT Interceptors)
- **Icons & Charts**: `@ant-design/icons`, `lucide-react`, `recharts`
- **Testing**: Vitest & React Testing Library

### Backend
- **Language**: Python 3.10+
- **Framework**: Django 4.2+
- **API Framework**: Django REST Framework (DRF)
- **Authentication**: JWT (`djangorestframework-simplejwt`)
- **Filtering**: `django-filter`, `rest_framework.filters`
- **CORS**: `django-cors-headers`

### Database
- **Primary / Production**: PostgreSQL
- **Zero-Config Local Dev**: SQLite (supported out of the box, switchable via environment variables)

---

## 3. Project Structure

```
smart-meeting-tracker/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── smart_meeting_tracker/    # Core Django Settings & Routing
│   ├── apps/
│   │   ├── authentication/       # User Custom Model & Role JWT Auth
│   │   ├── teams/                # Team Management
│   │   ├── meetings/             # Meeting CRUD, Filters & Search
│   │   ├── discussions/          # Discussion Topics & Priority
│   │   ├── decisions/            # Decisions & Version Audit Snapshots
│   │   ├── actions/              # Action Items & Dependency Validation
│   │   └── analytics/            # Dashboard Analytics & Charts API
│   └── tests/                    # Backend Automated Tests Suite
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── next.config.mjs
│   ├── .env.example
│   └── src/
│       ├── app/                  # Next.js App Router Pages
│       ├── components/           # Reusable Ant Design UI Components
│       ├── services/             # Axios API Client Modules
│       ├── context/              # Authentication React Context
│       └── types/                # TypeScript Interfaces
├── README.md                     # Comprehensive Setup & Architecture Guide
├── CODE_EXPLANATION_GUIDE.md     # File-by-File Educational Breakdown for Reviews
└── .gitignore
```

---

## 4. Installation & Setup

### Prerequisites
- Node.js v18+ and npm
- Python 3.10+
- PostgreSQL (Optional; defaults to SQLite if Postgres credentials are not set)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment variables file:
   ```bash
   cp .env.example .env
   ```
5. Apply database migrations:
   ```bash
   python manage.py migrate
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

---

## 5. Running the Application

1. **Start Backend API Server**:
   ```bash
   cd backend
   python manage.py runserver 8080
   ```
   *API will run at `http://localhost:8080/api/`*

2. **Start Frontend Next.js Server**:
   ```bash
   cd frontend
   npm run dev
   ```
   *Frontend will run at `http://localhost:3000`*

---

## 6. API Endpoint Documentation

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register/` | Register new user account | No |
| `POST` | `/api/auth/token/` | Login & obtain JWT Access/Refresh tokens | No |
| `GET` | `/api/auth/profile/` | Fetch current authenticated profile | Yes |
| `GET/POST` | `/api/meetings/` | List/Create Meetings (supports `?search=`, `?status=`, `?meeting_type=`, `?start_date=`) | Yes |
| `GET/PUT` | `/api/meetings/{id}/` | Get meeting detail with discussions & decisions | Yes |
| `GET/POST` | `/api/discussions/` | List/Create discussion points for a meeting | Yes |
| `POST` | `/api/decisions/` | Record decision for a discussion (Creates Version 1) | Yes |
| `PUT` | `/api/decisions/{id}/` | Update decision (Creates new `DecisionHistory` version snapshot) | Yes |
| `GET` | `/api/decisions/{id}/history/` | View decision version audit history | Yes |
| `GET/POST` | `/api/actions/` | List/Create action items | Yes |
| `GET` | `/api/actions/my_actions/` | Fetch logged-in user's assigned actions | Yes |
| `PATCH` | `/api/actions/{id}/` | Update action status (Enforces dependency locks) | Yes |
| `GET` | `/api/analytics/dashboard/` | Fetch dashboard stats, metrics, and chart data | Yes |

---

## 7. Database Design & Entity Relationship

```
+----------------+       +-------------------+       +-------------------+
|      User      |       |      Meeting      |       |    Discussion     |
+----------------+       +-------------------+       +-------------------+
| id (PK)        |1     *| id (PK)           |1     *| id (PK)           |
| username       |-------| title             |-------| meeting_id (FK)   |
| email          |       | meeting_date      |       | title             |
| role           |       | start_time        |       | priority          |
| department     |       | status            |       | created_by_id(FK) |
+----------------+       +-------------------+       +-------------------+
                                                       |1
                                                       |1 (One-to-One)
                                                     +-------------------+
                                                     |     Decision      |
                                                     +-------------------+
                                                     | id (PK)           |
                                                     | status            |
                                                     | decision (Text)   |
                                                     | version (Int)     |
                                                     +-------------------+
                                                       |1              |1
                                                       |*              |*
                                     +-------------------+   +-------------------+
                                     |  DecisionHistory  |   |    ActionItem     |
                                     +-------------------+   +-------------------+
                                     | version           |   | id (PK)           |
                                     | decision_text     |   | title             |
                                     | changed_by_id(FK) |   | assigned_to_id(FK)|
                                     +-------------------+   | due_date          |
                                                             | status            |
                                                             +-------------------+
                                                               |*             ^
                                                               | (Self-M2M)   |
                                                               +--------------+
```

---

## 8. Important Business Rules

1. **Rule 1 — Overdue Actions**:
   - Calculated as: `due_date < current_date` AND `status != COMPLETED` (and not cancelled).
   - Displayed with red warning badges in tables, alert drawer on dashboard, and overdue counters.

2. **Rule 2 — Action Dependencies**:
   - An action can depend on one or more prerequisite actions.
   - **Backend Enforcement**: When attempting to set status = `COMPLETED`, backend verifies all dependencies in `dependencies.all()`. If any dependency status is not `COMPLETED`, backend raises a `ValidationError` (400 Bad Request) preventing execution.

3. **Rule 3 — Decision History**:
   - Updating a decision does NOT overwrite previous records.
   - When a decision is updated, `version` increments by 1 and an immutable snapshot record is stored in `DecisionHistory`. Users can inspect full version timelines via the Version History modal.

4. **Rule 4 — Backend Validation & Permissions**:
   - Admins can manage users, promote roles, manage teams, and access all meetings.
   - Members can participate in meetings, add discussions, record decisions, and update assigned action items.

---

## 9. Testing

### Running Backend Tests
From the `backend/` directory:
```bash
python manage.py test tests
```
*Executes tests covering Auth, Meetings, Actions, Overdue calculation, Action dependency blocking, and Decision history snapshotting.*

### Running Frontend Tests
From the `frontend/` directory:
```bash
npm test
```
*Executes Vitest component tests for badges, empty states, and status renders.*

---

## 10. Assumptions
- Meeting start time must precede end time.
- Users are assigned to a single department or team for filtering purposes.
- SQLite is sufficient for single-developer local evaluation, while PostgreSQL is specified for production deployments.

---

## 11. Known Limitations
- Real-time WebSockets notification push is not included; data refreshes via React state / manual reload actions.
