import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import type { MonthlyPLRow } from '@fencetastic/shared';

interface MonthlyPLTableProps {
  data: MonthlyPLRow[];
  isLoading: boolean;
}

function CustomTooltip({
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
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function MonthlyPLTable({ data, isLoading }: MonthlyPLTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  function toggleRow(month: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Monthly P&L</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((row) => ({
    month: row.month,
    Revenue: row.revenue,
    'Net Profit': row.netProfit,
    Expenses: row.expenses,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Monthly P&L</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chart */}
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Revenue" fill="#7C3AED" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Expenses" fill="#EF4444" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Net Profit" fill="#06B6D4" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left py-2 pr-4 w-4" />
                <th className="text-left py-2 pr-4">Month</th>
                <th className="text-right py-2 pr-4">Revenue</th>
                <th className="text-right py-2 pr-4">Expenses</th>
                <th className="text-right py-2 pr-4">Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const expanded = expandedRows.has(row.month);
                return (
                  <>
                    <tr
                      key={row.month}
                      className="border-b hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => toggleRow(row.month)}
                    >
                      <td className="py-2 pr-2">
                        {expanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </td>
                      <td className="py-2 pr-4 font-medium">{row.month}</td>
                      <td className="py-2 pr-4 text-right text-emerald-400">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="py-2 pr-4 text-right text-red-400">
                        {formatCurrency(row.expenses)}
                      </td>
                      <td
                        className={`py-2 text-right font-semibold ${
                          row.netProfit >= 0 ? 'text-[#06B6D4]' : 'text-red-400'
                        }`}
                      >
                        {formatCurrency(row.netProfit)}
                      </td>
                    </tr>
                    {expanded && (
                      <tr key={`${row.month}-expand`} className="bg-muted/20">
                        <td />
                        <td colSpan={4} className="py-2 px-2">
                          <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                            <div>
                              <span className="block font-medium text-foreground">Adnaan Commission</span>
                              {formatCurrency(row.adnaanCommission)}
                            </div>
                            <div>
                              <span className="block font-medium text-foreground">Meme Commission</span>
                              {formatCurrency(row.memeCommission)}
                            </div>
                            <div>
                              <span className="block font-medium text-foreground">Aimann Deduction</span>
                              {formatCurrency(row.aimannDeduction)}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
            {data.length > 0 && (
              <tfoot>
                <tr className="border-t font-semibold text-sm">
                  <td />
                  <td className="py-2 pr-4">Total</td>
                  <td className="py-2 pr-4 text-right text-emerald-400">
                    {formatCurrency(data.reduce((s, r) => s + r.revenue, 0))}
                  </td>
                  <td className="py-2 pr-4 text-right text-red-400">
                    {formatCurrency(data.reduce((s, r) => s + r.expenses, 0))}
                  </td>
                  <td className="py-2 text-right text-[#06B6D4]">
                    {formatCurrency(data.reduce((s, r) => s + r.netProfit, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
