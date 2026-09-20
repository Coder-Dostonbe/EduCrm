# EduFlow CRM

Premium CRM for education centers — Next.js frontend + Django REST API.

Built around a real Uzbek education center: students, groups, schedule,
attendance, exams, finance, and a lead pipeline, in Uzbek / Russian / English.

```
education-crm/
├── src/          # Next.js frontend (App Router)
├── backend/      # Django 5 + DRF API
└── docker-compose.yml
```

## Run it

One command starts everything:

```bash
npm install
npm run dev
```

That boots the Django API and the Next.js frontend together, pointed at each
other. Before starting it applies migrations and seeds the demo data if the
database is empty, then waits until the API actually answers before bringing
the frontend up. Ctrl+C stops both.

```
  Frontend  http://localhost:3000
  API       http://localhost:8000
  Docs      http://localhost:8000/api/docs/
```

It needs a virtualenv at `backend/.venv` — create one once:

```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt   # Windows
.venv/bin/pip install -r requirements.txt       # macOS / Linux
```

Without `DATABASE_URL` the API falls back to SQLite, so there is nothing else
to set up.

### Running only one half

```bash
npm run dev:api     # just the Django API
npm run dev:web     # just Next.js, still pointed at the API
npm run dev:mock    # just Next.js, on the bundled demo data — no backend
```

Ports come from `PORT` and `API_PORT`; the launcher keeps the API's CORS list
in sync with whatever port the frontend is on.

### Postgres instead of SQLite

```bash
docker compose up --build          # API + Postgres on :8000
npm run dev:web                    # frontend against it
```

Backend without Docker: see [`backend/README.md`](backend/README.md).

## Demo accounts

| Role    | Email               | Password   | Sees                                    |
| ------- | ------------------- | ---------- | --------------------------------------- |
| Admin   | admin@eduflow.uz    | admin123   | everything, incl. payroll and branches  |
| Manager | manager@eduflow.uz  | manager123 | students, finance, leads, reports       |
| Teacher | teacher@eduflow.uz  | teacher123 | own groups, students, attendance, exams |
| Student | student@eduflow.uz  | student123 | own profile, schedule, grades, payments |

The same credentials work in both mock and API mode.

## The mock / API switch

One environment variable decides where data comes from:

```bash
NEXT_PUBLIC_API_MODE=mock   # bundled demo data (default)
NEXT_PUBLIC_API_MODE=api    # the Django REST API
```

Components never touch this. They call the services in `src/services/`, which
choose the source and translate between the API's snake_case payloads and the
frontend's TypeScript types. Adding a module to the real API means writing one
service file — the pages stay untouched.

## Features

**Education** — students (table, filters, full profile with 8 tabs), teachers,
courses, groups, drag-and-drop schedule (day/week/month), attendance marking
with bulk actions, exams and grades with score distribution.

**CRM** — lead pipeline as a drag-and-drop Kanban across 7 stages,
communications center with SMS/Telegram/Email templates.

**Finance** — payments with invoice numbering, debts with reminders, payroll.
Debt is always derived from invoices minus payments, so it can't drift.

**Management** — branches, employees, 8 report types with CSV/Excel/PDF export.

**System** — notification center, settings (10 sections incl. a live role matrix),
light/dark theme, and full uz/ru/en translation persisted per browser.

## Stack

**Frontend** — Next.js (App Router), React, TypeScript, Tailwind CSS v4,
shadcn/ui (customized), Recharts, Framer Motion, React Hook Form + Zod,
dnd-kit, date-fns.

**Backend** — Django 5, Django REST Framework, SimpleJWT, PostgreSQL,
drf-spectacular (OpenAPI), pytest, Docker.

## Quality

- Production build: 0 TypeScript errors, 0 ESLint errors
- Backend: 114 pytest tests covering auth, per-role permissions, queryset
  scoping, finance rules, the CRM pipeline, reports and aggregation accuracy
- Verified in a real browser: all routes render with no console errors, and no
  horizontal overflow at 360px

## Structure

```
src/
  app/            # routes
  components/     # ui/ (shadcn), layout/, shared/, dashboard/, per-module
  services/       # API client + per-module services (the mock/API switch)
  data/           # deterministic mock data
  lib/            # auth, i18n, branch, permissions, formatting, export
  translations/   # uz / ru / en
  types/          # domain types — the contract both sides agree on

backend/
  accounts/       # custom user, roles, JWT + Google OAuth, permission matrix,
                  # employees
  core/           # branches, courses, teachers, groups, students, schedule,
                  # attendance, exams, grades, dashboard, reports
  crm/            # leads pipeline, communications, notifications
  finance/        # payments, invoices (debt), salaries
  config/         # settings, urls, pagination, exception handling
```
