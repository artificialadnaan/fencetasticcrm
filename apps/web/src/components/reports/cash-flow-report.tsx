import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import { useCashFlowReport } from '@/hooks/use-financial-reports';

interface CashFlowReportProps {
  dateFrom: string;
  dateTo: string;
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
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function CashFlowReport({ dateFrom, dateTo }: CashFlowReportProps) {
  const { data, isLoading, error } = useCashFlowReport({ dateFrom, dateTo });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-950 mb-4">Cash Flow</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
        Failed to load cash flow report: {error}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm shadow-sm p-6">
        <p className="text-sm text-slate-500 py-6 text-center">No cash flow data found.</p>
      </div>
    );
  }

  const totalIn = data.reduce((s, r) => s + r.moneyIn, 0);
  const totalOut = data.reduce((s, r) => s + r.moneyOut, 0);
  const netCashFlow = totalIn - totalOut;

  const chartData = data.map((row) => ({
    month: row.month,
    'Money In': row.moneyIn,
    'Money Out': row.moneyOut,
    'Running Balance': row.runningBalance,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm shadow-sm p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Total In
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{formatCurrency(totalIn)}</p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm shadow-sm p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Total Out
          </p>
          <p className="mt-2 text-2xl font-bold text-red-500">{formatCurrency(totalOut)}</p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm shadow-sm p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Net Cash Flow
          </p>
          <p
            className={`mt-2 text-2xl font-bold ${
              netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {formatCurrency(netCashFlow)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-950 mb-4">Cash Flow Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="Money In" fill="#10B981" radius={[3, 3, 0, 0]} />
            <Bar yAxisId="left" dataKey="Money Out" fill="#EF4444" radius={[3, 3, 0, 0]} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="Running Balance"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Detail Table */}
      <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm shadow-sm p-6">
        <div className="rounded-lg border border-black/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 text-xs text-slate-500">
                  <th className="text-left py-2 px-4">Month</th>
                  <th className="text-right py-2 px-4">Money In</th>
                  <th className="text-right py-2 px-4">Money Out</th>
                  <th className="text-right py-2 px-4">Net</th>
                  <th className="text-right py-2 px-4">Running Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr
                    key={row.month}
                    className="border-b border-black/5 hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-2 px-4 font-medium">{row.month}</td>
                    <td className="py-2 px-4 text-right text-emerald-600">
                      {formatCurrency(row.moneyIn)}
                    </td>
                    <td className="py-2 px-4 text-right text-red-500">
                      {formatCurrency(row.moneyOut)}
                    </td>
                    <td
                      className={`py-2 px-4 text-right font-semibold ${
                        row.netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {formatCurrency(row.netCashFlow)}
                    </td>
                    <td className="py-2 px-4 text-right font-semibold text-blue-600">
                      {formatCurrency(row.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold text-sm bg-slate-50/60">
                  <td className="py-2 px-4">Total</td>
                  <td className="py-2 px-4 text-right text-emerald-600">
                    {formatCurrency(totalIn)}
                  </td>
                  <td className="py-2 px-4 text-right text-red-500">
                    {formatCurrency(totalOut)}
                  </td>
                  <td
                    className={`py-2 px-4 text-right font-bold ${
                      netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {formatCurrency(netCashFlow)}
                  </td>
                  <td className="py-2 px-4 text-right font-bold text-blue-600">
                    {data.length > 0 ? formatCurrency(data[data.length - 1].runningBalance) : '$0.00'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
