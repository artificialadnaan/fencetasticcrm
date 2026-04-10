import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import { useExpenseReport } from '@/hooks/use-financial-reports';

interface ExpenseReportProps {
  dateFrom: string;
  dateTo: string;
}

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#F59E0B', '#06B6D4', '#EC4899', '#6366F1'];

function CategoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-slate-600">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

export function ExpenseReport({ dateFrom, dateTo }: ExpenseReportProps) {
  const { data, isLoading, error } = useExpenseReport({ dateFrom, dateTo });
  const [subTab, setSubTab] = useState<'category' | 'vendor'>('category');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-950 mb-4">Expense Breakdown</h3>
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
        Failed to load expense report: {error}
      </div>
    );
  }

  if (!data) return null;

  const pieData = data.byCategory.map((c) => ({ name: c.category, value: c.total }));

  return (
    <div className="space-y-4">
      {/* Sub-Tab Toggle */}
      <div className="inline-flex items-center rounded-2xl border border-black/5 bg-white/65 p-1 shadow-sm">
        <button
          type="button"
          className={`rounded-xl px-4 py-1.5 text-sm font-medium transition-colors ${
            subTab === 'category'
              ? 'bg-slate-950 text-white hover:bg-slate-800'
              : 'text-slate-600 hover:bg-white hover:text-slate-950'
          }`}
          onClick={() => setSubTab('category')}
        >
          By Category
        </button>
        <button
          type="button"
          className={`rounded-xl px-4 py-1.5 text-sm font-medium transition-colors ${
            subTab === 'vendor'
              ? 'bg-slate-950 text-white hover:bg-slate-800'
              : 'text-slate-600 hover:bg-white hover:text-slate-950'
          }`}
          onClick={() => setSubTab('vendor')}
        >
          By Vendor
        </button>
      </div>

      {subTab === 'category' && (
        <div className="space-y-6">
          {/* Donut Chart */}
          {pieData.length > 0 && (
            <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-950 mb-4">Category Breakdown</h3>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {pieData.map((_entry, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CategoryTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 text-xs">
                  {pieData.map((entry, idx) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-slate-700">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Category Table */}
          <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm shadow-sm p-6">
            <div className="rounded-lg border border-black/5 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5 text-xs text-slate-500">
                    <th className="w-4 py-2 px-2" />
                    <th className="text-left py-2 px-4">Category</th>
                    <th className="text-right py-2 px-4">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCategory.map((cat) => {
                    const expanded = expandedCategories.has(cat.category);
                    return (
                      <Fragment key={cat.category}>
                        <tr
                          className="border-b border-black/5 hover:bg-slate-50/60 cursor-pointer transition-colors"
                          onClick={() => toggleCategory(cat.category)}
                          tabIndex={0}
                          role="button"
                          aria-expanded={expandedCategories.has(cat.category)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCategory(cat.category); }
                          }}
                        >
                          <td className="py-2 px-2">
                            {cat.subcategories.length > 0 ? (
                              expanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                              )
                            ) : null}
                          </td>
                          <td className="py-2 px-4 font-medium">{cat.category}</td>
                          <td className="py-2 px-4 text-right font-semibold">
                            {formatCurrency(cat.total)}
                          </td>
                        </tr>
                        {expanded &&
                          cat.subcategories.map((sub) => (
                            <tr
                              key={`${cat.category}-${sub.name}`}
                              className="bg-slate-50/40 border-b border-black/5"
                            >
                              <td />
                              <td className="py-1.5 px-4 pl-10 text-xs text-slate-600">
                                {sub.name}
                              </td>
                              <td className="py-1.5 px-4 text-right text-xs">
                                {formatCurrency(sub.amount)}
                              </td>
                            </tr>
                          ))}
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold text-sm bg-slate-50/60">
                    <td />
                    <td className="py-2 px-4">Total</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(data.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'vendor' && (
        <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm shadow-sm p-6">
          <div className="rounded-lg border border-black/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 text-xs text-slate-500">
                  <th className="text-left py-2 px-4">Vendor</th>
                  <th className="text-right py-2 px-4">Total Spend</th>
                  <th className="text-right py-2 px-4"># Projects</th>
                  <th className="text-left py-2 px-4">Top Categories</th>
                </tr>
              </thead>
              <tbody>
                {data.byVendor.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No vendor data found.
                    </td>
                  </tr>
                )}
                {data.byVendor.map((v) => (
                  <tr
                    key={v.vendor}
                    className="border-b border-black/5 hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-2 px-4 font-medium">{v.vendor}</td>
                    <td className="py-2 px-4 text-right font-semibold">
                      {formatCurrency(v.totalSpend)}
                    </td>
                    <td className="py-2 px-4 text-right">{v.projectCount}</td>
                    <td className="py-2 px-4 text-xs text-slate-600">
                      {v.topCategories.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
