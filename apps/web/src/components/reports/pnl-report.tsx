import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import { usePnlReport } from '@/hooks/use-financial-reports';

interface PnlReportProps {
  dateFrom: string;
  dateTo: string;
  period: string;
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

export function PnlReport({ dateFrom, dateTo, period }: PnlReportProps) {
  const { data, isLoading, error } = usePnlReport({ dateFrom, dateTo }, period);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-950 mb-4">Profit & Loss</h3>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
        Failed to load P&L report: {error}
      </div>
    );
  }

  if (!data) return null;

  const chartData = data.rows.map((row) => ({
    period: row.month,
    Revenue: row.revenue,
    COGS: row.cogs,
    'Net Profit': row.netProfit,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Table */}
      <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-950 mb-4">Period Summary</h3>
        <div className="rounded-lg border border-black/5 overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-black/5">
                <td className="py-2.5 px-4 font-medium text-slate-700">Revenue</td>
                <td className="py-2.5 px-4 text-right font-semibold text-emerald-600">
                  {formatCurrency(data.totals.revenue)}
                </td>
              </tr>
              <tr className="border-b border-black/5">
                <td className="py-2.5 px-4 font-medium text-slate-700">Cost of Goods Sold</td>
                <td className="py-2.5 px-4 text-right font-semibold text-red-500">
                  {formatCurrency(data.totals.cogs)}
                </td>
              </tr>
              <tr className="border-b border-black/5 bg-slate-50/60">
                <td className="py-2.5 px-4 font-semibold text-slate-900">Gross Profit</td>
                <td className="py-2.5 px-4 text-right font-semibold text-slate-900">
                  {formatCurrency(data.totals.grossProfit)}
                </td>
              </tr>
              <tr className="border-b border-black/5">
                <td className="py-2.5 px-4 font-medium text-slate-700">Operating Expenses</td>
                <td className="py-2.5 px-4 text-right font-semibold text-red-500">
                  {formatCurrency(data.totals.operatingExpenses)}
                </td>
              </tr>
              <tr className="border-b border-black/5">
                <td className="py-2.5 px-4 font-medium text-slate-700">Commissions</td>
                <td className="py-2.5 px-4 text-right font-semibold text-red-500">
                  {formatCurrency(data.totals.commissions)}
                </td>
              </tr>
              <tr className="bg-slate-50/60">
                <td className="py-2.5 px-4 font-semibold text-slate-900">Net Profit</td>
                <td
                  className={`py-2.5 px-4 text-right font-bold ${
                    data.totals.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {formatCurrency(data.totals.netProfit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-950 mb-4">Revenue vs COGS</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Revenue" fill="#10B981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="COGS" fill="#EF4444" radius={[3, 3, 0, 0]} />
              <Line
                type="monotone"
                dataKey="Net Profit"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detail Table */}
      {data.rows.length > 0 && (
        <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-950 mb-4">Period Breakdown</h3>
          <div className="rounded-lg border border-black/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5 text-xs text-slate-500">
                    <th className="text-left py-2 px-4">Period</th>
                    <th className="text-right py-2 px-4">Revenue</th>
                    <th className="text-right py-2 px-4">COGS</th>
                    <th className="text-right py-2 px-4">Gross Profit</th>
                    <th className="text-right py-2 px-4">Op. Expenses</th>
                    <th className="text-right py-2 px-4">Commissions</th>
                    <th className="text-right py-2 px-4">Net Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr
                      key={row.month}
                      className="border-b border-black/5 hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-2 px-4 font-medium">{row.month}</td>
                      <td className="py-2 px-4 text-right text-emerald-600">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="py-2 px-4 text-right text-red-500">
                        {formatCurrency(row.cogs)}
                      </td>
                      <td className="py-2 px-4 text-right">{formatCurrency(row.grossProfit)}</td>
                      <td className="py-2 px-4 text-right text-red-500">
                        {formatCurrency(row.operatingExpenses)}
                      </td>
                      <td className="py-2 px-4 text-right text-red-500">
                        {formatCurrency(row.commissions)}
                      </td>
                      <td
                        className={`py-2 px-4 text-right font-semibold ${
                          row.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        {formatCurrency(row.netProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold text-sm bg-slate-50/60">
                    <td className="py-2 px-4">Total</td>
                    <td className="py-2 px-4 text-right text-emerald-600">
                      {formatCurrency(data.totals.revenue)}
                    </td>
                    <td className="py-2 px-4 text-right text-red-500">
                      {formatCurrency(data.totals.cogs)}
                    </td>
                    <td className="py-2 px-4 text-right">
                      {formatCurrency(data.totals.grossProfit)}
                    </td>
                    <td className="py-2 px-4 text-right text-red-500">
                      {formatCurrency(data.totals.operatingExpenses)}
                    </td>
                    <td className="py-2 px-4 text-right text-red-500">
                      {formatCurrency(data.totals.commissions)}
                    </td>
                    <td
                      className={`py-2 px-4 text-right font-bold ${
                        data.totals.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {formatCurrency(data.totals.netProfit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
