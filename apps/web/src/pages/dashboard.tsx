import { useMemo, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import type { DashboardFollowUpTask } from '@fencetastic/shared';
import { toast } from 'sonner';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/hooks/use-dashboard';
import { useFinanceRisk } from '@/hooks/use-finance-risk';
import { usePageShell } from '@/components/layout/page-shell';
import { DashboardKpiStrip } from '@/components/dashboard/redesign/dashboard-kpi-strip';
import { DashboardCashRiskStrip } from '@/components/dashboard/redesign/dashboard-cash-risk-strip';
import { DashboardCommandQueue } from '@/components/dashboard/redesign/dashboard-command-queue';
import { DashboardRevenuePanel } from '@/components/dashboard/redesign/dashboard-revenue-panel';
import { DashboardProjectBreakdown } from '@/components/dashboard/redesign/dashboard-project-breakdown';
import { DashboardFollowupsPanel } from '@/components/dashboard/redesign/dashboard-followups-panel';
import { DashboardWorkflowPanel } from '@/components/dashboard/redesign/dashboard-workflow-panel';
import { DashboardActivityPanel } from '@/components/dashboard/redesign/dashboard-activity-panel';
import { DashboardInstallsPanel } from '@/components/dashboard/redesign/dashboard-installs-panel';
import { useUserOptions } from '@/hooks/use-user-options';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboard();
  const { data: riskData, isLoading: riskLoading, error: riskError } = useFinanceRisk();
  const { users, isLoading: usersLoading } = useUserOptions();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  function handlePrint() {
    window.print();
  }

  async function handleCompleteWorkflowTask(taskId: string) {
    try {
      await api.patch(`/calendar/events/${taskId}`, { taskStatus: 'COMPLETED' });
      await refetch();
      toast.success('Task completed');
    } catch (err) {
      console.error('Failed to complete workflow task', err);
      toast.error('Failed to complete task');
    }
  }

  async function handleCompleteFollowUpTask(task: DashboardFollowUpTask) {
    try {
      if (task.source === 'ESTIMATE_FOLLOW_UP') {
        await api.post(`/follow-ups/tasks/${task.actionId ?? task.id}/complete`);
      } else {
        await api.patch(`/calendar/events/${task.actionId ?? task.id}`, { taskStatus: 'COMPLETED' });
      }
      await refetch();
      toast.success('Follow-up completed');
    } catch (err) {
      console.error('Failed to complete dashboard follow-up', err);
      toast.error('Failed to complete follow-up');
    }
  }

  async function handleCompleteActionItem(item: { actionId?: string | null; id: string; source?: string }) {
    try {
      if (item.source === 'ESTIMATE_FOLLOW_UP') {
        await api.post(`/follow-ups/tasks/${item.actionId ?? item.id}/complete`);
      } else {
        await api.patch(`/calendar/events/${item.actionId ?? item.id}`, { taskStatus: 'COMPLETED' });
      }
      await refetch();
      toast.success('Task completed');
    } catch (err) {
      console.error('Failed to complete command queue task', err);
      toast.error('Failed to complete task');
    }
  }

  async function handleAssignActionItem(item: { actionId?: string | null; id: string }, userId: string | null) {
    try {
      await api.patch(`/calendar/events/${item.actionId ?? item.id}`, { assignedToUserId: userId });
      await refetch();
      toast.success(userId ? 'Task owner updated' : 'Task unassigned');
    } catch (err) {
      console.error('Failed to update command queue owner', err);
      toast.error('Failed to update task owner');
    }
  }

  async function handleRescheduleActionItem(item: { actionId?: string | null; id: string }, dueDate: string) {
    try {
      await api.patch(`/calendar/events/${item.actionId ?? item.id}`, { date: dueDate });
      await refetch();
      toast.success('Task due date updated');
    } catch (err) {
      console.error('Failed to reschedule command queue task', err);
      toast.error('Failed to update due date');
    }
  }

  async function handleAssignWorkflowTask(taskId: string, userId: string | null) {
    try {
      await api.patch(`/calendar/events/${taskId}`, { assignedToUserId: userId });
      await refetch();
      toast.success(userId ? 'Task owner updated' : 'Task unassigned');
    } catch (err) {
      console.error('Failed to update workflow owner', err);
      toast.error('Failed to update task owner');
    }
  }

  async function handleRescheduleWorkflowTask(taskId: string, dueDate: string) {
    try {
      await api.patch(`/calendar/events/${taskId}`, { date: dueDate });
      await refetch();
      toast.success('Task due date updated');
    } catch (err) {
      console.error('Failed to reschedule workflow task', err);
      toast.error('Failed to update due date');
    }
  }

  const secondaryActions = useMemo(
    () => (
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="rounded-2xl border-black/10 bg-white/70 px-4 print:hidden"
      >
        <Download className="h-4 w-4" />
        Export
      </Button>
    ),
    []
  );

  const primaryActions = useMemo(
    () => (
      <Button
        size="sm"
        onClick={() => setIsCreateOpen(true)}
        className="rounded-2xl bg-[hsl(var(--brand-blue))] px-4 text-white hover:bg-[hsl(var(--brand-blue-hover))] print:hidden"
      >
        <Plus className="h-4 w-4" />
        Add New
      </Button>
    ),
    []
  );

  usePageShell({
    eyebrow: 'Operations Overview',
    title: 'Dashboard',
    subtitle: 'Live view of revenue, pipeline, follow-ups, and install readiness.',
    secondaryActions,
    primaryActions,
  });

  return (
    <>
      <CreateProjectDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onCreated={refetch} />

      <div className="space-y-6 print:space-y-4">
        <div className="hidden print:block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Fencetastic Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
            Operational overview
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Generated{' '}
            {new Date().toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>

        {error && (
          <div className="rounded-[24px] border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive print:hidden">
            Failed to load dashboard: {error}
          </div>
        )}

        <DashboardKpiStrip kpis={data?.kpis ?? null} isLoading={isLoading} />

        <DashboardCashRiskStrip risk={riskData} isLoading={riskLoading} error={riskError} />

        <DashboardCommandQueue
          queue={data?.commandQueue ?? null}
          isLoading={isLoading}
          users={users}
          isUsersLoading={usersLoading}
          onCompleteActionItem={handleCompleteActionItem}
          onAssignActionItem={handleAssignActionItem}
          onRescheduleActionItem={handleRescheduleActionItem}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
          <DashboardRevenuePanel
            data={data?.monthlyRevenueExpenses ?? []}
            isLoading={isLoading}
          />
          <DashboardProjectBreakdown
            data={data?.projectTypeBreakdown ?? []}
            isLoading={isLoading}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)_minmax(0,0.95fr)]">
          <DashboardFollowupsPanel
            followUps={data?.todaysFollowUps ?? []}
            isLoading={isLoading}
            onCompleteFollowUp={handleCompleteFollowUpTask}
          />
          <DashboardWorkflowPanel
            overview={data?.workflowOverview ?? null}
            isLoading={isLoading}
            users={users}
            isUsersLoading={usersLoading}
            onCompleteTask={handleCompleteWorkflowTask}
            onAssignTask={handleAssignWorkflowTask}
            onRescheduleTask={handleRescheduleWorkflowTask}
          />
          <DashboardActivityPanel
            activity={data?.recentActivity ?? []}
            isLoading={isLoading}
          />
          <DashboardInstallsPanel
            installs={data?.upcomingInstalls ?? []}
            isLoading={isLoading}
          />
        </div>
      </div>
    </>
  );
}
