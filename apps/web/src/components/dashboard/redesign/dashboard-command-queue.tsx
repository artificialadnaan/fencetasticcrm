import { useState } from 'react';
import { AlertTriangle, CalendarClock, HandCoins } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardCommandItem, DashboardData } from '@fencetastic/shared';

type QueueLaneProps = {
  title: string;
  subtitle: string;
  items: DashboardCommandItem[];
  isLoading: boolean;
  Icon: typeof AlertTriangle;
  getHref: (item: DashboardCommandItem) => string;
  ctaLabel: string;
  actionHref?: string;
  actionLabel?: string;
  onCompleteItem?: (item: DashboardCommandItem) => Promise<void> | void;
};

function QueueLane({
  title,
  subtitle,
  items,
  isLoading,
  Icon,
  getHref,
  ctaLabel,
  actionHref,
  actionLabel,
  onCompleteItem,
}: QueueLaneProps) {
  const [completingId, setCompletingId] = useState<string | null>(null);

  return (
    <section className="shell-panel rounded-[32px] p-6">
      <div className="flex items-start justify-between gap-4 border-b border-black/5 pb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
            {title}
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-white">
            {subtitle}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {actionHref && actionLabel ? (
            <Link
              to={actionHref}
              className="rounded-2xl border border-white/12 bg-white/8 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/14"
            >
              {actionLabel}
            </Link>
          ) : null}
          <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-white shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-20 animate-pulse rounded-[24px] bg-white/10" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-5 rounded-[24px] border border-dashed border-white/12 bg-white/6 px-5 py-8 text-sm text-slate-300">
          No items in this lane.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-[24px] border border-white/10 bg-white px-4 py-4 text-slate-950 shadow-[0_12px_32px_rgba(15,23,42,0.18)]"
            >
              <Link
                to={item.href ?? getHref(item)}
                className="block transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-slate-950">{item.customer}</p>
                    <p className="mt-1 truncate text-sm text-slate-600">{item.address}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {item.urgency}
                  </span>
                </div>
                <p className="mt-4 text-sm font-medium text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{item.reason}</p>
                {item.financeProjectMode ? (
                  <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                    {item.financeProjectMode.replace(/_/g, ' ')}
                  </p>
                ) : null}
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {ctaLabel}
                </p>
              </Link>
              {onCompleteItem && item.actionId && item.source ? (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    disabled={completingId === item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-950 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-slate-800"
                    onClick={async () => {
                      setCompletingId(item.id);
                      try {
                        await onCompleteItem(item);
                      } finally {
                        setCompletingId(null);
                      }
                    }}
                  >
                    {completingId === item.id ? 'Completing…' : 'Complete'}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

interface DashboardCommandQueueProps {
  queue: DashboardData['commandQueue'] | null;
  isLoading: boolean;
  onCompleteActionItem?: (item: DashboardCommandItem) => Promise<void> | void;
}

export function DashboardCommandQueue({ queue, isLoading, onCompleteActionItem }: DashboardCommandQueueProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
              <QueueLane
        title="Action Needed"
        subtitle="Tasks that need movement today"
        items={queue?.actionNeeded ?? []}
        isLoading={isLoading}
        Icon={AlertTriangle}
        getHref={(item) => `/projects/${item.projectId}?tab=follow-up`}
        ctaLabel="Open follow-up"
        actionHref="/calendar?compose=1&type=followup"
        actionLabel="Add task"
        onCompleteItem={onCompleteActionItem}
      />
      <QueueLane
        title="Money At Risk"
        subtitle="Cash that still needs collection"
        items={queue?.moneyAtRisk ?? []}
        isLoading={isLoading}
        Icon={HandCoins}
        getHref={(item) => `/projects/${item.projectId}`}
        ctaLabel="Open project"
      />
      <QueueLane
        title="Schedule Blockers"
        subtitle="Active jobs missing execution readiness"
        items={queue?.scheduleBlockers ?? []}
        isLoading={isLoading}
        Icon={CalendarClock}
        getHref={(item) => `/projects/${item.projectId}`}
        ctaLabel="Open project"
      />
    </div>
  );
}
