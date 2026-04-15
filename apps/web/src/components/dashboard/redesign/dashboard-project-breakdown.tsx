import { Layers3 } from 'lucide-react';
import type { ProjectTypeBreakdown } from '@fencetastic/shared';

interface DashboardProjectBreakdownProps {
  data: ProjectTypeBreakdown[];
  isLoading: boolean;
}

const CHART_COLORS = ['#1d4ed8', '#0891b2', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'];

const FENCE_TYPE_LABELS: Record<string, string> = {
  WOOD: 'Wood',
  METAL: 'Metal',
  CHAIN_LINK: 'Chain Link',
  VINYL: 'Vinyl',
  GATE: 'Gate',
  OTHER: 'Other',
};

export function DashboardProjectBreakdown({
  data,
  isLoading,
}: DashboardProjectBreakdownProps) {
  const chartData = data.map((item) => ({
    label: FENCE_TYPE_LABELS[item.fenceType] ?? item.fenceType,
    value: item.count,
  }));
  const totalProjects = chartData.reduce((sum, item) => sum + item.value, 0);
  const donutStops = chartData.reduce<{ start: number; end: number; color: string }[]>((segments, item, index) => {
    const start = segments.at(-1)?.end ?? 0;
    const ratio = totalProjects > 0 ? item.value / totalProjects : 0;
    const end = start + ratio * 100;
    segments.push({
      start,
      end,
      color: CHART_COLORS[index % CHART_COLORS.length],
    });
    return segments;
  }, []);
  const donutBackground = donutStops.length
    ? `conic-gradient(${donutStops
      .map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`)
      .join(', ')})`
    : '#e5e7eb';

  return (
    <section className="shell-panel rounded-[32px] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Completed Mix
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
            Project breakdown
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Share of completed work by fence type.
          </p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white/75 p-3 text-slate-700 shadow-sm">
          <Layers3 className="h-5 w-5" />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 h-[320px] animate-pulse rounded-[28px] bg-slate-200/70" />
      ) : chartData.length === 0 ? (
        <div className="mt-6 flex h-[320px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/50 px-6 text-center">
          <p className="text-lg font-semibold text-slate-900">No completed project mix yet</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
            Fence type breakdown will populate here once completed projects are available.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
          <div className="flex h-[320px] items-center justify-center rounded-[28px] border border-black/5 bg-white/65 p-4">
            <div
              className="relative h-[260px] w-[260px] rounded-full"
              style={{ background: donutBackground }}
              role="img"
              aria-label="Completed project breakdown chart"
            >
              <div className="absolute inset-[44px] flex items-center justify-center rounded-full bg-white shadow-inner">
                <div className="text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Total
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950">{totalProjects}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-[24px] bg-slate-950 px-4 py-4 text-white">
              <p className="text-xs uppercase tracking-[0.22em] text-white/60">Completed Projects</p>
              <p className="mt-2 text-3xl font-semibold">{totalProjects}</p>
            </div>
            {chartData.map((item, index) => {
              const share = totalProjects > 0 ? Math.round((item.value / totalProjects) * 100) : 0;
              return (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-black/5 bg-white/70 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="font-medium text-slate-900">{item.label}</span>
                    </div>
                    <span className="text-sm text-slate-500">{share}%</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.value} completed job{item.value === 1 ? '' : 's'}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
