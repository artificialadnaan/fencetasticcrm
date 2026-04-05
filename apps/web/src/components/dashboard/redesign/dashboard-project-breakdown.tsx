import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
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

function ProjectBreakdownTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/95 px-3 py-2 text-sm shadow-xl">
      <p className="font-medium text-slate-900">{payload[0].name}</p>
      <p className="text-slate-600">{payload[0].value} completed project{payload[0].value === 1 ? '' : 's'}</p>
    </div>
  );
}

export function DashboardProjectBreakdown({
  data,
  isLoading,
}: DashboardProjectBreakdownProps) {
  const chartData = data.map((item) => ({
    label: FENCE_TYPE_LABELS[item.fenceType] ?? item.fenceType,
    value: item.count,
  }));
  const totalProjects = chartData.reduce((sum, item) => sum + item.value, 0);

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
          <div className="h-[320px] rounded-[28px] border border-black/5 bg-white/65 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={70}
                  outerRadius={112}
                  paddingAngle={4}
                >
                  {chartData.map((item, index) => (
                    <Cell key={item.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ProjectBreakdownTooltip />} />
              </PieChart>
            </ResponsiveContainer>
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
