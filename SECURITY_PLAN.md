# ?? SECURITY PLAN — Petty Cash Management System
**Project:** Somtel / Bluekom Petty Cash App
**Audit Date:** 2026-10-10
**Audited By:** AI Security Analyst
**Last Updated:** 2026-10-10

---

## ?? Issue Tracker

| ID | Issue | Severity | Status | Fixed In |
|---|---|---|---|---|
| S-01 | Tokens in `localStorage` (XSS risk) | ?? HIGH | ? Open — Phase 3 | Pending |
| S-02 | MinIO default credentials (`minioadmin`) | ?? HIGH | ? Open — manual on server | Pending |
| S-03 | JWT fallback hardcoded secrets | ?? HIGH | ? Already fixed by `setup.sh` | `ensure-jwt-secrets.js` |
| S-04 | Swagger exposed in production | ?? HIGH | ? Already disabled | `ENABLE_SWAGGER=false` |
| S-05 | CORS: localhost bypass in production | ?? MEDIUM | ? Fixed 2026-10-10 | `main.ts` |
| S-06 | Rate limiting too permissive (300/min) | ?? MEDIUM | ? Deferred | Next sprint |
| S-07 | File upload: MIME type bypass (`octet-stream`) | ?? MEDIUM | ? Fixed 2026-10-10 | `attachments.controller.ts` |
| S-08 | Excel budget export: XSS via unescaped fields | ?? MEDIUM | ? Fixed 2026-10-10 | `reports.service.ts` |
| S-09 | Settlements notifications: no companyId filter | ?? MEDIUM | ? Fixed 2026-10-10 | `settlements.service.ts` |
| S-10 | Nginx: missing CSP + Permissions-Policy headers | ?? MEDIUM | ? Fixed 2026-10-10 | `nginx-ubuntu.conf` |
| S-11 | Console.log printing sensitive notification content | ?? LOW | ? Fixed 2026-10-10 | `notifications.service.ts` |
| S-12 | `pageSize` not capped — data exfiltration risk | ?? LOW | ? Fixed 2026-10-10 | `requests.controller.ts` |

---

## ? Fixes Applied — 2026-10-10

All code fixes require `bash update-server.sh` on the Ubuntu server.
The nginx config fix requires one manual `sudo cp` step (see Deployment section).

### Fix A — pageSize Cap
**File:** `backend/src/requests/requests.controller.ts`
Added `Math.min(100, ...)` guard. Users can no longer dump the full DB via `?pageSize=999999`.

### Fix B — Excel Export XSS
**File:** `backend/src/reports/reports.service.ts`
Applied `escapeHtml()` to all user-sourced fields in `exportBudgetHeadsExcel()`.

### Fix C — Settlements Cross-Tenant Notification Leak
**File:** `backend/src/settlements/settlements.service.ts`
`notifyAccountants()` now accepts `companyId` and scopes notifications to that company only.

### Fix D — Sensitive Data in Server Logs
**File:** `backend/src/notifications/notifications.service.ts`
Removed `console.log()` that printed payment amounts and request numbers to PM2 logs.

### Fix E — File Upload MIME Bypass
**File:** `backend/src/attachments/attachments.controller.ts`
Removed `application/octet-stream` from allowedMimeTypes. Files with no Content-Type are now rejected.

### Fix F — CORS Production Bypass
**File:** `backend/src/main.ts`
localhost origins now only allowed when `NODE_ENV !== 'production'`. Production enforces strict origin checking.

### Fix G — Nginx Security Headers
**File:** `nginx-ubuntu.conf`
Added `Content-Security-Policy` and `Permissions-Policy` headers. HSTS omitted — Cloudflare handles HTTPS.

---

## ?? Deployment Instructions

### Step 1 — Push (Local Windows Machine)
```powershell
git add -A
git commit -m "security: fix CORS, MIME bypass, XSS export, notification leak, pageSize cap, sensitive logs"
git push origin main
```

### Step 2 — Deploy Backend (Ubuntu Server)
```bash
cd ~/app
bash update-server.sh
```

### Step 3 — Apply Nginx Config (Ubuntu Server — One-Time Manual Step)
```bash
sudo cp ~/app/nginx-ubuntu.conf /etc/nginx/sites-available/petty-cash
sudo nginx -t
sudo nginx -s reload
```

### Step 4 — Verify
```bash
pm2 list
pm2 logs petty-cash-backend --lines 20
curl -sI https://pettycash.bluekompl.com | grep -i "content-security\|permissions"
```

---

## ? Open Issues — Future Sprints

### S-01: Token Storage (localStorage ? httpOnly Cookies) [Next Sprint]
Requires coordinated frontend + backend change. Test on staging first.

### S-02: MinIO Default Credentials [ASAP — Manual on Server]
```bash
mc admin user add local pettycash_prod "NewStr0ngP@ssw0rd!"
mc admin policy attach local readwrite --user pettycash_prod
# Update MINIO_ACCESS_KEY and MINIO_SECRET_KEY in backend .env, then pm2 restart
```

### S-06: Rate Limiting [Next Sprint]
Reduce global throttle from 300 to 100 req/min. Add per-endpoint limits on payments/approvals.

---

## ?? Security Controls Already in Place (Do Not Remove)

| Control | File |
|---|---|
| SQL injection prevention — parameterized queries | `funds.service.ts`, `requests.service.ts` |
| Progressive 3-stage account lockout | `auth.service.ts` |
| Refresh token rotation + SHA-256 hashing | `auth.service.ts` |
| JWT validates user `status === ACTIVE` every request | `jwt.strategy.ts` |
| Multi-tenant company isolation | `CompanyIsolationGuard` |
| File path traversal prevention | `attachments.controller.ts` |
| Attachment ownership validation | `attachments.controller.ts` |
| Self-approval prevention | `requests.service.ts` |
| Docker ports bound to 127.0.0.1 only | `docker-compose.yml` |
| First-login forced password reset | Frontend + backend |
| PDF report HTML escaping | `reports.service.ts` |
| Admin account cannot be disabled via API | `users.service.ts` |

---

## ??? Review Schedule

| Date | Action |
|---|---|
| 2026-10-10 | Initial audit completed. Fixes A-G applied |
| Next sprint | S-01: localStorage ? httpOnly cookies |
| ASAP (manual) | S-02: MinIO credentials rotation |
| Next sprint | S-06: Rate limiting tightening |
| Quarterly | Re-run security audit on new endpoints |
