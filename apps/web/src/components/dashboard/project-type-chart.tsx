import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProjectTypeBreakdown } from '@fencetastic/shared';

const COLORS = ['#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const FENCE_TYPE_LABELS: Record<string, string> = {
  WOOD: 'Wood',
  METAL: 'Metal',
  CHAIN_LINK: 'Chain Link',
  VINYL: 'Vinyl',
  GATE: 'Gate',
  OTHER: 'Other',
};

interface ProjectTypeChartProps {
  data: ProjectTypeBreakdown[];
  isLoading: boolean;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-muted-foreground">{payload[0].value} project{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  );
}

export function ProjectTypeChart({ data, isLoading }: ProjectTypeChartProps) {
  const chartData = data.map((d) => ({
    name: FENCE_TYPE_LABELS[d.fenceType] ?? d.fenceType,
    value: d.count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Project Type Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 animate-pulse rounded bg-muted" />
        ) : chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No completed projects yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
