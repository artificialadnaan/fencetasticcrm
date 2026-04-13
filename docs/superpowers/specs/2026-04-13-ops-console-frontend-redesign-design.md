# Ops Console Frontend Redesign

Date: 2026-04-13
Repo: `FencetasticCRM`
Branch: `feat/crm-reconciliation-redesign`

## Goal

Redesign the CRM frontend so operational screens are readable, high-contrast, and fast to scan for office/admin staff and the owner. The immediate targets are Calendar and Reports, but the design must also fix the shared table and chart problems that currently affect the rest of the platform.

This redesign is not a shell rewrite. It is a frontend system upgrade that replaces washed-out light surfaces with a darker high-contrast operations console and applies that system to the most important data-heavy screens.

## Users

Primary users:
- office/admin staff
- owner/operator

Primary jobs to support:
- find schedule and finance information quickly
- trust what is visible on screen
- scan tables and charts without fighting low contrast or cramped hierarchy

## Problems To Solve

### Calendar

- The current month view is pale and low-contrast.
- Event chips are too faint and cramped, so labels truncate before they communicate anything useful.
- Day cells try to carry too much detail, making the grid noisy but still not informative.
- The current layout does not separate quick scan information from detailed event context.

### Reports

- The reports screen behaves like a tab strip with content underneath instead of a focused analytics workspace.
- Controls and content compete for attention.
- Charts do not have a strong enough visual plane, so the plotted information feels secondary.
- Tables below charts are readable only with effort because row contrast, header stickiness, and numeric alignment are too weak.

### Shared Data Surfaces

- Tables across reports, finances, commissions, settings, and project detail do not share a strong readability standard.
- Charts use inconsistent contrast and low-emphasis axis/grid styling.
- Important numbers are not consistently treated as primary visual anchors.
- Mobile and narrow-width behavior often relies on hiding too much or shrinking too far.

## Visual Thesis

The CRM should feel like a midnight operations console for a premium contractor business: dark graphite surfaces, crisp white data, warm amber highlights, restrained accent colors, and dense-but-readable information planes.

## Interaction Thesis

- Data surfaces should reveal hierarchy through contrast and layout first, not decorative chrome.
- Selected states should be obvious and persistent, especially in schedule and report workflows.
- Tables and charts should feel like the workspace itself, not supporting decoration under a header.

## Visual System

### Color

Base surfaces:
- background: deep charcoal / near-black graphite
- panel: slightly lifted slate-black
- elevated panel: warmer dark graphite for active work areas

Text:
- primary text: bright neutral off-white
- secondary text: muted cool gray with enough contrast to remain legible
- tertiary text: reserved for metadata only

Accents:
- amber/copper for warnings, queue emphasis, and premium brand warmth
- emerald for healthy positive financial states
- blue for scheduled/informational states
- rose/magenta only where existing event categories require distinction

Rules:
- no pale gray text on light panels
- no low-opacity borders as the only separator
- charts and tables must always exceed the contrast of surrounding chrome

### Typography

- Keep the current app typography structure if changing fonts is expensive, but strengthen weight, size contrast, and numeric emphasis.
- Large page titles stay compact and strong.
- Section labels become smaller but more legible, with higher contrast than the current washed-out eyebrow treatment.
- Currency, percentages, and counts should use tabular alignment and stronger weight when they are decision-critical.

### Surfaces

- Replace soft white, frosted, and low-contrast panel treatments with dark structured surfaces.
- Use borders, section dividers, and background shifts to define regions.
- Keep shadows restrained. Depth should come mostly from contrast and spacing.

## Shared Primitive Redesign

### Table System

Create a reusable dark-table treatment and migrate data-heavy screens to it.

Requirements:
- sticky headers where vertical scroll is expected
- stronger header background than body rows
- zebra or alternating row rhythm subtle enough to stay premium but strong enough to improve scanning
- clear hover and selected row states
- numeric columns right-aligned and visually grouped
- better truncation treatment with predictable max widths
- preserved horizontal scrolling on smaller screens instead of collapsing text into illegibility
- row density should be balanced: compact enough for operations work, but not terminal-tight

Applies to:
- reports tables
- finances transaction table
- commissions tables
- project detail tables
- settings tables
- projects tables where feasible in this slice

### Chart System

Standardize a dark Recharts theme.

Requirements:
- darker plot background than page background
- bright axis labels and visible ticks
- subtle but readable grid lines
- consistent tooltip shell with strong contrast
- series colors mapped intentionally:
  - revenue / positive cash: emerald
  - expenses / outflow: amber or rose
  - commissions / deductions: copper or muted red
  - neutral totals / balances: cool blue or stone
- legends must be readable without depending on tiny color dots alone

Applies to:
- reports charts
- dashboard charts
- finances charts

## Calendar Redesign

### Layout

Calendar becomes a two-part operational workspace:
- left/main: month grid
- right/secondary: selected-day agenda and quick insights

On narrower screens:
- grid stacks above the agenda panel
- selected-day agenda remains the detailed reading surface

### Month Grid

Day cells should show:
- date
- relative state such as today / selected
- up to 2 high-signal event chips
- overflow count like `+3 more`

The grid is for scanning, not full reading.

### Event Chips

Each chip should include:
- category indicator via left rail or dot
- readable truncated title with stronger contrast
- optional secondary line for project or subtype only when space allows

Quiet days should not dominate the grid with heavy placeholder treatments. Empty or low-activity days should look intentionally quiet.

### Selected-Day Agenda

The side panel should show:
- selected date header
- grouped events in time or priority order
- project name / address context when linked
- notes preview
- clear action buttons: open project, edit event, add event

### Filters And Controls

Top controls remain:
- search
- type filter
- previous/next month
- add event

They should be visually integrated into the darker control system and remain readable over the dark background.

## Reports Redesign

### Layout

Reports becomes a workstation with three layers:
- top control rail
- summary strip
- main analysis area with chart first and table second

### Control Rail

Include:
- report selector
- date range
- report-specific controls such as P&L period
- export actions

Requirements:
- sticky or persistent at the top during page use
- stronger active tab visibility
- more spacing discipline so controls do not blend together

### Summary Strip

Each report should surface the 3-5 most important totals first in a unified dark band.

Examples:
- P&L: revenue, gross profit, commissions, net profit
- cash flow: money in, money out, net, running balance
- commissions: owed, paid, Aimann reduction, company share

### Chart + Table Pairing

For every report:
- the chart is the visual summary
- the table is the verification/detail surface

The table should sit directly under the chart with matching category colors, clear column grouping, and improved numeric readability.

### Report Tabs

Current report areas stay:
- P&L
- Job Costing
- Commissions
- Expenses
- Cash Flow

This slice does not change report scope. It changes presentation and readability.

## Rollout Scope

### In Scope

- shared dark visual system for targeted screens
- shared dark table treatment
- shared Recharts dark theme
- calendar page redesign
- reports page redesign
- updates to report subcomponents so tables/charts are readable
- targeted cleanup of related finance/commission tables if needed to align with the new table primitive

### Out Of Scope

- backend data model changes
- report logic changes unrelated to presentation
- navigation or app shell rewrite
- full project detail redesign
- full settings redesign beyond shared table styling if touched indirectly

## Accessibility And Usability Requirements

- all primary text must remain readable at a glance in the dark theme
- color cannot be the only indicator of event or metric meaning
- keyboard focus states must be visible on dark backgrounds
- sticky headers and interactive chips must maintain sufficient contrast
- charts must expose readable tooltips and legend labels
- mobile layouts must preserve usability through stacking and horizontal scroll, not through miniature text

## Testing Strategy

### Frontend Verification

- update or add component tests for calendar month grid and reports control behavior where structure changes materially
- verify dark table states for loading, empty, and populated data
- verify chart containers render legibly in both populated and empty states

### Manual Verification

- desktop scan test for calendar readability
- desktop scan test for P&L and cash flow reports
- narrow-width checks for tables and chart containers
- check that sticky headers and controls behave correctly

## Implementation Approach

Recommended approach: foundation-first.

Sequence:
1. establish shared dark surface tokens and utility styles used by Calendar and Reports
2. build the shared dark table treatment
3. standardize Recharts theme helpers
4. redesign Calendar using the new primitives
5. redesign Reports and its sub-report components using the new primitives
6. apply the same table/chart readability rules to the most visibly affected adjacent screens

## Risks

- If the redesign is applied only at page level without shared primitives, the UI will remain inconsistent.
- If contrast is increased without simplifying hierarchy, screens may become noisy instead of readable.
- If mobile handling relies on hidden columns alone, the readability issue will remain unresolved on smaller screens.

## Success Criteria

- calendar events are readable without zooming or squinting
- reports page feels navigable and operational rather than cluttered
- charts are legible on first glance
- tables across targeted screens have clear row, header, and numeric hierarchy
- the platform reads as one coherent dark high-contrast operations console rather than a mix of old pale surfaces and isolated redesigns
