import { act, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectStatus } from '@fencetastic/shared';
import PageShell, { PageShellProvider, type PageShellConfig } from '@/components/layout/page-shell';
import DashboardPage from './dashboard';

const useDashboardMock = vi.fn();
const useFinanceRiskMock = vi.fn();
const useUserOptionsMock = vi.fn();
const apiPostMock = vi.fn();
const apiPatchMock = vi.fn();

vi.mock('@/hooks/use-dashboard', () => ({
  useDashboard: (...args: unknown[]) => useDashboardMock(...args),
}));

vi.mock('@/hooks/use-finance-risk', () => ({
  useFinanceRisk: (...args: unknown[]) => useFinanceRiskMock(...args),
}));

vi.mock('@/hooks/use-user-options', () => ({
  useUserOptions: (...args: unknown[]) => useUserOptionsMock(...args),
}));

vi.mock('@/lib/api', () => ({
  api: {
    post: (...args: unknown[]) => apiPostMock(...args),
    patch: (...args: unknown[]) => apiPatchMock(...args),
  },
}));

vi.mock('@/components/projects/create-project-dialog', () => ({
  CreateProjectDialog: () => null,
}));

vi.mock('@/components/dashboard/redesign/dashboard-kpi-strip', () => ({
  DashboardKpiStrip: () => <div data-testid="kpi-strip" />,
}));

vi.mock('@/components/dashboard/redesign/dashboard-command-queue', () => ({
  DashboardCommandQueue: ({
    queue,
    onCompleteActionItem,
  }: {
    queue: { actionNeeded: Array<{ id: string }> } | null;
    onCompleteActionItem?: (item: unknown) => Promise<void> | void;
  }) => (
    <div data-testid="command-queue">
      {queue?.actionNeeded.map((item) => (
        <button key={item.id} type="button" onClick={() => onCompleteActionItem?.(item)}>
          action-{item.id}
        </button>
      ))}
    </div>
  ),
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
  DashboardFollowupsPanel: ({
    followUps,
    onCompleteFollowUp,
  }: {
    followUps: Array<{ id: string; source?: string; actionId?: string }>;
    onCompleteFollowUp?: (task: unknown) => Promise<void> | void;
  }) => (
    <div data-testid="followups-panel">
      {followUps.map((task) => (
        <button key={task.id} type="button" onClick={() => onCompleteFollowUp?.(task)}>
          complete-{task.id}
        </button>
      ))}
    </div>
  ),
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
    useUserOptionsMock.mockReset();
    apiPostMock.mockReset();
    apiPatchMock.mockReset();

    useUserOptionsMock.mockReturnValue({
      users: [],
      isLoading: false,
    });
    apiPostMock.mockResolvedValue({ data: { data: {} } });
    apiPatchMock.mockResolvedValue({ data: { data: {} } });
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
          dueTodayCount: 0,
          upcomingCount: 0,
          unassignedCount: 0,
          ownerBreakdown: [],
          tasks: [],
          topTasks: [],
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

  it('routes dashboard follow-up completion through the correct API by task source', async () => {
    const refetchMock = vi.fn();

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
        todaysFollowUps: [
          {
            id: 'sequence-task-1',
            projectId: 'project-7',
            customer: 'Jane Doe',
            address: '123 Fence Lane',
            status: ProjectStatus.ESTIMATE,
            dueDate: '2026-04-09',
            kind: 'DAY_7',
            title: null,
            notes: null,
            href: '/projects/project-7?tab=follow-up',
            assignedToName: 'Office Admin',
            source: 'ESTIMATE_FOLLOW_UP',
          },
          {
            id: 'calendar-event-1',
            actionId: 'calendar-event-1',
            projectId: 'project-88',
            customer: 'Sharon Harbach',
            address: '321 River Meadows Ln',
            status: ProjectStatus.OPEN,
            dueDate: '2026-04-08',
            kind: 'MANUAL',
            title: 'Collect signed HOA form',
            notes: 'Need this before install scheduling.',
            href: '/calendar?date=2026-04-08',
            assignedToName: 'Adnaan',
            source: 'WORKFLOW_TASK',
          },
        ],
        workflowOverview: {
          overdueCount: 0,
          dueTodayCount: 0,
          upcomingCount: 0,
          unassignedCount: 0,
          ownerBreakdown: [],
          tasks: [],
          topTasks: [],
        },
        recentActivity: [],
        upcomingInstalls: [],
      },
      isLoading: false,
      error: null,
      refetch: refetchMock,
    });

    useFinanceRiskMock.mockReturnValue({
      data: { receivables: { overallOutstanding: 9700 } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    await act(async () => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ShellHarness>
            <DashboardPage />
          </ShellHarness>
        </MemoryRouter>
      );
    });

    const completeButtons = Array.from(container.querySelectorAll('button')).filter((node) =>
      node.textContent?.startsWith('complete-')
    );

    await act(async () => {
      completeButtons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    });
    expect(apiPostMock).toHaveBeenCalledWith('/follow-ups/tasks/sequence-task-1/complete');

    await act(async () => {
      completeButtons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    });
    expect(apiPatchMock).toHaveBeenCalledWith('/calendar/events/calendar-event-1', { taskStatus: 'COMPLETED' });
    expect(refetchMock).toHaveBeenCalledTimes(2);
  });

  it('routes action-needed completion through the correct API by task source', async () => {
    const refetchMock = vi.fn();

    useDashboardMock.mockReturnValue({
      data: {
        kpis: {
          revenueMTD: 0,
          openProjects: 3,
          outstandingReceivables: 28166.07,
          aimannDebtBalance: 300,
        },
        commandQueue: {
          actionNeeded: [
            {
              id: 'a-sequence',
              actionId: 'sequence-task-1',
              source: 'ESTIMATE_FOLLOW_UP',
              projectId: 'project-7',
              customer: 'Jane Doe',
              address: '123 Fence Lane',
              title: 'Follow-up due',
              reason: 'Day 7 follow-up due today',
              urgency: 'HIGH',
              financeProjectMode: null,
              href: '/projects/project-7?tab=follow-up',
            },
            {
              id: 'a-manual',
              actionId: 'calendar-event-1',
              source: 'WORKFLOW_TASK',
              projectId: 'project-88',
              customer: 'Sharon Harbach',
              address: '321 River Meadows Ln',
              title: 'Collect signed HOA form',
              reason: 'Need this before install scheduling.',
              urgency: 'MEDIUM',
              financeProjectMode: null,
              href: '/calendar?date=2026-04-08',
            },
          ],
          moneyAtRisk: [],
          scheduleBlockers: [],
        },
        monthlyRevenueExpenses: [],
        projectTypeBreakdown: [],
        todaysFollowUps: [],
        workflowOverview: {
          overdueCount: 0,
          dueTodayCount: 0,
          upcomingCount: 0,
          unassignedCount: 0,
          ownerBreakdown: [],
          tasks: [],
          topTasks: [],
        },
        recentActivity: [],
        upcomingInstalls: [],
      },
      isLoading: false,
      error: null,
      refetch: refetchMock,
    });

    useFinanceRiskMock.mockReturnValue({
      data: { receivables: { overallOutstanding: 9700 } },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    await act(async () => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ShellHarness>
            <DashboardPage />
          </ShellHarness>
        </MemoryRouter>
      );
    });

    const actionButtons = Array.from(container.querySelectorAll('button')).filter((node) =>
      node.textContent?.startsWith('action-')
    );

    await act(async () => {
      actionButtons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    });
    expect(apiPostMock).toHaveBeenCalledWith('/follow-ups/tasks/sequence-task-1/complete');

    await act(async () => {
      actionButtons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    });
    expect(apiPatchMock).toHaveBeenCalledWith('/calendar/events/calendar-event-1', { taskStatus: 'COMPLETED' });
    expect(refetchMock).toHaveBeenCalledTimes(2);
  });
});
