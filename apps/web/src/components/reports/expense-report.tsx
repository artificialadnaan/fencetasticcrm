import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import { useExpenseReport } from '@/hooks/use-financial-reports';
import { DataSurface } from '@/components/ui/data-surface';
import {
  DarkTable,
  DarkTableCell,
  DarkTableContainer,
  DarkTableHeader,
  DarkTableRow,
} from '@/components/ui/dark-table';
import { chartTheme } from '@/components/ui/chart-theme';

const LIGHT_TABLE_CLASS = '[--table-bg:#ffffff] [--table-border:#d9e1ef] [--table-text:#111827] [--table-head-bg:#1f3864] [--table-head-text:#ffffff] [--table-row-border:#e5e7eb] [--table-row-odd:#ffffff] [--table-row-even:#f9fafb] [--table-row-hover:#f3f6fb] [--table-cell-text:#111827]';

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
    <div
      className="rounded-lg border px-3 py-2 text-sm shadow-md"
      style={{ background: chartTheme.tooltipBg, borderColor: chartTheme.tooltipBorder }}
    >
      <p className="font-medium text-[#f7f8fb]">{payload[0].name}</p>
      <p className="text-[#9aa6bb]">{formatCurrency(payload[0].value)}</p>
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
      <DataSurface title="Expense Breakdown" eyebrow="Reports" tone="light">
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-white/5" />
          ))}
        </div>
      </DataSurface>
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
      <div className="inline-flex items-center rounded-2xl border border-[#2b436e] bg-[#f7f9fc] p-1 shadow-sm">
        <button
          type="button"
          className={`rounded-xl px-4 py-1.5 text-sm font-medium transition-colors ${
            subTab === 'category'
              ? 'bg-[#1f3864] text-white hover:bg-[#2e4a7a]'
              : 'text-[#4b5a73] hover:bg-white hover:text-[#111827]'
          }`}
          onClick={() => setSubTab('category')}
        >
          By Category
        </button>
        <button
          type="button"
          className={`rounded-xl px-4 py-1.5 text-sm font-medium transition-colors ${
            subTab === 'vendor'
              ? 'bg-[#1f3864] text-white hover:bg-[#2e4a7a]'
              : 'text-[#4b5a73] hover:bg-white hover:text-[#111827]'
          }`}
          onClick={() => setSubTab('vendor')}
        >
          By Vendor
        </button>
      </div>

      {subTab === 'category' && (
        <div className="space-y-6">
          {pieData.length > 0 && (
            <DataSurface title="Category Breakdown" eyebrow="Reports" tone="light">
              <div className="flex flex-col items-center gap-6 md:flex-row">
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
                      <span className="text-[#111827]">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </DataSurface>
          )}

          <DataSurface title="Category Ledger" eyebrow="Reports" tone="light">
            <DarkTableContainer className={LIGHT_TABLE_CLASS}>
              <DarkTable>
                <thead>
                  <tr>
                    <DarkTableHeader sticky className="w-4 px-2" />
                    <DarkTableHeader sticky>Category</DarkTableHeader>
                    <DarkTableHeader sticky className="text-right">Total</DarkTableHeader>
                  </tr>
                </thead>
                <tbody>
                  {data.byCategory.map((cat) => {
                    const expanded = expandedCategories.has(cat.category);
                    return (
                      <Fragment key={cat.category}>
                        <DarkTableRow
                          className="cursor-pointer"
                          onClick={() => toggleCategory(cat.category)}
                          tabIndex={0}
                          role="button"
                          aria-expanded={expanded}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleCategory(cat.category);
                            }
                          }}
                        >
                          <DarkTableCell className="px-2">
                            {cat.subcategories.length > 0 ? (
                              expanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-[#9aa6bb]" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-[#9aa6bb]" />
                              )
                            ) : null}
                          </DarkTableCell>
                          <DarkTableCell className="font-medium">{cat.category}</DarkTableCell>
                          <DarkTableCell numeric className="font-semibold">
                            {formatCurrency(cat.total)}
                          </DarkTableCell>
                        </DarkTableRow>
                        {expanded &&
                          cat.subcategories.map((sub) => (
                            <DarkTableRow
                              key={`${cat.category}-${sub.name}`}
                              className="bg-white/[0.03]"
                            >
                              <DarkTableCell />
                              <DarkTableCell className="pl-10 text-xs text-[#6b7280]">
                                {sub.name}
                              </DarkTableCell>
                              <DarkTableCell numeric className="text-xs">
                                {formatCurrency(sub.amount)}
                              </DarkTableCell>
                            </DarkTableRow>
                          ))}
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <DarkTableRow className="bg-white/[0.05] font-semibold">
                    <DarkTableCell />
                    <DarkTableCell>Total</DarkTableCell>
                    <DarkTableCell numeric>{formatCurrency(data.total)}</DarkTableCell>
                  </DarkTableRow>
                </tfoot>
              </DarkTable>
            </DarkTableContainer>
          </DataSurface>
        </div>
      )}

      {subTab === 'vendor' && (
        <DataSurface title="Vendor Spend" eyebrow="Reports" tone="light">
          <DarkTableContainer className={LIGHT_TABLE_CLASS}>
            <DarkTable>
              <thead>
                <tr>
                  <DarkTableHeader sticky>Vendor</DarkTableHeader>
                  <DarkTableHeader sticky className="text-right">Total Spend</DarkTableHeader>
                  <DarkTableHeader sticky className="text-right"># Projects</DarkTableHeader>
                  <DarkTableHeader sticky>Top Categories</DarkTableHeader>
                </tr>
              </thead>
              <tbody>
                {data.byVendor.length === 0 && (
                  <DarkTableRow>
                    <DarkTableCell colSpan={4} className="py-8 text-center text-[#4b5563]">
                      No vendor data found.
                    </DarkTableCell>
                  </DarkTableRow>
                )}
                {data.byVendor.map((vendor) => (
                  <DarkTableRow key={vendor.vendor}>
                    <DarkTableCell className="font-medium">{vendor.vendor}</DarkTableCell>
                    <DarkTableCell numeric className="font-semibold text-rose-700">
                      {formatCurrency(vendor.totalSpend)}
                    </DarkTableCell>
                    <DarkTableCell numeric>{vendor.projectCount}</DarkTableCell>
                    <DarkTableCell className="text-xs text-[#374151]">
                      {vendor.topCategories.join(', ')}
                    </DarkTableCell>
                  </DarkTableRow>
                ))}
              </tbody>
            </DarkTable>
          </DarkTableContainer>
        </DataSurface>
      )}
    </div>
  );
}
