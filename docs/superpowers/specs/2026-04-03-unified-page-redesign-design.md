# Unified Page Redesign Design

**Date:** 2026-04-03

## Goal

Rebuild the `Dashboard`, `Finances`, `Projects`, `Grid View`, and `Calendar` pages into one unified design system based on the pasted dashboard mock while preserving the current live route structure, data flows, and business actions. Use as much of the pasted HTML structure and styling intent as practical, but normalize conflicts so the application feels like one coherent product rather than a set of disconnected mockups.

## Scope

In scope:

- Restyle and restructure the existing application shell so the current sidebar items remain unchanged while adopting the dashboard mock's visual language.
- Rebuild these pages against live data and existing actions:
  - `Dashboard`
  - `Finances`
  - `Projects`
  - `Grid View`
  - `Calendar`
- Preserve and verify current business workflows on those pages.
- Add missing UI behavior where the intent is clear from the redesigned controls.
- Produce a post-implementation audit of any remaining visible controls that still lack defensible business logic.

Out of scope for this phase:

- Rebuilding `Commissions`, `Reports`, `Settings`, `Project Detail`, `Work Order`, or `Login` to match the new style.
- Inventing backend features that have no current data source and no obvious business rule.
- Changing the actual sidebar route list.

## Constraints Confirmed With User

- Use the pasted `Dashboard` mock as the master design language.
- Keep the current sidebar items exactly as they exist in the live app.
- Recreate the pages so they look and are formatted like the pasted code as closely as possible.
- Use as much of the pasted markup and layout structure as practical.
- If there are logic conflicts, preserve correct business behavior and surface the conflicts.
- Keep visible buttons even if they were only mock controls, and attach real behavior where feasible.

## Existing Conflicts To Normalize

### Branding Conflicts

The pasted mocks use both `Fencetastic` and `Iron & Timber`. The live product is `Fencetastic`. The redesign will standardize on `Fencetastic` everywhere.

### Navigation Conflicts

Some pasted mocks omit `Commissions`, `Reports`, and `Settings`. The live app requires these routes in navigation. The shell will keep the current route list intact and only restyle it.

### Shell Conflicts

The pasted pages use multiple sidebar/header constructions. The redesign will use a single shared shell derived from the pasted dashboard:

- dark left rail
- warm background canvas
- sticky glass top bar
- consistent avatar/account block
- consistent CTA button treatment

### Interaction Conflicts

Several pasted controls are decorative or ambiguous:

- notification icon
- help icon
- filter chips with unclear filter model
- extra CTA panels like `Launch Foreman AI`
- page-level `Export` controls where export behavior differs by page

These will be mapped to existing live logic where possible. Remaining unresolved controls will be listed explicitly after implementation.

## Visual Thesis

Warm, high-contrast operational workspace: dark structural navigation, pale drafting-table canvas, glass top chrome, tight typography, and restrained tonal surfaces that make the application feel premium and field-ready rather than generic SaaS.

## Shared Design System

### Master Shell

Create a shared app shell for the redesigned pages with:

- fixed dark sidebar matching the pasted dashboard proportions and hierarchy
- main content offset using the current route layout
- sticky translucent header with page title, contextual controls, utility icons, and profile avatar
- warm neutral content background
- unified spacing rhythm based on 24px and 32px section gaps

### Typography

- Use `Inter` as the single body and heading family for the implemented redesign.
- Preserve the strong, tight heading weights from the mocks.
- Use uppercase micro-labels and tracking only for metadata, legends, and KPI labels.

### Color System

Adopt the pasted dashboard token direction as the canonical system:

- dark navy/charcoal primary shell
- warm ivory content background
- blue accent for navigation and action
- green for positive pipeline/debt/follow-up states where appropriate
- red for urgent/outstanding states
- neutral tonal surfaces for cards, tables, and filters

The implementation should convert these into reusable app-level classes or variables rather than duplicating page-specific inline palettes.

### Surfaces

Prefer:

- tonal panels
- subtle left-border accents for KPI blocks
- low-contrast table containers
- restrained shadows

Avoid:

- the current purple-heavy gradients outside of intentional CTAs
- inconsistent page-specific branding treatments
- card overload when a section can be structured with layout alone

## Architecture

### Shared Layout Refactor

Refactor the current web shell so the sidebar and top bar are reusable and page-aware rather than each page reimplementing its own header. The current `AppLayout` and `Sidebar` should become the structural foundation for the redesigned experience.

Responsibilities:

- `Sidebar` owns route links, active states, account block, and logout
- `AppLayout` owns content offset, sticky header placement, and page content frame
- page-level components supply title, subtext, primary/secondary actions, utility controls, and optional floating action button

### Shared UI Primitives

Introduce shared visual primitives for the redesign instead of rewriting the full pasted HTML independently on every page:

- page header/top app bar
- KPI tile
- table shell
- section header with legends/actions
- tonal chip/status pill
- floating action button
- shell search input

These primitives should match the pasted structure closely enough that most page markup can still follow the mocks.

### Data Preservation Rule

Existing hooks remain the source of truth. The redesign changes presentation and interaction wiring first, but it may introduce small backend or hook extensions when a visible control in the approved mock needs real behavior and the current API cannot support it cleanly. Those extensions must stay narrowly scoped to the redesigned pages rather than becoming broad speculative product work.

## Page Designs

### Dashboard

Use the pasted dashboard nearly verbatim as the visual reference.

Map live data to:

- KPI cards:
  - Revenue MTD
  - Open Projects
  - Outstanding Receivables
  - Debt Balance
- monthly revenue vs expenses chart
- project type breakdown
- today's follow-ups
- recent activity
- upcoming installs

Button mapping:

- `Add New` opens the existing create-project flow
- `Export` uses a browser print/PDF flow for the dashboard view rather than inventing a misleading data export endpoint

Utility icons:

- keep visible
- audit whether they can be wired to existing behavior; if not, keep them in the unresolved-controls report

### Finances

Use the pasted finances page structure as the main composition:

- top KPI trio
- bar chart
- category breakdown
- recent transactions table
- table search/filter/add controls
- bottom-right contextual FAB

Map to current logic:

- summary cards use `useTransactionSummary`
- monthly chart uses `useMonthlyBreakdown`
- category chart uses `useCategoryBreakdown`
- table uses `useTransactions`
- `Add New`, `Add Transaction`, and FAB all open the same existing transaction modal

Behavior expectations:

- search is a real transaction search control, not a decorative input; extend transaction query support if necessary so it can search description, category, and payee across the filtered result set
- filter button opens real filter controls backed by transaction query state rather than page-local decoration
- pagination stays functional
- export downloads the full filtered transactions result set as a real CSV file, not just the currently visible page; if the existing transactions list endpoint cannot supply enough rows reliably, add a dedicated backend export route rather than exporting only the current page

### Projects

Use the pasted projects page as the main reference:

- top bar with search and actions
- status tab strip
- pipeline/stat summary
- detailed project table
- bottom CTA block

Map to current logic:

- search uses current project query state
- status tabs use existing project status filters
- `New Project` opens the existing create-project dialog
- `Export` uses the existing project export route
- row click navigates to project detail
- table rows show live project list data

The `Launch Foreman AI` CTA remains visible. Unless a discoverable feature already exists, it will likely stay visible and be listed as unresolved business logic after implementation.

### Grid View

Use the pasted grid view styling direction but keep the live editable-grid behavior intact:

- redesigned top header and stats block
- redesigned table shell and pagination
- preserve live editing cells and row actions

Map to current logic:

- existing status tabs/filter model remain
- export uses the existing project export route
- `New Installation` opens create-project dialog
- table edits continue using existing patch logic

Important rule: the redesign must not break inline editable cells or grid refetch behavior.

### Calendar

Use the pasted calendar page as the compositional target, but fit it over the live calendar functionality:

- redesigned header and legends
- custom right-side insights/crew panels
- add-event action and floating action button

Map to current logic:

- current calendar data remains driven by `useCalendarEvents`
- existing add-event dialog is preserved unless it can be restyled safely
- event clicking still routes to project detail for project-linked events
- the calendar top search becomes a real text filter over visible events, matching against event title and linked project customer/address when available
- the `Filter View` control becomes a real event-type filter using the existing calendar event types shown in the legend
- month navigation and current-month context remain functional
- no speculative project, crew, or date-range filters are added beyond the text search, event-type filter, and the existing calendar navigation/view state for this phase

If the current `react-big-calendar` month view cannot be restyled enough to meet the pasted design, replace the rendered month grid with a custom month grid built from current event data rather than forcing the existing library skin beyond reason.

## Button and Control Mapping Rules

Every visible control on the redesigned pages must end implementation in one of three states:

1. Wired to an existing working action
2. Wired to newly implemented but clearly justified client behavior
3. Documented in a post-implementation unresolved-controls list with the exact missing business rule

Examples:

- `Add New` / `New Project` / `New Installation` → create project dialog
- `Add Transaction` / finances FAB → add transaction dialog
- `Add Event` / calendar FAB → add event dialog
- search fields → page-specific filtering
- pagination → existing pagination state
- view toggles → real route/view switching
- export buttons → concrete page-specific behavior:
  - dashboard → browser print/PDF
  - finances → filtered transaction export file
  - projects → existing project export
  - grid view → existing project export

## User Identity Rule

Mock account names and avatars must not replace live authenticated identity. The redesigned shell should use the current logged-in user from auth context and only adopt the mock styling around that data.

## Testing and Audit Strategy

### Functional Verification

After implementation, audit every visible control on the redesigned pages:

- sidebar navigation items
- top-bar utility actions
- page primary buttons
- search inputs
- filter controls
- tabs and toggles
- row-level actions
- pagination
- FABs

### Output Format For Unresolved Logic

If any visible control still lacks business logic, produce a list containing:

- page
- control label
- current state
- why it is unresolved
- what business decision or backend capability is needed

### Regression Targets

The redesign must not regress these known live workflows:

- create project
- view project detail
- inline grid edits
- add calendar event
- add transaction
- pagination and filters on the relevant pages
- logout and route navigation

## Risks

### Shell Overreach

If the layout refactor couples page structure too tightly to one mock, later redesign of the remaining pages could become harder. Mitigation: keep the shell generic and push page-specific ornamentation down into page components.

### Decorative Controls Without Business Logic

The pasted mocks include a few controls that may not map cleanly to current behavior. Mitigation: keep them visible, wire what is defensible, then explicitly report what still needs product decisions.

### Calendar Styling Complexity

The pasted calendar is structurally different from the current big-calendar rendering. Mitigation: allow a custom month-grid rebuild if the current library cannot meet the desired look cleanly.

## Recommended Implementation Order

1. Shared shell and design tokens
2. Dashboard
3. Projects
4. Grid View
5. Finances
6. Calendar
7. Functional audit of all visible controls
