import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useJobCostingReport } from '@/hooks/use-financial-reports';
import { ProjectStatus, FenceType } from '@fencetastic/shared';
import type { JobCostingRow } from '@fencetastic/shared';

interface JobCostingReportProps {
  dateFrom?: string;
  dateTo?: string;
}

type SortField = keyof Pick<
  JobCostingRow,
  | 'customer'
  | 'address'
  | 'status'
  | 'fenceType'
  | 'revenue'
  | 'materials'
  | 'subcontractors'
  | 'otherExpenses'
  | 'commissionsAdnaan'
  | 'commissionsMeme'
  | 'profit'
  | 'marginPct'
>;

type SortDir = 'asc' | 'desc';

const STATUS_OPTIONS = Object.values(ProjectStatus);
const FENCE_TYPE_OPTIONS = Object.values(FenceType);

const STATUS_LABELS: Record<string, string> = {
  ESTIMATE: 'Estimate',
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
  WARRANTY: 'Warranty',
};

const FENCE_TYPE_LABELS: Record<string, string> = {
  WOOD: 'Wood',
  METAL: 'Metal',
  CHAIN_LINK: 'Chain Link',
  VINYL: 'Vinyl',
  GATE: 'Gate',
  OTHER: 'Other',
};

function marginColor(pct: number): string {
  if (pct >= 30) return 'text-emerald-600';
  if (pct >= 15) return 'text-amber-500';
  return 'text-red-500';
}

export function JobCostingReport({ dateFrom, dateTo }: JobCostingReportProps) {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [fenceTypeFilter, setFenceTypeFilter] = useState<string | undefined>(undefined);
  const [sortField, setSortField] = useState<SortField>('customer');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useJobCostingReport({
    dateFrom: dateFrom ?? '',
    dateTo: dateTo ?? '',
    status: statusFilter,
    fenceType: fenceTypeFilter,
  });

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
    });
  }, [data, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function sortIndicator(field: SortField) {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-950 mb-4">Job Costing</h3>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
        Failed to load job costing report: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter ?? ''}
          onChange={(e) => setStatusFilter(e.target.value || undefined)}
          className="rounded-xl border border-black/10 bg-white/70 px-3 py-1.5 text-sm text-slate-700"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s] ?? s}
            </option>
          ))}
        </select>
        <select
          value={fenceTypeFilter ?? ''}
          onChange={(e) => setFenceTypeFilter(e.target.value || undefined)}
          className="rounded-xl border border-black/10 bg-white/70 px-3 py-1.5 text-sm text-slate-700"
        >
          <option value="">All Fence Types</option>
          {FENCE_TYPE_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {FENCE_TYPE_LABELS[f] ?? f}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-black/5 bg-white/70 backdrop-blur-sm shadow-sm p-6">
        <div className="rounded-lg border border-black/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 text-xs text-slate-500">
                  <th className="w-4 py-2 px-2" />
                  {([
                    ['customer', 'Customer'],
                    ['address', 'Address'],
                    ['status', 'Status'],
                    ['fenceType', 'Fence Type'],
                    ['revenue', 'Revenue'],
                    ['materials', 'Materials'],
                    ['subcontractors', 'Subs'],
                    ['otherExpenses', 'Other'],
                    ['commissionsAdnaan', 'Comm (A)'],
                    ['commissionsMeme', 'Comm (M)'],
                    ['profit', 'Profit'],
                    ['marginPct', 'Margin %'],
                  ] as [SortField, string][]).map(([field, label]) => (
                    <th
                      key={field}
                      role="button"
                      tabIndex={0}
                      className={`py-2 px-3 cursor-pointer hover:text-slate-900 whitespace-nowrap ${
                        field === 'customer' || field === 'address' || field === 'status' || field === 'fenceType'
                          ? 'text-left'
                          : 'text-right'
                      }`}
                      onClick={() => handleSort(field)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort(field); } }}
                    >
                      {label}
                      {sortIndicator(field)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={13} className="py-8 text-center text-slate-500">
                      No job costing data found.
                    </td>
                  </tr>
                )}
                {sorted.map((row) => {
                  const expanded = expandedRows.has(row.projectId);
                  return (
                    <Fragment key={row.projectId}>
                      <tr
                        className="border-b border-black/5 hover:bg-slate-50/60 cursor-pointer transition-colors"
                        onClick={() => toggleRow(row.projectId)}
                        tabIndex={0}
                        role="button"
                        aria-expanded={expanded}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleRow(row.projectId);
                          }
                        }}
                      >
                        <td className="py-2 px-2">
                          {expanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                          )}
                        </td>
                        <td className="py-2 px-3 font-medium">{row.customer}</td>
                        <td className="py-2 px-3 text-slate-500 text-xs truncate max-w-[140px]">
                          {row.address}
                        </td>
                        <td className="py-2 px-3">
                          <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium">
                            {STATUS_LABELS[row.status] ?? row.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs">
                          {FENCE_TYPE_LABELS[row.fenceType] ?? row.fenceType}
                        </td>
                        <td className="py-2 px-3 text-right">{formatCurrency(row.revenue)}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(row.materials)}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(row.subcontractors)}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(row.otherExpenses)}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(row.commissionsAdnaan)}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(row.commissionsMeme)}</td>
                        <td
                          className={`py-2 px-3 text-right font-semibold ${
                            row.profit >= 0 ? 'text-emerald-600' : 'text-red-500'
                          }`}
                        >
                          {formatCurrency(row.profit)}
                        </td>
                        <td className={`py-2 px-3 text-right font-semibold ${marginColor(row.marginPct)}`}>
                          {row.marginPct.toFixed(1)}%
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-slate-50/40">
                          <td />
                          <td colSpan={12} className="py-3 px-4">
                            <div className="px-0 py-1 text-sm space-y-1 text-slate-600">
                              <p>
                                <span className="font-medium text-slate-900">Materials:</span>{' '}
                                {formatCurrency(row.materials)}
                                {' | '}
                                <span className="font-medium text-slate-900">Subcontractors:</span>{' '}
                                {formatCurrency(row.subcontractors)}
                              </p>
                              <p>
                                <span className="font-medium text-slate-900">Other Expenses:</span>{' '}
                                {formatCurrency(row.otherExpenses)}
                              </p>
                              <p>
                                <span className="font-medium text-slate-900">Commissions:</span>{' '}
                                Adnaan {formatCurrency(row.commissionsAdnaan)} + Meme{' '}
                                {formatCurrency(row.commissionsMeme)}
                              </p>
                              <p className="font-medium text-slate-900">
                                Total Costs:{' '}
                                {formatCurrency(
                                  row.materials +
                                    row.subcontractors +
                                    row.otherExpenses +
                                    row.commissionsAdnaan +
                                    row.commissionsMeme,
                                )}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
