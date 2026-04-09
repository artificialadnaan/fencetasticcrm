import { useMemo, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/hooks/use-dashboard';
import { usePageShell } from '@/components/layout/page-shell';
import { DashboardKpiStrip } from '@/components/dashboard/redesign/dashboard-kpi-strip';
import { DashboardRevenuePanel } from '@/components/dashboard/redesign/dashboard-revenue-panel';
import { DashboardProjectBreakdown } from '@/components/dashboard/redesign/dashboard-project-breakdown';
import { DashboardFollowupsPanel } from '@/components/dashboard/redesign/dashboard-followups-panel';
import { DashboardActivityPanel } from '@/components/dashboard/redesign/dashboard-activity-panel';
import { DashboardInstallsPanel } from '@/components/dashboard/redesign/dashboard-installs-panel';

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboard();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  function handlePrint() {
    window.print();
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
