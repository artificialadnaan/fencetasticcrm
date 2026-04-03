import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-52 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Avg Duration by Fence Type (days)</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Completions per month */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Completions per Month</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
