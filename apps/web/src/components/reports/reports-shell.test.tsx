import { act, type ReactNode, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PageShell, { PageShellProvider, type PageShellConfig } from '@/components/layout/page-shell';
import ReportsPage from '@/pages/reports';

vi.mock('@/components/reports/pnl-report', () => ({
  PnlReport: () => <section className="bg-[#11161d]">Monthly P&L</section>,
}));
vi.mock('@/components/reports/job-costing-report', () => ({
  JobCostingReport: () => <section>Job Costing</section>,
}));
vi.mock('@/components/reports/commission-report', () => ({
  CommissionReport: () => <section>Commissions</section>,
}));
vi.mock('@/components/reports/expense-report', () => ({
  ExpenseReport: () => <section>Expenses</section>,
}));
vi.mock('@/components/reports/cash-flow-report', () => ({
  CashFlowReport: () => <section>Cash Flow</section>,
}));
vi.mock('@/hooks/use-financial-reports', () => ({
  useExportReport: () => ({ exportCsv: vi.fn(), isExporting: false }),
}));
vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}));

function ShellHarness({ children }: { children: ReactNode }) {
  const [shellConfig, setShellConfig] = useState<PageShellConfig>({});

  return (
    <PageShellProvider value={setShellConfig}>
      <PageShell onOpenSidebar={vi.fn()} {...shellConfig}>
        {children}
      </PageShell>
    </PageShellProvider>
  );
}

describe('ReportsPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders a high-contrast report control rail and summary-first layout', () => {
    act(() => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ShellHarness>
            <ReportsPage />
          </ShellHarness>
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Reports');
    expect(container.textContent).toContain('P&L');
    expect(container.querySelector('input[aria-label="Date from"]')).not.toBeNull();
    expect(container.querySelectorAll('[role="tablist"]')).toHaveLength(1);
    expect(container.querySelector('.sticky.top-0.print\\:hidden')).not.toBeNull();
    expect(container.querySelector('section.bg-\\[\\#11161d\\]')?.textContent).toContain('Monthly P&L');
  });
});
