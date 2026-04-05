import { Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardActivityItem } from '@fencetastic/shared';
import { formatDate } from '@/lib/formatters';

interface DashboardActivityPanelProps {
  activity: DashboardActivityItem[];
  isLoading: boolean;
}

function formatStableCreatedDate(createdAt: string) {
  const dateOnly = createdAt.split('T')[0];
  return formatDate(dateOnly);
}

export function DashboardActivityPanel({
  activity,
  isLoading,
}: DashboardActivityPanelProps) {
  return (
    <section className="shell-panel rounded-[32px] p-6">
      <div className="border-b border-black/5 pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          Activity
        </p>
        <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-slate-950">
          Recent notes and changes
        </h2>
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-[24px] bg-slate-200/70" />
          ))}
        </div>
      ) : activity.length === 0 ? (
        <div className="mt-5 flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/50 px-6 py-12 text-center">
          <Activity className="h-10 w-10 text-slate-400" />
          <p className="mt-4 text-lg font-semibold text-slate-900">No recent activity</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
            Project notes and field updates will stream into this panel as they are added.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {activity.map((item) => (
            <Link
              key={item.id}
              to={`/projects/${item.projectId}`}
              className="block rounded-[24px] border border-black/5 bg-white/80 px-4 py-4 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                {item.customer}
              </p>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-700">
                {item.description}
              </p>
              <p className="mt-4 text-xs text-slate-500">{formatStableCreatedDate(item.createdAt)}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
