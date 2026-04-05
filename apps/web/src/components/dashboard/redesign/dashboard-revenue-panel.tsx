import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowUpRight, BadgeDollarSign } from 'lucide-react';
import type { MonthlyRevenueExpense } from '@fencetastic/shared';
import { formatCurrency } from '@/lib/formatters';

interface DashboardRevenuePanelProps {
  data: MonthlyRevenueExpense[];
  isLoading: boolean;
}

function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/95 px-3 py-2 text-sm shadow-xl">
      <p className="font-medium text-slate-900">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function DashboardRevenuePanel({ data, isLoading }: DashboardRevenuePanelProps) {
  const latestMonth = data[data.length - 1];
  const latestRevenue = latestMonth?.revenue ?? 0;
  const latestExpenses = latestMonth?.expenses ?? 0;
  const latestProfit = latestRevenue - latestExpenses;
  const hasData = data.length > 0;

  return (
    <section className="shell-panel rounded-[32px] p-6">
      <div className="flex flex-col gap-6 border-b border-black/5 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Revenue Pulse
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
            Revenue vs expenses
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Six-month view of completed work and spend, using the live dashboard feed.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[24px] border border-black/5 bg-white/70 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Latest Revenue
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {isLoading || !hasData ? '—' : formatCurrency(latestRevenue)}
            </p>
          </div>
          <div className="rounded-[24px] border border-black/5 bg-white/70 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Latest Expenses
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {isLoading || !hasData ? '—' : formatCurrency(latestExpenses)}
            </p>
          </div>
          <div className="rounded-[24px] border border-black/5 bg-slate-950 px-4 py-3 text-white">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">
              Margin Snapshot
            </p>
            <p className="mt-2 text-lg font-semibold">
              {isLoading || !hasData ? '—' : formatCurrency(latestProfit)}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 h-[320px] animate-pulse rounded-[28px] bg-slate-200/70" />
      ) : !hasData ? (
        <div className="mt-6 flex h-[320px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/50 px-6 text-center">
          <BadgeDollarSign className="h-10 w-10 text-slate-400" />
          <p className="mt-4 text-lg font-semibold text-slate-900">No revenue history yet</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
            Revenue and expense bars will appear here once completed projects start reporting into the dashboard.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Revenue
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-rose-700">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              Expenses
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Net {formatCurrency(latestProfit)} in {latestMonth?.month ?? 'latest month'}
            </span>
          </div>

          <div className="h-[320px] rounded-[28px] border border-black/5 bg-white/65 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(100, 116, 139, 0.18)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Bar dataKey="revenue" name="Revenue" fill="#169c68" radius={[10, 10, 0, 0]} maxBarSize={42} />
                <Bar dataKey="expenses" name="Expenses" fill="#e56b6f" radius={[10, 10, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}
