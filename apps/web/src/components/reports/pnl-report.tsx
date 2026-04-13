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
import { DataSurface } from '@/components/ui/data-surface';
import { DarkTable, DarkTableCell, DarkTableContainer, DarkTableHeader, DarkTableRow } from '@/components/ui/dark-table';
import { chartTheme } from '@/components/ui/chart-theme';
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

export function PnlReport({ dateFrom, dateTo, period }: PnlReportProps) {
  const { data, isLoading, error } = usePnlReport({ dateFrom, dateTo }, period);

  if (isLoading) {
    return (
      <DataSurface title="Profit & Loss" eyebrow="Reports">
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-white/5" />
          ))}
        </div>
      </DataSurface>
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
      <DataSurface title="Period Summary" eyebrow="Reports">
        <DarkTableContainer>
          <DarkTable>
            <tbody>
              <DarkTableRow>
                <DarkTableCell className="font-medium text-[#dbe2ee]">Revenue</DarkTableCell>
                <DarkTableCell numeric className="font-semibold text-emerald-400">
                  {formatCurrency(data.totals.revenue)}
                </DarkTableCell>
              </DarkTableRow>
              <DarkTableRow>
                <DarkTableCell className="font-medium text-[#dbe2ee]">Cost of Goods Sold</DarkTableCell>
                <DarkTableCell numeric className="font-semibold text-rose-400">
                  {formatCurrency(data.totals.cogs)}
                </DarkTableCell>
              </DarkTableRow>
              <DarkTableRow className="bg-white/[0.02]">
                <DarkTableCell className="font-semibold text-[#f7f8fb]">Gross Profit</DarkTableCell>
                <DarkTableCell numeric className="font-semibold text-[#f7f8fb]">
                  {formatCurrency(data.totals.grossProfit)}
                </DarkTableCell>
              </DarkTableRow>
              <DarkTableRow>
                <DarkTableCell className="font-medium text-[#dbe2ee]">Operating Expenses</DarkTableCell>
                <DarkTableCell numeric className="font-semibold text-rose-400">
                  {formatCurrency(data.totals.operatingExpenses)}
                </DarkTableCell>
              </DarkTableRow>
              <DarkTableRow>
                <DarkTableCell className="font-medium text-[#dbe2ee]">Commissions</DarkTableCell>
                <DarkTableCell numeric className="font-semibold text-rose-400">
                  {formatCurrency(data.totals.commissions)}
                </DarkTableCell>
              </DarkTableRow>
              <DarkTableRow className="bg-white/[0.02]">
                <DarkTableCell className="font-semibold text-[#f7f8fb]">Net Profit</DarkTableCell>
                <DarkTableCell
                  numeric
                  className={`font-bold ${
                    data.totals.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(data.totals.netProfit)}
                </DarkTableCell>
              </DarkTableRow>
            </tbody>
          </DarkTable>
        </DarkTableContainer>
      </DataSurface>

      {chartData.length > 0 && (
        <DataSurface title="Revenue vs COGS" eyebrow="Reports">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, fill: chartTheme.axis }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: chartTheme.axis }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Revenue" fill={chartTheme.revenue} radius={[3, 3, 0, 0]} />
              <Bar dataKey="COGS" fill="#fb7185" radius={[3, 3, 0, 0]} />
              <Line
                type="monotone"
                dataKey="Net Profit"
                stroke={chartTheme.balance}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </DataSurface>
      )}

      {data.rows.length > 0 && (
        <DataSurface title="Period Breakdown" eyebrow="Reports">
          <DarkTableContainer>
            <DarkTable>
                <thead>
                  <tr>
                    <DarkTableHeader sticky>Period</DarkTableHeader>
                    <DarkTableHeader sticky className="text-right">Revenue</DarkTableHeader>
                    <DarkTableHeader sticky className="text-right">COGS</DarkTableHeader>
                    <DarkTableHeader sticky className="text-right">Gross Profit</DarkTableHeader>
                    <DarkTableHeader sticky className="text-right">Op. Expenses</DarkTableHeader>
                    <DarkTableHeader sticky className="text-right">Commissions</DarkTableHeader>
                    <DarkTableHeader sticky className="text-right">Net Profit</DarkTableHeader>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <DarkTableRow key={row.month}>
                      <DarkTableCell className="font-medium">{row.month}</DarkTableCell>
                      <DarkTableCell numeric className="text-emerald-400">
                        {formatCurrency(row.revenue)}
                      </DarkTableCell>
                      <DarkTableCell numeric className="text-rose-400">
                        {formatCurrency(row.cogs)}
                      </DarkTableCell>
                      <DarkTableCell numeric>{formatCurrency(row.grossProfit)}</DarkTableCell>
                      <DarkTableCell numeric className="text-rose-400">
                        {formatCurrency(row.operatingExpenses)}
                      </DarkTableCell>
                      <DarkTableCell numeric className="text-rose-400">
                        {formatCurrency(row.commissions)}
                      </DarkTableCell>
                      <DarkTableCell
                        numeric
                        className={`font-semibold ${
                          row.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatCurrency(row.netProfit)}
                      </DarkTableCell>
                    </DarkTableRow>
                  ))}
                </tbody>
                <tfoot>
                  <DarkTableRow className="bg-white/[0.04] font-semibold">
                    <DarkTableCell>Total</DarkTableCell>
                    <DarkTableCell numeric className="text-emerald-400">
                      {formatCurrency(data.totals.revenue)}
                    </DarkTableCell>
                    <DarkTableCell numeric className="text-rose-400">
                      {formatCurrency(data.totals.cogs)}
                    </DarkTableCell>
                    <DarkTableCell numeric>
                      {formatCurrency(data.totals.grossProfit)}
                    </DarkTableCell>
                    <DarkTableCell numeric className="text-rose-400">
                      {formatCurrency(data.totals.operatingExpenses)}
                    </DarkTableCell>
                    <DarkTableCell numeric className="text-rose-400">
                      {formatCurrency(data.totals.commissions)}
                    </DarkTableCell>
                    <DarkTableCell
                      numeric
                      className={`font-bold ${
                        data.totals.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatCurrency(data.totals.netProfit)}
                    </DarkTableCell>
                  </DarkTableRow>
                </tfoot>
            </DarkTable>
          </DarkTableContainer>
        </DataSurface>
      )}
    </div>
  );
}
