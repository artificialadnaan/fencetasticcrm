import { Link } from 'react-router-dom';
import type { DashboardWorkflowOverview } from '@fencetastic/shared';
import { formatDate } from '@/lib/formatters';

interface DashboardWorkflowPanelProps {
  overview: DashboardWorkflowOverview | null;
  isLoading: boolean;
}

function SummaryPill({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

export function DashboardWorkflowPanel({ overview, isLoading }: DashboardWorkflowPanelProps) {
  return (
    <section className="shell-panel rounded-[32px] p-6">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Workflow Queue</p>
          <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-white">Owned and unassigned work</h2>
        </div>
        <Link
          to="/calendar"
          className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/16"
        >
          Open calendar
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-20 animate-pulse rounded-[24px] bg-white/10" />
          ))}
        </div>
      ) : !overview ? (
        <div className="mt-5 rounded-[24px] border border-dashed border-white/12 bg-white/6 px-5 py-8 text-sm text-slate-300">
          Workflow queue unavailable.
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryPill label="Overdue" value={overview.overdueCount} />
            <SummaryPill label="Due Today" value={overview.dueTodayCount} />
            <SummaryPill label="Upcoming" value={overview.upcomingCount} />
            <SummaryPill label="Unassigned" value={overview.unassignedCount} />
          </div>

          <div className="flex flex-wrap gap-2">
            {overview.ownerBreakdown.map((owner) => (
              <div key={owner.ownerName} className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200">
                {owner.ownerName} • {owner.count}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {overview.topTasks.map((task) => (
              <Link
                key={task.id}
                to={task.href}
                className="block rounded-[24px] border border-white/10 bg-white px-4 py-4 text-slate-950 shadow-[0_12px_32px_rgba(15,23,42,0.18)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-slate-950">{task.title}</p>
                    <p className="mt-1 truncate text-sm text-slate-600">{task.customer} • {task.address}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{task.urgency}</span>
                </div>
                <p className="mt-3 text-sm text-slate-700">
                  {formatDate(task.dueDate)}
                  {task.assignedToName ? ` • ${task.assignedToName}` : ' • Unassigned'}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
