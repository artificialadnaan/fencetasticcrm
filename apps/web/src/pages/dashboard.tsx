import { useDashboard } from '@/hooks/use-dashboard';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { ProjectTypeChart } from '@/components/dashboard/project-type-chart';
import { FollowUpsWidget } from '@/components/dashboard/follow-ups-widget';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { UpcomingInstalls } from '@/components/dashboard/upcoming-installs';

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your fencing projects and financials.</p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load dashboard: {error}
        </div>
      )}

      {/* KPI Cards */}
      <KpiCards kpis={data?.kpis ?? null} isLoading={isLoading} />

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RevenueChart
          data={data?.monthlyRevenueExpenses ?? []}
          isLoading={isLoading}
        />
        <ProjectTypeChart
          data={data?.projectTypeBreakdown ?? []}
          isLoading={isLoading}
        />
      </div>

      {/* Widgets row */}
      <div className="grid gap-4 md:grid-cols-3">
        <FollowUpsWidget
          followUps={data?.todaysFollowUps ?? []}
          isLoading={isLoading}
        />
        <RecentActivity
          activity={data?.recentActivity ?? []}
          isLoading={isLoading}
        />
        <UpcomingInstalls
          installs={data?.upcomingInstalls ?? []}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
