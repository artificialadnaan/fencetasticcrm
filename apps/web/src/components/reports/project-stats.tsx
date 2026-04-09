import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ProjectStatsData } from '@fencetastic/shared';

const FENCE_TYPE_LABELS: Record<string, string> = {
  WOOD: 'Wood',
  METAL: 'Metal',
  CHAIN_LINK: 'Chain Link',
  VINYL: 'Vinyl',
  GATE: 'Gate',
  OTHER: 'Other',
};

interface ProjectStatsProps {
  data: ProjectStatsData | null;
  isLoading: boolean;
}

function CustomTooltip({
  active,
  payload,
  label,
  suffix = '',
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-[#7C3AED]">
        {payload[0].value}
        {suffix}
      </p>
    </div>
  );
}

export function ProjectStats({ data, isLoading }: ProjectStatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <section key={i} className="shell-panel rounded-[28px] p-6 md:p-8">
            <div className="h-52 animate-pulse rounded bg-muted" />
          </section>
        ))}
      </div>
    );
  }

  const durationData = (data?.avgDurationByType ?? []).map((d) => ({
    name: FENCE_TYPE_LABELS[d.fenceType] ?? d.fenceType,
    avgDays: d.avgDays,
    count: d.count,
  }));

  const completionData = data?.completionsPerMonth ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Avg duration by fence type */}
      <section className="shell-panel rounded-[28px] p-6 md:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Performance</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">Avg Duration by Fence Type</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Days from start to completion, by fence type.</p>
        <div className="mt-6">
          {durationData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No completed projects with dates
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={durationData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <Tooltip
                  content={<CustomTooltip suffix=" days" />}
                />
                <Bar dataKey="avgDays" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Completions per month */}
      <section className="shell-panel rounded-[28px] p-6 md:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Throughput</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">Completions per Month</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Number of projects completed each month.</p>
        <div className="mt-6">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={completionData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                width={24}
              />
              <Tooltip content={<CustomTooltip suffix=" projects" />} />
              <Bar dataKey="count" fill="#06B6D4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
