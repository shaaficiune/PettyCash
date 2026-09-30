# 💵 Petty Cash Management System

> Enterprise-grade petty cash management platform for **Bluekom** and **Somtel**.  
> Full-stack application with NestJS backend, React 19 frontend, PostgreSQL database, MinIO file storage, and Docker Compose orchestration.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Quick Start (Local Development)](#quick-start-local-development)
- [Docker Deployment](#docker-deployment)
- [Initial Accounts](#initial-accounts)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Security Notes](#security-notes)

---

## Overview

The Petty Cash Management System provides:

- **Multi-company isolation** — Bluekom and Somtel data is strictly separated at the database layer
- **Role-based access control** — Super Admin, Accountant, and Employee roles with enforced permissions
- **Complete request lifecycle** — Draft → Submit → Review → Approve/Reject/Correct → Pay → Settle → Complete
- **Audit trail** — Every significant action is logged with user, timestamp, IP, and user-agent
- **In-app notifications** — Real-time alerts for request status changes
- **File attachments** — Up to 10 files (PDF, DOCX, XLSX, PNG, JPG, JPEG) at 20 MB each
- **Analytics dashboards** — Charts, KPI cards, department/company breakdowns
- **CSV export** — Download filtered request logs

---

## Technology Stack

| Layer       | Technology                                              |
|-------------|--------------------------------------------------------|
| Frontend    | React 19, Vite, TypeScript, Tailwind CSS, Recharts    |
| State Mgmt  | TanStack Query, React Context, React Router           |
| Backend     | NestJS 11, TypeScript, Passport.js JWT                |
| ORM         | Prisma 6 + PostgreSQL 16                              |
| File Store  | Local disk (dev) / MinIO S3-compatible (prod)        |
| Container   | Docker + Docker Compose                               |
| Web Server  | Nginx (reverse proxy + SPA server)                   |

---

## Project Structure

```
Petty Cash App/
├── backend/                    # NestJS REST API
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema (14 tables)
│   │   └── seed.ts             # Initial data seeder
│   ├── scripts/
│   │   └── init-db.js          # Auto database creation script
│   ├── src/
│   │   ├── auth/               # JWT auth, guards, strategies
│   │   ├── users/              # User CRUD (Super Admin)
│   │   ├── companies/          # Companies, departments, projects
│   │   ├── requests/           # Petty cash request lifecycle
│   │   ├── payments/           # Disbursement recording
│   │   ├── settlements/        # Expense settlement & audit
│   │   ├── notifications/      # In-app notification service
│   │   ├── reports/            # Analytics, CSV export, audit logs
│   │   ├── attachments/        # File upload controller
│   │   ├── common/             # Interceptors, audit logger
│   │   ├── prisma/             # Prisma service + module
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── .env                    # Backend environment config
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                   # React 19 + Vite Client
│   ├── src/
│   │   ├── context/            # AuthContext
│   │   ├── layouts/            # DashboardLayout (sidebar, navbar)
│   │   ├── pages/              # All page components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── FirstLoginResetPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── RequestsListPage.tsx
│   │   │   ├── RequestFormPage.tsx
│   │   │   ├── RequestDetailPage.tsx
│   │   │   ├── SettlementsPendingPage.tsx
│   │   │   ├── UserManagementPage.tsx
│   │   │   └── ReportsPage.tsx
│   │   ├── services/           # Axios API client
│   │   ├── App.tsx             # Router + route guards
│   │   └── main.tsx
│   ├── nginx.conf              # Production Nginx config
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml          # Full stack orchestration
├── .env.example                # Environment variables template
└── README.md
```

---

## Quick Start (Local Development)

### Prerequisites

- **Node.js** 20+
- **PostgreSQL** 16+ running locally
- **npm** 10+

### 1. Clone / Open the Project

```bash
cd "D:/Petty Cash App"
```

### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create backend/.env from the template and configure DATABASE_URL plus two
# separate random JWT secrets (at least 64 characters each).
copy .env.example .env    # Windows
# cp .env.example .env     # Linux/Mac

# Create the PostgreSQL database first, then apply the schema
node scripts/init-db.js

# Seed initial data (Prisma loads .env; development generates one-time passwords)
npx prisma db seed

# Start development server
npm run start:dev
```

Backend API will be available at: **http://localhost:3000/api**  
Swagger documentation at: **http://localhost:3000/swagger**

### 3. Setup Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at: **http://localhost:5173**

> The Vite dev server proxies authenticated API requests to `http://localhost:3000` automatically.

---

## Docker Deployment

### Prerequisites

- **Docker** 24+
- **Docker Compose** 2.20+

### Full Stack Launch

```bash
cd "D:/Petty Cash App"

# Build and start all services
copy .env.example .env    # Windows; then fill in the required random secrets
# cp .env.example .env    # Linux/Mac
# Generate distinct values for every secret with `openssl rand -hex 32`.
# Set all four INITIAL_* passwords to different values of at least 16 characters.
docker compose up --build -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

Services started:
| Service   | Port | Description                        |
|-----------|------|------------------------------------|
| frontend  | 80   | React app (Nginx) + API proxy      |
| backend   | 3000 | NestJS REST API                    |
| postgres  | 5432 | PostgreSQL 16 database             |
| minio     | 9000 | MinIO S3 object storage API        |
| minio     | 9001 | MinIO web console                  |

After launch, open **http://localhost** in your browser.

---

## Initial Accounts

There are no shared default passwords. In development, seeding generates unique one-time passwords and prints them in the local terminal. Production seeding requires distinct values of at least 16 characters for `INITIAL_ADMIN_PASSWORD`, `INITIAL_ACCOUNTANT_PASSWORD`, `INITIAL_EMPLOYEE_PASSWORD`, and `INITIAL_BLUEKOM_EMPLOYEE_PASSWORD`. Keep these values out of source control and share them only through a secure channel. The setup script generates per-user temporary passwords and requires a change at first login.

---

## API Documentation

Once the backend is running, the interactive Swagger API docs are at:

```
http://localhost:3000/swagger
```

### Core API Groups

| Group                  | Base Path              |
|------------------------|------------------------|
| Authentication         | `/api/auth`            |
| User Management        | `/api/users`           |
| Companies / Depts      | `/api/companies`       |
| Petty Cash Requests    | `/api/requests`        |
| Payments               | `/api/payments`        |
| Expense Settlements    | `/api/settlements`     |
| Reports & Audit        | `/api/reports`         |
| File Attachments       | `/api/attachments`     |
| Notifications          | `/api/notifications`   |

---

## Database Schema

The PostgreSQL database (`petty_cash_db`) contains these tables:

| Table                   | Purpose                                          |
|-------------------------|--------------------------------------------------|
| `companies`             | Bluekom and Somtel company records               |
| `roles`                 | SUPER_ADMIN, ACCOUNTANT, EMPLOYEE                |
| `permissions`           | Granular action permissions per role             |
| `role_permissions`      | Many-to-many role ↔ permission mapping           |
| `departments`           | Per-company department directory                 |
| `projects`              | Optional project codes per company               |
| `users`                 | Employee accounts with company/dept/role links   |
| `refresh_tokens`        | JWT refresh token sessions                       |
| `petty_cash_requests`   | Core request records with status state machine   |
| `petty_cash_attachments`| File references linked to requests               |
| `payments`              | Disbursement records (method, amount, txn ID)    |
| `expense_settlements`   | Employee expense reconciliation records          |
| `notifications`         | In-app notification messages per user            |
| `audit_logs`            | System-wide action trail                         |
| `system_settings`       | Key-value configuration store                    |

### Request Status Flow

```
DRAFT
  └─ PENDING_APPROVAL
       ├─ CORRECTION_REQUIRED ──► (Employee edits) ──► PENDING_APPROVAL
       ├─ REJECTED
       └─ APPROVED
            └─ PAYMENT_PROCESSING / PAID
                 └─ (Employee submits settlement)
                      └─ COMPLETED
```

---

## Security Notes

> ⚠️ **Before deploying to production:**

1. **Change all passwords** — Rotate the PostgreSQL password, JWT secrets, and MinIO credentials in your `.env` file
2. **Use strong JWT secrets** — Generate with: `openssl rand -hex 64`
3. **Restrict CORS** — Update `main.ts` CORS `origin` from `'*'` to your production domain
4. **Enable HTTPS** — Configure SSL termination at your load balancer or Nginx
5. **Set up MinIO buckets** — Create the `petty-cash-attachments` bucket via MinIO console at port 9001
6. **Firewall rules** — Only expose ports 80/443 publicly; keep 3000, 5432, 9000, 9001 internal only

---

## License

Internal use — Bluekom & Somtel © 2026
