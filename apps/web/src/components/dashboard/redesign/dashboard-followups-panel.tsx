import { BellDot } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PROJECT_STATUS_META, type DashboardFollowUpTask, type ProjectStatus } from '@fencetastic/shared';
import { formatDate } from '@/lib/formatters';

interface DashboardFollowupsPanelProps {
  followUps: DashboardFollowUpTask[];
  isLoading: boolean;
}

export function DashboardFollowupsPanel({
  followUps,
  isLoading,
}: DashboardFollowupsPanelProps) {
  return (
    <section className="shell-panel rounded-[32px] p-6">
      <div className="flex items-start justify-between gap-4 border-b border-black/5 pb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Follow-Ups
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-slate-950">
            Today&apos;s reminders
          </h2>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
          {isLoading ? '...' : `${followUps.length} due`}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-20 animate-pulse rounded-[24px] bg-slate-200/70" />
          ))}
        </div>
      ) : followUps.length === 0 ? (
        <div className="mt-5 flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/50 px-6 py-12 text-center">
          <BellDot className="h-10 w-10 text-slate-400" />
          <p className="mt-4 text-lg font-semibold text-slate-900">No follow-ups due today</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
            The next scheduled callbacks and estimate follow-ups will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {followUps.map((followUp) => {
            const statusMeta = PROJECT_STATUS_META[followUp.status as ProjectStatus];
            return (
              <Link
                key={followUp.id}
                to={`/projects/${followUp.projectId}`}
                className="block rounded-[24px] border border-black/5 bg-white/80 px-4 py-4 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-slate-950">{followUp.customer}</p>
                    <p className="mt-1 truncate text-sm text-slate-600">{followUp.address}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {statusMeta?.shortLabel ?? followUp.status}
                  </span>
                </div>
                <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Due date
                </p>
                <p className="mt-1 text-sm text-slate-800">{formatDate(followUp.dueDate)}</p>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
