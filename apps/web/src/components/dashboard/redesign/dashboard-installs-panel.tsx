import { Hammer } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardUpcomingInstall } from '@fencetastic/shared';
import { formatDate } from '@/lib/formatters';

interface DashboardInstallsPanelProps {
  installs: DashboardUpcomingInstall[];
  isLoading: boolean;
}

const FENCE_TYPE_LABELS: Record<string, string> = {
  WOOD: 'Wood',
  METAL: 'Metal',
  CHAIN_LINK: 'Chain Link',
  VINYL: 'Vinyl',
  GATE: 'Gate',
  OTHER: 'Other',
};

export function DashboardInstallsPanel({
  installs,
  isLoading,
}: DashboardInstallsPanelProps) {
  return (
    <section className="shell-panel rounded-[32px] p-6">
      <div className="flex items-start justify-between gap-4 border-b border-black/5 pb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Installs
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-slate-950">
            Upcoming schedule
          </h2>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700">
          {isLoading ? '...' : `${installs.length} queued`}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-20 animate-pulse rounded-[24px] bg-slate-200/70" />
          ))}
        </div>
      ) : installs.length === 0 ? (
        <div className="mt-5 flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/50 px-6 py-12 text-center">
          <Hammer className="h-10 w-10 text-slate-400" />
          <p className="mt-4 text-lg font-semibold text-slate-900">No upcoming installs</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
            Scheduled installs will appear here once projects are assigned install dates.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {installs.map((install) => (
            <Link
              key={install.id}
              to={`/projects/${install.id}`}
              className="block rounded-[24px] border border-black/5 bg-white/80 px-4 py-4 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-950">{install.customer}</p>
                  <p className="mt-1 truncate text-sm text-slate-600">{install.address}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {FENCE_TYPE_LABELS[install.fenceType] ?? install.fenceType}
                </span>
              </div>
              <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Install date
              </p>
              <p className="mt-1 text-sm text-slate-800">{formatDate(install.installDate)}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
