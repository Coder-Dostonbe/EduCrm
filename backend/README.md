# EduFlow CRM — Backend API

Django 5 + DRF + PostgreSQL REST API for the EduFlow education-center CRM.

## Quick start

### Option A — Docker (Postgres included)

From the **project root** (one level up):

```bash
docker compose up --build
```

That starts Postgres, runs migrations, seeds demo data, and serves the API on
http://localhost:8000.

### Option B — local venv (SQLite, zero setup)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # optional; SQLite is used if DATABASE_URL is empty
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

## Demo accounts

`seed_demo` creates the same four accounts the frontend offers on its login page:

| Role    | Email               | Password   |
| ------- | ------------------- | ---------- |
| Admin   | admin@eduflow.uz    | admin123   |
| Manager | manager@eduflow.uz  | manager123 |
| Teacher | teacher@eduflow.uz  | teacher123 |
| Student | student@eduflow.uz  | student123 |

Reseed at any time with `python manage.py seed_demo --flush`.

## API surface

Interactive docs: **http://localhost:8000/api/docs/** (Swagger) ·
http://localhost:8000/api/redoc/ · raw schema at `/api/schema/`
Django admin: http://localhost:8000/admin/

### Auth

| Method | Endpoint                     | Purpose                              |
| ------ | ---------------------------- | ------------------------------------ |
| POST   | `/api/auth/login/`           | email + password → access/refresh + user |
| POST   | `/api/auth/register/`        | self-registration (always a student) |
| POST   | `/api/auth/google/`          | exchange a Google ID token for JWTs  |
| POST   | `/api/auth/refresh/`         | refresh an expired access token      |
| GET    | `/api/auth/me/`              | current user (session restore)       |
| PATCH  | `/api/auth/me/`              | update own profile                   |
| POST   | `/api/auth/change-password/` | change password                      |
| GET    | `/api/auth/permissions/`     | the role → module matrix             |

### Resources

**Education** — `/api/branches/` · `/api/courses/` · `/api/teachers/` ·
`/api/groups/` · `/api/students/` · `/api/lessons/` · `/api/attendance/` ·
`/api/exams/` · `/api/grades/`

**CRM** — `/api/leads/` · `/api/message-templates/` · `/api/messages/` ·
`/api/notifications/`

**Finance** — `/api/payments/` · `/api/debts/` · `/api/salaries/`

**Management** — `/api/employees/` · `/api/reports/<type>/`

All support `?search=`, `?ordering=`, `?page=`, `?page_size=`, and `?branch=`
(the branch selector in the app's topbar).

### Extra endpoints

| Endpoint                        | What it does                                  |
| ------------------------------- | --------------------------------------------- |
| `GET  /api/dashboard/`          | all dashboard KPIs + chart series in one call |
| `GET  /api/students/{id}/summary/` | everything the student profile page needs  |
| `POST /api/attendance/bulk/`    | mark a whole group for one lesson             |
| `GET  /api/attendance/stats/`   | attendance rate per group                     |
| `GET  /api/payments/summary/`   | the six payment KPI tiles                     |
| `GET  /api/debts/summary/`      | debt totals                                   |
| `POST /api/debts/{id}/remind/`  | send a payment reminder (stub)                |
| `POST /api/salaries/{id}/pay/`  | mark a salary paid                            |
| `GET  /api/salaries/summary/`   | payroll totals                                |
| `GET  /api/leads/pipeline/`     | counts and value per Kanban stage             |
| `POST /api/leads/{id}/stage/`   | move a lead between stages (drag-and-drop)    |
| `POST /api/leads/{id}/notes/`   | add a note to the communication history       |
| `POST /api/leads/{id}/convert/` | enrol the lead — creates and links a student  |
| `POST /api/messages/send/`      | send to a group, all students, or all debtors |
| `POST /api/notifications/{id}/read/` | mark one notification read               |
| `POST /api/notifications/read-all/`  | mark every notification read             |
| `GET  /api/notifications/summary/`   | unread count and per-type breakdown      |
| `GET  /api/reports/<type>/`     | one of students, attendance, revenue, debt, teachers, courses, leads, branches |

## Permissions

`accounts/permissions.py` holds the role matrix, mirroring
`src/lib/permissions.ts` on the frontend — keep the two in sync.

Beyond module access, querysets are scoped per role:

- **Teachers** see only their own groups, students, lessons and exams, and can
  mark attendance only for their own groups.
- **Students** see only their own record, payments and schedule.
- **Admin / manager** see everything, narrowed by `?branch=` when set.

## Design notes

- **Debt is derived, never stored.** `Invoice.balance` = amount due − payments
  applied, so the Debts page can't drift out of sync with reality.
- **Invoice numbers** are allocated under `select_for_update()`, so concurrent
  cashiers can't collide.
- **Protected deletes**: a student with payment history returns `409` with a
  `blocked_by` field rather than a 500 — deactivate instead.
- **Google sign-in** verifies the ID token against Google's tokeninfo endpoint;
  set `GOOGLE_OAUTH_CLIENT_ID` (and optionally `GOOGLE_ALLOWED_DOMAIN`). It is
  entirely optional — the project runs without it.
- **Leads enrol through `convert`**, never by setting `stage=enrolled`
  directly, so an enrolled lead always has a real student record behind it.
- **Employees deactivate instead of deleting**, keeping payroll history intact.
- **Branch revenue uses a subquery.** Summing a joined relation alongside the
  student/group counts multiplies rows through the JOINs and inflates the
  figure; `core/aggregation_tests.py` pins it against a plain per-branch sum.
- **Bulk messaging above 50 recipients** needs `confirm_large_send=true`, so a
  misclick can't message the whole center.

## Tests

```bash
pytest            # 114 tests: auth, role permissions, queryset scoping,
                  # finance rules, CRM pipeline, reports, aggregation
```

## Environment

See `.env.example`. `DATABASE_URL` empty → SQLite; set it for PostgreSQL.
`DJANGO_DEBUG=False` turns on HSTS, secure cookies and SSL redirect.
