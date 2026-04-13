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
import { DataSurface } from '@/components/ui/data-surface';
import { DarkTable, DarkTableCell, DarkTableContainer, DarkTableHeader, DarkTableRow } from '@/components/ui/dark-table';
import { chartTheme } from '@/components/ui/chart-theme';
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
    <div className="rounded-lg border px-3 py-2 text-sm shadow-md" style={{ background: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder }}>
      <p className="mb-1 font-medium text-[#f7f8fb]">{label}</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DataSurface eyebrow="Cash flow" title="Total In">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Total In
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-400">{formatCurrency(totalIn)}</p>
        </DataSurface>
        <DataSurface eyebrow="Cash flow" title="Total Out">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Total Out
          </p>
          <p className="mt-2 text-2xl font-bold text-rose-400">{formatCurrency(totalOut)}</p>
        </DataSurface>
        <DataSurface eyebrow="Cash flow" title="Net Cash Flow">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Net Cash Flow
          </p>
          <p
            className={`mt-2 text-2xl font-bold ${
              netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatCurrency(netCashFlow)}
          </p>
        </DataSurface>
      </div>

      <DataSurface title="Cash Flow Over Time" eyebrow="Reports">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: chartTheme.axis }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: chartTheme.axis }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: chartTheme.axis }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="Money In" fill={chartTheme.revenue} radius={[3, 3, 0, 0]} />
            <Bar yAxisId="left" dataKey="Money Out" fill="#fb7185" radius={[3, 3, 0, 0]} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="Running Balance"
              stroke={chartTheme.balance}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </DataSurface>

      <DataSurface title="Monthly Cash Ledger" eyebrow="Reports">
        <DarkTableContainer>
          <DarkTable>
              <thead>
                <tr>
                  <DarkTableHeader sticky>Month</DarkTableHeader>
                  <DarkTableHeader sticky className="text-right">Money In</DarkTableHeader>
                  <DarkTableHeader sticky className="text-right">Money Out</DarkTableHeader>
                  <DarkTableHeader sticky className="text-right">Net</DarkTableHeader>
                  <DarkTableHeader sticky className="text-right">Running Balance</DarkTableHeader>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <DarkTableRow key={row.month}>
                    <DarkTableCell className="font-medium">{row.month}</DarkTableCell>
                    <DarkTableCell numeric className="text-emerald-400">
                      {formatCurrency(row.moneyIn)}
                    </DarkTableCell>
                    <DarkTableCell numeric className="text-rose-400">
                      {formatCurrency(row.moneyOut)}
                    </DarkTableCell>
                    <DarkTableCell
                      numeric
                      className={`font-semibold ${
                        row.netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatCurrency(row.netCashFlow)}
                    </DarkTableCell>
                    <DarkTableCell numeric className="font-semibold text-blue-400">
                      {formatCurrency(row.runningBalance)}
                    </DarkTableCell>
                  </DarkTableRow>
                ))}
              </tbody>
              <tfoot>
                <DarkTableRow className="bg-white/[0.04] font-semibold">
                  <DarkTableCell>Total</DarkTableCell>
                  <DarkTableCell numeric className="text-emerald-400">
                    {formatCurrency(totalIn)}
                  </DarkTableCell>
                  <DarkTableCell numeric className="text-rose-400">
                    {formatCurrency(totalOut)}
                  </DarkTableCell>
                  <DarkTableCell
                    numeric
                    className={`font-bold ${
                      netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatCurrency(netCashFlow)}
                  </DarkTableCell>
                  <DarkTableCell numeric className="font-bold text-blue-400">
                    {data.length > 0 ? formatCurrency(data[data.length - 1].runningBalance) : '$0.00'}
                  </DarkTableCell>
                </DarkTableRow>
              </tfoot>
          </DarkTable>
        </DarkTableContainer>
      </DataSurface>
    </div>
  );
}
