# Unified Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the dashboard, finances, projects, grid view, and calendar pages into one unified design system based on the approved dashboard mock while preserving live business behavior and auditing every visible control.

**Architecture:** Introduce a shared shell and a small set of presentation primitives, then recompose each target page around existing hooks and targeted API extensions. Keep live hooks as the source of truth, add only narrowly scoped backend/query/export support needed by the redesigned controls, and finish with a browser audit of all visible controls on the redesigned pages.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, Express, Prisma, Zod, Recharts, react-big-calendar, Playwright

---

### Task 1: Extend Transaction Query and Export Support

**Files:**
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/packages/shared/src/types.ts`
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/routes/transactions.ts`
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/services/transaction.service.ts`
- Test: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/__tests__/transaction.service.test.ts`

- [ ] **Step 1: Write the failing transaction-service tests**

Add tests covering:
- text search matching `description`, `category`, and `payee`
- export path returning all filtered rows instead of one paginated page

- [ ] **Step 2: Run the API tests to verify the new coverage fails**

Run: `npm run test:api`
Expected: failing assertions for missing transaction search/export support.

- [ ] **Step 3: Extend shared query types**

Update `TransactionListQuery` to support a text search field and any export-only flag needed by the API route.

- [ ] **Step 4: Extend the transaction list route validation**

Add the new query inputs to the Zod schema in `routes/transactions.ts`, keeping them narrow and explicit.

- [ ] **Step 5: Implement service-layer search filtering**

Update `listTransactions()` so the query can search across `description`, `category`, and `payee` without breaking existing filters.

- [ ] **Step 6: Add a dedicated export route**

Create a transaction export route that returns the full filtered result set as CSV, rather than relying on paginated frontend data.

- [ ] **Step 7: Run the API tests again**

Run: `npm run test:api`
Expected: transaction tests pass and no existing API tests regress.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/types.ts apps/api/src/routes/transactions.ts apps/api/src/services/transaction.service.ts apps/api/src/__tests__/transaction.service.test.ts
git commit -m "Add transaction search and export support"
```

### Task 2: Build the Shared Redesign Shell

**Files:**
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/layout/app-layout.tsx`
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/layout/sidebar.tsx`
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/layout/page-shell.tsx`
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/layout/top-app-bar.tsx`
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/ui/floating-action-button.tsx`
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/index.css`
- Test: visual/manual verification through the running app

- [ ] **Step 1: Create the shared shell components**

Implement a reusable page shell and top app bar matching the approved visual system:
- fixed dark sidebar
- warm content canvas
- sticky glass header
- shared action slots
- optional floating action button

- [ ] **Step 2: Restyle the sidebar without changing route inventory**

Keep the existing route list unchanged while porting the dashboard mock’s look and spacing into `sidebar.tsx`.

- [ ] **Step 3: Update the app layout**

Refactor `app-layout.tsx` so target pages render inside the new shell without duplicating offsets, header spacing, or mobile behavior.

- [ ] **Step 4: Add shared design tokens/styles**

Move the approved color and surface treatment into `index.css` and shared utility classes instead of per-page one-off styles.

- [ ] **Step 5: Run a production build**

Run: `npm run build`
Expected: web build passes after the shell refactor.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/layout/app-layout.tsx apps/web/src/components/layout/sidebar.tsx apps/web/src/components/layout/page-shell.tsx apps/web/src/components/layout/top-app-bar.tsx apps/web/src/components/ui/floating-action-button.tsx apps/web/src/index.css
git commit -m "Add shared shell for unified redesign"
```

### Task 3: Rebuild the Dashboard Page

**Files:**
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/pages/dashboard.tsx`
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/dashboard/redesign/dashboard-kpi-strip.tsx`
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/dashboard/redesign/dashboard-revenue-panel.tsx`
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/dashboard/redesign/dashboard-project-breakdown.tsx`
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/dashboard/redesign/dashboard-followups-panel.tsx`
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/dashboard/redesign/dashboard-activity-panel.tsx`
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/dashboard/redesign/dashboard-installs-panel.tsx`
- Test: manual page verification and Playwright audit coverage

- [ ] **Step 1: Port the dashboard composition**

Replace the current simple layout with the approved dashboard structure using live `useDashboard()` data.

- [ ] **Step 2: Wire dashboard actions**

Map:
- `Add New` to the existing create-project dialog
- `Export` to browser print/PDF behavior for the dashboard view

- [ ] **Step 3: Preserve live widgets and loading/error states**

Ensure follow-ups, activity, installs, KPI cards, and charts still render safely with loading and empty states.

- [ ] **Step 4: Run a build**

Run: `npm run build`
Expected: dashboard rebuild compiles cleanly.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/dashboard.tsx apps/web/src/components/dashboard/redesign
git commit -m "Redesign dashboard page"
```

### Task 4: Rebuild the Projects Page

**Files:**
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/pages/projects.tsx`
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/projects/redesign/projects-summary-strip.tsx`
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/projects/redesign/projects-table-shell.tsx`
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/projects/create-project-dialog.tsx`
- Test: manual page verification and Playwright audit coverage

- [ ] **Step 1: Recompose the projects page to the approved layout**

Implement:
- top header with search/actions
- status tabs
- summary strip
- redesigned project table container
- bottom CTA block

- [ ] **Step 2: Keep the live project query model**

Preserve the current search, status filter, fence-type filter, pagination, and row navigation behavior.

- [ ] **Step 3: Wire page buttons**

Map:
- `New Project` to the existing dialog
- `Export` to the existing `/api/projects/export` flow
- list/grid toggle to real route navigation

- [ ] **Step 4: Verify project create and row navigation**

Manually confirm:
- project creation still works
- table row click still opens project detail

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/projects.tsx apps/web/src/components/projects/redesign apps/web/src/components/projects/create-project-dialog.tsx
git commit -m "Redesign projects list page"
```

### Task 5: Rebuild the Grid View

**Files:**
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/pages/project-grid.tsx`
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/projects/redesign/grid-header.tsx`
- Test: manual verification of inline edit behavior and Playwright audit coverage

- [ ] **Step 1: Port the approved grid-view framing**

Apply the approved grid-view header, stats strip, table shell, and secondary content layout while keeping the grid data model.

- [ ] **Step 2: Preserve editable-cell behavior**

Keep current inline patch/refetch flows intact for editable fields in the grid.

- [ ] **Step 3: Wire real controls**

Map:
- `New Installation` to create-project dialog
- export to project export route
- pagination controls to existing table state

- [ ] **Step 4: Manually verify inline editing**

Confirm at least one editable numeric field and one editable text field still save and refresh correctly.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/project-grid.tsx apps/web/src/components/projects/redesign/grid-header.tsx
git commit -m "Redesign project grid view"
```

### Task 6: Rebuild the Finances Page

**Files:**
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/pages/finances.tsx`
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/hooks/use-transactions.ts`
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/finances/finance-filter-sheet.tsx`
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/finances/finance-export.ts`
- Test: manual page verification and Playwright audit coverage

- [ ] **Step 1: Extend the web transaction hook**

Add support for the new text search query and any export helper needed by the redesigned page.

- [ ] **Step 2: Port the finances page layout**

Implement the approved:
- KPI trio
- charts
- table shell
- search/filter/add controls
- FAB

- [ ] **Step 3: Make search and filter real**

Wire the search input and filter controls to transaction query state instead of decorative local UI.

- [ ] **Step 4: Implement finance export**

Trigger the full filtered CSV export route from the redesigned `Export` action.

- [ ] **Step 5: Verify transaction creation and filtering**

Manually confirm:
- add transaction works from both primary CTA and FAB
- search/filter updates the table
- export returns a file for the filtered result set

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/finances.tsx apps/web/src/hooks/use-transactions.ts apps/web/src/components/finances apps/web/src/components/finances/finance-export.ts
git commit -m "Redesign finances page"
```

### Task 7: Rebuild the Calendar Page

**Files:**
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/pages/calendar.tsx`
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/hooks/use-calendar-events.ts`
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/calendar/calendar-month-grid.tsx`
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/calendar/calendar-side-insights.tsx`
- Test: manual page verification and Playwright audit coverage

- [ ] **Step 1: Decide the calendar rendering path**

Implement the approved custom month grid if `react-big-calendar` styling cannot reasonably reach the target layout; otherwise keep the library only if it can satisfy the approved design cleanly.

- [ ] **Step 2: Port the approved calendar layout**

Add:
- redesigned header
- event legend
- month grid
- right-side insights panels
- `Add Event` CTA and FAB

- [ ] **Step 3: Implement real calendar filters**

Wire:
- top search to text filtering over visible events
- `Filter View` to event-type filtering
- month navigation to current calendar state

- [ ] **Step 4: Preserve add-event and project-link behavior**

Ensure:
- add-event dialog still works
- clicking a project-linked event still navigates to project detail

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/calendar.tsx apps/web/src/hooks/use-calendar-events.ts apps/web/src/components/calendar
git commit -m "Redesign calendar page"
```

### Task 8: Audit Every Visible Control on the Redesigned Pages

**Files:**
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/scripts/playwright-production-audit.mjs`
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/docs/superpowers/audits/2026-04-03-unified-page-redesign-audit.md`
- Test: Playwright production/local audit run

- [ ] **Step 1: Update the audit runner for redesigned controls**

Extend the existing audit script to exercise the redesigned buttons, filters, exports, toggles, navigation controls, and FABs on the five target pages.

- [ ] **Step 2: Run the full audit**

Run the browser audit against the deployed app after shipping the redesign.

- [ ] **Step 3: Write the unresolved-controls report**

If any visible control remains without defensible business logic, document it in the audit file with:
- page
- control
- current behavior
- blocker
- required business decision

- [ ] **Step 4: Re-run the audit after any fixes**

Do not stop at the first pass if issues are found; re-audit until the redesigned pages are either clean or have an explicit unresolved-controls list.

- [ ] **Step 5: Commit**

```bash
git add scripts/playwright-production-audit.mjs docs/superpowers/audits/2026-04-03-unified-page-redesign-audit.md
git commit -m "Audit redesigned pages and document remaining controls"
```

### Task 9: Final Verification

**Files:**
- Verify all changes above

- [ ] **Step 1: Run API tests**

Run: `npm run test:api`
Expected: all API tests pass.

- [ ] **Step 2: Run the build**

Run: `npm run build`
Expected: shared, API, and web builds pass.

- [ ] **Step 3: Run the final browser audit**

Run the updated Playwright audit script.
Expected: redesigned flows pass, or any remaining unresolved controls are explicitly documented.

- [ ] **Step 4: Summarize shipped behavior vs unresolved controls**

Prepare the final change summary around:
- shared shell
- redesigned pages
- newly added API/query/export support
- audit results

