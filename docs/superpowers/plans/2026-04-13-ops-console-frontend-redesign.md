# Ops Console Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the CRM frontend into a darker high-contrast operations console by introducing shared dark table/chart primitives and applying them to Calendar, Reports, and the most visibly affected adjacent data surfaces.

**Architecture:** Build the redesign foundation first in shared web primitives and theme tokens, then migrate Calendar and Reports onto those primitives, then apply the same readability system to cross-cutting tables and charts used in Finances, Commissions, Projects, and Settings. Keep backend behavior unchanged; this plan is presentation-first and should preserve existing data flows.

**Tech Stack:** React, TypeScript, Tailwind CSS, Recharts, Vitest, Testing Library

---

## File Map

### Shared style and utility surface

- Modify: `apps/web/src/index.css`
  - Introduce darker surface tokens, chart tokens, stronger text/border utilities, and global scrollbar/selection refinements for the new ops-console theme.
- Create: `apps/web/src/components/ui/data-surface.tsx`
  - Reusable dark section shell for chart/table blocks, summary strips, and inspector panels.
- Create: `apps/web/src/components/ui/dark-table.tsx`
  - Shared high-contrast table wrapper and helper subcomponents for sticky headers, numeric cells, zebra rows, and empty states.
- Create: `apps/web/src/components/ui/chart-theme.ts`
  - Central chart palette, tooltip config, axis/grid colors, and Recharts helper constants.

### Calendar surface

- Modify: `apps/web/src/pages/calendar.tsx`
  - Recompose the page around grid + selected-day agenda and upgraded controls.
- Modify: `apps/web/src/components/calendar/redesign/calendar-month-grid.tsx`
  - Convert day cells to quick-scan surfaces with stronger contrast and overflow behavior.
- Modify: `apps/web/src/components/calendar/redesign/calendar-side-insights.tsx`
  - Turn the side panel into a selected-day agenda/inspector.
- Modify: `apps/web/src/components/calendar/redesign/calendar-types.ts`
  - Add any lightweight derived view properties needed by the redesigned calendar presentation.
- Create: `apps/web/src/components/calendar/redesign/calendar-month-grid.test.tsx`
  - Coverage for selected-day, overflow, and chip readability behaviors.

### Reports surface

- Modify: `apps/web/src/pages/reports.tsx`
  - Replace the current light workstation shell with a sticky dark control rail and summary-first layout.
- Modify: `apps/web/src/components/reports/pnl-report.tsx`
- Modify: `apps/web/src/components/reports/cash-flow-report.tsx`
- Modify: `apps/web/src/components/reports/commission-report.tsx`
- Modify: `apps/web/src/components/reports/expense-report.tsx`
- Modify: `apps/web/src/components/reports/job-costing-report.tsx`
- Modify: `apps/web/src/components/reports/receivables-table.tsx`
- Modify: `apps/web/src/components/reports/monthly-pl-table.tsx`
  - Migrate report charts/tables to the dark chart/table primitives and summary strip pattern.
- Create: `apps/web/src/components/reports/reports-shell.test.tsx`
  - Coverage for active report controls, summary strip rendering, and sticky/filter structure.

### Adjacent shared readability pass

- Modify: `apps/web/src/components/finances/redesign/finances-transaction-table.tsx`
- Modify: `apps/web/src/components/commissions/project-breakdown-table.tsx`
- Modify: `apps/web/src/components/commissions/debt-tracker.tsx`
- Modify: `apps/web/src/components/commissions/pipeline-projection.tsx`
- Modify: `apps/web/src/components/projects/redesign/projects-table-shell.tsx`
- Modify: `apps/web/src/components/projects/redesign-grid/grid-view-table.tsx`
- Modify: `apps/web/src/components/settings/operating-expenses-section.tsx`
- Modify: `apps/web/src/components/settings/rate-templates-section.tsx`
  - Align the most visible existing tables with the new dark-table system.

### Test entry points

- Modify: `apps/web/src/pages/finances.test.tsx`
- Modify: `apps/web/src/pages/projects.test.tsx`
- Modify: existing component tests near touched components as needed for updated contrast/layout semantics.

---

### Task 1: Establish the shared ops-console theme foundation

**Files:**
- Create: `apps/web/src/components/ui/data-surface.tsx`
- Create: `apps/web/src/components/ui/chart-theme.ts`
- Modify: `apps/web/src/index.css`
- Test: `apps/web/src/components/calendar/redesign/calendar-side-insights.test.tsx`

- [ ] **Step 1: Write the failing test for dark inspector surfaces**

Add a class-level assertion to the existing side-insights test so the redesigned panel must expose the new dark inspector surface classes.

```tsx
it('renders the selected-day panel with ops-console contrast classes', () => {
  render(
    <CalendarSideInsights
      events={[makeEvent()]}
      selectedDate={new Date('2026-04-13')}
      selectedDayEvents={[makeEvent()]}
      onOpenEvent={vi.fn()}
      onCreateEvent={vi.fn()}
    />
  );

  expect(screen.getByText('Selected day')).toBeInTheDocument();
  expect(screen.getByText('Selected day').closest('section')?.className).toContain('bg-[#11161d]');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run apps/web/src/components/calendar/redesign/calendar-side-insights.test.tsx
```

Expected: FAIL because the current component does not render the new dark inspector classes.

- [ ] **Step 3: Add the shared theme utilities and dark surface primitive**

Create the reusable shell and chart tokens first.

```tsx
// apps/web/src/components/ui/data-surface.tsx
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DataSurfaceProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  eyebrow?: string;
  actions?: ReactNode;
}

export function DataSurface({ title, eyebrow, actions, className, children, ...props }: DataSurfaceProps) {
  return (
    <section
      className={cn(
        'rounded-[28px] border border-white/10 bg-[#11161d] shadow-[0_18px_48px_rgba(0,0,0,0.32)]',
        className,
      )}
      {...props}
    >
      {(title || eyebrow || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-white/8 px-6 py-5">
          <div>
            {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8f9aae]">{eyebrow}</p> : null}
            {title ? <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#f7f8fb]">{title}</h2> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      )}
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}
```

```ts
// apps/web/src/components/ui/chart-theme.ts
export const chartTheme = {
  axis: '#c7cfdd',
  grid: 'rgba(199, 207, 221, 0.16)',
  tooltipBg: '#11161d',
  tooltipBorder: 'rgba(255,255,255,0.12)',
  revenue: '#34d399',
  expense: '#f59e0b',
  deduction: '#f97316',
  balance: '#60a5fa',
  neutral: '#94a3b8',
};
```

Add matching CSS tokens to `apps/web/src/index.css`.

```css
@layer base {
  :root {
    --ops-bg: 222 24% 8%;
    --ops-panel: 219 25% 11%;
    --ops-panel-raised: 220 20% 14%;
    --ops-border: 220 14% 24%;
    --ops-text: 220 25% 97%;
    --ops-text-muted: 220 12% 66%;
    --ops-amber: 35 88% 58%;
    --ops-emerald: 160 84% 44%;
    --ops-blue: 212 92% 64%;
  }

  body {
    @apply bg-[#090d12] text-[#f7f8fb];
  }
}
```

- [ ] **Step 4: Update the calendar side panel to use the new surface**

Apply the new surface classes without changing behavior yet.

```tsx
// apps/web/src/components/calendar/redesign/calendar-side-insights.tsx
import { DataSurface } from '@/components/ui/data-surface';

// ...

return (
  <DataSurface
    title="Selected day"
    eyebrow="Schedule detail"
    className="bg-[#11161d]"
  >
    {/* existing content */}
  </DataSurface>
);
```

- [ ] **Step 5: Run the test to verify it passes**

Run:

```bash
npx vitest run apps/web/src/components/calendar/redesign/calendar-side-insights.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/index.css apps/web/src/components/ui/data-surface.tsx apps/web/src/components/ui/chart-theme.ts apps/web/src/components/calendar/redesign/calendar-side-insights.tsx apps/web/src/components/calendar/redesign/calendar-side-insights.test.tsx
git commit -m "feat: add ops console theme foundation"
```

---

### Task 2: Build the shared dark table system

**Files:**
- Create: `apps/web/src/components/ui/dark-table.tsx`
- Modify: `apps/web/src/components/ui/table.tsx`
- Test: `apps/web/src/components/reports/reports-shell.test.tsx`

- [ ] **Step 1: Write the failing test for sticky dark headers**

Create a focused test for the new table wrapper.

```tsx
import { render, screen } from '@testing-library/react';
import { DarkTable, DarkTableHeader, DarkTableRow, DarkTableCell } from '@/components/ui/dark-table';

it('renders sticky high-contrast headers for data-heavy tables', () => {
  render(
    <DarkTable>
      <thead>
        <tr>
          <DarkTableHeader sticky>Revenue</DarkTableHeader>
        </tr>
      </thead>
      <tbody>
        <DarkTableRow>
          <DarkTableCell numeric>$12,400</DarkTableCell>
        </DarkTableRow>
      </tbody>
    </DarkTable>
  );

  expect(screen.getByText('Revenue').className).toContain('sticky');
  expect(screen.getByText('$12,400').className).toContain('text-right');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run apps/web/src/components/reports/reports-shell.test.tsx
```

Expected: FAIL because `DarkTable` does not exist yet.

- [ ] **Step 3: Create the reusable dark table wrapper**

```tsx
// apps/web/src/components/ui/dark-table.tsx
import type { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function DarkTable({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('overflow-hidden rounded-[24px] border border-white/8 bg-[#0d1218]', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm text-[#f7f8fb]" {...props} />
      </div>
    </div>
  );
}

export function DarkTableHeader({ className, sticky, ...props }: ThHTMLAttributes<HTMLTableCellElement> & { sticky?: boolean }) {
  return (
    <th
      className={cn(
        'bg-[#131a22] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9aa6bb]',
        sticky && 'sticky top-0 z-10',
        className,
      )}
      {...props}
    />
  );
}

export function DarkTableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-t border-white/6 odd:bg-white/[0.01] even:bg-transparent hover:bg-white/[0.04]',
        className,
      )}
      {...props}
    />
  );
}

export function DarkTableCell({ className, numeric, ...props }: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={cn('px-4 py-3 align-middle text-[#e7ebf3]', numeric && 'text-right tabular-nums', className)}
      {...props}
    />
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx vitest run apps/web/src/components/reports/reports-shell.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/dark-table.tsx apps/web/src/components/ui/table.tsx apps/web/src/components/reports/reports-shell.test.tsx
git commit -m "feat: add dark table system"
```

---

### Task 3: Redesign the calendar month grid for scanability

**Files:**
- Modify: `apps/web/src/components/calendar/redesign/calendar-month-grid.tsx`
- Modify: `apps/web/src/components/calendar/redesign/calendar-types.ts`
- Create: `apps/web/src/components/calendar/redesign/calendar-month-grid.test.tsx`

- [ ] **Step 1: Write the failing calendar grid test**

```tsx
import { render, screen } from '@testing-library/react';
import { CalendarMonthGrid } from './calendar-month-grid';

it('shows only the top two event chips and an overflow counter in each day cell', () => {
  render(
    <CalendarMonthGrid
      currentDate={new Date('2026-04-01')}
      events={[
        makeEvent({ id: '1', start: '2026-04-13', title: 'Estimate A' }),
        makeEvent({ id: '2', start: '2026-04-13', title: 'Install B' }),
        makeEvent({ id: '3', start: '2026-04-13', title: 'Follow-Up C' }),
      ]}
      isLoading={false}
      selectedDate={new Date('2026-04-13')}
      onSelectDate={vi.fn()}
      onSelectEvent={vi.fn()}
      onCreateEvent={vi.fn()}
      onPreviousMonth={vi.fn()}
      onNextMonth={vi.fn()}
    />
  );

  expect(screen.getByText('Estimate A')).toBeInTheDocument();
  expect(screen.getByText('Install B')).toBeInTheDocument();
  expect(screen.getByText('+1 more')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx vitest run apps/web/src/components/calendar/redesign/calendar-month-grid.test.tsx
```

Expected: FAIL because the current month grid does not enforce the new overflow presentation.

- [ ] **Step 3: Implement the darker scan-first grid**

Update day-cell rendering to:
- show darker cell shells
- highlight today/selected states
- clamp chip count to 2
- render a `+n more` button/label

```tsx
const visibleEvents = dayEvents.slice(0, 2);
const hiddenCount = Math.max(dayEvents.length - visibleEvents.length, 0);

<button
  type="button"
  onClick={() => onSelectDate(day)}
  className={cn(
    'min-h-[156px] border border-white/6 bg-[#0f141b] p-3 text-left transition',
    isSelected && 'border-[#f59e0b] bg-[#141b23]',
    isToday && 'ring-1 ring-[#34d399]',
  )}
>
  <div className="flex items-center justify-between">
    <span className="text-lg font-semibold text-[#f7f8fb]">{format(day, 'd')}</span>
    {isToday ? <span className="rounded-full bg-[#143227] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8ef0c2]">Today</span> : null}
  </div>

  <div className="mt-3 space-y-2">
    {visibleEvents.map((event) => (
      <button key={event.id} type="button" onClick={() => onSelectEvent(event)} className="flex w-full items-start gap-2 rounded-2xl border border-white/8 bg-[#151d27] px-3 py-2 text-left">
        <span className="mt-1 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: event.color }} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-[#f7f8fb]">{event.title}</span>
          <span className="block truncate text-xs text-[#93a0b4]">{event.projectCustomer || event.type}</span>
        </span>
      </button>
    ))}
    {hiddenCount > 0 ? <div className="px-1 text-xs font-medium text-[#f6bf74]">+{hiddenCount} more</div> : null}
  </div>
</button>
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx vitest run apps/web/src/components/calendar/redesign/calendar-month-grid.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/calendar/redesign/calendar-month-grid.tsx apps/web/src/components/calendar/redesign/calendar-types.ts apps/web/src/components/calendar/redesign/calendar-month-grid.test.tsx
git commit -m "feat: redesign calendar month grid"
```

---

### Task 4: Redesign the calendar page around grid + agenda

**Files:**
- Modify: `apps/web/src/pages/calendar.tsx`
- Modify: `apps/web/src/components/calendar/redesign/calendar-side-insights.tsx`
- Test: `apps/web/src/components/calendar/redesign/calendar-side-insights.test.tsx`

- [ ] **Step 1: Extend the test to cover selected-day agenda behavior**

```tsx
it('surfaces selected-day events in the agenda panel', () => {
  render(
    <CalendarSideInsights
      events={[makeEvent({ title: 'Install for Baker' })]}
      selectedDate={new Date('2026-04-13')}
      selectedDayEvents={[makeEvent({ title: 'Install for Baker' })]}
      onOpenEvent={vi.fn()}
      onCreateEvent={vi.fn()}
    />
  );

  expect(screen.getByText('Install for Baker')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /add event/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx vitest run apps/web/src/components/calendar/redesign/calendar-side-insights.test.tsx
```

Expected: FAIL if the current side panel still behaves like a general insights strip instead of a selected-day agenda.

- [ ] **Step 3: Recompose the calendar page**

In `apps/web/src/pages/calendar.tsx`:
- derive `selectedDayEvents`
- pass them to the side panel
- update the page shell classes to a darker workspace

```tsx
const [selectedDate, setSelectedDate] = useState(() => new Date());

const selectedDayEvents = useMemo(
  () => filteredEvents.filter((event) => event.start === format(selectedDate, 'yyyy-MM-dd')),
  [filteredEvents, selectedDate],
);

return (
  <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_380px]">
    <CalendarMonthGrid
      currentDate={currentDate}
      events={filteredEvents}
      selectedDate={selectedDate}
      onSelectDate={setSelectedDate}
      // existing props
    />
    <CalendarSideInsights
      events={monthEvents}
      selectedDate={selectedDate}
      selectedDayEvents={selectedDayEvents}
      onOpenEvent={handleEventClick}
      onCreateEvent={openCreateDialog}
    />
  </div>
);
```

- [ ] **Step 4: Update the side panel implementation**

Use `selectedDayEvents` as the main payload, with month-level stats as secondary context only.

```tsx
<DataSurface title={format(selectedDate, 'EEEE, MMM d')} eyebrow="Selected day">
  <div className="space-y-3">
    {selectedDayEvents.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-[#93a0b4]">
        No scheduled items. Use Add Event to place a follow-up, install, or meeting here.
      </div>
    ) : (
      selectedDayEvents.map((event) => (
        <button key={event.id} type="button" onClick={() => onOpenEvent(event)} className="w-full rounded-2xl border border-white/8 bg-[#151d27] px-4 py-3 text-left">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: event.color }} />
            <span className="text-sm font-semibold text-[#f7f8fb]">{event.title}</span>
          </div>
          <p className="mt-1 text-xs text-[#93a0b4]">{event.projectCustomer || 'Standalone event'}</p>
        </button>
      ))
    )}
  </div>
</DataSurface>
```

- [ ] **Step 5: Run the test to verify it passes**

Run:

```bash
npx vitest run apps/web/src/components/calendar/redesign/calendar-side-insights.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/calendar.tsx apps/web/src/components/calendar/redesign/calendar-side-insights.tsx apps/web/src/components/calendar/redesign/calendar-side-insights.test.tsx
git commit -m "feat: redesign calendar agenda layout"
```

---

### Task 5: Rebuild the reports shell as a dark workstation

**Files:**
- Modify: `apps/web/src/pages/reports.tsx`
- Create: `apps/web/src/components/reports/reports-shell.test.tsx`

- [ ] **Step 1: Write the failing reports shell test**

```tsx
import { render, screen } from '@testing-library/react';
import ReportsPage from '@/pages/reports';

it('renders a high-contrast report control rail and summary-first layout', () => {
  render(<ReportsPage />);
  expect(screen.getByRole('tab', { name: 'P&L' })).toBeInTheDocument();
  expect(screen.getByLabelText('Date from')).toBeInTheDocument();
  expect(screen.getByText('Reports')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run apps/web/src/components/reports/reports-shell.test.tsx
```

Expected: FAIL because the new dark summary-first shell is not implemented and the test file is new.

- [ ] **Step 3: Recompose `apps/web/src/pages/reports.tsx`**

Use a dark sticky control rail and a dedicated content stack.

```tsx
return (
  <div className="space-y-6">
    <section className="sticky top-0 z-20 rounded-[28px] border border-white/10 bg-[#0f141b]/95 px-6 py-5 backdrop-blur">
      {/* tablist + period + date range + export */}
    </section>

    <div className="space-y-6">
      {activeTab === 'pnl' && <PnlReport dateFrom={dateFrom} dateTo={dateTo} period={period} />}
      {activeTab === 'job-costing' && <JobCostingReport dateFrom={dateFrom} dateTo={dateTo} onFiltersChange={setJobCostingFilters} />}
      {activeTab === 'commissions' && <CommissionReport dateFrom={dateFrom} dateTo={dateTo} />}
      {activeTab === 'expenses' && <ExpenseReport dateFrom={dateFrom} dateTo={dateTo} />}
      {activeTab === 'cash-flow' && <CashFlowReport dateFrom={dateFrom} dateTo={dateTo} />}
    </div>
  </div>
);
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx vitest run apps/web/src/components/reports/reports-shell.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/reports.tsx apps/web/src/components/reports/reports-shell.test.tsx
git commit -m "feat: redesign reports workspace shell"
```

---

### Task 6: Migrate report charts and tables to the new dark primitives

**Files:**
- Modify: `apps/web/src/components/reports/pnl-report.tsx`
- Modify: `apps/web/src/components/reports/cash-flow-report.tsx`
- Modify: `apps/web/src/components/reports/commission-report.tsx`
- Modify: `apps/web/src/components/reports/expense-report.tsx`
- Modify: `apps/web/src/components/reports/job-costing-report.tsx`
- Modify: `apps/web/src/components/reports/receivables-table.tsx`
- Modify: `apps/web/src/components/reports/monthly-pl-table.tsx`

- [ ] **Step 1: Write a failing render assertion for one representative report**

Add a test expectation in `apps/web/src/components/reports/reports-shell.test.tsx` that a report section uses the new dark surface classes.

```tsx
expect(screen.getByText('Monthly P&L').closest('section')?.className).toContain('bg-[#11161d]');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run apps/web/src/components/reports/reports-shell.test.tsx
```

Expected: FAIL because the report bodies are still using the older pale surfaces.

- [ ] **Step 3: Update the report components**

Pattern for each report:
- wrap chart/table blocks in `DataSurface`
- use `chartTheme`
- replace raw table markup with `DarkTable`

```tsx
<DataSurface title="Monthly P&L" eyebrow="Reports">
  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_420px]">
    <div className="rounded-[24px] border border-white/8 bg-[#0d1218] p-4">
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData}>
          <CartesianGrid stroke={chartTheme.grid} vertical={false} />
          <XAxis dataKey="label" stroke={chartTheme.axis} tick={{ fill: chartTheme.axis }} />
          <YAxis stroke={chartTheme.axis} tick={{ fill: chartTheme.axis }} />
          <Tooltip contentStyle={{ background: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}` }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    <DarkTable>
      {/* migrated rows */}
    </DarkTable>
  </div>
</DataSurface>
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx vitest run apps/web/src/components/reports/reports-shell.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/reports/pnl-report.tsx apps/web/src/components/reports/cash-flow-report.tsx apps/web/src/components/reports/commission-report.tsx apps/web/src/components/reports/expense-report.tsx apps/web/src/components/reports/job-costing-report.tsx apps/web/src/components/reports/receivables-table.tsx apps/web/src/components/reports/monthly-pl-table.tsx apps/web/src/components/reports/reports-shell.test.tsx
git commit -m "feat: migrate reports to dark chart and table primitives"
```

---

### Task 7: Apply the dark-table system to adjacent operational tables

**Files:**
- Modify: `apps/web/src/components/finances/redesign/finances-transaction-table.tsx`
- Modify: `apps/web/src/components/commissions/project-breakdown-table.tsx`
- Modify: `apps/web/src/components/commissions/debt-tracker.tsx`
- Modify: `apps/web/src/components/commissions/pipeline-projection.tsx`
- Modify: `apps/web/src/components/projects/redesign/projects-table-shell.tsx`
- Modify: `apps/web/src/components/projects/redesign-grid/grid-view-table.tsx`
- Modify: `apps/web/src/components/settings/operating-expenses-section.tsx`
- Modify: `apps/web/src/components/settings/rate-templates-section.tsx`
- Test: `apps/web/src/pages/finances.test.tsx`

- [ ] **Step 1: Add a failing finances table assertion**

```tsx
expect(screen.getByTestId('transaction-table').className).toContain('bg-[#0d1218]');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run apps/web/src/pages/finances.test.tsx
```

Expected: FAIL because the transactions table does not yet expose the new dark-table wrapper.

- [ ] **Step 3: Replace existing raw table wrappers with `DarkTable`**

Example for finances:

```tsx
<DarkTable className="min-h-[420px]" data-testid="transaction-table">
  <thead>
    <tr>
      <DarkTableHeader sticky>Date</DarkTableHeader>
      <DarkTableHeader sticky>Category</DarkTableHeader>
      <DarkTableHeader sticky>Description</DarkTableHeader>
      <DarkTableHeader sticky numeric>Amount</DarkTableHeader>
    </tr>
  </thead>
  <tbody>
    {rows.map((row) => (
      <DarkTableRow key={row.id}>
        <DarkTableCell>{formatDate(row.date)}</DarkTableCell>
        <DarkTableCell>{row.category}</DarkTableCell>
        <DarkTableCell>{row.description}</DarkTableCell>
        <DarkTableCell numeric>{formatCurrency(row.amount)}</DarkTableCell>
      </DarkTableRow>
    ))}
  </tbody>
</DarkTable>
```

Apply the same pattern to the listed commissions, projects, and settings tables.

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx vitest run apps/web/src/pages/finances.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/finances/redesign/finances-transaction-table.tsx apps/web/src/components/commissions/project-breakdown-table.tsx apps/web/src/components/commissions/debt-tracker.tsx apps/web/src/components/commissions/pipeline-projection.tsx apps/web/src/components/projects/redesign/projects-table-shell.tsx apps/web/src/components/projects/redesign-grid/grid-view-table.tsx apps/web/src/components/settings/operating-expenses-section.tsx apps/web/src/components/settings/rate-templates-section.tsx apps/web/src/pages/finances.test.tsx
git commit -m "feat: apply dark table system across operational surfaces"
```

---

### Task 8: Run the full frontend verification pass

**Files:**
- Modify: any touched frontend tests as needed from previous tasks

- [ ] **Step 1: Run targeted component tests**

Run:

```bash
npx vitest run apps/web/src/components/calendar/redesign/calendar-month-grid.test.tsx apps/web/src/components/calendar/redesign/calendar-side-insights.test.tsx apps/web/src/components/reports/reports-shell.test.tsx apps/web/src/pages/finances.test.tsx apps/web/src/pages/projects.test.tsx
```

Expected: PASS

- [ ] **Step 2: Run the web build**

Run:

```bash
npm run build -w apps/web
```

Expected: build completes successfully

- [ ] **Step 3: Commit any final test adjustments**

```bash
git add apps/web/src
git commit -m "test: verify ops console frontend redesign"
```

---

## Self-Review

### Spec coverage

- Dark high-contrast visual system: covered by Tasks 1 and 2
- Calendar redesign: covered by Tasks 3 and 4
- Reports redesign: covered by Tasks 5 and 6
- Shared table/chart readability across the platform: covered by Tasks 2, 6, and 7
- Verification: covered by Task 8

No spec gaps remain for the approved scope.

### Placeholder scan

- No `TODO`, `TBD`, or deferred implementation markers remain.
- Each code-bearing step contains concrete file paths, example code, and exact commands.

### Type consistency

- Shared primitives use consistent names through later tasks: `DataSurface`, `DarkTable`, `DarkTableHeader`, `DarkTableRow`, `DarkTableCell`, `chartTheme`.
- Calendar tasks consistently use `selectedDayEvents`.

