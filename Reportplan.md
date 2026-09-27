# 📊 PETTY CASH MANAGEMENT SYSTEM — BUDGET HEAD REPORTING PLAN
**Document:** `Reportplan.md`  
**Author:** Pair Programming Agent & System Architect  
**Date:** 2026-09-27  
**Status:** Approved & Implementation In-Progress  
**Target:** Somtel & Bluekom Multi-Tenant Petty Cash Architecture  

---

## 1. 🎯 EXECUTIVE SUMMARY & OBJECTIVE
In the Petty Cash Management System, both **Somtel** and **Bluekom** operate under identical standardized Budget Head categories (e.g. *Tasliix*, *Transportation*, *Repair of Vehicles*, *Repair of Buildings*, *Repair of Generators*, *Refreshment*, *Miscellaneous*), each assigned monthly limits.

Executive management (CFO, Finance Director, CEOs, and Auditors) requires a centralized, comparative, and actionable view to analyze:
1. How much each individual company spent on each specific category.
2. The combined group-wide total expenditure per category.
3. The remaining budget allocation and consumption percentage (% utilized).
4. Detailed audit visibility into the exact petty cash transactions supporting the numbers.
5. Exportability to professional Microsoft Excel spreadsheets and printable executive summaries.

---

## 2. 🏛️ ARCHITECTURAL DESIGN & DATA MODEL

### Database Model Relationships
```
┌─────────────┐       ┌──────────────────────┐       ┌────────────────────────┐
│   Company   │◄──────┤      BudgetHead      │◄──────┤    PettyCashRequest    │
│ (Somtel /   │       │ - code (e.g. BH-101) │       │ - requestedAmount      │
│  Bluekom)   │       │ - name ("Tasliix")   │       │ - approvedAmount       │
└─────────────┘       │ - monthlyLimit ($)   │       │ - status (PAID/APP...) │
                      └──────────────────────┘       │ - requestDate          │
                                                     └────────────────────────┘
```

### Key Shared Budget Head Categories
| Standard Category | Somtel Code | Bluekom Code | Standard Monthly Limit |
|---|:---:|:---:|:---:|
| **Tasliix** | `BH-101` | `BH-201` | $5,000.00 |
| **Transportation** | `BH-102` | `BH-202` | $5,000.00 |
| **Repair of Vehicles** | `BH-103` | `BH-203` | $5,000.00 |
| **Repair of Buildings** | `BH-104` | `BH-204` | $5,000.00 |
| **Repair of Generators** | `BH-105` | `BH-205` | $5,000.00 |
| **Refreshment** | `BH-106` | `BH-206` | $3,000.00 |
| **Miscellaneous expenses** | `BH-107` | `BH-207` | $3,000.00 |

---

## 3. 🔌 BACKEND API SPECIFICATION

### Endpoint: `GET /api/reports/budget-heads`
- **Security:** `@UseGuards(JwtAuthGuard, RolesGuard)` — Accessible to `ACCOUNTANT` & `SUPER_ADMIN`.
- **Query Parameters:**
  - `startDate` *(optional, string YYYY-MM-DD)*: Filter requests from start of local day.
  - `endDate` *(optional, string YYYY-MM-DD)*: Filter requests until end of local day.
  - `companyId` *(optional, UUID)*: Filter by single company or leave empty for all.
  - `statusScope` *(optional, 'PAID_ONLY' | 'APPROVED_AND_PAID')*: Default `'PAID_ONLY'`.

### Response Payload Structure:
```json
{
  "period": {
    "startDate": "2026-09-01",
    "endDate": "2026-09-30",
    "statusScope": "PAID_ONLY"
  },
  "summary": {
    "totalBudget": 62000.00,
    "somtelSpent": 1420.00,
    "bluekomSpent": 1850.00,
    "grandTotalSpent": 3270.00,
    "remainingBudget": 58730.00,
    "percentageUsed": 5.27
  },
  "categories": [
    {
      "categoryName": "Transportation",
      "somtelSpent": 350.00,
      "somtelCount": 12,
      "bluekomSpent": 410.00,
      "bluekomCount": 15,
      "totalSpent": 760.00,
      "totalCount": 27,
      "totalLimit": 10000.00,
      "remainingBudget": 9240.00,
      "percentageUsed": 7.6,
      "status": "SAFE"
    }
  ]
}
```

### Endpoint: `GET /api/reports/export-budget-heads-excel`
- Generates an XML/Excel workbook with styled header rows, currency formatting, separate Somtel/Bluekom columns, totals, and formulas.

---

## 4. 🎨 FRONTEND USER EXPERIENCE & INTERACTION

### Navigation & Page Location
Integrated as a primary tab inside [ReportsPage.tsx](file:///d:/Petty%20Cash%20App/frontend/src/pages/ReportsPage.tsx):
```
[ Expense Analytics ]  |  [ 📊 Budget Head Report ]  |  [ System Audit Trail ]
```

### Component Breakdown
1. **Top Summary KPIs:**
   - 4 glassmorphic metric cards: Total Budget Allocation, Somtel Total Spent (Orange), Bluekom Total Spent (Blue), and Group-Wide Total & % Utilized.
2. **Interactive Controls Bar:**
   - Period Preset Dropdown: `This Month`, `Last Month`, `This Quarter`, `Year to Date`, `Custom Range`.
   - Spend Status Selector: `Actual Disbursed Only (Paid)` vs `Include Approved (Committed)`.
   - Export Button: Download formatted Excel report.
3. **Visual Analytics Chart:**
   - Grouped horizontal or vertical Bar Chart (Somtel Orange `#ea580c` vs Bluekom Blue `#2563eb`) displaying expenditure by category side-by-side.
4. **Comparative Matrix Table:**
   - Columns: Category Name, Somtel Spent, Bluekom Spent, Combined Total, Total Budget, Remaining, % Utilization Bar, Health Status.
5. **Interactive Drill-Down Drawer/Modal:**
   - Clicking on any row opens a slide-over drawer displaying all individual petty cash requests under that budget category during the selected period.

---

## 5. 🛡️ SAFETY & SECURITY CHECKS (Adhering to KNOWLEDGE.md)
- **Zero Database Schema Mutations:** Uses existing `BudgetHead`, `Company`, and `PettyCashRequest` relations. No database migrations required.
- **Tenant Isolation Protected:** Accountants assigned to a specific company are filtered automatically, while Super Admins enjoy group-wide comparative analytics.
- **Performance Optimized:** Uses database aggregations and indexed queries on `requestDate`, `status`, and `companyId`.

---

## 6. 🚀 IMPLEMENTATION ROADMAP
- [x] Step 1: Architectural plan created in `Reportplan.md`.
- [ ] Step 2: Implement `getBudgetHeadReport` & Excel export in backend (`reports.service.ts` & `reports.controller.ts`).
- [ ] Step 3: Implement frontend Tab, KPIs, Comparative Table, and Recharts integration in `ReportsPage.tsx`.
- [ ] Step 4: Verification, build validation (`nest build` + `vite build`), and Git push to `main`.
