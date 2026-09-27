# 📊 PETTY CASH MANAGEMENT SYSTEM — REPORTING PLAN (FINAL)
**Document:** `Reportplan.md`
**Author:** Pair Programming Agent & System Architect
**Date:** 2026-09-27 (Final — Approved)
**Status:** ✅ Decisions Made — Ready for Implementation
**Target:** Somtel & Bluekom Multi-Tenant Petty Cash Architecture

---

## ✅ CONFIRMED DECISIONS (All 4 Questions Answered)

| # | Question | Decision |
|---|---|---|
| 1 | Budget Head nullable? | **MANDATORY** — No request can be submitted without selecting a Budget Head |
| 2 | Company view vs Region view? | **Both** — Keep company-level view + add Region breakdown within same tab |
| 3 | Daily trend — all days or active only? | **Separate section** — Daily trend is its own dedicated view |
| 4 | Budget % denominator? | **`Region.monthlyBudget`** = primary budget cap for utilization % |

---

## ⚠️ ARCHITECTURE CORRECTION (Confirmed)

```
Company (Somtel / Bluekom)
├── Region (Nugaal, Mudug, Bari...)
│   ├── monthlyBudget  ← THE ENFORCED BUDGET CAP (used for % utilization)
│   └── PettyCashRequest[]
│       ├── budgetHeadId  ← NOW MANDATORY (enforced at app layer, not schema)
│       ├── approvedAmount
│       ├── status
│       └── requestDate
│
└── BudgetHead (Transportation, Tasliix, Refreshment...)
    ├── monthlyLimit  ← reference soft-limit per company (shown as info)
    └── companyId
```

---

## 1. 🔒 DECISION 1 — Budget Head is MANDATORY

### What Changes
- `budgetHeadId` remains `String?` (nullable) in schema — **no migration needed** (preserves existing data)
- Enforcement is done at the **application layer only**:

| Layer | Change |
|---|---|
| **Backend** | `requests.service.ts` → `createRequest()` and `updateRequest()` throw `BadRequestException` if `budgetHeadId` is null/missing |
| **Frontend** | `RequestFormPage.tsx` → Budget Head field marked required (`*`), form cannot submit without it |
| **Existing data** | Existing requests with null `budgetHeadId` remain untouched — report shows them as "Uncategorized" |

---

## 2. 📊 DECISION 2 — Report Tab Structure (Company + Region Views)

### Tab Layout Inside `ReportsPage.tsx`

```
[ Expense Analytics ]  |  [ Budget Head Report ]  |  [ System Audit Trail ]
```

Inside **"Budget Head Report"** tab, a **View Toggle**:

```
[ 📊 By Company ]   [ 🗺️ By Region ]   [ 📅 Daily Trend ]
```

#### View A: "By Company" (Current — Keep As-Is)
- Rows = Budget Head categories
- Columns = Somtel | Bluekom | Combined Total | Budget | Remaining | % | Status
- Budget reference = `BudgetHead.monthlyLimit` per company
- Grand Total footer
- ✅ Already implemented

#### View B: "By Region" (NEW)
- Rows = Regions (grouped by company)
- Columns = Budget Head categories as pivot columns + Total Spent | Region Budget | % Used | Status
- Budget reference = `Region.monthlyBudget`
- Example:

| Region | Company | Tasliix | Transport | Refreshment | … | **Total** | Budget | % | Status |
|---|---|---|---|---|---|---|---|---|---|
| Nugaal | 🟠 Somtel | $180 | $420 | $60 | … | **$660** | $5,000 | 13% | Safe |
| Nugaal | 🔵 Bluekom | $200 | $310 | $90 | … | **$600** | $4,000 | 15% | Safe |
| Mudug | 🟠 Somtel | $80 | $150 | $30 | … | **$260** | $3,000 | 8% | Safe |
| **TOTAL** | | $460 | $880 | $180 | … | **$1,520** | | | |

- Click any row → slide-over drawer with individual transactions
- Click any cell → filter drawer to that region + budget head

#### View C: "Daily Trend" (NEW — Separate Section)
- Bar/Line chart: X-axis = date, Y-axis = amount spent
- One line/bar per company (Somtel 🟠 vs Bluekom 🔵)
- Optional: toggle to show per-region lines
- Data from new `/api/reports/region-budget-heads/daily` endpoint

---

## 3. 🔌 BACKEND API SPECIFICATION (Final)

### Existing (Keep)
```
GET /api/reports/budget-heads              → Company-level matrix (uses BudgetHead.monthlyLimit)
GET /api/reports/export-budget-heads-excel → Excel export of company matrix
```

### New Endpoints Needed

#### `GET /api/reports/region-budget-heads`
```
Query params:
  startDate    YYYY-MM-DD (default: first of current month)
  endDate      YYYY-MM-DD (default: last of current month)
  companyId    UUID (optional — filter by company)
  regionId     UUID (optional — filter by single region)
  statusScope  PAID_ONLY | APPROVED_AND_PAID (default: PAID_ONLY)
```

Response shape:
```json
{
  "period": { "startDate": "2026-09-01", "endDate": "2026-09-30", "statusScope": "PAID_ONLY" },
  "summary": { "totalSpent": 2440, "somtelSpent": 1520, "bluekomSpent": 920 },
  "budgetHeads": ["Tasliix", "Transportation", "Refreshment", ...],
  "rows": [
    {
      "regionId": "uuid",
      "regionName": "Nugaal",
      "companyName": "Somtel",
      "regionBudget": 5000,
      "totalSpent": 660,
      "percentageUsed": 13.2,
      "status": "SAFE",
      "byCategory": {
        "Tasliix":        { "spent": 180, "count": 6 },
        "Transportation": { "spent": 420, "count": 12 },
        "Refreshment":    { "spent": 60,  "count": 3 },
        "Uncategorized":  { "spent": 0,   "count": 0 }
      }
    }
  ]
}
```

#### `GET /api/reports/region-budget-heads/daily`
```
Query params: same as above
```
Response shape:
```json
{
  "days": [
    {
      "date": "2026-09-01",
      "somtelSpent": 240,
      "bluekomSpent": 180,
      "totalSpent": 420,
      "byRegion": [
        { "regionName": "Nugaal", "companyName": "Somtel", "spent": 120 },
        { "regionName": "Mudug",  "companyName": "Somtel", "spent": 120 }
      ]
    }
  ]
}
```

#### `GET /api/reports/export-region-budget-heads-excel`
- Sheet 1: Summary KPIs
- Sheet 2: Region Matrix (pivot table)
- Sheet 3: Daily Trend

---

## 4. 🎨 FRONTEND CHANGES NEEDED

### File: `RequestFormPage.tsx`
- Make Budget Head select field **required** (add `required` attribute + validation message)
- Show asterisk (*) next to label
- Disable submit button if no budget head selected

### File: `reports.service.ts` (backend)
- Add `getRegionBudgetHeadReport()` method
- Add `getRegionBudgetHeadDaily()` method
- Add `exportRegionBudgetHeadsExcel()` method

### File: `reports.controller.ts` (backend)
- Add 3 new `@Get` endpoints

### File: `ReportsPage.tsx` (frontend)
- Add view toggle inside Budget Head Report tab: `By Company` | `By Region` | `Daily Trend`
- Implement `RegionMatrixView` component (new)
- Implement `DailyTrendView` component (new)
- Keep existing `BudgetHeadReportTab` for "By Company" view

---

## 5. 🛡️ SAFETY & DATA INTEGRITY

- **Zero schema changes** — `budgetHeadId` stays nullable in schema; validation is at app layer
- **Existing requests preserved** — old requests with null `budgetHeadId` shown as "Uncategorized"
- **Tenant isolation:** Accountant sees only their company's regions; SUPER_ADMIN sees all
- **`Region.monthlyBudget`** is the budget cap for % utilization in region view
- **`BudgetHead.monthlyLimit`** remains the reference in company view (existing behavior)

---

## 6. 🚀 IMPLEMENTATION ROADMAP

- [x] Step 1: Architecture plan created (v1)
- [x] Step 2: Backend `getBudgetHeadReport` (company-level)
- [x] Step 3: Frontend Budget Head tab — "By Company" view
- [x] Step 4: Architecture revised (region-aware, correct model understanding)
- [x] Step 5: Decisions confirmed by user
- [ ] **Step 6: Backend — `getRegionBudgetHeadReport()` in reports.service.ts**
- [ ] **Step 7: Backend — `getRegionBudgetHeadDaily()` in reports.service.ts**
- [ ] **Step 8: Backend — 3 new endpoints in reports.controller.ts**
- [ ] **Step 9: Backend — enforce Budget Head required in requests.service.ts (createRequest + updateRequest)**
- [ ] **Step 10: Frontend — RequestFormPage.tsx: make Budget Head required field**
- [ ] **Step 11: Frontend — ReportsPage.tsx: add view toggle + RegionMatrixView + DailyTrendView**
- [ ] **Step 12: TypeScript check + git push + server update**
