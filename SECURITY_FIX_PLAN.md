# 🛡️ SECURITY FIX PLAN — Petty Cash Management System
**Project:** Somtel / Bluekom Petty Cash App  
**Audit Date:** 2026-10-27  
**Status:** 📋 Ready for Implementation (Work Deferred / Planning Phase)  
**Target Branch:** `main`  
**Applicable Environments:** Development & Ubuntu Production (`pettycash.bluekompl.com`)  

---

## 📌 Executive Summary

On 2026-10-27, a full-system defensive security audit and source code scan was conducted across the backend (NestJS), database layer (Prisma/PostgreSQL), file attachments, infrastructure scripts, and web server configurations.

### Summary of Results:
- **SQL Injection:** 🟢 **PASSED.** All raw queries use parameter placeholders (`$1, $2`) or Prisma ORM. No SQL injection vulnerabilities found.
- **Authentication & Token Rotation:** 🟢 **PASSED.** SHA-256 refresh tokens, atomic rotation, 3-stage lockout, and JWT secret validation (>= 64 chars) are functional.
- **File Upload & Path Traversal:** 🟢 **PASSED.** MIME + extension whitelists enforced; `validateOwnedUploads` strictly blocks cross-user file references.
- **Vulnerabilities Identified for Remediation:** **8 items** (2 Critical, 2 High, 4 Medium).

---

## 📊 Security Remediation Matrix

| ID | Vulnerability / Issue | Severity | Affected Component | Effort |
|---|---|---|---|---|
| **SEC-01** | Privilege Escalation & Admin Account Takeover (`ACCOUNTANT` role in User Controller) | 🔴 CRITICAL | `backend/src/users/users.controller.ts` | 15 mins |
| **SEC-02** | Cloudflare Tunnel Secret Token committed in Git | 🔴 CRITICAL | `run-tunnel.sh` | 20 mins |
| **SEC-03** | Client-Supplied `remainingBalance` in Expense Settlements (Financial Logic Flaw) | 🟠 HIGH | `backend/src/settlements/settlements.service.ts` | 30 mins |
| **SEC-04** | Predictable Hardcoded Seed Passwords (`Welcome@2026`) on User Create & Reset | 🟠 HIGH | `backend/src/users/users.service.ts` | 25 mins |
| **SEC-05** | Production CORS Bypass for Localhost & Private Subnets | 🟡 MEDIUM | `backend/src/main.ts` | 15 mins |
| **SEC-06** | DoS / Memory Exhaustion via Uncapped `pageSize` in Fund Transactions | 🟡 MEDIUM | `backend/src/funds/funds.controller.ts` | 10 mins |
| **SEC-07** | Formula Injection (CSV DDE Injection) in Request CSV Export | 🟡 MEDIUM | `backend/src/reports/reports.service.ts` | 15 mins |
| **SEC-08** | Nginx Dropping Parent Security Headers on Static Asset Locations | 🟡 MEDIUM | `nginx-ubuntu.conf` | 15 mins |
| **SEC-09** | Best Practice Hardening: Replace `$executeRawUnsafe` with Prisma tagged `$executeRaw` | 🟢 LOW | `funds.service.ts`, `payments.service.ts`, `requests.service.ts` | 30 mins |

---

## 🛠️ Detailed Remediation Steps & Code Fixes

### 🔴 SEC-01: Fix User Controller Role Authorization (Privilege Escalation)
* **File:** `backend/src/users/users.controller.ts`
* **Root Cause:** `@Roles(RoleName.SUPER_ADMIN, RoleName.ACCOUNTANT)` was set on the class level. This allowed any accountant to update roles or reset the master admin password.
* **Fix Required:**
  Remove `RoleName.ACCOUNTANT` from the class decorator. User management must be restricted strictly to `SUPER_ADMIN`.
  ```diff
  - @Roles(RoleName.SUPER_ADMIN, RoleName.ACCOUNTANT)
  + @Roles(RoleName.SUPER_ADMIN)
    @Controller('users')
    export class UsersController {
  ```
  Additionally, inside `users.service.ts:resetPassword()`, add an explicit guard preventing the reset of the primary `admin` user via the standard user reset endpoint.

---

### 🔴 SEC-02: Rotate Cloudflare Tunnel Token & Remove from Git
* **File:** `run-tunnel.sh`
* **Root Cause:** A live Cloudflare Tunnel credential was committed as a plaintext string in `run-tunnel.sh`.
* **Fix Required:**
  1. Go to the Cloudflare Zero Trust Dashboard → Access → Tunnels.
  2. Revoke the existing tunnel token and generate a new one.
  3. Modify `run-tunnel.sh` to read the token from an environment variable or a local non-committed config file:
  ```diff
  - TOKEN="eyJhIjoiZDM5YmNiMzMwNTliMDA2NzU1ZTVlNmNhOWMyZjA5NDMiLCJ0Ijoi..."
  + TOKEN="${CLOUDFLARE_TUNNEL_TOKEN}"
  + if [ -z "$TOKEN" ]; then
  +   echo "Error: CLOUDFLARE_TUNNEL_TOKEN is not set in environment."
  +   exit 1
  + fi
  ```
  4. Ensure `run-tunnel.sh` references `.env` or system environment variable on the server.

---

### 🟠 SEC-03: Server-Side Calculation of Settlement Balances
* **Files:** 
  - `backend/src/settlements/settlements.service.ts`
  - `backend/src/settlements/dto/settlement.dto.ts`
* **Root Cause:** The client submitted `remainingBalance` directly, which was persisted and used to refund money back to the company fund without validation.
* **Fix Required:**
  1. In `settlements.service.ts`, fetch the total amount disbursed/approved for the request.
  2. Compute `remainingBalance` server-side:
  ```ts
  const approvedLimit = Number(request.approvedAmount || request.requestedAmount);
  const calculatedRemaining = Math.max(0, approvedLimit - Number(dto.actualExpenseAmount));
  ```
  3. Discard or validate any client-provided `dto.remainingBalance` against `calculatedRemaining`.
  4. Save `calculatedRemaining` to the database record.

---

### 🟠 SEC-04: Dynamic Cryptographic Passwords for User Creation & Resets
* **File:** `backend/src/users/users.service.ts`
* **Root Cause:** `Welcome@2026` was hardcoded as the initial password for all created users and password resets.
* **Fix Required:**
  1. Import `randomBytes` from `crypto`.
  2. Generate a secure, unique 12-character one-time temporary password:
  ```ts
  const temporaryPassword = randomBytes(9).toString('base64url'); // e.g. "K7mX9qP2wL4z"
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);
  ```
  3. Return `temporaryPassword` to the Super Admin in the API response so it can be delivered to the user securely.

---

### 🟡 SEC-05: Enforce Strict CORS in Production
* **File:** `backend/src/main.ts`
* **Root Cause:** The `isPrivateOrLocal` regex allowed `localhost` and private subnets without checking `NODE_ENV`.
* **Fix Required:**
  Wrap the local subnet check inside a development-only condition:
  ```diff
  - if (isPrivateOrLocal) {
  -   return callback(null, true);
  - }
  + if (process.env.NODE_ENV !== 'production' && isPrivateOrLocal) {
  +   return callback(null, true);
  + }
  ```

---

### 🟡 SEC-06: Cap `pageSize` on Fund Transactions
* **File:** `backend/src/funds/funds.controller.ts`
* **Root Cause:** `getTransactions` lacked a `Math.min(100, ...)` upper bound, risking database Denial of Service.
* **Fix Required:**
  ```diff
    const pageNum = parseInt(page as any, 10) || 1;
  - const size = parseInt(pageSize as any, 10) || 20;
  + const size = Math.min(100, Math.max(1, parseInt(pageSize as any, 10) || 20));
  ```

---

### 🟡 SEC-07: Sanitize Formula Injection in CSV Export
* **File:** `backend/src/reports/reports.service.ts`
* **Root Cause:** User strings in `generateCSV` starting with `=`, `+`, `-`, or `@` could trigger dynamic execution in spreadsheet applications.
* **Fix Required:**
  In `generateCSV`, sanitize field values:
  ```ts
  let valStr = String(val).replace(/"/g, '""');
  if (/^[=\+\-\@\t\r]/.test(valStr)) {
    valStr = "'" + valStr;
  }
  return `"${valStr}"`;
  ```

---

### 🟡 SEC-08: Preserve Security Headers on Static Asset Requests in Nginx
* **File:** `nginx-ubuntu.conf`
* **Root Cause:** Nginx ignores parent block `add_header` directives whenever a nested `location` defines its own `add_header`.
* **Fix Required:**
  In `nginx-ubuntu.conf`, repeat security headers inside the static assets location block, or ensure `Cache-Control` is handled without clearing security headers.

---

### 🟢 SEC-09: Harden Raw SQL Execution
* **Files:** `funds.service.ts`, `payments.service.ts`, `requests.service.ts`
* **Action:** Transition from `$executeRawUnsafe('... $1', id)` to tagged template `$executeRaw`SELECT ... ${id}``. This eliminates the keyword `Unsafe` and ensures future modifications cannot introduce string-interpolated SQLi.

---

## 🚀 Execution & Verification Checklist

When you are ready to implement these fixes:

- [ ] **Step 1:** Apply backend code fixes (SEC-01, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-09).
- [ ] **Step 2:** Test API endpoints locally:
  - Verify that an `ACCOUNTANT` token receives `403 Forbidden` on `PUT /api/users/:id` and `POST /api/users/:id/reset-password`.
  - Verify that `POST /api/settlements` computes `remainingBalance` server-side.
  - Verify that `pageSize=99999` on `/api/funds/transactions` returns a maximum of 100 rows.
  - Verify that new user creation returns a unique random temporary password.
- [ ] **Step 3:** Rotate Cloudflare Tunnel secret and update `run-tunnel.sh` (SEC-02).
- [ ] **Step 4:** Update `nginx-ubuntu.conf` (SEC-08) and test with `sudo nginx -t`.
- [ ] **Step 5:** Commit changes with message:
  ```bash
  git commit -m "security: fix user authorization, settlement balance calculation, CORS and CSV injection"
  git push origin main
  ```
- [ ] **Step 6:** Run `bash update-server.sh` on the Ubuntu production VM.
