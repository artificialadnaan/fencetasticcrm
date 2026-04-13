import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useJobCostingReport } from '@/hooks/use-financial-reports';
import { DataSurface } from '@/components/ui/data-surface';
import {
  DarkTable,
  DarkTableCell,
  DarkTableContainer,
  DarkTableHeader,
  DarkTableRow,
} from '@/components/ui/dark-table';
import { ProjectStatus, FenceType } from '@fencetastic/shared';
import type { JobCostingRow } from '@fencetastic/shared';

const LIGHT_TABLE_CLASS = '[--table-bg:#ffffff] [--table-border:#d9e1ef] [--table-text:#111827] [--table-head-bg:#1f3864] [--table-head-text:#ffffff] [--table-row-border:#e5e7eb] [--table-row-odd:#ffffff] [--table-row-even:#f9fafb] [--table-row-hover:#f3f6fb] [--table-cell-text:#111827]';

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
  if (pct >= 30) return 'text-emerald-700';
  if (pct >= 15) return 'text-amber-700';
  return 'text-rose-700';
}

export function JobCostingReport({
  dateFrom,
  dateTo,
  onFiltersChange,
}: JobCostingReportProps & { onFiltersChange?: (filters: Record<string, string>) => void }) {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [fenceTypeFilter, setFenceTypeFilter] = useState<string | undefined>(undefined);
  const [sortField, setSortField] = useState<SortField>('customer');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    const filters: Record<string, string> = {};
    if (statusFilter) filters.status = statusFilter;
    if (fenceTypeFilter) filters.fenceType = fenceTypeFilter;
    onFiltersChange?.(filters);
  }, [statusFilter, fenceTypeFilter, onFiltersChange]);

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
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
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
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  if (isLoading) {
    return (
      <DataSurface title="Job Costing" eyebrow="Reports" tone="light">
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-white/5" />
          ))}
        </div>
      </DataSurface>
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
      <div className="flex flex-wrap gap-3">
        <select
          aria-label="Filter by status"
          value={statusFilter ?? ''}
          onChange={(e) => setStatusFilter(e.target.value || undefined)}
          className="rounded-xl border border-[#d1d9e6] bg-white px-3 py-1.5 text-sm text-[#111827]"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status] ?? status}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by fence type"
          value={fenceTypeFilter ?? ''}
          onChange={(e) => setFenceTypeFilter(e.target.value || undefined)}
          className="rounded-xl border border-[#d1d9e6] bg-white px-3 py-1.5 text-sm text-[#111827]"
        >
          <option value="">All Fence Types</option>
          {FENCE_TYPE_OPTIONS.map((fenceType) => (
            <option key={fenceType} value={fenceType}>
              {FENCE_TYPE_LABELS[fenceType] ?? fenceType}
            </option>
          ))}
        </select>
      </div>

      <DataSurface title="Project Margin Ledger" eyebrow="Reports" tone="light">
        <DarkTableContainer className={LIGHT_TABLE_CLASS}>
          <DarkTable>
            <thead>
              <tr>
                <DarkTableHeader sticky className="w-4 px-2" />
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
                  <DarkTableHeader
                    key={field}
                    sticky
                    role="button"
                    tabIndex={0}
                    className={`cursor-pointer whitespace-nowrap hover:text-[#f7f8fb] ${
                      field === 'customer' ||
                      field === 'address' ||
                      field === 'status' ||
                      field === 'fenceType'
                        ? 'text-left'
                        : 'text-right'
                    }`}
                    onClick={() => handleSort(field)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSort(field);
                      }
                    }}
                  >
                    {label}
                    {sortIndicator(field)}
                  </DarkTableHeader>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <DarkTableRow>
                  <DarkTableCell colSpan={13} className="py-8 text-center text-[#6b7280]">
                    No job costing data found.
                  </DarkTableCell>
                </DarkTableRow>
              )}
              {sorted.map((row) => {
                const expanded = expandedRows.has(row.projectId);
                return (
                  <Fragment key={row.projectId}>
                    <DarkTableRow
                      className="cursor-pointer"
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
                      <DarkTableCell className="px-2">
                        {expanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-[#6b7280]" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-[#6b7280]" />
                        )}
                      </DarkTableCell>
                      <DarkTableCell className="font-medium">{row.customer}</DarkTableCell>
                      <DarkTableCell className="max-w-[140px] truncate text-xs text-[#6b7280]">
                        {row.address}
                      </DarkTableCell>
                      <DarkTableCell>
                        <span className="inline-block rounded-full border border-[#d9e1ef] bg-[#f3f4f6] px-2 py-0.5 text-xs font-medium text-[#1f2937]">
                          {STATUS_LABELS[row.status] ?? row.status}
                        </span>
                      </DarkTableCell>
                      <DarkTableCell className="text-xs">
                        {FENCE_TYPE_LABELS[row.fenceType] ?? row.fenceType}
                      </DarkTableCell>
                      <DarkTableCell numeric>{formatCurrency(row.revenue)}</DarkTableCell>
                      <DarkTableCell numeric>{formatCurrency(row.materials)}</DarkTableCell>
                      <DarkTableCell numeric>{formatCurrency(row.subcontractors)}</DarkTableCell>
                      <DarkTableCell numeric>{formatCurrency(row.otherExpenses)}</DarkTableCell>
                      <DarkTableCell numeric>{formatCurrency(row.commissionsAdnaan)}</DarkTableCell>
                      <DarkTableCell numeric>{formatCurrency(row.commissionsMeme)}</DarkTableCell>
                      <DarkTableCell
                        numeric
                          className={`font-semibold ${row.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
                      >
                        {formatCurrency(row.profit)}
                      </DarkTableCell>
                      <DarkTableCell numeric className={`font-semibold ${marginColor(row.marginPct)}`}>
                        {row.marginPct.toFixed(1)}%
                      </DarkTableCell>
                    </DarkTableRow>
                    {expanded && (
                      <DarkTableRow className="bg-white/[0.03]">
                        <DarkTableCell />
                        <DarkTableCell colSpan={12} className="py-4">
                          <div className="space-y-1 text-sm text-[#4b5563]">
                            <p>
                              <span className="font-medium text-[#111827]">Materials:</span>{' '}
                              {formatCurrency(row.materials)}
                              {' | '}
                              <span className="font-medium text-[#111827]">Subcontractors:</span>{' '}
                              {formatCurrency(row.subcontractors)}
                            </p>
                            <p>
                              <span className="font-medium text-[#111827]">Other Expenses:</span>{' '}
                              {formatCurrency(row.otherExpenses)}
                            </p>
                            <p>
                              <span className="font-medium text-[#111827]">Commissions:</span>{' '}
                              Adnaan {formatCurrency(row.commissionsAdnaan)} + Meme{' '}
                              {formatCurrency(row.commissionsMeme)}
                            </p>
                            <p className="font-medium text-[#111827]">
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
                        </DarkTableCell>
                      </DarkTableRow>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </DarkTable>
        </DarkTableContainer>
      </DataSurface>
    </div>
  );
}
