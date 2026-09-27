# 📚 PETTY CASH MANAGEMENT SYSTEM — MASTER KNOWLEDGE DOCUMENT
**Project:** Somtel / Bluekom Petty Cash App  
**GitHub:** https://github.com/shaaficiune/PettyCash.git  
**Last Updated:** 2026-09-25  
**Purpose:** Full context restoration for any future AI assistant — read this file before starting any work.

---

## 1. 🏗️ SYSTEM ARCHITECTURE

### Stack Overview
| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite + TailwindCSS (custom tokens) |
| **Backend** | NestJS (Node.js) + TypeScript |
| **Database** | PostgreSQL (managed via Prisma ORM) |
| **Auth** | JWT Access Tokens (15min) + Refresh Tokens (7 days, stored in DB) |
| **File Storage** | Local `./uploads` folder (MinIO optional) |
| **Process Manager** | PM2 (`ecosystem.config.js`) |
| **Web Server** | Nginx (reverse proxy → Node backend, serves frontend static files) |

### Directory Structure
```
d:\Petty Cash App\          ← Root workspace (Windows local dev)
├── backend/                ← NestJS API (port 3000)
│   ├── src/
│   │   ├── auth/           ← Login, JWT, refresh, password reset
│   │   ├── users/          ← User CRUD (SUPER_ADMIN only)
│   │   ├── requests/       ← Petty cash request lifecycle
│   │   ├── funds/          ← Monthly fund management + ledger
│   │   ├── payments/       ← Payment recording
│   │   ├── settlements/    ← Settlement audits
│   │   ├── reports/        ← Dashboard stats, CSV export
│   │   ├── notifications/  ← In-app notification system
│   │   ├── companies/      ← Company data
│   │   ├── attachments/    ← File upload endpoint
│   │   └── storage/        ← Local/MinIO storage abstraction
│   ├── prisma/
│   │   ├── schema.prisma   ← Database schema (SOURCE OF TRUTH)
│   │   └── seed.ts         ← Initial seed data
│   └── scripts/
│       ├── export-data.js  ← Export all DB tables → JSON files
│       ├── import-data.js  ← Import JSON data → server DB (version-safe)
│       └── data/           ← JSON snapshots of production data
│           ├── company.json, role.json, department.json
│           ├── region.json, user.json, project.json
│           ├── budgetHead.json, pettyCashRequest.json
│           └── ...
├── frontend/
│   └── src/
│       ├── layouts/DashboardLayout.tsx   ← Sidebar + header layout
│       ├── pages/
│       │   ├── DashboardPage.tsx
│       │   ├── RequestsListPage.tsx      ← All requests (Accountant/Admin)
│       │   ├── RequestFormPage.tsx       ← Submit/edit request (Employee)
│       │   ├── RequestDetailPage.tsx
│       │   ├── UserManagementPage.tsx    ← User CRUD (Admin)
│       │   ├── FundManagementPage.tsx
│       │   ├── TransactionsPage.tsx
│       │   ├── ReportsPage.tsx
│       │   ├── SettlementsPendingPage.tsx
│       │   └── LoginPage.tsx
│       ├── context/AuthContext.tsx       ← Global auth state
│       ├── services/api.ts               ← Axios instance (auto refresh token)
│       └── App.tsx                       ← Routes + role guards
├── setup.sh              ← ONE-TIME server setup (clone + install everything)
├── update-server.sh      ← ONGOING updates (git pull + rebuild + restart)
├── deploy-ubuntu.sh      ← Alternative deploy script
├── ecosystem.config.js   ← PM2 process config (app name: petty-cash-backend)
├── nginx-ubuntu.conf     ← Nginx config reference
├── docker-compose.yml    ← Optional Docker setup
├── database_dump.sql     ← PostgreSQL dump (may have version issues — use JSON instead)
└── .env.production       ← Production env template (NOT in git)
```

---

## 2. 🖥️ SERVER ENVIRONMENT

### Server Setup (Critical — Read Carefully)
- **Server OS:** Ubuntu (running inside VirtualBox on a local Windows machine)
- **No external IP used** — everything runs on `localhost` internally
- **Production Domain:** `pettycash.bluekompl.com` (HTTPS via Cloudflare Tunnel)
- **Access method:** Cloudflare Tunnel connects the Ubuntu VM to the internet (`pettycash.bluekompl.com`)
- **VirtualBox networking:** NAT or Bridged Adapter (no SSH from outside)
- **Git clone folder:** App was cloned into `~/app` (home directory, subfolder named `app`)

```bash
# How the server was initially set up:
git clone https://github.com/shaaficiune/PettyCash.git app
cd app && bash setup.sh
```

### What `setup.sh` Does (Automated)
1. Fixes Ubuntu mirror if `so.archive.ubuntu.com` is unreachable
2. Installs: Node.js 20 LTS, Nginx, PostgreSQL, Git (if missing)
3. Installs PM2 globally
4. Creates PostgreSQL database + user:
   - **DB:** `petty_cash_db`
   - **DB User:** `petty_user`
   - **DB Password:** `PettyCashPass2026!`
5. Creates `backend/.env` with all required environment variables
6. Runs `npm install` + `npx prisma generate` + `npx prisma db push` + `npm run build`
7. Builds frontend: `npm install` + `npm run build`
8. Configures Nginx (serves frontend at `/`, proxies `/api/` to port 3000)
9. Starts backend via PM2 (`pm2 start ecosystem.config.js`)

### PM2 Process Name
```
petty-cash-backend
```
Check: `pm2 list` | Restart: `pm2 restart petty-cash-backend`

### Backend `.env` on Server (Generated by setup.sh)
```env
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
DATABASE_URL="postgresql://petty_user:PettyCashPass2026!@localhost:5432/petty_cash_db?schema=public"
JWT_SECRET="super-secure-production-jwt-secret-key-2026"
JWT_REFRESH_SECRET="super-secure-production-refresh-secret-2026"
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
ALLOWED_ORIGINS="*"
ENABLE_SWAGGER="false"
```

> ⚠️ IMPORTANT: The server uses `petty_user`, NOT `postgres`. Never run `psql -U postgres -f dump.sql` — it will fail.
> ⚠️ Local PostgreSQL is version 18, server may be older. DO NOT use pg_dump/psql restore — use JSON import instead.

---

## 3. 🔄 DEPLOYMENT WORKFLOW

### Routine Update (After Every Code Change)

**Step 1 — Local Machine (Windows):**
```powershell
git add -A
git commit -m "feat/fix: description of change"
git push origin main
```

**Step 2 — Ubuntu Server terminal:**
```bash
cd ~/app
git pull origin main
bash update-server.sh
```

`update-server.sh` does automatically:
1. `git pull origin main`
2. `cd backend && npm install`
3. `npx prisma generate`
4. `npx prisma db push --accept-data-loss`
5. `npm run build`
6. `cd frontend && npm install && npm run build`
7. `pm2 restart petty-cash-backend`
8. `sudo systemctl reload nginx`

### Restoring Data on Fresh Server Install
**DO NOT use:** `psql -U postgres -d petty_cash_db -f database_dump.sql`
→ Fails due to PostgreSQL version mismatch (local=v18, server=older)
→ Also fails because server user is `petty_user` not `postgres`

**DO USE — JSON import (version-independent):**
```bash
cd ~/app/backend
node scripts/import-data.js
```

### Updating Data Snapshot (On Local Dev Machine)
```bash
cd "d:\Petty Cash App\backend"
node scripts/export-data.js
git add scripts/data/
git commit -m "chore: update data snapshot YYYY-MM-DD"
git push origin main
```

---

## 4. 👥 USER ROLES & PERMISSIONS

| Role | Access |
|------|--------|
| `SUPER_ADMIN` | Full access: users, reports, funds, all requests across companies |
| `ACCOUNTANT` | Review requests, manage payments, settlements, reports, funds |
| `EMPLOYEE` | Submit own requests, view own requests only |

### Default Admin Account
- **Username:** `admin`
- **Password:** `Welcome@2026` (must be changed on first login)
- **Role:** SUPER_ADMIN
- **Protection:** This account CANNOT be disabled via the UI (hardcoded guard in `UserManagementPage.tsx`)

### Default New User Password
All newly created users get: `Welcome@2026`
They are forced to change it on first login (`resetPasswordRequired: true`).

---

## 5. 📊 DATABASE SCHEMA (Key Models)

### Companies
- **Somtel** — Orange theme (`data-company="somtel"` attribute on HTML)
- **Bluekom** — Blue theme (default)

### Request Lifecycle (Status Flow)
```
DRAFT → PENDING_APPROVAL → APPROVED → PAYMENT_PROCESSING → PAID → COMPLETED
                        ↘ REJECTED
                        ↘ CORRECTION_REQUIRED → (Employee fixes) → PENDING_APPROVAL
```

### Business Rules (Enforced in Backend — Never Remove These)
- Maximum petty cash per request: **$50 USD** (validated in create + update + approve)
- Maximum attachments per request: **10 files**
- Allowed file types: `.pdf`, `.docx`, `.xlsx`, `.png`, `.jpg`, `.jpeg`
- Max file size: **20 MB**
- Fund must be initialized for current month before submitting
- Region monthly budget cap enforced on submit and resubmit
- Payments use `prisma.$transaction()` to prevent race conditions

---

## 6. 🔐 SECURITY ARCHITECTURE

| Mechanism | Implementation |
|-----------|---------------|
| Password hashing | bcrypt (cost factor 10) |
| Access tokens | JWT, 15-minute expiry |
| Refresh tokens | Stored in DB, 7-day expiry, single-use rotation |
| Disabled user blocking | JWT validation checks `status === ACTIVE` on every request |
| Role enforcement | `@Roles()` decorator + `RolesGuard` on all protected routes |
| Data isolation | Employees see only their own data; cross-tenant access blocked |
| File upload safety | Whitelist extensions + **MIME-type double-check** + 20MB limit + unique filenames |
| Security headers | Helmet.js enabled |
| CORS | Locked to `ALLOWED_ORIGINS` + **exact localhost matching** (no prefix bypass) |
| Input validation | NestJS `ValidationPipe` with `whitelist: true` |
| Swagger | Disabled in production (`ENABLE_SWAGGER=false`) |
| **Login rate limiting** | `@Throttle(10 req/min)` on `/api/auth/login` per real client IP |
| **Trust Proxy** | `app.set('trust proxy', 1)` — reads real IP via Cloudflare CF-Connecting-IP |
| **Audit log sanitization** | All `password*`, `token`, `refreshToken` fields auto-masked as `********` in AuditLog |
| **Admin account immutability** | Backend guard: `admin` account can never be DISABLED via API |
| **JWT_SECRET enforcement** | `jwt.strategy.ts` throws fatal error if JWT_SECRET missing in production |
| **Progressive lockout** | 5 failures→1h lock→5 more→6h lock→5 more→account DISABLED (Active) |
| **Production domain** | `https://pettycash.bluekompl.com` (Cloudflare Tunnel, HTTPS at edge) |
| **Password min length** | `@MinLength(8)` enforced on all password-change/reset endpoints |
| **Safe deploy** | `update-server.sh` uses `prisma db push` without `--accept-data-loss` |


---

## 7. ✅ ALL FEATURES BUILT (Complete List)

### Authentication & Profile
- [x] Login with username/password
- [x] JWT access + refresh token flow with rotation
- [x] First-login forced password reset
- [x] Change password (authenticated)
- [x] My Profile modal (click bottom sidebar user card to view details & update Full Name; username is read-only)
- [x] Self-service profile update API (`PUT /auth/profile`) for authenticated users
- [x] Logout (invalidates refresh token)
- [x] Account status check on every request

### User Management (SUPER_ADMIN only)
- [x] Create user (auto-assigns default department if none given)
- [x] Edit user (name, email, phone, role, region, status)
- [x] Toggle user status (ACTIVE ↔ DISABLED) with confirmation dialog
- [x] Reset user password to `Welcome@2026`
- [x] Delete user (only if DISABLED and has no requests/payments)
- [x] Admin account (`admin`) protected from being disabled via UI
- [x] Department and Job Title removed from create/edit forms (simplified)

### Petty Cash Requests
- [x] Submit new request (with fund availability check)
- [x] Save as draft
- [x] Edit draft / correction-required requests
- [x] Attach files (upload to server, whitelist validated)
- [x] View request detail with full history
- [x] Accountant review: Approve / Reject / Request Correction
- [x] Employee resubmit after correction
- [x] Delete own draft requests
- [x] $50 cap enforced on create + edit + approve

### Fund Management
- [x] Initialize monthly fund per company
- [x] Top up existing fund
- [x] Close month (carry-forward balance to next month)
- [x] Real-time balance tracking via ledger
- [x] Atomic payment recording (transaction-safe, race condition proof)

### Payments & Settlements
- [x] Record payment against approved request
- [x] Settlement audit workflow
- [x] Transaction ledger view

### Reports & Dashboard
- [x] Executive dashboard (stats, pending requests, fund status)
- [x] Expense breakdowns by company/department
- [x] System analytics page
- [x] CSV export of all requests
- [x] Region monthly usage tracking

### UI / UX
- [x] Dark mode toggle (persisted in localStorage)
- [x] Responsive mobile layout (hamburger menu)
- [x] Company context switcher (Accountant/Admin can view per company)
- [x] In-app notification bell with unread count (polls every 30s)
- [x] Requests list: Region column (replaced Department), searchable by region
- [x] Sidebar profile card: clickable → navigates to User Management (Admin)
- [x] Somtel/Bluekom brand theming (CSS custom properties)
- [x] User Directory: Filter by Company, Role, Status, **Region** (grouped by Company via `<optgroup>`)
- [x] Request List: Region filter grouped by Company (`<optgroup>`) to easily differentiate duplicate region names (e.g. Nugaal Somtel vs Nugaal Bluekom)

### Reporting & Filtering (Updated 2026-09-27)
- [x] Request List: Single select dropdown for Date filtering, defaulted to **Today** (presets: Today, This Week, This Month, Custom Date Range, All Time)
- [x] Request List: Region filter, Status filter, Priority filter on a unified sleek toolbar
- [x] Request List: Export Excel (server-side) + Export PDF (print view)
- [x] Request List columns: Date, Employee, Receiver/Merchant, Category, Region, Amount, Status
- [x] Transaction Ledger: Descending order (newest first), Date column
- [x] Payment Details & Disbursement: Clearly displays Receiver/Beneficiary Name and Account/Phone Number submitted in request (clean UI, removed 'None' fallbacks)
- [x] Two-Stage Review Lifecycle: Employee (Draft/Pending) → Accountant Review (`ACCOUNTANT_REVIEW`) → CFO/Finance Approval (`APPROVED`) → Payment Disbursement (`PAID`)

---

## 8. ⚠️ SAFE DEVELOPMENT RULES FOR FUTURE FEATURES

> The app is LIVE in production. Follow these rules strictly to avoid data loss.

### Rule 1 — Database Schema Changes
**ALWAYS additive. NEVER remove or rename existing columns.**

✅ Safe — Add new optional field:
```prisma
model User {
  // existing fields...
  newOptionalField  String?   // ← SAFE: nullable, existing data unaffected
}
```

❌ DANGEROUS — Never do this on production:
```prisma
// Deleting a field = destroys all data in that column
// Renaming a field = breaks all queries using the old name
```

**Workflow for schema changes:**
1. Edit `backend/prisma/schema.prisma`
2. Only add new optional (`?`) fields or entirely new models
3. Run locally: `npx prisma db push`
4. On server: it runs automatically via `update-server.sh`
5. **NEVER use `--force-reset` on production**

### Rule 2 — New API Endpoints
- Always add `@UseGuards(JwtAuthGuard)` to every endpoint
- Add `@Roles(...)` for role-restricted endpoints
- Add route to `App.tsx` with correct guard wrapper
- Test all three roles (SUPER_ADMIN, ACCOUNTANT, EMPLOYEE) before deploying

### Rule 3 — New Frontend Pages
- Add route in `App.tsx` inside `ProtectedRoute`, `AdminRoute`, or `AccountantRoute`
- Add nav item in `DashboardLayout.tsx` `navItems[]` with correct `roles` array
- Never rely on frontend-only role checks — backend must also enforce

### Rule 4 — Feature Flags for Risky Changes
If a feature changes core logic (payments, fund balances), test locally first:
1. Test on local dev (`localhost:5173`)
2. Only push to git after confirming no regressions
3. Check `npm run build` (frontend) and `npx tsc --noEmit` (backend) before pushing

---

## 9. 🧰 USEFUL COMMANDS REFERENCE

### Local Development (Windows PowerShell)
```powershell
# Backend (d:\Petty Cash App\backend)
npm start                          # Start dev server
npx tsc --noEmit                   # TypeScript check (0 errors required before push)
node scripts/export-data.js        # Export DB to JSON snapshot

# Frontend (d:\Petty Cash App\frontend)
npm run dev                        # Start dev server (port 5173)
npm run build                      # Production build check
```

### Server (Ubuntu Terminal)
```bash
# Status checks
pm2 list                                          # List running processes
pm2 logs petty-cash-backend --lines 100           # View backend logs
sudo systemctl status nginx                       # Check Nginx

# App management
cd ~/app && git pull && bash update-server.sh     # Full update
pm2 restart petty-cash-backend                   # Restart backend only
sudo systemctl reload nginx                       # Reload Nginx config

# Data management
cd ~/app/backend && node scripts/import-data.js   # Import data snapshot

# Database (use petty_user, NOT postgres)
psql -U petty_user -d petty_cash_db -c "\dt"     # List tables
psql -U petty_user -d petty_cash_db               # Interactive psql
```

### Emergency: Re-enable Admin Account
```bash
psql -U petty_user -d petty_cash_db -c "UPDATE \"User\" SET status='ACTIVE' WHERE username='admin';"
pm2 restart petty-cash-backend
```

---

## 10. 📝 KNOWN ISSUES & GOTCHAS

1. **`psql -U postgres -f database_dump.sql` FAILS** — Use `node scripts/import-data.js` instead. Reason: local PG v18 ≠ server PG version, plus server uses `petty_user` not `postgres`.

2. **Server has NO external IP** — VirtualBox Ubuntu uses localhost internally. Cloudflare Tunnel (`pettycash.bluekompl.com`) provides the public URL. No direct SSH from outside.

3. **`pettyCashFund` uses `(prisma as any)`** — TypeScript types lag behind schema for some models. Intentional workaround, don't remove the casts.

4. **Swagger disabled in production** — Temporarily enable with `ENABLE_SWAGGER=true` in `.env` if debugging is needed. Disable again after.

5. **`enable-admin.js`** — Debug script, excluded from git. Only needed if admin account gets accidentally disabled directly in the database.

6. **`setup.sh` uses `CURRENT_DIR=$(pwd)`** — Must be run from inside the `~/app` directory. Nginx root path is set dynamically from where the script is run.

7. **`database_dump.sql` is in git** — This was a mistake (kept for reference only). Always prefer `scripts/data/*.json` files for data restoration.

8. **`prisma generate` may fail on Windows while `npm start` is running** — The query engine DLL is locked by the running process. Either stop the backend first, or let `update-server.sh` handle it on the Ubuntu server (PM2 restarts after generate).

9. **Progressive lockout columns need `prisma db push` on server** — The 3 new columns (`failedLoginAttempts`, `lockoutUntil`, `lockoutStage`) added to the `User` model are safe additive columns with defaults. They will be applied automatically on next `bash update-server.sh`.

---

## 11. 🔒 PROGRESSIVE LOCKOUT FEATURE (2026-09-27)

### Overview
After a security audit, a **Progressive Account Lockout Policy** was designed and is being implemented to protect against brute-force / credential stuffing attacks.

### Lockout Rules
| Stage | Trigger | Action | Duration |
|-------|---------|--------|----------|
| Stage 0 | Normal | No lockout | — |
| Stage 1 | 5 consecutive wrong passwords | Account locked | **1 hour** |
| Stage 2 | 5 more wrong passwords after Stage 1 expires | Account locked | **6 hours** |
| Stage 3 | 5 more wrong passwords after Stage 2 expires | Account **DISABLED** | Permanent (Admin must re-enable) |

### Counter Reset Rule
A **successful login at any stage** resets `failedLoginAttempts = 0`, `lockoutStage = 0`, and `lockoutUntil = null`.

### Admin Immunity
The `admin` account (username: `admin`) is **NEVER permanently disabled** by lockout. It can reach Stage 1 and Stage 2 temporary lockouts, but Stage 3 DISABLED is skipped for the primary admin to prevent denial-of-service against the system.

### Admin Unlock
When an Admin resets a user's password (`POST /users/:id/reset-password`), the lockout state is automatically cleared (`failedLoginAttempts = 0`, `lockoutUntil = null`, `lockoutStage = 0`).

### New Database Columns (User model)
```prisma
failedLoginAttempts  Int       @default(0)   // resets on successful login
lockoutUntil         DateTime?               // null = not locked
lockoutStage         Int       @default(0)   // 0=none 1=1h 2=6h 3=DISABLED
```

### Files Affected
- `backend/prisma/schema.prisma` — 3 new columns
- `backend/src/auth/auth.service.ts` — login() lockout logic
- `backend/src/users/users.service.ts` — resetPassword() clears lockout

> **Status:** ✅ Code complete. Deployed to server via `update-server.sh` which runs `prisma db push` automatically.

---

## 12. 📊 REPORTS OVERHAUL & ENTERPRISE UI STANDARDIZATION (2026-09-27)

### Overview
1. **Reports Module Modernization:**
   - Deprecated and removed legacy `Department` references from reports backend services, controllers, database queries, and export formats.
   - Tied budget and expense reporting to operational **Regions** and **Budget Heads** (aligned with the system's Regional Budget Limits model).
   - Replaced complex matrix charts with standard enterprise data tables, top summary KPI cards, comprehensive multi-attribute filters (Date range, Company, Region, Budget Head, Status, Min/Max amount), and direct **Excel** (`.xlsx`) and **PDF** export options.
   - Clean, audit-friendly columns: Date, Request #, Company, Region, Requester, Receiver, Budget Head, Amount, Status, Paid Date.

2. **Enterprise SaaS UI & Consistency Overhaul:**
   - **Table Theming:** Standardized all table headers across the application (`DashboardPage`, `RequestsListPage`, `TransactionsPage`, `PaymentsPage`, `SettlementsPendingPage`, `UserManagementPage`) to clean enterprise SaaS borders and backgrounds (`bg-slate-50 dark:bg-slate-800/60`, font-bold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400).
   - **Row Styling:** Removed non-standard thick colored left row borders (`border-l-4 border-l-orange-500` / `border-l-blue-600`) and amber background tints. Company identity is cleanly represented via standard badges/pills in the Company column (Orange for Somtel, Blue for Bluekom).
   - **Professional Copy & Placeholders:** Replaced verbose AI-generated marketing copy, repetitive subtitles, and wordy input placeholder text with concise, industry-standard developer terminology (`Search requests...`, `Search transactions...`, `Search users...`, `Search records...`, `Expense purpose`, `Additional details (optional)...`).
   - **Navigation:** Standardized sidebar navigation item label from `System Analytics` to `Reports`.

### Deployment Checklist for Server:
When pulling changes onto the production Ubuntu server:
```bash
cd ~/app  # or repository root
git pull origin main
cd backend
npm run build
pm2 restart petty-cash-api  # or npm run start:prod
cd ../frontend
npm run build
# Nginx automatically serves the updated dist/ folder
```
No database schema changes were required for this update (`prisma db push` not needed, existing data completely safe).

