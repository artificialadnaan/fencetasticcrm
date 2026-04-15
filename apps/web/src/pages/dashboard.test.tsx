import { act, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PageShell, { PageShellProvider, type PageShellConfig } from '@/components/layout/page-shell';
import DashboardPage from './dashboard';

const useDashboardMock = vi.fn();
const useFinanceRiskMock = vi.fn();

vi.mock('@/hooks/use-dashboard', () => ({
  useDashboard: (...args: unknown[]) => useDashboardMock(...args),
}));

vi.mock('@/hooks/use-finance-risk', () => ({
  useFinanceRisk: (...args: unknown[]) => useFinanceRiskMock(...args),
}));

vi.mock('@/components/projects/create-project-dialog', () => ({
  CreateProjectDialog: () => null,
}));

vi.mock('@/components/dashboard/redesign/dashboard-kpi-strip', () => ({
  DashboardKpiStrip: () => <div data-testid="kpi-strip" />,
}));

vi.mock('@/components/dashboard/redesign/dashboard-command-queue', () => ({
  DashboardCommandQueue: () => <div data-testid="command-queue" />,
}));

vi.mock('@/components/dashboard/redesign/dashboard-cash-risk-strip', () => ({
  DashboardCashRiskStrip: ({
    risk,
    isLoading,
  }: {
    risk: { receivables: { overallOutstanding: number } } | null;
    isLoading: boolean;
  }) => <div data-testid="cash-risk-strip">{isLoading ? 'loading' : risk?.receivables.overallOutstanding}</div>,
}));

vi.mock('@/components/dashboard/redesign/dashboard-revenue-panel', () => ({
  DashboardRevenuePanel: () => <div data-testid="revenue-panel" />,
}));

vi.mock('@/components/dashboard/redesign/dashboard-project-breakdown', () => ({
  DashboardProjectBreakdown: () => <div data-testid="project-breakdown" />,
}));

vi.mock('@/components/dashboard/redesign/dashboard-followups-panel', () => ({
  DashboardFollowupsPanel: () => <div data-testid="followups-panel" />,
}));

vi.mock('@/components/dashboard/redesign/dashboard-workflow-panel', () => ({
  DashboardWorkflowPanel: ({
    overview,
  }: {
    overview: { overdueCount: number } | null;
  }) => <div data-testid="workflow-panel">{overview?.overdueCount}</div>,
}));

vi.mock('@/components/dashboard/redesign/dashboard-activity-panel', () => ({
  DashboardActivityPanel: () => <div data-testid="activity-panel" />,
}));

vi.mock('@/components/dashboard/redesign/dashboard-installs-panel', () => ({
  DashboardInstallsPanel: () => <div data-testid="installs-panel" />,
}));

function ShellHarness({ children }: { children: ReactNode }) {
  const [shellConfig, setShellConfig] = useState<PageShellConfig>({});

  return (
    <PageShellProvider value={setShellConfig}>
      <PageShell
        onOpenSidebar={vi.fn()}
        {...shellConfig}
      >
        {children}
      </PageShell>
    </PageShellProvider>
  );
}

describe('DashboardPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    useDashboardMock.mockReset();
    useFinanceRiskMock.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders the cash-risk strip alongside the existing dashboard overview surfaces', () => {
    useDashboardMock.mockReturnValue({
      data: {
        kpis: {
          revenueMTD: 0,
          openProjects: 3,
          outstandingReceivables: 28166.07,
          aimannDebtBalance: 300,
        },
        commandQueue: {
          actionNeeded: [],
          moneyAtRisk: [],
          scheduleBlockers: [],
        },
        monthlyRevenueExpenses: [],
        projectTypeBreakdown: [],
        todaysFollowUps: [],
        workflowOverview: {
          overdueCount: 2,
        },
        recentActivity: [],
        upcomingInstalls: [],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    useFinanceRiskMock.mockReturnValue({
      data: {
        receivables: {
          overallOutstanding: 9700,
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    act(() => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ShellHarness>
            <DashboardPage />
          </ShellHarness>
        </MemoryRouter>
      );
    });

    expect(container.querySelector('[data-testid="cash-risk-strip"]')?.textContent).toBe('9700');
    expect(container.querySelector('[data-testid="workflow-panel"]')?.textContent).toBe('2');
  });
});
