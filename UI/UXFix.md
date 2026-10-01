# UI/UX Review and Future Fix Backlog

**Reviewed:** 2026-09-27  
**Scope:** Read-only review of the petty cash application UI, with extra attention to tables. No application source or configuration was changed for this review.

## Review Scope and Confidence

- The login screen was inspected visually at desktop size.
- Protected screens (dashboards, requests, funds, payments, transactions, settlements, reports, and user management) were reviewed from their source markup and UI logic. They were not opened using a user account, so mobile behavior and authenticated interactions still need a hands-on review.
- Ratings below are a practical product review, not an automated accessibility certification.

## Current Assessment

| Area | Rating | Notes |
|---|---:|---|
| Visual consistency | 7/10 | Deep teal and amber branding, company cues, dark mode, and navigation form a coherent base. |
| Table usability | 6/10 | Useful filters, status badges, hover states, and report totals; data coverage, density, and small-screen handling need attention. |
| Error feedback and accessibility | 5/10 | Several loading failures look like empty results; some labels and icon controls are not exposed clearly to assistive technology. |

## Prioritized Fix Backlog

### P1 — Correct table coverage and filter/export consistency

**Where:** `frontend/src/pages/RequestsListPage.tsx`, `frontend/src/pages/TransactionsPage.tsx`

- Requests use a fixed page size of 50 and page 1, without visible pagination controls. Search and priority filtering happen in the browser over the loaded page, so users may miss matching older records.
- Requests Excel/PDF exports pass company, region, and date filters, but omit other active filters such as status, priority, and text search. The exported records can differ from the visible list.
- Transactions load 20 records per page, then apply search only to those loaded records. Make the search cover all matching ledger records or label its scope clearly.

**Future acceptance:** Users can reach every matching request/transaction; the displayed result count is clear; exports use the same active filters as the table.

### P1 — Distinguish API failures from empty results

**Where:** `frontend/src/pages/RequestsListPage.tsx`, `frontend/src/pages/PaymentsPage.tsx`, `frontend/src/pages/ReportsPage.tsx`, `frontend/src/pages/DashboardPage.tsx`

- Several fetch handlers only write errors to the console and then leave the page showing “no records” or zero/blank summary values.
- In a finance system, a failed request must not look like confirmed absence of records.

**Future acceptance:** Show a visible error state with a retry action; preserve existing data when a refresh fails; reserve empty states for successful responses containing zero records.

### P1 — Improve table readability and small-screen behavior

**Where:** `frontend/src/pages/RequestsListPage.tsx`, `frontend/src/pages/ReportsPage.tsx`, `frontend/src/pages/PaymentsPage.tsx`, `frontend/src/pages/TransactionsPage.tsx`, `frontend/src/index.css`

- Many table headers use 10–11px uppercase text and body cells use `text-xs` (12px). This is dense for long financial review sessions.
- The reports table has 10 columns and scrolls horizontally. The requests table still has several visible columns on narrow screens; hidden columns also make some data unavailable until a wider screen is used.
- Horizontal scrolling has no explicit visual cue. Review a responsive card layout or prioritize the most important columns at narrow widths.
- Requests right-aligns the Amount header but not the corresponding cell. Payment amounts are not consistently formatted or aligned with the rest of the finance tables.

**Future acceptance:** At 360px and 768px widths, key identifying, amount, status, and action information remains easy to find; any horizontal scrolling is apparent; numeric columns align consistently.

### P1 — Make payment filtering and CSV export user-centered

**Where:** `frontend/src/pages/PaymentsPage.tsx`

- “Paid By (ID)” requires staff to know an internal user ID. Prefer a searchable person selector or a human-readable filter.
- CSV export scrapes the rendered table DOM, so it exports only the current page and can produce a column/header mismatch when responsive columns are hidden.

**Future acceptance:** CSV export is generated from payment data, not rendered cells, and clearly follows the chosen date/company/payer filters and export scope.

### P2 — Strengthen table consistency

**Where:** `frontend/src/index.css` and the table pages listed above

- Table styles are repeated inline across pages. The stylesheet defines `.fin-table`, but the application tables do not use that class. This leaves a design rule that is easy to drift from and makes future consistency work harder.
- Currency, amount alignment, spacing, header sizes, and pagination labels vary between requests, payments, reports, settlements, and transactions.
- Table headers do not offer visible sorting controls. Consider sorting for fields staff commonly compare, such as date, amount, request number, and status.

**Future acceptance:** Shared table conventions cover header/body typography, row spacing, number alignment, currency formatting, empty/loading/error states, and pagination without removing page-specific columns.

### P2 — Improve contrast and control accessibility

**Where:** `frontend/src/pages/LoginPage.tsx`, `frontend/src/layouts/DashboardLayout.tsx`, form pages, `frontend/src/index.css`

- The white text on the amber `#E8A020` login button has approximately 2.22:1 contrast, which makes its small label harder to read. Check the other white-on-amber buttons too.
- Form labels are visually present but are not associated with their inputs using `htmlFor`/`id` in the current UI.
- The theme and notification icon buttons do not have accessible names; the sidebar open/close buttons do.
- The global focus-visible outline is a useful foundation. Keep it visible and ensure it remains clear in light mode, dark mode, and both company themes.

**Future acceptance:** Inputs expose their labels to assistive technology; icon-only controls announce an action; small text and button combinations have clear contrast; keyboard focus is always visible.

### P2 — Improve visual trust in login and data states

**Where:** `frontend/src/pages/LoginPage.tsx`, `frontend/src/pages/DashboardPage.tsx`

- The password field’s dot placeholder looks like a password may already be entered. Use a neutral instruction so the empty state is unambiguous.
- Dashboard fetch errors are silent. Show a clear, recoverable state instead of leaving users to infer whether data is missing or still loading.

## Strengths to Preserve

- Teal/amber product identity, Somtel/Bluekom context, dark mode, and responsive sidebar provide a recognizable shell.
- Text status badges communicate more than color alone.
- Request filters, the “view all time” empty-state action, report totals, and report pagination support common staff tasks.
- Keep these strengths while addressing the backlog; avoid replacing the existing visual identity without a separate product decision.

## Suggested Work Order

1. Fix record coverage and keep table/export filters in sync.
2. Add explicit API error states so failures cannot masquerade as empty finance data.
3. Improve payment CSV behavior and table readability on mobile.
4. Standardize money columns and shared table conventions.
5. Address contrast, form labeling, and accessible names for icon controls.
