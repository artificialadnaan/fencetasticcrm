import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowUpRight, Layers3 } from 'lucide-react';
import type { CategoryBreakdown, MonthlyBreakdown } from '@/hooks/use-transactions';
import { formatCurrency } from '@/lib/formatters';

const PIE_COLORS = ['#169c68', '#3b82f6', '#0ea5e9', '#e56b6f', '#f59e0b', '#8b5cf6', '#14b8a6'];

interface FinancesOverviewPanelsProps {
  monthly: MonthlyBreakdown[];
  categories: CategoryBreakdown[];
  isMonthlyLoading: boolean;
  isCategoryLoading: boolean;
}

function ChartTooltip({
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

export function FinancesOverviewPanels({
  monthly,
  categories,
  isMonthlyLoading,
  isCategoryLoading,
}: FinancesOverviewPanelsProps) {
  const latestMonth = monthly[monthly.length - 1];
  const latestRevenue = latestMonth?.income ?? 0;
  const latestExpenses = latestMonth?.expenses ?? 0;
  const latestNet = latestRevenue - latestExpenses;

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <section className="shell-panel rounded-[32px] p-6 xl:col-span-2">
        <div className="flex flex-col gap-5 border-b border-black/5 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Revenue Pulse
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
              Monthly overview
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Revenue and expense flow from the live transaction ledger.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-black/5 bg-white/70 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                Latest Revenue
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {isMonthlyLoading ? '—' : formatCurrency(latestRevenue)}
              </p>
            </div>
            <div className="rounded-[24px] border border-black/5 bg-white/70 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                Latest Expenses
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {isMonthlyLoading ? '—' : formatCurrency(latestExpenses)}
              </p>
            </div>
            <div className="rounded-[24px] border border-black/5 bg-slate-950 px-4 py-3 text-white">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">
                Margin Snapshot
              </p>
              <p className="mt-2 text-lg font-semibold">
                {isMonthlyLoading ? '—' : formatCurrency(latestNet)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
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
            Net {formatCurrency(latestNet)} in {latestMonth?.month ?? 'latest month'}
          </span>
        </div>

        <div className="mt-5 h-[320px] rounded-[28px] border border-black/5 bg-white/65 p-4">
          {isMonthlyLoading ? (
            <div className="flex h-full animate-pulse items-center justify-center rounded-[24px] bg-slate-100/70 text-slate-400">
              Loading monthly chart...
            </div>
          ) : monthly.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white/50 text-sm text-slate-500">
              No monthly financial data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(100, 116, 139, 0.18)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="income" name="Revenue" fill="#169c68" radius={[10, 10, 0, 0]} maxBarSize={42} />
                <Bar dataKey="expenses" name="Expenses" fill="#e56b6f" radius={[10, 10, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="shell-panel rounded-[32px] p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Completed Mix
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">
              Expense categories
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Share of expense categories in the current ledger.
            </p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/80 p-3 text-slate-700 shadow-sm">
            <Layers3 className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center">
          <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-[16px] border-emerald-500 border-r-rose-500 border-b-sky-400">
            <div className="text-center">
              <p className="text-2xl font-semibold text-slate-950">{categories.length}</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Categories
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          {isCategoryLoading ? (
            <div className="h-[260px] animate-pulse rounded-[24px] bg-slate-100/70" />
          ) : categories.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white/50 px-6 text-center text-sm text-slate-500">
              No category breakdown yet
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-[180px] rounded-[24px] border border-black/5 bg-white/65 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categories} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={72}>
                      {categories.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {categories.slice(0, 7).map((category, index) => (
                  <div key={category.category} className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/70 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <span className="truncate text-sm font-medium text-slate-900">{category.category}</span>
                    </div>
                    <span className="text-sm text-slate-500">{formatCurrency(category.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
