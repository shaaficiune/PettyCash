# 📚 PETTY CASH MANAGEMENT SYSTEM — MASTER KNOWLEDGE DOCUMENT
**Project:** Somtel / Bluekom Petty Cash App  
**GitHub:** https://github.com/shaaficiune/PettyCash.git  
**Last Updated:** 2026-09-30
**Purpose:** Full context restoration for any future AI assistant — read this file before starting any work.

---

## 1. 🏗️ SYSTEM ARCHITECTURE

### Stack Overview
| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite + TailwindCSS (custom tokens) |
| **Backend** | NestJS (Node.js) + TypeScript |
| **Database** | PostgreSQL (managed via Prisma ORM) |
| **Auth** | JWT Access Tokens (15min) + Refresh Tokens (7 days, SHA-256 hashes stored in DB) |
| **File Storage** | Local `./uploads` folder or MinIO; attachment downloads require authenticated API access |
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
│       ├── import-data.js  Controlled import; strips credentials and requires password reset
│       └── data/           Ignored local JSON exports; never commit or share
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
├── database_dump.sql     ← Schema/reference sample only; contains no production records
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
cd app && sudo bash setup.sh
```

### What `setup.sh` Does (Automated)
1. Installs Node.js, Nginx, PostgreSQL, and PM2 when needed
2. Refuses to overwrite an existing `backend/.env`, database role, or database
3. Generates unique database and JWT secrets, plus per-user one-time seed passwords
4. Applies the Prisma schema without a data-loss override and seeds a fresh database
5. Builds the app, configures Nginx without a public uploads route, and starts PM2

### PM2 Process Name
```
petty-cash-backend
```
Check: `pm2 list` | Restart: `pm2 restart petty-cash-backend`

The server's `backend/.env` is generated locally with unique values and is ignored by Git. Do not copy its contents into documentation, support messages, or source control. The setup script prints each temporary seed password once for secure delivery.

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
bash update-server.sh
```

`update-server.sh` does automatically:
1. `git pull origin main`
2. `cd backend && npm install`
3. `npx prisma generate`
4. `node scripts/init-db.js` (safe schema update and legacy refresh-session revocation)
5. `npm run build`
6. `cd frontend && npm install && npm run build`
7. `pm2 restart petty-cash-backend`
8. `sudo systemctl reload nginx`

### Database Backups
`database_dump.sql` is a schema/reference sample, not a backup. Keep production backups encrypted outside Git. The JSON import/export scripts are for controlled local use only; never commit or share their output.

---

## 4. 👥 USER ROLES & PERMISSIONS

| Role | Access |
|------|--------|
| `SUPER_ADMIN` | Full access: users, reports, funds, all requests across companies |
| `ACCOUNTANT` | Review requests, manage payments, settlements, reports, funds |
| `EMPLOYEE` | Submit own requests, view own requests only |

### Initial Admin Account
- **Username:** `admin`
- **Password:** unique one-time value generated during setup; change at first login
- **Role:** SUPER_ADMIN
- **Protection:** This account CANNOT be disabled via the UI (hardcoded guard in `UserManagementPage.tsx`)

### New User Passwords
User creation and admin resets generate unique one-time passwords, which are displayed once to the administrator. Users must change them at first login (`resetPasswordRequired: true`).

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
| Refresh tokens | SHA-256 hashes stored in DB, 7-day expiry, single-use rotation |
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
| **JWT secret enforcement** | Both signing secrets must be distinct and at least 64 characters; deploy rotates weaker legacy values |
| **Progressive lockout** | 5 failures→1h lock→5 more→6h lock→5 more→account DISABLED (Active) |
| **Production domain** | `https://pettycash.bluekompl.com` (Cloudflare Tunnel, HTTPS at edge) |
| **Password min length** | `@MinLength(8)` enforced on all password-change/reset endpoints |
| **Safe deploy** | `update-server.sh` applies schema updates without a data-loss override and revokes legacy plaintext refresh tokens |


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
- [x] Reset user password to a unique one-time value
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
- [x] Request List: Authenticated Excel/PDF downloads
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
cd ~/app && bash update-server.sh                 # Pull, build, and restart
pm2 restart petty-cash-backend                   # Restart backend only
sudo systemctl reload nginx                       # Reload Nginx config

# Data management
# Do not import JSON snapshots directly on production; use an approved encrypted backup/restore procedure.

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

1. **`database_dump.sql` is not a production restore** — It contains schema/reference rows only. Restore production data from an encrypted backup kept outside Git.

2. **Server has NO external IP** — VirtualBox Ubuntu uses localhost internally. Cloudflare Tunnel (`pettycash.bluekompl.com`) provides the public URL. No direct SSH from outside.

3. **`pettyCashFund` uses `(prisma as any)`** — TypeScript types lag behind schema for some models. Intentional workaround, don't remove the casts.

4. **Swagger disabled in production** — Temporarily enable with `ENABLE_SWAGGER=true` in `.env` if debugging is needed. Disable again after.

5. **`enable-admin.js`** — Debug script, excluded from git. Only needed if admin account gets accidentally disabled directly in the database.

6. **`setup.sh` resolves its own app directory** — Run it as root from the repository; it refuses to overwrite an existing environment or database.

7. **Local JSON exports may contain sensitive data** — Export files are ignored by Git and must not be committed or shared.

8. **`prisma generate` may fail on Windows while `npm start` is running** — The query engine DLL is locked by the running process. Either stop the backend first, or let `update-server.sh` handle it on the Ubuntu server (PM2 restarts after generate).

9. **Progressive lockout columns use the safe DB initializer** — The additive `User` columns are applied by `node scripts/init-db.js` during `bash update-server.sh`; do not manually force a reset.

---

## 11. 🔒 PROGRESSIVE LOCKOUT FEATURE (2026-09-27)

### Overview
After a security audit, a **Progressive Account Lockout Policy** was implemented to protect against brute-force / credential stuffing attacks.

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

> **Status:** ✅ Code complete. The deploy script applies its schema with `node scripts/init-db.js`. No production host was accessed as part of the code changes, so deployment must be confirmed separately.

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
cd ~/app
bash update-server.sh
```
The script installs dependencies, ensures distinct JWT secrets, runs the safe database initializer, builds both apps, restarts `petty-cash-backend`, and reloads Nginx. The reports/UI changes themselves add no report-specific schema.

---

## 13. SECURITY, DATA & TRANSACTION HARDENING (2026-09-27)

This section records the security and correctness changes made during the full system review. Code and deployment scripts were updated locally; no production host or live database was accessed.

### Authentication, Sessions & Passwords
- JWT access and refresh secrets must be distinct and at least 64 characters. `JwtStrategy` accepts bearer tokens only; query-string access tokens are no longer supported.
- `DATABASE_URL` is required; Prisma no longer falls back to an embedded local database credential.
- Refresh tokens are stored as SHA-256 hashes. Refresh rotates the old session and inserts its replacement in one transaction; tokens include a random `jti`. Legacy plaintext JWT-shaped refresh-session rows are removed by `scripts/init-db.js`, and old plaintext tokens cannot be refreshed.
- `JwtAuthGuard` blocks protected API routes while a user must reset their password, allowing only first-login reset and logout. Password resets and user disable actions revoke sessions. Logout accepts the refresh token so it can revoke the session even after the client clears its access token.
- `scripts/ensure-jwt-secrets.js`, called by deployment scripts, generates 64-byte random secrets when values are missing, weak, or shared. Rotating signing secrets requires users to sign in again.
- Seed passwords are unique per user. Production requires explicit initial passwords for newly seeded accounts; development generates random values and prints them only when creating accounts. Re-running seed does not reset existing users' credentials.
- Admin-created users and password resets receive a unique one-time password shown once, with a forced password change at first login. `fix-login.sh` no longer prints credentials, supplies shared defaults, or applies destructive schema changes; an explicit `--reset-user username` performs a confirmed one-user reset.

### Tenant Boundaries, Requests & Finance
- User create/update validates that selected departments and regions belong to the selected company. Request create/update validates company ownership for project, region, and budget head. Region budget statistics also enforce company scope.
- Employees can edit only draft or correction-required requests and can resubmit only pending approval. They cannot set review, approval, or payment states themselves. Create/resubmit checks budget limits and available funds.
- Review and approval operations lock request rows. Fund reservations and approval updates are transactional; accountant approval must pass through `ACCOUNTANT_REVIEW` before final approval, except for `SUPER_ADMIN`. Notifications are sent after commit, and notification failures no longer make a successful request operation appear to fail.
- Fund initialization and month close use transactions and locks. Closing a month carries the remaining balance and additional funding forward once, updating an existing next-month fund/ledger entry when present. Top-ups to a closed fund are rejected.
- Approval/payment calculations lock fund rows and count approved, pending-payment, paid, and completed requests as committed for their request month. Recording payment, updating fund/ledger values, and changing request status happen in one transaction; overpayment is rejected. `PAYMENT_PROCESSING` is included in regional usage.

### Private Attachments & Report Exports
- Public `/uploads` serving and corresponding Nginx/Vite routes were removed. Attachment file and presign routes resolve an attachment by ID, require authentication, and restrict employees to their own requests. Local paths and MinIO object keys are scoped to the uploader. `src/auth/express-user.d.ts` declares the JWT `userId` on Express's authenticated user type for the Multer upload callback. MinIO credentials are required when MinIO storage is selected, with SSL controlled by `MINIO_USE_SSL`.
- Request and report PDF exports fetch through authenticated API calls and download as blobs; browser URLs no longer contain access tokens. Dynamic report content is escaped for Excel XML and PDF HTML.

### Data Handling & Deployment
- `export-data.js` omits password hashes, refresh tokens, and lockout secrets; exported users are marked to reset their password. Export files use restrictive permissions where supported. `import-data.js` never restores password hashes or refresh sessions; imported users get random unusable credentials and must reset their password.
- `backend/scripts/data/*.json` is ignored by Git, and sensitive snapshots were removed from the tracked index. Local ignored files may still exist. `database_dump.sql` is a scrubbed schema/reference sample, not a production backup. Earlier secrets may still exist in Git history; history was not rewritten.
- Root/backend/frontend `.env.example` files contain placeholders only. Compose requires explicit database, JWT, MinIO, and initial account secrets. `setup.sh` refuses existing environment/database objects, generates unique secrets, writes protected environment files, initializes schema without a data-loss override, seeds, builds, and configures Nginx without public uploads.
- `update-server.sh` and `deploy-ubuntu.sh` ensure JWT secrets and call `node scripts/init-db.js`. The initializer runs Prisma schema push without a data-loss override, then deletes legacy raw refresh-token rows. Docker ignores local JSON snapshots and includes the safe initializer. README and deployment documentation now describe these requirements and encrypted off-repository backups.
- `database_dump.sql`, JSON exports, and environment files must never be treated as credentials or backups to commit. Production PostgreSQL/MinIO credentials were not rotated because no production service was accessed.
- The local `backend/.env` initially had distinct JWT secrets shorter than the enforced minimum. `node scripts/ensure-jwt-secrets.js` replaced them with random secrets; existing local JWT sessions must sign in again. The local database host was confirmed, and no database records were changed.

### Verification Record
- `npm start` compiled the backend and reached `Nest application successfully started` on `http://127.0.0.1:3000/api`; the temporary process started for verification was stopped afterward. Automated tests and production builds were not run.

---

## 14. 🔐 CODEX SECURITY HARDENING (2026-09-30)

### Overview
CodeX applied a comprehensive security hardening pass. All changes were reviewed, committed, and deployed on 2026-09-30. The commit hash is `6695550`.

### Key Changes (What Changed & Why)

#### Refresh Token Storage — SHA-256 Hashes
- **Before:** Refresh tokens stored as raw JWT strings (plaintext, ~188 chars) in `RefreshToken` table
- **After:** Only SHA-256 hashes (64-char hex) are stored; the raw token is returned to the client only once
- **Local fix applied:** `node scripts/init-db.js` was run locally — it deleted 31 old plaintext tokens
- **Server fix:** `update-server.sh` runs `node scripts/init-db.js` automatically — old tokens on server are deleted on deploy
- **Impact:** All users must log in again after this deploy (sessions are invalidated)

#### JWT Secret Enforcement
- **Before:** Fallback secrets hardcoded in code (weak, shared `somtel_bluekom_...` defaults)
- **After:** Both `JWT_SECRET` and `JWT_REFRESH_SECRET` MUST be in `.env`, ≥ 64 chars, and different from each other — or the app crashes on start
- **Local `.env`:** 128-char secrets, different ✅
- **Server `.env`:** Generated by `setup.sh` / `ensure-jwt-secrets.js` ✅

#### Authenticated Attachments (Breaking Change for Old URLs)
- **Before:** Files served via `express.static('/uploads')` — any URL could access any file
- **After:** Files accessible only via `GET /api/attachments/:id/file` (requires JWT)
- **Frontend updated:** `RequestDetailPage.tsx` now uses `api.get('/attachments/:id/file', {responseType: 'blob'})` to open files
- **Old `/uploads/` paths:** Will 404. Existing attachment _records_ in DB still work via the new authenticated route
- **Vite proxy:** `/uploads` proxy rule removed from `vite.config.ts` (no longer needed)

#### Password Generation — Unique One-Time Passwords
- **Before:** Default password `Welcome@2026` for all new users and resets
- **After:** `randomBytes(24).toString('base64url')` — unique per user, shown once in an alert dialog to the admin
- **Frontend updated:** `UserManagementPage.tsx` shows alert with `temporaryPassword` after create/reset

#### Tenant Boundary Validation
- Department and Region must belong to the same Company as the User/Request — enforced in backend
- `requests.service.ts`: Employees cannot set review/payment states themselves
- Notification failures no longer roll back a successful request operation

#### Logout — No Auth Required
- `POST /auth/logout` no longer requires `JwtAuthGuard` — logout works even if the access token expired

### `init-db.js` Behavior (Updated)
Now does two things:
1. `npx prisma db push` — applies schema safely (no `--force-reset`)
2. `DELETE FROM "RefreshToken" WHERE token LIKE '%.%.%'` — removes all legacy JWT-shaped plaintext tokens

### Files Added (New, Previously Untracked)
- `backend/scripts/ensure-jwt-secrets.js` — generates 64-byte random secrets when `.env` values are missing or too short
- `backend/src/auth/express-user.d.ts` — TypeScript declaration for `req.user.userId` in Multer upload callback

> **Status:** ✅ Committed to `main`, pushed to GitHub (`6695550`). Server deploy: run `bash update-server.sh` on Ubuntu.

---

## 15. TRANSACTION LEDGER UPGRADE & ENHANCEMENTS (2026-09-30)

### Overview
The Transaction Ledger (`TransactionsPage.tsx`, `funds.controller.ts`, `funds.service.ts`) was significantly enhanced to provide full transparency, advanced reporting, and audit capabilities matching the Requests list view, with zero breaking database schema changes.

### Key Features Added
1. **Chronological Sorting (Ascending):**
   - Transactions are ordered oldest first (`orderBy: [{ date: 'asc' }, { createdAt: 'asc' }]`), allowing users to follow chronological ledger balances naturally from earlier dates (e.g. Sept 25) onward.
2. **Rich Row Columns (Sida Request List):**
   - **Date:** Formatted transaction timestamp.
   - **Company:** Distinct Somtel / Bluekom badge.
   - **Ref / Request #:** Direct request tracking (`#PC-YYYYMMDD-XXXX`) or ledger reference.
   - **Employee:** Full name of initiator or employee associated.
   - **Recipient:** Name and contact phone of the payment recipient or merchant.
   - **Region:** Geographic region pill associated with the request.
   - **Category:** Budget head name and accounting category.
   - **Type:** Color-coded movement badge (`PAYMENT`, `ALLOCATION`, `CARRY_FORWARD`, `TRANSFER_IN`, `TRANSFER_OUT`, `ADJUSTMENT`).
   - **Debit / Credit / Balance:** Clearly distinguished red negative outflow, green positive inflow, and running balance.
   - **Detail Modal:** Interactive eye icon opening a full popup card with all request details, remarks, and complete financial movement breakdown.
3. **Date Filtering & Presets:**
   - Quick presets: `All Dates`, `Today`, `This Week`, `This Month`, and `Custom Range...` with `From` and `To` date pickers.
4. **Company-Grouped Region Filter:**
   - The region dropdown cleanly groups regions under their respective company (`Somtel` / `Bluekom`) using `<optgroup>` to prevent confusion between identical region names across companies.
5. **Exports (Excel & PDF):**
   - **Export Excel (`.xls`):** Direct styled native spreadsheet download via `/api/funds/transactions/export-excel`.
   - **Export PDF:** Printable branded report view with summary totals and print dialog via `/api/funds/transactions/export-pdf`.
6. **Backend Enhancements:**
   - Database queries include nested request details (`user`, `receiverName`, `receiverPhone`, `region`, `budgetHead`, `department`).
   - Case-insensitive multi-field search across descriptions, reference numbers, remarks, employees, and request metadata.
   - Zero changes to Prisma schema (safe for live database and backward compatible).

---

## 16. CARRY-FORWARD DASHBOARD CARDS & CLOSE MONTH WORKFLOW (2026-10-01)

### Context / Problem Solved
At the start of each new month (e.g. October), Finance takes 1–5 days to initialize the new month's fund. During that window the dashboard showed **$0** for all balances — even though the previous month (September) still had an unspent carry-forward balance that employees and accountants needed to see.

### Changes Made

#### Backend — `reports.service.ts` (`getDashboardStats`)
- After computing the current-month `fundSummary`, if **both** `totalBalance === 0` AND `totalAllocated === 0` (meaning no fund has been set up yet for this month), the function now:
  1. Fetches the **previous month's** `PettyCashFund` rows.
  2. For each company, extracts `closingBalance ?? remainingBalance`.
  3. Attaches the result as `funds.prevMonthCarryForward`:
     ```json
     {
       "month": 9, "year": 2026, "totalBalance": 20700,
       "perCompany": [
         { "id": "...", "name": "Somtel", "balance": 12500, "status": "OPEN" },
         { "id": "...", "name": "Bluekom", "balance": 8200, "status": "OPEN" }
       ]
     }
     ```
  4. Field is `null` as soon as the current month has any allocation → cards vanish automatically.
- **No schema changes.** No new API endpoints.

#### Frontend — `DashboardPage.tsx`
- **SuperAdminDashboard** and **AccountantDashboard** both read `stats.funds.prevMonthCarryForward`.
- `carryCards` array is built using the **exact same `SummaryCard` component** and **existing color scheme** (Somtel → orange, Bluekom → blue — identical to normal company balance cards).
- Cards are spread into `mainCards` after `companyCards`:
  - Label: `"Somtel — Sep Balance"`
  - Value: `$12,500`
  - Sub: `"Sep 2026 carry-forward · Oct not yet funded"`
  - Click → `/funds` (Fund Management page)
- Cards **auto-disappear** the moment October is funded. Zero manual action required.
- Employee dashboard unchanged — Employees never see fund balance cards.

#### Backend — `funds.service.ts` + `FundManagementPage.tsx` (same commit)
- **Auto Carry-Forward on `initFund`:** when opening a new month and `openingBalance=0`, the backend automatically inherits the previous month's `closingBalance`, records a `CARRY_FORWARD` ledger entry, and closes the previous month if still OPEN.
- **"Close Month" button** added to Fund Management page: Accountant can explicitly close a month → remaining balance rolls over to the next month → confirmation modal → calls `POST /funds/close`.
- UI labels renamed: "Additional Funding" → "Monthly Allocation".

### Behavioral Rules
| Condition | Dashboard shows |
|-----------|----------------|
| Current month fund **not yet initialized** | Carry-forward cards from prev month |
| Current month fund **initialized** (any amount > 0) | Normal company balance cards (carry cards gone) |
| Current month fund initialized **but drained to $0** | Normal $0 cards (no carry-forward shown — this is a real zero) |

### Files Changed
| File | Change |
|------|--------|
| `backend/src/reports/reports.service.ts` | `getDashboardStats` — add `prevMonthCarryForward` fallback |
| `frontend/src/pages/DashboardPage.tsx` | `carryCards` in SuperAdmin + Accountant dashboards |
| `backend/src/funds/funds.service.ts` | Auto carry-forward in `initFund`, `closeMonth` logic |
| `frontend/src/pages/FundManagementPage.tsx` | Close Month button + modal, UI label renames |

> **Status:** ✅ Committed to `main`. Run `bash update-server.sh` on the Ubuntu server to deploy.

---

## 17. EMPLOYEE DATE FILTER (THIS MONTH) & APPROVED VS REQUESTED AMOUNT (2026-10-01)

### Context & Problem Solved
1. **Empty list confusion for regular employees:** The main requests table (`/requests`) defaulted to `TODAY`. If an employee hadn't submitted a request on the current day, they were presented with an empty table.
2. **Hidden approved amount adjustments:** When an accountant approved a request for an amount lower than requested (e.g., requested $50, approved $35), the table only displayed `requestedAmount` ($50), concealing the approved reduction until the user clicked "View".

### Implementation
1. **`RequestsListPage.tsx`:**
   - Role-based date preset: `EMPLOYEE` defaults to `'THIS_MONTH'` (1st of current month to today), while `ACCOUNTANT` and `SUPER_ADMIN` remain on `'TODAY'` to avoid heavy initial loads.
   - When requests list is empty under `THIS_MONTH`, the "View All Time Requests" button is offered just as under `TODAY`.
   - "Amount" column: If `status` is `APPROVED`, `PAID`, or `COMPLETED` and `approvedAmount !== requestedAmount`, it shows the approved amount in bold emerald (`$35.00`) with the original requested amount line-through below (`Req: $50.00`).
2. **`DashboardPage.tsx` (`RequestsTable`):**
   - Matching "Amount" column enhancement for the Employee Dashboard's "My Recent Requests" table.
3. **`RequestDetailPage.tsx`:**
   - Pre-fills `approvedAmountOverride` with `approvedAmount || requestedAmount`.
   - Passes `approvedAmount` during `ACCOUNTANT_REVIEW` (Stage 1 review) as well as `APPROVED` (Stage 2 review).

### Files Changed
- `frontend/src/pages/RequestsListPage.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/RequestDetailPage.tsx`

---

## 18. CLEAN URL ROUTING WITH REQUEST NUMBER (2026-10-01)

### Context & Problem Solved
- Previously, navigating to request details generated URLs with raw UUIDs: `/requests/d43dedcb-9044-4041-8d78-c27563408a8e`.
- This was poor UX: unreadable, hard to share, and gave no indication of the request identity.

### Implementation
1. **Backend (`requests.service.ts`):**
   - Added regex check `isUuid(id)`.
   - `findOne`, `update`, `delete`, and `review` resolve by either `id` (UUID) or `requestNumber` (e.g., `PC-20261001-0001`).
   - 100% backward compatible: both UUIDs and formatted request numbers are accepted.
2. **Frontend Routing & Links:**
   - `RequestsListPage.tsx`: Request # and "View" button link to `/requests/${req.requestNumber}`.
   - `DashboardPage.tsx`: "My Recent Requests" links to `/requests/${req.requestNumber}`.
   - `PaymentsPage.tsx`: Request link points to `/requests/${p.request?.requestNumber}`.
   - `SettlementsPendingPage.tsx`: "Audit" button links to `/requests/${st.request?.requestNumber}`.
   - `RequestDetailPage.tsx`: Edit link points to `/requests/edit/${request.requestNumber}`.

---

## 19. REGION TO COST CENTER ALIGNMENT (2026-10-01)

### Context & Problem Solved
- In the Petty Cash workflow, each request is tied to a `Region`, which enforces a region-specific monthly budget limit (`Region.monthlyBudget`).
- However, the `Cost Center` field on `PettyCashRequest` was previously displaying as blank/dash (`—`) on every request because it was not explicitly captured in the creation form.

### Implementation
1. **Backend (`requests.service.ts`):**
   - On `create`: When `dto.costCenter` is omitted but `dto.regionId` is provided, `costCenter` automatically defaults to the selected `Region.name`.
   - On `update`: If the region is updated and `dto.costCenter` is not explicitly set, `data.costCenter` is updated with the new `Region.name`.
2. **Frontend (`RequestDetailPage.tsx`):**
   - Displays `request.costCenter || request.region?.name || '—'`.
   - This ensures both existing historical requests and new requests immediately display the region as the Cost Center instead of an empty dash.

---

## 20. CROSS-MONTH APPROVAL & DISBURSEMENT ROLLOVER (2026-10-01)

### Context & Problem Solved
- When a request initiated in an earlier month (e.g. September) rolled over for final approval or payment in a subsequent month (e.g. October), the approval could encounter `"The petty cash fund is not open for approvals"` if the referenced fund month was closed.
- Additionally, if an accountant tested "Close Month" on a current month, the closed status would block further activity until the next month was funded.

### Implementation
1. **Database Recovery (Local):**
   - Reset local October 2026 fund (`PettyCashFund`) status back to `OPEN` (with its remaining balance intact) and cleared premature test records.
2. **Backend Fail-Safe (`funds.service.ts`):**
   - `recordApprovalInTransaction`: If the referenced fund is `CLOSED`, it automatically falls back to the company's active `OPEN` fund and logs the approval commit against it.
   - `recordPaymentInTransaction`: If the referenced fund is `CLOSED`, it also falls back to the company's active `OPEN` fund.
   - `getOrCreateCurrentMonthFund`: If the current month fund was marked `CLOSED`, it searches for any active `OPEN` fund for that company rather than returning a closed fund.

---

## 21. ROLE-AWARE FILTER HUB — HIDING REGION FILTER FOR EMPLOYEES (2026-10-01)

### Context & Problem Solved
- In `RequestsListPage.tsx`, the Region filter dropdown was shown to all users.
- Regular employees only have access to their own requests within their assigned region. Having a dropdown showing other regions was confusing and non-functional for employees (selecting other regions returned 0 records).

### Implementation
- `RequestsListPage.tsx`: Wrapped the Region filter dropdown in `{!isEmployee}` so it is only displayed to `ACCOUNTANT` and `SUPER_ADMIN` roles who oversee multi-region requests.

---

## 22. PRIMARY 'ADMIN' ACCOUNT LOCKOUT EXEMPTION (2026-10-01)

### Context & Problem Solved
- Previously, all accounts including `username: 'admin'` were subject to account lockout after 5 consecutive failed login attempts (1 hour in Stage 1, 6 hours in Stage 2).
- This posed serious risks:
  1. **Self-lockout:** The system owner/administrator could lock themselves out of the system if mistyping credentials.
  2. **Denial of Service (DoS):** An external actor knowing the default admin username could deliberately submit 5 bad passwords every hour to keep the system administrator permanently locked out.

### Implementation
- `backend/src/auth/auth.service.ts`:
  - Completely exempted `user.username === 'admin'` from `lockoutUntil` checks and failed login attempt counter increments.
  - Returns a generic `"Invalid username or password."` without displaying remaining attempt countdowns.
  - Reset database lockout flags on `admin` user.
  - Other user roles (`ACCOUNTANT`, `EMPLOYEE`, other `SUPER_ADMIN` accounts) retain standard progressive brute-force protection.

---

## 23. PRODUCTION GO-LIVE DATA CLEANUP (2026-10-03)

### Context
The system went live online for real production use on **2026-10-03**. Staff had already completed training using test/demo data. Before going live, all transactional/training data was cleared while preserving all reference/configuration data.

### Script Added
- **File:** `backend/scripts/clean-production-data.js`
- **Run with:** `node scripts/clean-production-data.js`
- **Cutoff date:** 2026-10-04 (deletes all records created before this date)

### What Was DELETED (Training Data)
| Table | Records Deleted |
|-------|----------------|
| PettyCashRequest | All |
| Payment | All |
| ExpenseSettlement | All |
| PettyCashFund | All (Sep 2026 test funds) |
| PettyCashLedger | All |
| PettyCashAttachment | All |
| Notification | All |
| AuditLog | All |
| RefreshToken | All (sessions reset, all users re-login) |

### What Was KEPT (Reference Data)
| Table | Kept |
|-------|------|
| Company | ✅ Somtel + Bluekom |
| User | ✅ All real users |
| Region | ✅ All regions |
| BudgetHead | ✅ All budget heads |
| Department | ✅ All departments |
| Role / Permission | ✅ |
| SystemSetting | ✅ |

### Go-Live Rules
- **Month billing starts October 2026** — first real October fund must be initialized by the Accountant
- Script is safe to re-run; it deletes based on `createdAt < CUTOFF_DATE`
- Script prints a full audit table before and after deletion
- All sessions are invalidated (RefreshToken table cleared entirely); all users must log in again

---

## 24. ACCOUNTANT / SUPER_ADMIN SUBMIT REQUEST FIX (2026-10-03)

### Business Rules (Accountant Role — Enforced in Both Frontend & Backend)

| Action | Accountant | SUPER_ADMIN | Notes |
|--------|-----------|-------------|-------|
| Submit new request | ✅ Yes | ✅ Yes | Even when October fund not yet initialized |
| Save as draft | ✅ Yes | ✅ Yes | |
| Review (Stage 1: forward to CFO) | ✅ Yes (others' requests) | ✅ Yes | |
| **Approve OWN request** | ❌ **NO — Blocked** | ✅ Yes | Backend throws `ForbiddenException` |
| Approve others' requests | ✅ Yes (Stage 2) | ✅ Yes | |
| Record payment | ✅ Yes (after APPROVED) | ✅ Yes | Only after final approval |
| Fund management | ✅ Yes | ✅ Yes | Initialize, top-up, close month |

### Self-Approval Prevention (Backend — `requests.service.ts`)
Two layers of protection:
1. **Pre-check (line 535):** Before transaction starts
2. **In-transaction (line 552):** Inside `$transaction` to prevent race conditions

```typescript
// Self-approval guard
if (reviewerRole === RoleName.ACCOUNTANT && request.userId === reviewerId) {
  throw new ForbiddenException(
    'You cannot approve your own request. Please ask a Super Admin (CFO) to review and approve it.'
  );
}
```

### Self-Approval Prevention (Frontend — `RequestDetailPage.tsx`)
```tsx
// Line 220
const isOwnRequest = user?.role === 'ACCOUNTANT' && request?.userId === user?.id;

// Line 499 — Review panel hidden if own request
{isAccountant && !isOwnRequest && (request.status === 'PENDING_APPROVAL' || ...)}
```
When `isOwnRequest === true`: The entire review panel (Approve/Reject/Correction buttons) is **hidden** from the UI.

### Workflow for Accountant's Own Request
1. Accountant submits request → `PENDING_APPROVAL`
2. Another Accountant (or SUPER_ADMIN) forwards to `ACCOUNTANT_REVIEW`
3. **SUPER_ADMIN (CFO) approves** → `APPROVED`
4. Accountant records payment → `PAID`

### Problem (Fixed)
After the October go-live cleanup, **Accountant and SUPER_ADMIN users could not submit new petty cash requests** via `RequestFormPage.tsx`. The "Submit Request" button was disabled and the form showed a "Fund Unavailable" warning banner.

### Root Cause
`RequestFormPage.tsx` had a hard frontend block that applied to ALL roles:
```tsx
// OLD (broken):
disabled={fundAvailability !== null && !fundAvailability.available}
```

### Fix Applied
- `frontend/src/pages/RequestFormPage.tsx`
  - Added `const isEmployee = (user as any)?.role === 'EMPLOYEE'`
  - Fund unavailability banner: only shown to `isEmployee`
  - Submit button disabled by fund check: only for `isEmployee`
  - Region over-budget block on submit button: only for `isEmployee`

### Files Changed
| File | Change |
|------|--------|
| `frontend/src/pages/RequestFormPage.tsx` | `isEmployee` guard on fund/budget blocks |

> **Status:** ✅ Fixed 2026-10-03. Commit `2941f35`. Run `bash update-server.sh` on the Ubuntu server.

---

## 25. SERVER DEPLOY COMMAND (Quick Reference)

After every `git push`, run this on the Ubuntu server terminal:

```bash
cd ~/app
bash update-server.sh
```

### To Clean Production Data (Once — Already Done 2026-10-03)
```bash
cd ~/app
node backend/scripts/clean-production-data.js
```

> ⚠️ Only run the cleanup script **once**. It is idempotent (safe to re-run) but will delete any real October requests if run again without adjusting the CUTOFF_DATE.

---

## 26. SELF-SERVICE CHANGE PASSWORD (2026-10-09)

### Context / Problem Solved
Users had no way to change their own password after the forced first-login reset. The only way to get a new password was for an Admin to reset it — which generated a new one-time temporary password. This was inconvenient for everyday password management.

### Implementation — Frontend Only (No Schema or Backend Changes)

#### Backend (already existed — no changes made)
- **Endpoint:** `POST /api/auth/change-password`
- **Guard:** `JwtAuthGuard` (requires active session)
- **DTO:** `{ oldPassword: string, newPassword: string }` (`ChangePasswordDto`)
- **Logic:** bcrypt compare old → hash new → update DB → invalidate all refresh tokens
- **File:** `backend/src/auth/auth.service.ts` → `changePassword()`
- **Controller:** `backend/src/auth/auth.controller.ts` (line 44–51)

#### Frontend Change (`frontend/src/layouts/DashboardLayout.tsx`)
- Updated bottom sidebar user card to have an upward popup menu (matching modern web apps) showing User info, "Change Password", and "Log out".
- Clicking "Change Password" opens a dedicated modal with: **Current Password**, **New Password**, and **Confirm New Password**.
- State variables: `showCpModal`, `showProfileDropdown`, `cpOldPass`, `cpNewPass`, `cpConfirm`, `cpShowOld/New/Confirm`, `cpError`, `cpSuccess`, `cpSaving`.
- Function: `handleChangePassword()` — calls `POST /auth/change-password`.
- Icons used: `KeyRound`, `Eye`, `EyeOff`, `ChevronUp`, `LogOut`.

#### UX Details
- **Trigger:** Sidebar bottom user card click toggles the popup menu.
- **Current Password** field with show/hide toggle.
- **New Password** field with show/hide toggle + real-time strength bar (`Too short` / `Good` / `Strong`).
- **Confirm Password** field with real-time match indicator (red border if mismatch, green if match).
- **Warning banner:** "After changing your password, you will be signed out and need to log in again."
- **On success:** Green message → modal auto-closes after 1.8s → session invalidated.
- **Client-side validation:** min 8 chars, passwords must match, new ≠ old.
- `Enter` key on Confirm field submits the form.

### Files Changed
| File | Change |
|------|--------|
| `frontend/src/layouts/DashboardLayout.tsx` | Sidebar bottom profile popup + Change Password modal |

### Deployment
```bash
# No schema migration needed — frontend-only change
cd ~/app && bash update-server.sh
```

> **Status:** ✅ Implemented 2026-10-09. Zero downtime deploy. No schema changes.

---

## 27. INVOICE NUMBER VISIBILITY IN REQUEST DETAIL & TRANSACTION LEDGER (2026-10-09)

### Problem Solved
1. When recording a disbursement payment, users enter an **Invoice Number** (e.g., `456`). In the Request Detail view under payment history, it was previously labeled ambiguously as `Ref: 456`.
2. In the **Transaction Ledger** table (`/transactions`), the column `Ref / Req #` only showed `#PC-20261009-0001` whenever a request number existed, completely hiding the invoice/reference number (`456`). The transaction detail modal also omitted the invoice number when a request number was present.

### Implementation
1. **Frontend (`RequestDetailPage.tsx`):**
   - Labeled payment history reference as compact `Invoice #: 456` instead of `Ref: 456`.
2. **Frontend (`TransactionsPage.tsx`):**
   - Table header updated to `Req / Invoice #`.
   - Table cell now renders both the Request # (e.g., `#PC-20261009-0001`) and the Invoice Number (e.g., `Inv #: 456`).
   - Transaction Detail view modal now displays **Invoice #** in a dedicated field.
3. **Backend (`backend/src/funds/funds.service.ts`):**
   - Added `invoiceNumber` to search filter `where.OR.request.OR`.
   - Included `invoiceNumber: true` in `request.select` for ledger queries, Excel export, and PDF export.
   - Updated Excel and PDF exports to display the invoice number alongside the request number.

### Production Safety & Backward Compatibility
- **Zero Schema Change:** `PettyCashLedger.referenceNumber`, `Payment.referenceNumber`, and `PettyCashRequest.invoiceNumber` have always existed in the PostgreSQL database.
- **100% Backward Compatible:** All historical and existing production requests and ledger transactions automatically display their invoice numbers without any data modification or risk of corruption.
- **Zero Downtime:** Simply run `git push origin main` locally, then `bash update-server.sh` on the Ubuntu production server.

### Files Changed
| File | Change |
|------|--------|
| `frontend/src/pages/RequestDetailPage.tsx` | Display `Invoice #: [number]` in payment history section |
| `frontend/src/pages/TransactionsPage.tsx` | Show both Request # and `Inv #: [number]` in table and detail modal |
| `backend/src/funds/funds.service.ts` | Search support, include `invoiceNumber`, and export formatting |

> **Status:** ✅ Implemented 2026-10-09. Zero downtime deploy. No schema migration needed.


---

## 28. 📒 Monthly Petty Cash Book Export (.xlsx) — Historical Format

### Overview
Accountants can export a fully formatted **Monthly Petty Cash Book** in the exact Excel format that was historically used (matching `Petty Cash book.xlsx`). The workbook contains two sheets — one per company — with embedded logos, eDahab account numbers, running balance formulas, and a formal reconciliation card.

### Sheet Format (per company)
| Area | Details |
|------|---------|
| **Logo** | Somtel banner (`somtel-banner.png`, 190×48px) or Bluekom round logo (`bluekom-logo.jpeg`, 52×52px) |
| **Header** | Company name, eDahab NO (763238 Somtel / 763241 Bluekom), Opening Balance, Closing Balance, Currency |
| **Columns** | S/N, Date, #No (Invoice/Ref), Payee Name#, Expenses Description, Category, Region, Credit (Money In), Debit (Money Out), Balance |
| **Row 7** | Top-up / Float Allocation row with `H7+H3` formula |
| **Data rows** | All PAYMENT ledger entries for the requested month, sorted by date |
| **Total Row** | `SUM(I7:Ixx)` for debit, `SUM(H7:Hxx)` for credit, final balance reference |
| **Reconciliation Card** | Opening Balance, Additional Top-Up, Total Disbursed, Net Remaining (D col summary block) |
| **Sign-off** | Prepared By / Verified By / Approved By (CFO) signature lines |

### Brand Colors
| Company | Header BG | Accent |
|---------|-----------|--------|
| Somtel | `#0B2545` (navy) | `#D97706` (gold) |
| Bluekom | `#1E40AF` (royal blue) | blue tones |

### Backend Implementation
- **Service:** [`backend/src/funds/monthly-book.service.ts`](file:///d:/Petty%20Cash%20App/backend/src/funds/monthly-book.service.ts)
  - `MonthlyBookService.generateMonthlyBook(month?, year?, companyId?)` → `{ buffer: Buffer, filename: string }`
  - Uses ExcelJS (`^4.4.0`) for real `.xlsx` with embedded images, formulas, and cell styles
  - Logo paths are resolved via multiple candidate dirs so the feature works both in dev and from the compiled `dist/` on the server
- **Controller:** [`backend/src/funds/funds.controller.ts`](file:///d:/Petty%20Cash%20App/backend/src/funds/funds.controller.ts)
  - `GET /api/funds/export/monthly-book?month=:m&year=:y&companyId=:cid`
  - Requires JWT auth. Employees are scoped to their own company automatically.

### Frontend Integration
- **Fund Management Page** (`FundManagementPage.tsx`): Green "Export Book" button in toolbar — exports the current selected company + month/year.
- **Reports Page** (`ReportsPage.tsx`): Teal "Monthly Book (.xlsx)" button — uses the current date filter to pick month/year.

### Logo Assets
| Company | Backend Path | Frontend Path |
|---------|-------------|---------------|
| Somtel | `backend/assets/logos/somtel-banner.png` | `frontend/public/logos/somtel-banner.png` |
| Bluekom | `backend/assets/logos/bluekom-logo.jpeg` | `frontend/public/logos/bluekom-logo.jpeg` |

### Production Safety
- **Zero schema changes** — reads only from existing `PettyCashFund` and `PettyCashLedger` tables.
- **Zero downtime** — additive GET endpoint, no migrations, no destructive changes.
- **Date filter:** Ledger entries are filtered by `transactionType = 'PAYMENT'` and `date` within the selected month range.

> **Status:** ✅ Implemented 2026-10-09. No schema migrations needed.

